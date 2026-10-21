"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolvePhoneForMultchats } from "@/lib/multchats/phone";

const SEND_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 90000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getItemPhone(item) {
  if (typeof item === "string" || typeof item === "number") return item;
  return (
    item?.customer?.phone ||
    item?.phone ||
    item?.phone_number ||
    item?.whatsapp ||
    item?.customer_phone
  );
}

// Monta a fila removendo números repetidos (com e sem 9 contam como o mesmo)
export function buildQueueItems(rawItems) {
  const seen = new Set();
  const items = [];
  let duplicates = 0;

  rawItems.forEach((raw, index) => {
    const phone = resolvePhoneForMultchats(getItemPhone(raw));
    if (phone && seen.has(phone)) {
      duplicates++;
      return;
    }
    if (phone) seen.add(phone);

    items.push({
      id: `${index}-${phone || "invalido"}`,
      raw,
      phone: phone || String(getItemPhone(raw) ?? ""),
      status: "pending",
      error: null,
      result: null,
      attempts: 0,
    });
  });

  return { items, duplicates };
}

async function sendItem(endpoint, raw) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([raw]),
      signal: controller.signal,
    });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof body.error === "string"
          ? body.error
          : JSON.stringify(body.error) || "Erro na requisição",
      );
    }

    if (body.erros?.length) {
      const erro = body.erros[0].erro;
      return {
        status: "error",
        error: typeof erro === "string" ? erro : JSON.stringify(erro),
      };
    }

    if (body.enviados?.length) {
      return { status: "sent", result: body.enviados[0] };
    }

    return { status: "error", error: "Resposta vazia do servidor" };
  } catch (error) {
    return {
      status: "error",
      error:
        error.name === "AbortError"
          ? "Tempo esgotado — pode ter sido enviado, confira antes de tentar de novo"
          : error.message,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function useSendQueue() {
  const [queue, setQueue] = useState(null);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const queueRef = useRef(null);
  const runningRef = useRef(false);
  const pausedRef = useRef(false);

  // queueRef é a fonte da verdade (lida pelo loop); o state só espelha pra renderizar
  const commitQueue = useCallback((next) => {
    queueRef.current = next;
    setQueue(next);
  }, []);

  const updateItem = useCallback(
    (id, patch) => {
      const current = queueRef.current;
      if (!current) return;
      commitQueue({
        ...current,
        items: current.items.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      });
    },
    [commitQueue],
  );

  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);

    let first = true;
    try {
      while (!pausedRef.current) {
        const current = queueRef.current;
        const next = current?.items.find((item) => item.status === "pending");
        if (!next) break;

        if (!first) await sleep(SEND_DELAY_MS);
        first = false;
        if (pausedRef.current) break;

        updateItem(next.id, {
          status: "sending",
          error: null,
          attempts: next.attempts + 1,
        });
        const outcome = await sendItem(current.endpoint, next.raw);
        updateItem(next.id, outcome);
      }
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }, [updateItem]);

  const start = useCallback(
    (endpoint, rawItems) => {
      const { items, duplicates } = buildQueueItems(rawItems);
      commitQueue({ endpoint, items, duplicates });
      pausedRef.current = false;
      setPaused(false);
      run();
    },
    [commitQueue, run],
  );

  const pause = useCallback(() => {
    pausedRef.current = true;
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
    run();
  }, [run]);

  const retry = useCallback(
    (ids) => {
      const current = queueRef.current;
      if (!current) return;
      const retryIds = new Set(ids);
      commitQueue({
        ...current,
        items: current.items.map((item) =>
          retryIds.has(item.id) && item.status === "error"
            ? { ...item, status: "pending", error: null }
            : item,
        ),
      });
      if (!pausedRef.current) run();
    },
    [commitQueue, run],
  );

  const clear = useCallback(() => {
    if (runningRef.current) return;
    commitQueue(null);
    pausedRef.current = false;
    setPaused(false);
  }, [commitQueue]);

  // Avisa antes de fechar/recarregar a página com envio em andamento
  useEffect(() => {
    if (!running) return;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [running]);

  const hasPending = Boolean(
    queue?.items.some(
      (item) => item.status === "pending" || item.status === "sending",
    ),
  );

  return {
    queue,
    running,
    paused,
    busy: running || hasPending,
    start,
    pause,
    resume,
    retry,
    clear,
  };
}

const STATUS_LABEL = {
  pending: "Na fila",
  sending: "Enviando",
  sent: "Enviado",
  error: "Falhou",
};

const STATUS_TEXT = {
  pending: "text-gray-500",
  sending: "text-amber-700",
  sent: "text-green-700",
  error: "text-red-700",
};

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "pending", label: "Na fila" },
  { id: "sent", label: "Enviados" },
  { id: "error", label: "Falhas" },
];

