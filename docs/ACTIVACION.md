# Guía de activación: publicar en Netlify y activar el formulario

Este paquete publica el brochure en Netlify con un formulario que envía cada solicitud por correo (Resend) a **grqualityrefresh@gmail.com**.

## Qué hay en la carpeta

| Carpeta / archivo | Para qué sirve |
|---|---|
| `public/` | La página del brochure y sus imágenes. |
| `netlify/functions/contact.mjs` | La función de servidor que recibe el formulario y envía el correo. La clave de Resend vive solo aquí, nunca en la página. |
| `shared/contact-schema.mjs` | Las reglas de validación. Las usan la página y el servidor, así nunca se separan. |
| `shared/email.mjs` | El diseño del correo que llega (HTML con la marca y versión en texto). |
| `netlify.toml` | Le dice a Netlify dónde está la página y la función. |
| `.env.example` | Lista de variables necesarias. |

## Activación paso a paso (Windows)

### 1. Crear la cuenta de Resend

1. Entra a **resend.com** y crea la cuenta **con grqualityrefresh@gmail.com**. Tiene que ser ese correo: sin dominio propio, Resend solo entrega al correo con el que se creó la cuenta.
2. Confirma la cuenta desde ese buzón.
3. Ve a **API Keys → Create API Key**, ponle un nombre (por ejemplo, `brochure`) y copia la clave que empieza por `re_`. Guárdala; solo se muestra una vez.

### 2. Preparar el computador

1. Instala **Node.js LTS** desde nodejs.org (siguiente, siguiente, finalizar).
2. Descomprime este zip en una carpeta, por ejemplo `Documentos\gr-brochure`.
3. Abre esa carpeta, haz clic en la barra de direcciones, escribe `powershell` y presiona Enter.

### 3. Publicar en Netlify

Copia y pega cada línea en PowerShell, una por una:

```
npx.cmd netlify-cli login
```

Se abre el navegador para entrar a Netlify (puedes crear la cuenta ahí mismo con Google). Luego:

```
npx.cmd netlify-cli deploy --prod
```

La primera vez pregunta qué hacer: elige **Create & configure a new project**, tu equipo y como nombre `grqualityrefresh`. Al final muestra la dirección, algo como `https://grqualityrefresh.netlify.app`.

### 4. Guardar la clave de Resend en Netlify

Cambia `re_TU_CLAVE` por tu clave real:

```
npx.cmd netlify-cli env:set RESEND_API_KEY re_TU_CLAVE
npx.cmd netlify-cli env:set CONTACT_TO_EMAIL grqualityrefresh@gmail.com
npx.cmd netlify-cli deploy --prod
```

El último comando vuelve a publicar para que la función tome las variables.

### 5. Probar

Abre tu dirección de Netlify, llena el formulario con tus datos y envíalo. Debe llegar a grqualityrefresh@gmail.com en menos de un minuto. Si no aparece en la bandeja de entrada, revisa **Spam** y marca el correo como "No es spam".

## Si algo falla

La causa real **no** aparece en la página ni en la consola del navegador (F12), donde solo se ve un error 502. Aparece en Netlify: **tu proyecto → Logs → Functions → contact**. Envía una solicitud y mira las últimas líneas.

| Lo que dice el log | Causa | Solución |
|---|---|---|
| `HTTP 403 ... only send testing emails to your own email address (X)` | La cuenta de Resend se creó con otro correo | `CONTACT_TO_EMAIL` debe ser exactamente X, o verifica un dominio en resend.com/domains |
| `HTTP 401` | Clave inválida o mal copiada | Vuelve a ejecutar `env:set RESEND_API_KEY ...` y `deploy --prod` |
| `HTTP 403/422` sobre `from` | `CONTACT_FROM_EMAIL` no es de un dominio verificado | Déjalo vacío o verifica el dominio |
| `Falta la variable de entorno ...` | No se guardó una variable | Repite el paso 4 |

Las líneas rojas `Unchecked runtime.lastError` en la consola del navegador vienen de extensiones (por ejemplo, AdBlock) y se pueden ignorar.

## Cuando tengan dominio propio

1. En Resend, **Domains → Add Domain** con el dominio (por ejemplo, `grqualityrefresh.com`). Quien administre el dominio debe agregar los registros DNS que muestra Resend.
2. Cuando aparezca como verificado:
   ```
   npx.cmd netlify-cli env:set CONTACT_FROM_EMAIL "GR Quality Refresh <web@grqualityrefresh.com>"
   npx.cmd netlify-cli deploy --prod
   ```
3. Con el dominio verificado ya puedes enviar a cualquier correo, no solo al de la cuenta.

## Reglas de protección incluidas

- Máximo **3 solicitudes al día por persona** (se cuenta por correo y por teléfono, con la fecha de Bogotá). La cuarta recibe: *"Ya recibimos 3 solicitudes tuyas hoy. Nuestro equipo te contactará pronto; si es urgente, escríbenos por WhatsApp."*
- Máximo 10 envíos al día y 10 intentos cada 10 minutos por conexión (IP).
- Campo oculto antispam: si un robot lo llena, se le responde "ok" y no se envía nada.
- Solo se aceptan datos JSON de hasta 10 KB, y todo lo que escribe el usuario se limpia y se escapa antes de ponerlo en el correo.
- El botón "Responder" del correo le escribe directamente a quien llenó el formulario.

## Datos técnicos para quien mantenga el sitio (handoff)

- **Contadores en memoria.** Los límites diarios y de ráfaga viven en la memoria de la función. Netlify puede reiniciarla o abrir varias copias, y entonces los contadores empiezan de cero. Para un brochure es suficiente; si el tráfico crece, moverlos a Netlify Blobs, Redis o KV.
- **Solo cuentan los envíos exitosos** (`registerDaily` se llama después de que Resend acepta el correo).
- **Variables de entorno:** `RESEND_API_KEY` y `CONTACT_TO_EMAIL` son obligatorias; `CONTACT_FROM_EMAIL` es opcional (por defecto `onboarding@resend.dev`). Nunca se guardan en archivos del repositorio: `.env` y `.env.local` están en `.gitignore`.
- **Validación compartida.** `shared/contact-schema.mjs` es la fuente única. La copia dentro de `public/index.html` (entre `// <contact-schema>` y `// </contact-schema>`) se genera desde ese archivo al empaquetar; si cambias las reglas, ejecuta `npm run sync-schema` para actualizar la copia.
- **Envío desacoplado.** En la página, todo el envío pasa por `submitContactForm()`. Para cambiar el destino (por ejemplo, un CRM) solo se toca esa función.
- **Si no hay servidor** (por ejemplo, el brochure abierto dentro de Claude), el formulario muestra el error y un botón para enviar la misma solicitud por WhatsApp, sin borrar lo escrito.
