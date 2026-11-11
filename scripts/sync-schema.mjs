// Copia las reglas de validación de shared/contact-schema.mjs dentro de public/index.html,
// para que el navegador y el servidor usen exactamente las mismas reglas.
// Uso: npm run sync-schema   (después de cambiar shared/contact-schema.mjs)
import { readFile, writeFile } from "node:fs/promises";

const htmlPath = new URL("../public/index.html", import.meta.url);
const schemaPath = new URL("../shared/contact-schema.mjs", import.meta.url);

const html = await readFile(htmlPath, "utf8");
const schema = (await readFile(schemaPath, "utf8"))
  .replaceAll("export const", "const")
  .replaceAll("export function", "function");

const re = /(\/\/ <contact-schema>[^\n]*\n)[\s\S]*?(  \/\/ <\/contact-schema>)/;
if (!re.test(html)) {
  console.error("No encontré las marcas // <contact-schema> en public/index.html");
  process.exit(1);
}
const out = html.replace(re, (_, start, end) => start + schema + end);
if (out === html) {
  console.log("Sin cambios: el esquema ya estaba sincronizado.");
} else {
  await writeFile(htmlPath, out);
  console.log("Listo: public/index.html actualizado con shared/contact-schema.mjs");
}
