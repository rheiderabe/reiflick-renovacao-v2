"use client";

import { useState } from "react";
import { SendQueuePanel, useSendQueue } from "@/app/components/SendQueue";
import { CsvImport } from "@/app/components/CsvImport";

export default function Home() {
  const [activeTab, setActiveTab] = useState("cancelados");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const sendQueue = useSendQueue();

  // Estados para cada formulário
  const [canceladosData, setCanceladosData] = useState("");
  const [reidodramaData, setReidodramaData] = useState("");
  const [renovacaoData, setRenovacaoData] = useState("");

  // Função para processar dados de telefone
  const processPhoneData = (data) => {
    // Se começar com [ e terminar com ], é JSON
    if (data.trim().startsWith("[") && data.trim().endsWith("]")) {
      return JSON.parse(data);
    }

    // Senão, trata como lista de números (um por linha)
    return data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  };

  const handleSubmit = async (endpoint, data) => {
    setLoading(true);
    setResult(null);

    try {
      let parsedData;
      try {
        // Para cancelados e renovação, processamos de forma especial
        if (endpoint === "send-cancelados" || endpoint === "send-renovacao") {
          parsedData = processPhoneData(data);
        } else {
          parsedData = JSON.parse(data);
        }
      } catch (e) {
        throw new Error("Dados inválidos. Verifique a formatação.");
      }

      if (endpoint === "send-cancelados" || endpoint === "send-renovacao") {
        if (!Array.isArray(parsedData)) {
          throw new Error("Dados inválidos. Verifique a formatação.");
        }

        // Fila: um número por request, com status, pausa e nova tentativa
        sendQueue.start(endpoint, parsedData);
        return;
      }

      const response = await fetch(`/api/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro na requisição");
      }

      setResult({
        success: true,
        data: result,
      });
    } catch (error) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    {
      id: "cancelados",
      label: "Envio Cancelados",
      color: "bg-red-500",
      hoverColor: "hover:bg-red-600",
      focusColor: "focus:ring-red-500",
    },
    {
      id: "reidodrama",
      label: "Rei do Drama",
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600",
      focusColor: "focus:ring-purple-500",
    },
    {
      id: "renovacao",
      label: "Renovação",
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600",
      focusColor: "focus:ring-blue-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🚀 Reiflick</h1>
          <p className="text-xl text-gray-600">Sistema de Envio de Mensagens</p>
          <div className="w-24 h-1 bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white rounded-xl shadow-lg p-2 border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-8 py-4 rounded-lg font-semibold transition-all duration-200 transform ${
                  activeTab === tab.id
                    ? `${tab.color} text-white shadow-lg scale-105`
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl p-8 border">
          {/* Formulário Cancelados */}
          {activeTab === "cancelados" && (
            <div>
              <div className="flex items-center mb-6">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <h2 className="text-3xl font-bold text-red-600">
                  Envio de Cancelados
                </h2>
              </div>
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
                <p className="text-red-700">
                  📱 Envie mensagens de carrinho abandonado via WhatsApp. Você
                  pode inserir os números de duas formas:
                </p>
                <div className="mt-3 text-sm text-red-600">
                  <div className="mb-2">
                    <strong>✅ Lista simples (um por linha):</strong>
                  </div>
                  <div className="bg-white p-2 rounded border font-mono text-xs">
                    5511999999999
                    <br />
                    5511888888888
                    <br />
                    5511777777777
                  </div>
                  <div className="mt-3 mb-2">
                    <strong>✅ Array JSON:</strong>
                  </div>
                  <div className="bg-white p-2 rounded border font-mono text-xs">
                    ["5511999999999", "5511888888888"]
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Dados (Números de WhatsApp)
                </label>
                <textarea
                  value={canceladosData}
                  onChange={(e) => setCanceladosData(e.target.value)}
                  placeholder={`Você pode usar qualquer um dos formatos:

Lista simples:
5511999999999
5511888888888
5511777777777

OU Array JSON:
["5511999999999", "5511888888888"]`}
                  className="w-full h-48 p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <button
                onClick={() => handleSubmit("send-cancelados", canceladosData)}
                disabled={loading || sendQueue.busy}
                className="w-full bg-red-500 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                {sendQueue.busy ? "📤 Envio em andamento" : "🚀 Enviar Carrinho Abandonado"}
              </button>
              <div className="mt-6">
                <CsvImport
                  accent="red"
                  disabled={loading || sendQueue.busy}
                  onSend={(items) => {
                    setResult(null);
                    sendQueue.start("send-cancelados", items);
                  }}
                />
              </div>
            </div>
          )}

          {/* Formulário Rei do Drama */}
          {activeTab === "reidodrama" && (
            <div>
              <div className="flex items-center mb-6">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <h2 className="text-3xl font-bold text-purple-600">
                  Rei do Drama
                </h2>
              </div>
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6 rounded-r-lg">
                <p className="text-purple-700">
                  🎬 Envie instruções de acesso ao Rei do Drama via WhatsApp e
                  email. Insira um array JSON com os dados dos pagamentos.
                </p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Dados (Array de objetos com payment)
                </label>
                <textarea
                  value={reidodramaData}
                  onChange={(e) => setReidodramaData(e.target.value)}
                  placeholder='[{"payment": {"customer_name": "João", "customer_email": "joao@email.com", "customer_phone": "5511999999999"}}]'
                  className="w-full h-36 p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <button
                onClick={() => handleSubmit("send-reidodrama", reidodramaData)}
                disabled={loading}
                className="w-full bg-purple-500 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                {loading ? "📤 Enviando..." : "🎭 Enviar Rei do Drama"}
              </button>
            </div>
          )}

          {/* Formulário Renovação */}
          {activeTab === "renovacao" && (
            <div>
              <div className="flex items-center mb-6">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <h2 className="text-3xl font-bold text-blue-600">Renovação</h2>
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
                <p className="text-blue-700">
                  🔄 Envie mensagens de renovação via WhatsApp. Você pode
                  inserir os números de duas formas:
                </p>
                <div className="mt-3 text-sm text-blue-600">
                  <div className="mb-2">
                    <strong>✅ Lista simples (um por linha):</strong>
                  </div>
                  <div className="bg-white p-2 rounded border font-mono text-xs">
                    5511999999999
                    <br />
                    5511888888888
                    <br />
                    5511777777777
                  </div>
                  <div className="mt-3 mb-2">
                    <strong>✅ Array JSON:</strong>
                  </div>
                  <div className="bg-white p-2 rounded border font-mono text-xs">
                    ["5511999999999", "5511888888888"]
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Dados (Números de WhatsApp)
                </label>
                <textarea
                  value={renovacaoData}
                  onChange={(e) => setRenovacaoData(e.target.value)}
                  placeholder={`Você pode usar qualquer um dos formatos:

Lista simples:
5511999999999
5511888888888
5511777777777

OU Array JSON:
["5511999999999", "5511888888888"]`}
                  className="w-full h-48 p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <button
                onClick={() => handleSubmit("send-renovacao", renovacaoData)}
                disabled={loading || sendQueue.busy}
                className="w-full bg-blue-500 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                {sendQueue.busy ? "📤 Envio em andamento" : "♻️ Enviar Renovação"}
              </button>
              <div className="mt-6">
                <CsvImport
                  accent="blue"
                  disabled={loading || sendQueue.busy}
                  onSend={(items) => {
                    setResult(null);
                    sendQueue.start("send-renovacao", items);
                  }}
                />
              </div>
            </div>
          )}

          {/* Fila de envio (Cancelados / Renovação) */}
          <SendQueuePanel
            title={
              sendQueue.queue?.endpoint === "send-renovacao"
                ? "Renovação"
                : "Envio de Cancelados"
            }
            queue={sendQueue.queue}
            running={sendQueue.running}
            paused={sendQueue.paused}
            onPause={sendQueue.pause}
            onResume={sendQueue.resume}
            onRetry={sendQueue.retry}
            onClear={sendQueue.clear}
          />

          {/* Resultado */}
          {result && (
            <div
              className={`mt-8 p-6 rounded-xl border-2 ${
                result.success
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center mb-4">
                <div
                  className={`w-4 h-4 rounded-full mr-3 ${
                    result.success ? "bg-green-500" : "bg-red-500"
                  }`}
                ></div>
                <h3
                  className={`text-xl font-bold ${
                    result.success ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {result.success ? "✅ Sucesso!" : "❌ Erro!"}
                </h3>
              </div>
              {result.success ? (
                <div>
                  <p className="text-green-700 text-lg font-semibold mb-4">
                    📊 Total de mensagens enviadas:{" "}
                    <span className="text-2xl">{result.data.total}</span>
                  </p>
                  {result.data.enviados && result.data.enviados.length > 0 && (
                    <details className="bg-green-100 rounded-lg p-4">
                      <summary className="cursor-pointer text-green-800 font-semibold hover:text-green-900">
                        📋 Ver detalhes dos envios
                      </summary>
                      <div className="mt-4 max-h-48 overflow-y-auto">
                        <pre className="text-sm text-green-700 whitespace-pre-wrap bg-white p-3 rounded border">
                          {JSON.stringify(result.data.enviados, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
                  {result.data.erros && result.data.erros.length > 0 && (
                    <details className="bg-red-100 rounded-lg p-4 mt-4" open>
                      <summary className="cursor-pointer text-red-800 font-semibold hover:text-red-900">
                        ⚠️ Falhas: {result.data.erros.length}
                      </summary>
                      <div className="mt-4 max-h-48 overflow-y-auto">
                        <pre className="text-sm text-red-700 whitespace-pre-wrap bg-white p-3 rounded border">
                          {JSON.stringify(result.data.erros, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              ) : (
                <div className="bg-red-100 p-4 rounded-lg">
                  <p className="text-red-800 font-semibold">
                    ⚠️ {result.error}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="mt-12 text-center">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              🚀 Reiflick
            </h3>
            <p className="text-gray-600 mb-2">Sistema de Envio de Mensagens</p>
            <p className="text-sm text-gray-500">Desenvolvido em Next.js</p>
            <div className="flex justify-center space-x-2 mt-3">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
