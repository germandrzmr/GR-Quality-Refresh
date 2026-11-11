// Validación del formulario de contacto.
// Este mismo archivo se usa en el navegador (se inserta en index.html al empaquetar)
// y en el servidor (la función de Netlify lo importa). Así las reglas nunca se separan.

export const PROJECT_TYPES = {
  "sitio-web": "Sitio web o landing page",
  "plataforma": "Plataforma o sistema empresarial",
  "ux-ui": "Diseño UX/UI",
  "ia-automatizacion": "IA y automatización",
  "bi-datos": "Dashboards, BI o bases de datos",
  "modernizacion": "Modernización de un sistema",
  "qa": "QA y validación",
  "otro": "Otro",
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\d\s-]{7,20}$/;

function clean(value, { multiline = false } = {}) {
  let s = typeof value === "string" ? value : "";
  s = s.replace(CONTROL_CHARS, "").replace(/[<>]/g, "");
  if (!multiline) s = s.replace(/[\r\n\t]+/g, " ");
  return s.trim();
}

function lengthRule(errors, field, value, min, max, label) {
  if (!value) errors[field] = `Escribe ${label}.`;
  else if (value.length < min) errors[field] = `Debe tener al menos ${min} caracteres.`;
  else if (value.length > max) errors[field] = `Máximo ${max} caracteres.`;
}

export function validateContact(input) {
  const raw = input && typeof input === "object" ? input : {};
  const data = {
    name: clean(raw.name),
    company: clean(raw.company),
    role: clean(raw.role),
    email: clean(raw.email).toLowerCase(),
    phone: clean(raw.phone),
    projectType: clean(raw.projectType),
    message: clean(raw.message, { multiline: true }),
    privacy: raw.privacy === true,
  };
  const errors = {};

  lengthRule(errors, "name", data.name, 2, 80, "tu nombre");
  lengthRule(errors, "company", data.company, 2, 100, "el nombre de tu empresa");
  lengthRule(errors, "role", data.role, 2, 80, "tu cargo");

  if (!data.email) errors.email = "Escribe tu correo.";
  else if (data.email.length > 120 || !EMAIL_RE.test(data.email)) errors.email = "Revisa el correo, por ejemplo nombre@empresa.com.";

  if (!data.phone) errors.phone = "Escribe tu teléfono.";
  else if (!PHONE_RE.test(data.phone) || data.phone.replace(/\D/g, "").length < 7) errors.phone = "Usa solo números, espacios, +, ( ) o guiones.";

  if (!Object.prototype.hasOwnProperty.call(PROJECT_TYPES, data.projectType)) errors.projectType = "Elige el tipo de proyecto.";

  lengthRule(errors, "message", data.message, 10, 2000, "un mensaje");

  if (!data.privacy) errors.privacy = "Debes autorizar el tratamiento de datos para enviar la solicitud.";

  const ok = Object.keys(errors).length === 0;
  return ok ? { success: true, data } : { success: false, fieldErrors: errors };
}
