"use client";

import { useState } from "react";
import { buildQueueItems } from "@/app/components/SendQueue";

// Coluna V da planilha de vendas (Cliente (Telefone)), usada se o cabeçalho não for reconhecido
const DEFAULT_PHONE_COLUMN = 21;

// Planilhas exportadas no Excel/Kirvano costumam vir em Windows-1252, não UTF-8
function decodeFile(buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0];
  const count = (char) => firstLine.split(char).length - 1;
  return count(";") >= count(",") ? ";" : ",";
}

function parseCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim()));
}

function findColumn(header, matcher, fallback = -1) {
  const index = header.findIndex((cell) => matcher(cell.trim().toLowerCase()));
  return index >= 0 ? index : fallback;
}

function readSalesCsv(text) {
  const rows = parseCsv(text.replace(/^﻿/, ""), detectDelimiter(text));
  if (rows.length < 2) throw new Error("CSV vazio ou sem linhas de dados.");

  const [header, ...dataRows] = rows;
  const phoneCol = findColumn(
    header,
    (h) => h.includes("telefone") || h.includes("whatsapp") || h === "phone",
    DEFAULT_PHONE_COLUMN,
  );
  const nameCol = findColumn(
    header,
    (h) => h === "cliente (nome)" || h === "nome" || h === "name",
  );
  const statusCol = findColumn(header, (h) => h === "status");

  if (phoneCol >= header.length) {
    throw new Error("Não encontrei a coluna de telefone (coluna V).");
  }

  const contacts = dataRows.map((row) => ({
    phone: (row[phoneCol] || "").trim(),
    name: nameCol >= 0 ? (row[nameCol] || "").trim() : "",
    status: statusCol >= 0 ? (row[statusCol] || "").trim() : "",
  }));

  return { contacts, phoneHeader: header[phoneCol] };
}

export function CsvImport({ disabled, onSend, accent = "red" }) {
  const [fileName, setFileName] = useState("");
  const [data, setData] = useState(null);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [error, setError] = useState("");

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setData(null);
    setFileName(file.name);

    try {
      const parsed = readSalesCsv(decodeFile(await file.arrayBuffer()));
      setData(parsed);
      setSelectedStatuses([
        ...new Set(parsed.contacts.map((c) => c.status).filter(Boolean)),
      ]);
    } catch (err) {
      setError(err.message || "Não foi possível ler o CSV.");
    }
  };

  const statusCounts = (data?.contacts || []).reduce((acc, contact) => {
    if (contact.status) acc[contact.status] = (acc[contact.status] || 0) + 1;
    return acc;
  }, {});
  const hasStatuses = Object.keys(statusCounts).length > 0;

  const selectedContacts = (data?.contacts || []).filter(
    (contact) => !hasStatuses || selectedStatuses.includes(contact.status),
  );
  const toSend = selectedContacts
    .filter((contact) => contact.phone)
    .map((contact) => ({ name: contact.name || "Cliente", phone: contact.phone }));
  const { items: uniqueItems, duplicates } = buildQueueItems(toSend);
  const withoutPhone = selectedContacts.length - toSend.length;

  const toggleStatus = (status) =>
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );

  const buttonColor =
    accent === "blue"
      ? "bg-blue-500 hover:bg-blue-600"
      : "bg-red-500 hover:bg-red-600";

  return (
    <div className="mb-6 rounded-lg border-2 border-dashed border-gray-300 p-4">
      <p className="mb-3 text-sm font-semibold text-gray-700">
        Ou envie a planilha de vendas (.csv) — telefone lido da coluna V
      </p>
      <label className="inline-flex cursor-pointer items-center rounded-lg border-2 border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50">
        📄 Escolher CSV
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          disabled={disabled}
          className="hidden"
        />
      </label>
      {fileName && (
        <span className="ml-3 break-all text-sm text-gray-600">{fileName}</span>
      )}

      {error && <p className="mt-3 text-sm text-red-600">⚠️ {error}</p>}

      {data && (
        <div className="mt-4">
          {hasStatuses && (
            <div className="mb-3">
              <p className="mb-2 text-sm text-gray-600">
                Enviar para vendas com status:
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <label
                    key={status}
                    className="flex cursor-pointer items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status)}
                      onChange={() => toggleStatus(status)}
                    />
                    {status} ({count})
                  </label>
                ))}
              </div>
            </div>
          )}

          <p className="mb-3 text-sm text-gray-600">
            {data.contacts.length} linhas · coluna “{data.phoneHeader}” ·{" "}
            <strong>{uniqueItems.length} números a enviar</strong>
            {duplicates > 0 && ` · ${duplicates} repetidos ignorados`}
            {withoutPhone > 0 && ` · ${withoutPhone} sem telefone`}
          </p>

          <button
            onClick={() => onSend(toSend)}
            disabled={disabled || uniqueItems.length === 0}
            className={`w-full rounded-lg px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${buttonColor}`}
          >
            {disabled
              ? "📤 Envio em andamento"
              : `🚀 Enviar para ${uniqueItems.length} números do CSV`}
          </button>
        </div>
      )}
    </div>
  );
}
