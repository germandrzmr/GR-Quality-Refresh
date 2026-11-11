// Función de servidor: recibe el formulario del brochure y envía el correo por Resend.
// La clave de Resend vive solo aquí, en variables de entorno de Netlify. Nunca en el navegador.
import { validateContact } from "../../shared/contact-schema.mjs";
import { buildHtmlBody, buildTextBody, buildSubject } from "../../shared/email.mjs";

export const config = { path: "/api/contact" };

const MAX_BYTES = 10 * 1024;
const BURST_LIMIT = 10;              // solicitudes por IP
const BURST_WINDOW_MS = 10 * 60_000; // cada 10 minutos
const DAILY_PER_PERSON = 3;          // envíos exitosos por correo o teléfono al día
const DAILY_PER_IP = 10;             // envíos exitosos por IP al día

const MSG_LIMIT = "Ya recibimos 3 solicitudes tuyas hoy. Nuestro equipo te contactará pronto; si es urgente, escríbenos por WhatsApp.";
const MSG_FAIL = "No pudimos enviar tu solicitud en este momento. Escríbenos por WhatsApp o al correo de contacto.";

// Contadores en memoria. Se pierden cuando Netlify reinicia la función y no se comparten
// entre instancias. Para un tráfico mayor, mover a Netlify Blobs, Redis o KV.
const burst = new Map();  // ip -> [timestamps]
let dailyDay = "";
const daily = new Map();  // "email:x" | "phone:x" | "ip:x" -> count

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function bogotaDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(now);
}

function rollDay() {
  const today = bogotaDay();
  if (today !== dailyDay) { dailyDay = today; daily.clear(); }
}

function clientIp(req, context) {
  const fwd = req.headers.get("x-forwarded-for");
  return (context && context.ip) || (fwd && fwd.split(",")[0].trim()) || req.headers.get("x-real-ip") || "desconocida";
}

function burstExceeded(ip) {
  const now = Date.now();
  const list = (burst.get(ip) || []).filter((t) => now - t < BURST_WINDOW_MS);
  list.push(now);
  burst.set(ip, list);
  return list.length > BURST_LIMIT;
}

function personKeys(data) {
  const digits = data.phone.replace(/\D/g, "").slice(-10);
  return [`email:${data.email}`, `phone:${digits}`];
}

function dailyBlocked(data, ip) {
  rollDay();
  if (personKeys(data).some((k) => (daily.get(k) || 0) >= DAILY_PER_PERSON)) return true;
  return (daily.get(`ip:${ip}`) || 0) >= DAILY_PER_IP;
}

function registerDaily(data, ip) {
  rollDay();
  for (const k of [...personKeys(data), `ip:${ip}`]) daily.set(k, (daily.get(k) || 0) + 1);
}

function env(name) {
  const v = (globalThis.Netlify?.env?.get?.(name)) ?? process.env[name];
  return typeof v === "string" ? v.trim() : "";
}

function hintFor(status, text) {
  if (status === 401) return "La clave RESEND_API_KEY es inválida o está mal copiada. Cópiala de nuevo en Netlify y vuelve a publicar.";
  if (status === 403 && /testing emails/i.test(text)) return "Sin dominio verificado, Resend solo entrega al correo con el que se creó la cuenta. CONTACT_TO_EMAIL debe ser exactamente ese correo, o verifica un dominio en resend.com/domains.";
  if ((status === 403 || status === 422) && /from/i.test(text)) return "CONTACT_FROM_EMAIL no pertenece a un dominio verificado. Déjalo vacío o verifica el dominio en Resend.";
  return "Revisa las variables de entorno y el panel de Resend.";
}

async function sendWithResend(data) {
  const key = env("RESEND_API_KEY");
  const to = env("CONTACT_TO_EMAIL");
  if (!key) throw new Error("Falta la variable de entorno RESEND_API_KEY");
  if (!to) throw new Error("Falta la variable de entorno CONTACT_TO_EMAIL");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from: env("CONTACT_FROM_EMAIL") || "GR Quality Refresh <onboarding@resend.dev>",
      to: [to],
      reply_to: data.email,
      subject: buildSubject(data),
      html: buildHtmlBody(data),
      text: buildTextBody(data),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Resend respondió HTTP ${res.status}: ${text}`);
    err.hint = hintFor(res.status, text);
    throw err;
  }
}

export default async function handler(req, context) {
  if (req.method !== "POST") return json(405, { ok: false, error: "Método no permitido." });

  const type = (req.headers.get("content-type") || "").toLowerCase();
  if (!type.includes("application/json")) return json(415, { ok: false, error: "Formato no admitido." });

  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BYTES) return json(413, { ok: false, error: "La solicitud es demasiado grande." });

  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BYTES) return json(413, { ok: false, error: "La solicitud es demasiado grande." });

  let body;
  try { body = JSON.parse(raw); } catch { return json(400, { ok: false, error: "No pudimos leer la solicitud." }); }

  const ip = clientIp(req, context);
  if (burstExceeded(ip)) return json(429, { ok: false, error: "Recibimos demasiadas solicitudes seguidas. Intenta de nuevo en unos minutos." });

  // Honeypot: un bot llenó el campo oculto. Fingimos éxito y no enviamos nada.
  if (body && typeof body.website === "string" && body.website.trim() !== "") return json(200, { ok: true });

  const result = validateContact(body);
  if (!result.success) return json(422, { ok: false, error: "Revisa los campos marcados.", fieldErrors: result.fieldErrors });
  const data = result.data;

  if (dailyBlocked(data, ip)) return json(429, { ok: false, error: MSG_LIMIT });

  try {
    await sendWithResend(data);
  } catch (err) {
    console.error("[contacto] No se pudo enviar:", err.message);
    console.error("[contacto] Pista:", err.hint || "Revisa las variables de entorno RESEND_API_KEY y CONTACT_TO_EMAIL en Netlify.");
    return json(502, { ok: false, error: MSG_FAIL });
  }

  registerDaily(data, ip); // solo se cuentan los envíos exitosos
  return json(200, { ok: true });
}
