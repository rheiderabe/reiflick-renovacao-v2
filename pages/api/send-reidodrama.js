import axios from "axios";
import nodemailer from "nodemailer";

const MULTCHATS_URL = "https://api.multchats.com/v1/message/send-message-queue";
const INTEGRATION_ID = "cmdt09yhp06r7ax15pq23tdqu";
const BEARER_TOKEN = "0198665a-7283-79ad-a0d9-f21920848e00";

const configOptions = {
  host: "smtpout.secureserver.net",
  port: 465,
  secure: true,
  auth: { user: "suporte@reiflick.com", pass: "Rm110452rdr#@" },
  tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
};

const transporter = nodemailer.createTransport(configOptions);

function cleanPhone(phone) {
  let cleaned = String(phone).replace(/[^0-9]/g, "");
  if (!cleaned.startsWith("55") && cleaned.length === 11)
    cleaned = "55" + cleaned;
  return cleaned;
}

const messageTemplate = (name, email) => `
Olá, ${name}

Seu acesso ao conteúdo do REI DO DRAMA chegou:

1. Instale o aplicativo *Telegram* no seu celular, caso ainda não tenha.

2. Depois de instalar, acesse o link para entrar em contato com nosso BOT:
   https://t.me/REI_DORAMA_BOT 👈 *clique aqui*

3. No Telegram, clique em *START* (no canto superior direito da tela)

4. Digite o seu e-mail e envie para o BOT: ${email}

5. O BOT irá validar seu e-mail automaticamente. Aguarde a confirmação antes de prosseguir.

6. Em seguida, clique no link do grupo: https://t.me/+4L5vSHXf3mE3MTAx 👈 *clique aqui*

7. Pronto! Agora é só acessar o catálogo e assistir aos seus doramas favoritos! 🎬✨
`;

async function sendToMultchats(phone, message) {
  const payload = {
    integrationId: INTEGRATION_ID,
    phone: phone.startsWith("+") ? phone : `+${phone}`,
    messages: [{ type: "text", content: message }],
  };
  await axios.post(MULTCHATS_URL, payload, {
    headers: {
      Authorization: `Bearer ${BEARER_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
}

async function sendEmail(email, name, message) {
  const mailOptions = {
    from: '"COMPRAS REI DO DRAMA" <suporte@reiflick.com>',
    to: email,
    subject: "COMO ACESSAR REI DO DRAMA",
    text: message,
    html: message.replace(/\n/g, "<br>"),
  };
  await transporter.sendMail(mailOptions);
}

export default async function handler(req, res) {
  // Adiciona CORS
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
    const data = req.body; // Recebe array de objetos via POST
    let messagesSent = 0;
    let sentList = [];

    for (const item of data) {
      const payment = item.payment;
      if (
        !payment ||
        !payment.customer_name ||
        !payment.customer_email ||
        !payment.customer_phone
      )
        continue;
      const name = payment.customer_name;
      const email = payment.customer_email;
      const phone = cleanPhone(payment.customer_phone);
      const message = messageTemplate(name, email);
      try {
        await sendToMultchats(phone, message);
        await sendEmail(email, name, message);
        messagesSent++;
        sentList.push({ name, phone, email });
        console.log(`Mensagem enviada para: ${name} - ${phone} e ${email}`);
      } catch (err) {
        console.error(`Erro ao enviar para ${name}:`, err.message);
      }
      // Aguarda 5 segundos antes de enviar para o próximo cliente
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    res.json({ total: messagesSent, enviados: sentList });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.response ? error.response.data : error.message });
  }
}
