import {
  normalizePhoneNumber,
  sendCanceladosMessage,
} from "@/lib/multchats/wabaMultchats";

function resolvePayload(item) {
  if (typeof item === "string" || typeof item === "number") {
    return {
      customer: {
        name: "Cliente",
        phone: String(item),
      },
    };
  }

  if (item?.customer) {
    return item;
  }

  return {
    customer: {
      name: item?.name || "Cliente",
      phone:
        item?.phone ||
        item?.phone_number ||
        item?.whatsapp ||
        item?.customer_phone,
    },
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const data = req.body;
    let messagesSent = 0;
    const sentList = [];
    const errorList = [];

    for (const item of data) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const payload = resolvePayload(item);
      const cleanWhatsapp = normalizePhoneNumber(
        payload.customer?.phone || payload.customer?.phone_number,
      );

      if (!cleanWhatsapp) {
        console.log("Pulando número vazio ou inválido");
        errorList.push({
          whatsapp: item,
          erro: "Número de WhatsApp vazio ou inválido",
        });
        continue;
      }

      try {
        const whatsappResult = await sendCanceladosMessage(payload);

        messagesSent++;
        sentList.push({
          whatsapp: cleanWhatsapp,
          cliente: payload.customer?.name,
          status: "enviado",
          multchats: {
            templateId: whatsappResult.templateId,
            params: whatsappResult.params,
          },
        });
        console.log(`Mensagem enviada para: ${cleanWhatsapp}`);
      } catch (error) {
        console.error(
          `Erro ao enviar mensagem para ${cleanWhatsapp}:`,
          error.response ? error.response.data : error.message,
        );
        errorList.push({
          whatsapp: cleanWhatsapp,
          erro: error.response ? error.response.data : error.message,
        });
      }
    }

    res.json({
      total: messagesSent,
      enviados: sentList,
      erros: errorList,
    });
  } catch (error) {
    res.status(500).json({
      error: error.response ? error.response.data : error.message,
    });
  }
}