function ItemBar({ status }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
      {status === "sending" && (
        <div className="send-queue-indeterminate h-full w-1/3 rounded-full bg-amber-500" />
      )}
      {status === "sent" && <div className="h-full w-full bg-green-500" />}
      {status === "error" && <div className="h-full w-full bg-red-500" />}
    </div>
  );
}

export function SendQueuePanel({
  title,
  queue,
  running,
  paused,
  onPause,
  onResume,
  onRetry,
  onClear,
}) {
  const [filter, setFilter] = useState("all");

  if (!queue) return null;

  const { items, duplicates } = queue;
  const counts = items.reduce(
    (acc, item) => {
      acc[item.status === "sending" ? "pending" : item.status]++;
      return acc;
    },
    { pending: 0, sent: 0, error: 0 },
  );
  const total = items.length;
  const finished = counts.sent + counts.error;
  const failedIds = items
    .filter((item) => item.status === "error")
    .map((item) => item.id);
  const visible =
    filter === "all"
      ? items
      : items.filter((item) =>
          filter === "pending"
            ? item.status === "pending" || item.status === "sending"
            : item.status === filter,
        );

  let stateLabel = "Concluído";
  if (running && paused) stateLabel = "Pausando após o envio atual…";
  else if (running) stateLabel = "Enviando…";
  else if (paused && counts.pending > 0) stateLabel = "Pausado";

  const pct = (value) => (total ? (value / total) * 100 : 0);

  return (
    <div className="mt-8 rounded-xl border-2 border-gray-200 bg-white p-4 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {title}
          </p>
          <h3 className="text-lg font-bold text-gray-800">{stateLabel}</h3>
          <p className="text-sm text-gray-600">
            {finished}/{total} processados · {counts.sent} enviados ·{" "}
            {counts.error} falhas
            {duplicates > 0 && ` · ${duplicates} duplicados ignorados`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {running && !paused && (
            <button
              onClick={onPause}
              className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600"
            >
              ⏸ Pausar
            </button>
          )}
          {paused && counts.pending > 0 && (
            <button
              onClick={onResume}
              disabled={running}
              className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ▶ Retomar
            </button>
          )}
          {failedIds.length > 0 && (
            <button
              onClick={() => onRetry(failedIds)}
              className="rounded-lg border-2 border-red-500 px-4 py-2 font-semibold text-red-600 hover:bg-red-50"
            >
              ↻ Tentar falhas ({failedIds.length})
            </button>
          )}
          {!running && (
            <button
              onClick={onClear}
              className="rounded-lg border-2 border-gray-300 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${pct(counts.sent)}%` }}
        />
        <div
          className="h-full bg-red-500 transition-all duration-300"
          style={{ width: `${pct(counts.error)}%` }}
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.id === "all" ? total : counts[f.id];
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                filter === f.id
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
        {visible.map((item) => (
          <li key={item.id} className="px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 text-sm text-gray-800">
                <span className="font-mono">{item.phone || "(vazio)"}</span>
                {item.raw?.name && item.raw.name !== "Cliente" && (
                  <span className="ml-2 text-gray-500">{item.raw.name}</span>
                )}
              </span>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`text-sm font-semibold ${STATUS_TEXT[item.status]}`}
                >
                  {STATUS_LABEL[item.status]}
                  {item.attempts > 1 && ` · ${item.attempts}ª tentativa`}
                </span>
                {item.status === "error" && (
                  <button
                    onClick={() => onRetry([item.id])}
                    className="rounded-md border border-red-400 px-2 py-0.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    ↻ Tentar de novo
                  </button>
                )}
              </div>
            </div>
            <div className="mt-1.5">
              <ItemBar status={item.status} />
            </div>
            {item.error && (
              <p className="mt-1 break-words text-xs text-red-600">
                {item.error}
              </p>
            )}
          </li>
        ))}
        {visible.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-gray-500">
            Nenhum número neste filtro.
          </li>
        )}
      </ul>
    </div>
  );
}
