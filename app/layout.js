import "./globals.css";

export const metadata = {
  title: "Reiflick - Sistema de Envio de Mensagens",
  description: "Sistema para gerenciar envio de mensagens via WhatsApp e email",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
