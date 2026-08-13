import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function rangeToDays(range: string): number {
  switch (String(range || "3mo")) {
    case "5d":
      return 8;
    case "1mo":
      return 32;
    case "3mo":
      return 95;
    case "6mo":
      return 185;
    case "1y":
      return 370;
    case "5y":
      return 365 * 5 + 15;
    default:
      return 95;
  }
}

/** Yahoo quoteSummary — F/K, açık, hacim, 52h vb. */
async function fetchYahooProfile(symbol: string) {
  const url =
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
    `?modules=price,summaryDetail,defaultKeyStatistics`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const yd = await res.json();
  const r = yd?.quoteSummary?.result?.[0];
  if (!r) return null;

  const price = r.price;
  const sum = r.summaryDetail;
  const ks = r.defaultKeyStatistics;

  const pctRaw = price?.regularMarketChangePercent?.raw;
  return {
    symbol,
    price: price?.regularMarketPrice?.raw ?? null,
    pct:
      pctRaw != null && isFinite(pctRaw)
        ? pctRaw * (Math.abs(pctRaw) < 1 ? 100 : 1)
        : null,
    open: price?.regularMarketOpen?.raw ?? sum?.open?.raw ?? null,
    high: price?.regularMarketDayHigh?.raw ?? sum?.dayHigh?.raw ?? null,
    low: price?.regularMarketDayLow?.raw ?? sum?.dayLow?.raw ?? null,
    marketCap: price?.marketCap?.raw ?? sum?.marketCap?.raw ?? null,
    volume: price?.regularMarketVolume?.raw ?? sum?.volume?.raw ?? null,
    avgVolume: sum?.averageVolume?.raw ?? null,
    pe: sum?.trailingPE?.raw ?? ks?.trailingPE?.raw ?? null,
    week52High: sum?.fiftyTwoWeekHigh?.raw ?? null,
    week52Low: sum?.fiftyTwoWeekLow?.raw ?? null,
    eps: ks?.trailingEps?.raw ?? null,
    shares: ks?.sharesOutstanding?.raw ?? null,
    employees: ks?.fullTimeEmployees ?? null,
    source: "yahoo",
  };
}

/** FMP anlık */
async function fetchFmpQuote(symbol: string, key: string) {
  const url =
    `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbol)}?apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || !data[0]) return null;
  const q = data[0];
  return {
    symbol: q.symbol || symbol,
    price: q.price ?? null,
    pct: q.changesPercentage ?? null,
    open: q.open ?? null,
    high: q.dayHigh ?? null,
    low: q.dayLow ?? null,
    volume: q.volume ?? null,
    avgVolume: q.avgVolume ?? null,
    marketCap: q.marketCap ?? null,
    pe: q.pe ?? null,
    week52High: q.yearHigh ?? null,
    week52Low: q.yearLow ?? null,
    eps: q.eps ?? null,
    source: "fmp",
  };
}

/** Finnhub anlık */
async function fetchFinnhubQuote(symbol: string, key: string) {
  const url =
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.c == null) return null;
  return {
    symbol,
    price: data.c,
    pct: data.dp ?? null,
    open: data.o ?? null,
    high: data.h ?? null,
    low: data.l ?? null,
    source: "finnhub",
  };
}

/** FMP geçmiş kapanış */
async function fetchFmpHistory(symbol: string, key: string, range: string) {
  const days = rangeToDays(range);
  const url =
    `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(symbol)}` +
    `?timeseries=${days}&apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const rows = Array.isArray(data?.historical)
    ? data.historical
    : Array.isArray(data)
      ? data
      : [];
  if (rows.length < 2) return [];

  const out = rows
    .map((x: { date?: string; close?: number }) => {
      if (x.close == null || !x.date) return null;
      const t = Math.floor(new Date(x.date + "T12:00:00Z").getTime() / 1000);
      if (!isFinite(t)) return null;
      return { time: t, close: Number(x.close) };
    })
    .filter(Boolean) as { time: number; close: number }[];

  return out.reverse();
}

/** Finnhub mum (ABD yedek) */
async function fetchFinnhubHistory(symbol: string, key: string, range: string) {
  const days = rangeToDays(range);
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 86400;
  const url =
    `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}` +
    `&resolution=D&from=${from}&to=${to}&token=${key}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (data?.s !== "ok" || !Array.isArray(data.t) || !Array.isArray(data.c)) {
    return [];
  }
  return data.t.map((t: number, i: number) => ({
    time: t,
    close: data.c[i],
  }));
}

/** Yahoo chart — geçmiş yedek */
async function fetchYahooHistory(symbol: string, range: string) {
  const map: Record<string, string> = {
    "5d": "5d",
    "1mo": "1mo",
    "3mo": "3mo",
    "6mo": "6mo",
    "1y": "1y",
    "5y": "5y",
  };
  const yRange = map[range] || "3mo";
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=${yRange}&interval=1d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  const ts: number[] = result?.timestamp || [];
  const closes: (number | null)[] =
    result?.indicators?.quote?.[0]?.close || [];
  const out: { time: number; close: number }[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    if (c == null || !isFinite(c)) continue;
    out.push({ time: ts[i], close: c });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return json({ error: "POST only" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const symbol = String(body.symbol || "").toUpperCase().trim();
    if (!symbol) return json({ error: "symbol required" }, 400);

    const FMP = Deno.env.get("FMP_KEY") || "";
    const FINNHUB = Deno.env.get("FINNHUB_KEY") || "";
    const wantHistory = !!body.history;
    const wantProfile = !!body.profile;
    const range = String(body.range || "3mo");

    // —— PROFİL (karşılaştır sayfası) ——
    if (wantProfile) {
      let profile = await fetchYahooProfile(symbol);
      if (!profile && FMP) {
        profile = await fetchFmpQuote(symbol, FMP);
      }
      if (!profile) {
        return json({
          symbol,
          error: "profile_empty",
          price: null,
          pct: null,
        });
      }
      return json(profile);
    }

    // —— ANLIK ——
    let quote: Record<string, unknown> | null = null;

    if (FMP) {
      quote = await fetchFmpQuote(symbol, FMP);
    }
    if (!quote && FINNHUB) {
      quote = await fetchFinnhubQuote(symbol, FINNHUB);
    }
    if (!quote) {
      // Yahoo son çare
      const y = await fetchYahooProfile(symbol);
      if (y) {
        quote = {
          symbol,
          price: y.price,
          pct: y.pct,
          open: y.open,
          high: y.high,
          low: y.low,
          source: "yahoo",
        };
      }
    }

    // —— GEÇMİŞ ——
    let history: { time: number; close: number }[] = [];
    if (wantHistory) {
      if (FMP) {
        history = await fetchFmpHistory(symbol, FMP, range);
      }
      if (history.length < 3 && FINNHUB) {
        history = await fetchFinnhubHistory(symbol, FINNHUB, range);
      }
      if (history.length < 3) {
        history = await fetchYahooHistory(symbol, range);
      }
    }

    return json({
      symbol,
      price: quote?.price ?? null,
      pct: quote?.pct ?? null,
      open: quote?.open ?? null,
      high: quote?.high ?? null,
      low: quote?.low ?? null,
      volume: quote?.volume ?? null,
      marketCap: quote?.marketCap ?? null,
      history,
      source: history.length
        ? "live"
        : quote
          ? String(quote.source || "quote")
          : "empty",
    });
  } catch (e) {
    return json({ error: "proxy_failed", detail: String(e) }, 500);
  }
});
