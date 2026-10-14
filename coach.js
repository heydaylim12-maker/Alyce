// 문장 사다리 — AI 코치 중계 함수 (Vercel Serverless Function)
// 브라우저는 이 함수만 호출하고, Anthropic API 키는 서버(환경 변수)에만 있습니다.

const API_URL = "https://api.anthropic.com/v1/messages";
const MODELS = {
  default: process.env.MODEL_DEFAULT || "claude-sonnet-5-5", // 코치 피드백, 생각 나누기
  quick: process.env.MODEL_QUICK || "claude-haiku-5-5",      // 단어 찾기, 단어 더 받기
};
const MAX_INPUT_CHARS = 40000;   // 요청 하나에 담을 수 있는 최대 글자 수
const MAX_OUTPUT_TOKENS = 1500;

// 간단한 IP별 요청 제한 (서버 인스턴스마다 따로 세므로 '대략적인' 보호입니다)
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_10MIN || 60);
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < win);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > RATE_LIMIT;
}

// 같은 역할이 연속되면 하나로 합치고, 첫 턴과 마지막 턴이 user가 되도록 정리
function cleanMessages(raw) {
  const out = [];
  for (const m of Array.isArray(raw) ? raw : []) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    const content = String(m.content ?? "").trim();
    if (!content) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + content;
    else out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  while (out.length && out[out.length - 1].role !== "user") out.pop();
  return out;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST only" });
  }

  const code = process.env.ACCESS_CODE;
  let sent = "";
  try { sent = decodeURIComponent(String(req.headers["x-access-code"] || "")); } catch { sent = ""; }
  if (code && sent !== code) {
    return res.status(401).json({ error: "bad_code" });
  }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return res.status(429).json({ error: "rate_limited" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const messages = cleanMessages(body && body.messages);
  if (!messages.length) return res.status(400).json({ error: "messages required" });
  const size = messages.reduce((n, m) => n + m.content.length, 0);
  if (size > MAX_INPUT_CHARS) return res.status(413).json({ error: "prompt_too_large" });

  const model = body.tier === "quick" ? MODELS.quick : MODELS.default;

  try {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system:
          "You are a careful English writing coach for Korean high school students inside a school learning app. " +
          "Follow the instructions in the user's messages exactly. When asked for JSON, reply with the JSON only, no extra text.",
        messages,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const status = r.status === 429 ? 429 : 502;
      return res.status(status).json({ error: (data && data.error && data.error.message) || "upstream_error" });
    }
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    return res.status(200).json({ text, truncated: data.stop_reason === "max_tokens" });
  } catch (e) {
    return res.status(502).json({ error: "upstream_error" });
  }
};
