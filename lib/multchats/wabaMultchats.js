import axios from "axios";
import { resolvePhoneForMultchats } from "./phone";

const MULTCHATS_API_BASE = "https://api.multchats.com/v2";
const MULTCHATS_API_TOKEN = "019e806c-12e3-7bf8-a54d-73287b728c46";
const MULTCHATS_INTEGRATION_ID = "cmpxg4255004y14i7tzuh3b90";
const MULTCHATS_CARRINHO_TEMPLATE_ID = "1313925986831411";
const MULTCHATS_CARRINHO_ABANDONADO_TEMPLATE_ID = "876554762161113";
const MULTCHATS_COMPRA_TEMPLATE_ID = "1528932175630070";
const MULTCHATS_ASSINATURA_CANCELADA_TEMPLATE_ID = "1969729540325034";
const MULTCHATS_RENOVACAO_TEMPLATE_ID = "1741932333826088";
const MULTCHATS_AUTOMATION_WEBHOOK_URL =
  "https://backend.multchats.com/automation-webhook/xo5cpojiczb3c9run0pshnxf?force=true";

const REQUEST_TIMEOUT = 30000;

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${MULTCHATS_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export {
  normalizePhoneNumber,
  normalizeBrazilianMobilePhone,
  resolvePhoneForMultchats,
} from "./phone";

export function getFirstName(name, fallback = "Cliente") {
  const first = String(name || "")
    .trim()
    .split(/\s+/)[0];
  return first || fallback;
}

export function prepareMessageForMultchatsAutomation(message) {
  if (!message) return "";

  return String(message)
    .replace(/\*([^*\n]+)\*/g, "**$1**")
    .replace(/^---$/gm, "\u200b---");
}

export function formatMultchatsError(error) {
  const data = error.response?.data;
  if (data?.message) return data.message;
  if (typeof data === "string") return data;
  return error.message;
}

function isBrokenTemplateError(message = "") {
  return (
    message.includes("header_text") ||
    message.includes("Request failed with status code 400")
  );
}

export async function validateWhatsAppPhoneNumber(
  phoneNumber,
  integrationId = MULTCHATS_INTEGRATION_ID,
) {
  const normalizedPhone = resolvePhoneForMultchats(phoneNumber);
  if (!normalizedPhone) {
    throw new Error("Telefone ausente ou inválido");
  }

  const response = await axios.post(
    `${MULTCHATS_API_BASE}/integration/validate-whatsapp-phone-number`,
    {
      integrationId,
      phoneNumber: normalizedPhone,
    },
    {
      headers: getAuthHeaders(),
      timeout: REQUEST_TIMEOUT,
      validateStatus: () => true,
    },
  );

  if (response.data?.success === false) {
    throw new Error(
      response.data.message || "Número de WhatsApp inválido ou inexistente",
    );
  }

  return {
    phoneNumber: normalizedPhone,
    response: response.data?.response || null,
  };
}

async function postSendMessage(payload) {
  try {
    const response = await axios.post(
      `${MULTCHATS_API_BASE}/message/send-message`,
      payload,
      {
        headers: getAuthHeaders(),
        timeout: REQUEST_TIMEOUT,
      },
    );

    if (response.data?.success === false) {
      throw new Error(
        response.data.message || "Falha ao enviar mensagem Multchats",
      );
    }

    return response.data;
  } catch (error) {
    const err = new Error(formatMultchatsError(error));
    err.response = error.response;
    throw err;
  }
}

export async function sendTemplateMessage({
  phoneNumber,
  templateId,
  params,
  integrationId = MULTCHATS_INTEGRATION_ID,
  skipValidation = false,
}) {
  const normalizedPhone = skipValidation
    ? resolvePhoneForMultchats(phoneNumber)
    : (await validateWhatsAppPhoneNumber(phoneNumber, integrationId))
        .phoneNumber;

  if (!normalizedPhone) {
    throw new Error("Telefone ausente ou inválido");
  }

  return postSendMessage({
    integrationId,
    phoneNumber: normalizedPhone,
    message: {
      type: "template",
      template: {
        templateId,
        params,
      },
    },
  });
}

export async function sendTextMessage({
  phoneNumber,
  text,
  integrationId = MULTCHATS_INTEGRATION_ID,
  skipValidation = false,
}) {
  const normalizedPhone = skipValidation
    ? resolvePhoneForMultchats(phoneNumber)
    : (await validateWhatsAppPhoneNumber(phoneNumber, integrationId))
        .phoneNumber;
  if (!normalizedPhone) {
    throw new Error("Telefone ausente ou inválido");
  }

  const body = String(text || "").trim();
  if (!body) {
    throw new Error("Texto da mensagem ausente");
  }

  return postSendMessage({
    integrationId,
    phoneNumber: normalizedPhone,
    message: {
      type: "text",
      text: {
        body,
      },
    },
  });
}

export function buildPurchaseTemplateParams(context = {}) {
  const customerName =
    context.customer?.name || context.customerName || context.name || "Cliente";

  return {
    bodyText: {
      param_1: getFirstName(customerName),
      param_2: context.isRenew ? "renovação" : "compra",
    },
  };
}

export function buildAbandonedCartTemplateParams(payload = {}) {
  const customerName = payload.customer?.name || payload.name || "Cliente";

  return {
    bodyText: {
      param_1: getFirstName(customerName),
    },
  };
}

export function buildCanceladosTemplateParams(payload = {}) {
  const customerName = payload.customer?.name || payload.name || "Cliente";

  return {
    bodyTextNamedParams: {
      param_nome: getFirstName(customerName),
    },
  };
}

export function buildRenovacaoTemplateParams(payload = {}) {
  const customerName = payload.customer?.name || payload.name || "Cliente";

  return {
    bodyTextNamedParams: {
      param_nome: getFirstName(customerName),
    },
  };
}

function resolvePhone(payload = {}) {
  return (
    payload.customer?.phone ||
    payload.customer?.phone_number ||
    payload.phone_number ||
    payload.phoneNumber ||
    payload.whatsapp
  );
}

export function buildAbandonedCartAutomationMessage(payload = {}) {
  const firstName = getFirstName(payload.customer?.name || payload.name);

  return `Olá, ${firstName}!

Notamos que você deixou itens no carrinho e ainda não finalizou sua compra.

Se precisar de ajuda ou tiver alguma dúvida, estamos à disposição para te atender.`;
}

function resolveTemplateConfig(payload = {}, options = {}, buildParams) {
  return {
    templateId:
      options.templateId || payload.multchats?.templateId || payload.templateId,
    params: options.params || payload.multchats?.params || buildParams(payload),
  };
}

export async function sendAbandonedCartMessage(payload = {}, options = {}) {
  const { phoneNumber } = await validateWhatsAppPhoneNumber(
    resolvePhone(payload),
    options.integrationId,
  );

  const { templateId, params } = resolveTemplateConfig(
    payload,
    {
      ...options,
      templateId: options.templateId || MULTCHATS_CARRINHO_TEMPLATE_ID,
    },
    buildAbandonedCartTemplateParams,
  );

  try {
    const multchatsResponse = await sendTemplateMessage({
      phoneNumber,
      templateId,
      params,
      integrationId: options.integrationId,
      skipValidation: true,
    });

    return {
      phoneNumber,
      deliveryMethod: "template",
      templateId,
      params,
      multchatsResponse,
    };
  } catch (error) {
    const errorMessage = formatMultchatsError(error);

    if (
      options.disableAutomationFallback ||
      !isBrokenTemplateError(errorMessage)
    ) {
      throw error;
    }

    const automationMessage =
      payload.automationMessage ||
      payload.message ||
      buildAbandonedCartAutomationMessage(payload);

    const automationResponse = await sendAutomationWebhook({
      phoneNumber,
      message: automationMessage,
      webhookUrl: options.webhookUrl,
    });

    return {
      phoneNumber,
      deliveryMethod: "automation",
      templateId,
      params,
      templateError: errorMessage,
      automationMessage,
      automationResponse,
    };
  }
}

export async function sendCanceladosMessage(payload = {}, options = {}) {
  const { phoneNumber } = await validateWhatsAppPhoneNumber(
    resolvePhone(payload),
    options.integrationId,
  );

  const templateId =
    options.templateId ||
    payload.multchats?.templateId ||
    MULTCHATS_CARRINHO_ABANDONADO_TEMPLATE_ID;
  const params =
    options.params ||
    payload.multchats?.params ||
    buildCanceladosTemplateParams(payload);

  const multchatsResponse = await sendTemplateMessage({
    phoneNumber,
    templateId,
    params,
    integrationId: options.integrationId,
    skipValidation: true,
  });

  return {
    phoneNumber,
    deliveryMethod: "template",
    templateId,
    params,
    multchatsResponse,
  };
}

export async function sendRenovacaoMessage(payload = {}, options = {}) {
  const { phoneNumber } = await validateWhatsAppPhoneNumber(
    resolvePhone(payload),
    options.integrationId,
  );

  const templateId =
    options.templateId ||
    payload.multchats?.templateId ||
    MULTCHATS_RENOVACAO_TEMPLATE_ID;
  const params =
    options.params ||
    payload.multchats?.params ||
    buildRenovacaoTemplateParams(payload);

  const multchatsResponse = await sendTemplateMessage({
    phoneNumber,
    templateId,
    params,
    integrationId: options.integrationId,
    skipValidation: true,
  });

  return {
    phoneNumber,
    deliveryMethod: "template",
    templateId,
    params,
    multchatsResponse,
  };
}

export async function sendPurchaseMessage(context = {}, options = {}) {
  const phoneNumber =
    context.phone_number || context.phoneNumber || context.whatsapp;
  const { phoneNumber: normalizedPhone } = await validateWhatsAppPhoneNumber(
    phoneNumber,
    options.integrationId,
  );

  const params =
    options.params ||
    context.multchats?.params ||
    buildPurchaseTemplateParams(context);
  const templateId =
    options.templateId ||
    context.multchats?.templateId ||
    MULTCHATS_COMPRA_TEMPLATE_ID;

  const templateResponse = await sendTemplateMessage({
    phoneNumber: normalizedPhone,
    templateId,
    params,
    integrationId: options.integrationId,
    skipValidation: true,
  });

  const fullMessage = String(context.fullMessage || "").trim();
  let textResponse = null;

  if (fullMessage) {
    textResponse = await sendTextMessage({
      phoneNumber: normalizedPhone,
      text: fullMessage,
      integrationId: options.integrationId,
      skipValidation: true,
    });
  }

  return {
    phoneNumber: normalizedPhone,
    deliveryMethod: "template",
    templateId,
    params,
    templateResponse,
    textResponse,
  };
}

export async function sendAutomationWebhook({
  phoneNumber,
  message,
  webhookUrl = MULTCHATS_AUTOMATION_WEBHOOK_URL,
}) {
  const normalizedPhone = resolvePhoneForMultchats(phoneNumber);
  if (!normalizedPhone) {
    throw new Error("Telefone ausente ou inválido");
  }

  const preparedMessage = prepareMessageForMultchatsAutomation(message);
  if (!preparedMessage.trim()) {
    throw new Error("Mensagem da automação ausente");
  }

  const response = await axios.post(
    webhookUrl,
    {
      phone: normalizedPhone,
      message: preparedMessage,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: REQUEST_TIMEOUT,
    },
  );

  return response.data;
}
