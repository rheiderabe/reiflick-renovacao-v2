import {
  normalizePhoneNumber,
  sendPurchaseMessage,
} from "@/lib/multchats/wabaMultchats";

function resolveCliente(item) {
  if (typeof item === "string" || typeof item === "number") {
    return {
      whatsapp: String(item),
      name: "Cliente",
    };
  }

  return item || {};
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

    for (const rawCliente of data) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const cliente = resolveCliente(rawCliente);
      const cleanWhatsapp = normalizePhoneNumber(cliente.whatsapp);

      if (!cleanWhatsapp) {
        console.log(
          `Pulando cliente ${
            cliente.name || "sem nome"
          } - número vazio ou inválido`,
        );
        errorList.push({
          cliente: cliente.name || cliente.id || "sem nome",
          erro: "Número de WhatsApp vazio ou inválido",
        });
        continue;
      }

      try {
        const multchatsResponse = await sendPurchaseMessage({
          customer: { name: cliente.name },
          phone_number: cleanWhatsapp,
          isRenew: true,
          fullMessage: cliente.customer_renew_template || "",
        });

        messagesSent++;
        sentList.push({
          whatsapp: cleanWhatsapp,
          cliente: cliente.name,
          id: cliente.id,
          status: "enviado",
          multchats: {
            templateId: multchatsResponse.templateId,
            params: multchatsResponse.params,
          },
        });
        console.log(
          `Mensagem enviada para: ${cliente.name || cleanWhatsapp} (${cleanWhatsapp})`,
        );
      } catch (error) {
        const errorMsg = `Erro ao enviar mensagem para ${cliente.name || cleanWhatsapp} (${cleanWhatsapp})`;
        console.error(
          errorMsg,
          error.response ? error.response.data : error.message,
        );
        errorList.push({
          cliente: cliente.name,
          whatsapp: cleanWhatsapp,
          id: cliente.id,
          erro: error.response ? error.response.data : error.message,
        });
      }
    }

    res.json({
      total: messagesSent,
      enviados: sentList,
      erros: errorList,
      resumo: {
        total_processados: data.length,
        sucessos: messagesSent,
        falhas: errorList.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error.response ? error.response.data : error.message,
    });
  }
}
