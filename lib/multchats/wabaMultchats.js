import axios from "axios";

const MULTCHATS_API_BASE = "https://api.multchats.com/v2";
const MULTCHATS_API_TOKEN = "019e806c-12e3-7bf8-a54d-73287b728c46";
const MULTCHATS_INTEGRATION_ID = "cmpxg4255004y14i7tzuh3b90";
const MULTCHATS_CARRINHO_TEMPLATE_ID = "1313925986831411";
const MULTCHATS_COMPRA_TEMPLATE_ID = "1528932175630070";
const MULTCHATS_AUTOMATION_WEBHOOK_URL =
  "https://backend.multchats.com/automation-webhook/xo5cpojiczb3c9run0pshnxf?force=true";

const REQUEST_TIMEOUT = 30000;

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${MULTCHATS_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export function normalizePhoneNumber(phone) {
  return String(phone || "").replace(/\D/g, "");
}

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

function resolveAbandonedCartPhone(payload = {}) {
  return (
    payload.customer?.phone ||
    payload.customer?.phone_number ||
    payload.phone_number ||
    payload.phoneNumber ||
    payload.whatsapp
  );
}

export async function sendAbandonedCartMessage(payload = {}, options = {}) {
  const phoneNumber = resolveAbandonedCartPhone(payload);
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  if (!normalizedPhone) {
    throw new Error("Telefone ausente ou inválido");
  }

  const params = buildAbandonedCartTemplateParams(payload);
  const templateId = options.templateId || MULTCHATS_CARRINHO_TEMPLATE_ID;

  const multchatsResponse = await sendTemplateMessage({
    phoneNumber: normalizedPhone,
    templateId,
    params,
    integrationId: options.integrationId,
  });

  return {
    phoneNumber: normalizedPhone,
    templateId,
    params,
    multchatsResponse,
  };
}

async function postSendMessage(payload) {
  const response = await axios.post(
    `${MULTCHATS_API_BASE}/message/send-message`,
    payload,
    {
      headers: getAuthHeaders(),
      timeout: REQUEST_TIMEOUT,
    },
  );

  return response.data;
}

export async function sendTemplateMessage({
  phoneNumber,
  templateId,
  params,
  integrationId = MULTCHATS_INTEGRATION_ID,
}) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
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
}) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
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

export async function sendPurchaseMessage(context = {}, options = {}) {
  const phoneNumber =
    context.phone_number || context.phoneNumber || context.whatsapp;
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  if (!normalizedPhone) {
    throw new Error("Telefone ausente ou inválido");
  }

  const params = buildPurchaseTemplateParams(context);
  const templateId = options.templateId || MULTCHATS_COMPRA_TEMPLATE_ID;

  const templateResponse = await sendTemplateMessage({
    phoneNumber: normalizedPhone,
    templateId,
    params,
    integrationId: options.integrationId,
  });

  const fullMessage = String(context.fullMessage || "").trim();
  let textResponse = null;

  if (fullMessage) {
    textResponse = await sendTextMessage({
      phoneNumber: normalizedPhone,
      text: fullMessage,
      integrationId: options.integrationId,
    });
  }

  return {
    phoneNumber: normalizedPhone,
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
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
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
