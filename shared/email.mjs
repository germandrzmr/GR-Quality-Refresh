// Correo HTML con la marca de GR Quality Refresh y su versión en texto plano.
import { PROJECT_TYPES } from "./contact-schema.mjs";

const C = { ink: "#14171d", slate: "#2a303b", mint: "#74dba8", deep: "#2f6e55", text: "#1c222a", muted: "#5b6470", line: "#e3e8e6", paper: "#f3f6f5" };

export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function whatsappNumber(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) d = "57" + d;
  return d;
}

function bogotaDate(now = new Date()) {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeStyle: "short", timeZone: "America/Bogota" }).format(now);
}

export function projectLabel(data) {
  return PROJECT_TYPES[data.projectType] || "Otro";
}

export function buildSubject(data) {
  return `Nueva solicitud: ${projectLabel(data)} — ${data.name} (${data.company})`;
}

export function buildHtmlBody(data, { site = "Brochure web de GR Quality Refresh", now = new Date() } = {}) {
  const tipo = projectLabel(data);
  const replySubject = encodeURIComponent(`Re: tu solicitud a GR Quality Refresh — ${tipo}`);
  const wa = whatsappNumber(data.phone);
  const waText = encodeURIComponent(`Hola ${data.name}, te escribimos de GR Quality Refresh por tu solicitud sobre ${tipo}.`);
  const message = esc(data.message).replace(/\r?\n/g, "<br>");
  const row = (label, value) => `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid ${C.line};width:120px;font:600 13px Arial,Helvetica,sans-serif;color:${C.muted};vertical-align:top;">${label}</td>
              <td style="padding:10px 0;border-bottom:1px solid ${C.line};font:15px Arial,Helvetica,sans-serif;color:${C.text};vertical-align:top;">${value}</td>
            </tr>`;

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(buildSubject(data))}</title></head>
<body style="margin:0;padding:0;background:${C.paper};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(data.name)} de ${esc(data.company)} quiere hablar sobre ${esc(tipo)}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${C.line};">
        <tr><td style="background:${C.ink};padding:28px 28px 26px;">
          <div style="font:700 20px Arial,Helvetica,sans-serif;color:#ffffff;letter-spacing:.5px;">GR <span style="color:${C.mint};">Quality Refresh</span></div>
          <div style="margin-top:18px;display:inline-block;padding:5px 10px;border:1px solid ${C.mint};border-radius:999px;font:700 11px Arial,Helvetica,sans-serif;letter-spacing:1.5px;color:${C.mint};">NUEVA SOLICITUD DESDE LA WEB</div>
          <h1 style="margin:14px 0 4px;font:700 24px/1.25 Arial,Helvetica,sans-serif;color:#ffffff;">${esc(data.name)} quiere hablar contigo</h1>
          <div style="font:15px Arial,Helvetica,sans-serif;color:#b9c2cc;">${esc(data.role)} · ${esc(data.company)}</div>
        </td></tr>
        <tr><td style="padding:24px 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9f8f0;border-radius:10px;">
            <tr><td style="padding:14px 16px;">
              <div style="font:700 11px Arial,Helvetica,sans-serif;letter-spacing:1.2px;color:${C.deep};">TIPO DE PROYECTO</div>
              <div style="margin-top:4px;font:700 17px Arial,Helvetica,sans-serif;color:${C.text};">${esc(tipo)}</div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:12px 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${row("Nombre", esc(data.name))}${row("Empresa", esc(data.company))}${row("Cargo", esc(data.role))}${row("Correo", `<a href="mailto:${esc(data.email)}" style="color:${C.deep};">${esc(data.email)}</a>`)}${row("Teléfono", `<a href="tel:${esc(data.phone.replace(/[^\d+]/g, ""))}" style="color:${C.deep};">${esc(data.phone)}</a>`)}
          </table>
        </td></tr>
        <tr><td style="padding:22px 28px 0;">
          <div style="font:700 11px Arial,Helvetica,sans-serif;letter-spacing:1.2px;color:${C.muted};">MENSAJE</div>
          <div style="margin-top:8px;padding:14px 16px;border-left:4px solid ${C.mint};background:${C.paper};border-radius:0 8px 8px 0;font:15px/1.6 Arial,Helvetica,sans-serif;color:${C.text};">${message}</div>
        </td></tr>
        <tr><td style="padding:24px 28px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding:0 10px 10px 0;"><a href="mailto:${esc(data.email)}?subject=${replySubject}" style="display:inline-block;padding:12px 18px;background:${C.ink};color:#ffffff;border-radius:999px;font:700 14px Arial,Helvetica,sans-serif;text-decoration:none;">Responder por correo</a></td>
            ${wa ? `<td style="padding:0 0 10px;"><a href="https://wa.me/${wa}?text=${waText}" style="display:inline-block;padding:12px 18px;background:${C.mint};color:${C.ink};border-radius:999px;font:700 14px Arial,Helvetica,sans-serif;text-decoration:none;">Escribir por WhatsApp</a></td>` : ""}
          </tr></table>
        </td></tr>
        <tr><td style="padding:16px 28px 26px;border-top:1px solid ${C.line};font:12.5px/1.6 Arial,Helvetica,sans-serif;color:${C.muted};">
          Recibida el ${esc(bogotaDate(now))} desde ${esc(site)}.<br>Puedes responder directamente a este correo: la respuesta le llega a ${esc(data.name)}.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildTextBody(data, { site = "Brochure web de GR Quality Refresh", now = new Date() } = {}) {
  return [
    "NUEVA SOLICITUD DESDE LA WEB — GR Quality Refresh",
    "",
    `${data.name} quiere hablar contigo`,
    `${data.role} · ${data.company}`,
    "",
    `Tipo de proyecto: ${projectLabel(data)}`,
    `Nombre: ${data.name}`,
    `Empresa: ${data.company}`,
    `Cargo: ${data.role}`,
    `Correo: ${data.email}`,
    `Teléfono: ${data.phone}`,
    "",
    "Mensaje:",
    data.message,
    "",
    `Recibida el ${bogotaDate(now)} desde ${site}.`,
    "Puedes responder directamente a este correo.",
  ].join("\n");
}
