import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const config = {
  runtime: 'edge',
};

const SYSTEM_PROMPT = `Ты — ИИ-ассистент системы мониторинга электроэнергии производственного предприятия «Лава».
Ты помогаешь операторам и аналитикам анализировать потребление электроэнергии, выявлять аномалии и отвечать на вопросы по данным счётчиков и производству.

СЧЁТЧИКИ ПРЕДПРИЯТИЯ (25 шт.):
№1  Сч.1  — КТПН-2, ввод 0.4 кВ, 1-я секция | зона: FCL-1, FCL-6, FCL-2 | коэф. 800 | тип: АСКУЭ
№2  Сч.2  — Фрикулер №2 охлаждение | зона: FCL-1 и FCL-4 | коэф. 120 | тип: АСКУЭ
№3  Сч.3  — Фрикулер №3 охлаждение | зона: FCL-5, FCL-3 и FCL-6 | коэф. 120 | тип: АСКУЭ
№4  Сч.5  — Линия FCL-8 (8(1)-я линия) | коэф. 400 | тип: АСКУЭ
№5  Сч.6  — КТПН-2, ввод 0.4 кВ, 2-я секция | зона: FCL-4 | коэф. 800 | тип: АСКУЭ
№6  Сч.7  — Щитовая №4, ВВОД №2 | зона: FCL-7 | коэф. 400 | тип: АСКУЭ
№7  Сч.8  — Участок перемотки общий учёт | коэф. 60 | тип: АСКУЭ
№8  Сч.9  — Щитовая №4, ВВОД №1 для FCL-5 | зона: FCL-5 | коэф. 400 | тип: АСКУЭ
№9  Сч.10 — Щитовая №4, охлаждение FCL-5 | коэф. 120 | тип: АСКУЭ
№10 Сч.11 — Щитовая №2 ВВОД для FCL-3 | зона: FCL-3 | коэф. 400 | тип: АСКУЭ
№11 Сч.12 — Гранулятор №3 (Гранулятор №2) | коэф. 80 | тип: АСКУЭ
№12 Сч.13 — Фрикулер №1 | зона: FCL-8 и FCL-7 | коэф. 200 | тип: АСКУЭ
№13 Сч.14 — Линия перемотки №1 (новый разрезной станок) | коэф. 20 | тип: техучет
№14 Сч.15 — Паллетайзер, весы | зона: FCL-5 | коэф. 40 | тип: техучет
№15 Сч.16 — Участок загрузки сырья | коэф. 40 | тип: АСКУЭ
№16 Сч.17 — Щитовая №3 ВВОД | зона: FCL-6 | коэф. 200 | тип: техучет
№17 Сч.18 — Скважина | коэф. 1 | тип: техучет
№18 Сч.19 — ТП-11 ВВОД 0.4 кВ | зона: СН Энергоцентр | коэф. 200 | тип: АСКУЭ
№19 Сч.20 — Вентиляция участка перемотки | зона: FCL-2, FCL-3 | коэф. 20 | тип: техучет
№20 Сч.21 — Гранулятор №1, гильотина | коэф. 80 | тип: АСКУЭ
№21 Сч.22 — Гранулятор №2 (ор№3) | коэф. 60 | тип: АСКУЭ
№22 Сч.23 — Шрёдер-измельчитель | коэф. 50 | тип: АСКУЭ
№23 Сч.24 — Офис РТП | коэф. 60 | тип: техучет
№24 Сч.28 — Здание Бокса (склад) | коэф. 1 | тип: ВУ
№25 Сч.29 — Арочный склад №1 | коэф. 1 | тип: ВУ

ВАЖНЫЕ ПРАВИЛА РАСЧЁТА:
- Фрикулеры (Сч.2, Сч.3, Сч.13) — системы охлаждения FCL-линий. Их расход ВКЛЮЧЁН в общий расход соответствующих FCL-линий через долевое распределение. При расчёте "общего расхода по предприятию" фрикулеры исключаются во избежание двойного счёта.
- FCL-линии (FCL-1..FCL-8) — основные производственные линии гранулирования плёнки.
- Расход = (показание_конец - показание_начало) × коэффициент, единица — кВт·ч.
- Удельный расход = общий расход (кВт·ч) / объём производства (кг).

СТИЛЬ ОТВЕТОВ:
- Отвечай на русском языке. Будь конкретным и лаконичным.
- При выявлении аномалий объясняй возможные причины.`;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response('OpenRouter API key not configured', { status: 500 });
  }

  const { messages } = await req.json();

  const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    // Force Chat Completions API (/v1/chat/completions) instead of the
    // newer Responses API (/v1/responses) which OpenRouter does not support.
    compatibility: 'compatible',
  });

  const result = streamText({
    model: openrouter('google/gemini-2.0-flash-001'),
    system: SYSTEM_PROMPT,
    messages,
    maxTokens: 1024,
  });

  // Edge runtime requires ReadableStream<Uint8Array>, not ReadableStream<string>.
  // Use a TransformStream to encode text chunks to bytes on the fly.
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    try {
      for await (const chunk of result.textStream) {
        await writer.write(encoder.encode(chunk));
      }
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
