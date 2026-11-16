import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  METER_NUMBERS,
  METER_SHEET_INSTRUCTIONS,
  assignSheetNote,
  meterName,
  paperRowTarget,
} from "../src/lib/meterSheet.js";

function openaiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim();
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  for (const name of [".env.local", ".env"]) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    const line = fs.readFileSync(file, "utf8").match(/^OPENAI_API_KEY=(.*)$/m);
    if (!line) continue;
    return line[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

function asNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function pushExtra(extras, seen, item) {
  if (seen.has(item.key)) return;
  seen.add(item.key);
  extras.push(item);
}

function normalize(raw) {
  const meters = [];
  const extras = [];
  const unmatched = [];
  const seenMeters = new Set();
  const seenExtras = new Set();
  const ic = { water: null, ee: null, heating: null };

  for (const row of Array.isArray(raw?.rows) ? raw.rows : []) {
    const reading = asNumber(row?.reading);
    const paperRow = row?.paper_row == null ? null : Number(row.paper_row);
    if (reading == null || paperRow == null) continue;
    const target = paperRowTarget(paperRow);
    const uncertain = Boolean(row?.uncertain) || asNumber(row?.replaced_from) != null;
    if (target?.meter && METER_NUMBERS.has(target.meter) && !seenMeters.has(target.meter)) {
      seenMeters.add(target.meter);
      meters.push({
        number: target.meter,
        name: meterName(target.meter),
        reading,
        paper_row: paperRow,
        note: target.note,
        uncertain,
        replaced_from: asNumber(row?.replaced_from),
      });
      continue;
    }
    if (target?.extra) {
      pushExtra(extras, seenExtras, {
        key: target.extra,
        label: target.label,
        reading,
        paper_row: paperRow,
        uncertain,
      });
      continue;
    }
    unmatched.push({
      paper_row: paperRow,
      reading,
      note: target?.note || "",
      uncertain,
    });
  }

  for (const row of Array.isArray(raw?.footer) ? raw.footer : []) {
    const reading = asNumber(row?.reading);
    if (reading == null) continue;
    const assigned = assignSheetNote(row?.label);
    if (assigned.kind === "ic" && ic[assigned.field] == null) {
      ic[assigned.field] = reading;
      continue;
    }
    if (assigned.kind === "extra") {
      pushExtra(extras, seenExtras, {
        key: assigned.key,
        label: assigned.label,
        reading,
        paper_row: null,
        uncertain: Boolean(row?.uncertain),
      });
    }
  }

  meters.sort((a, b) => a.number - b.number);
  return { meters, ic, extras, unmatched };
}

export async function recognizeMeterSheet({ image }) {
  const key = openaiKey();
  if (!key) {
    const error = new Error("Ключ OpenAI не задан на сервере");
    error.status = 500;
    throw error;
  }
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    const error = new Error("Нужна фотография бланка");
    error.status = 400;
    throw error;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      temperature: 0,
      max_tokens: 2500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: METER_SHEET_INSTRUCTIONS },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Прочитай этот бланк и верни JSON.",
            },
            {
              type: "image_url",
              image_url: { url: image, detail: "high" },
            },
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || "OpenAI не ответил";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const text = payload?.choices?.[0]?.message?.content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const error = new Error("Модель вернула не JSON");
    error.status = 502;
    throw error;
  }
  return normalize(parsed);
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body) return JSON.parse(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Только POST" }));
    return;
  }
  try {
    const body = await readBody(req);
    const result = await recognizeMeterSheet({ image: body.image });
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result));
  } catch (err) {
    res.statusCode = err.status || 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: err.message || "Не удалось прочитать бланк" }));
  }
}
