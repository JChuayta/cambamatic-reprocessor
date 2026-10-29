# Cambamatic Reprocessor (`bsol-firmador`)

Herramienta interna de diagnóstico y soporte para el flujo de **firma electrónica de créditos**. Permite a un operador:

1. Buscar en **Dynatrace** los logs de solicitudes de firma enviadas (`"signature sended"`) a partir de uno o varios GUID.
2. Cargar el JSON de cada solicitud encontrada y verlo como una tarjeta (documentos, firmantes, posiciones).
3. **Reenviar la solicitud de firma** al servicio de negocio (`/api/sign`).
4. **Registrar al dueño del documento** (titular / codeudor) cuando falta.
5. **Reprocesar** un documento por firmante y seguir el resultado en una página de detalle.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4.

## Requisitos

- Node.js 20+
- Acceso de red al API de negocio (usa certificado autofirmado) y al tenant de Dynatrace del ambiente.

## Configuración

Copiar `.env.example` a `.env.local` y completar. La lectura de variables está centralizada en `app/lib/env.server.ts` (secretos, solo servidor) y `app/lib/env.public.ts` (`NEXT_PUBLIC_*`).

| Variable | Alcance | Descripción |
|---|---|---|
| `BUSINESS_API_BASE_URL` | servidor | URL base del API de firma/negocio. No usar prefijo `NEXT_PUBLIC_`. |
| `DYNATRACE_URL` | servidor | URL del tenant de la plataforma, p. ej. `https://<tenant>.apps.dynatrace.com` (no el endpoint OTLP). |
| `DYNATRACE_TOKEN` | servidor | Platform token (`dt0s16...`) con scopes `storage:logs:read` y `storage:buckets:read`. Nunca con `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_DYNATRACE_URL` | cliente | Enlace opcional a Dynatrace mostrado en la UI. |

> `.env*` está en `.gitignore`, pero el commit `6edc0fb` agregó `.env` al repositorio. Si contiene valores reales, conviene sacarlo del tracking (`git rm --cached .env`) y rotar lo que corresponda.

## Uso

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm start
npm run lint
```

## Flujo de uso

1. **`/`** (re-exporta `/signing-request`): pegar las líneas de log con GUIDs (opcionalmente `índice<TAB>guid`, una por línea). La búsqueda la hace el servidor contra Dynatrace con `DYNATRACE_TOKEN`; el navegador solo envía los GUIDs.
2. La app consulta los últimos 24 h, extrae el JSON del mensaje y agrega cada solicitud como tarjeta. Las solicitudes se persisten en `localStorage`.
3. En cada tarjeta: **Firmar** (reenvía la solicitud) o **Registrar dueño** (Titular=2 / Codeudor=3).
4. En la tabla de documentos, el botón por firmante dispara el reproceso y redirige a **`/reprocess/[id]`**, donde se ve el estado, la respuesta del API y se puede marcar manualmente el resultado (exitoso/fallido). Los jobs se guardan en `localStorage` (`reprocess_jobs`).

## Arquitectura

```
app/
  page.tsx                      -> re-exporta signing-request/page
  signing-request/page.tsx      -> búsqueda de logs + listado de solicitudes
  reprocess/[id]/page.tsx       -> detalle de un job de reproceso
  components/                   -> request-card, documents-table, auth-provider, user-badge, ...
  context/signing-requests.tsx  -> estado de solicitudes (persistido en localStorage)
  lib/
    constants.ts                -> nombres de documentos, etiquetas de firmantes
    env.server.ts / env.public.ts -> lectura centralizada de variables de entorno (servidor / cliente)
    https-proxy.ts              -> POST https con rejectUnauthorized:false (cert autofirmado)
    logs-query.ts               -> extracción de GUIDs, query DQL para Dynatrace, extracción del JSON
    reprocess-jobs.ts           -> CRUD de jobs en localStorage
  api/                          -> proxies server-side hacia el backend
```

### Rutas API (proxies)

| Ruta local | Destino |
|---|---|
| `POST /api/sign` | `{BUSINESS_API_BASE_URL}/test/loan/sign` (desenvuelve `Input` si viene) |
| `POST /api/document-owner/register` | `{BASE}/Bsol/BusinessApiSignature/v1/documentOwner/register` |
| `POST /api/reprocess/[documentId]` | `{BASE}/Bsol/BusinessApiSignature/v1/Reprocess/Documents/{documentId}/execute` |
| `POST /api/logs/query` | `{DYNATRACE_URL}/platform/storage/query/v1/query:execute` (recibe `{ guids }`, arma el DQL en el servidor y usa `DYNATRACE_TOKEN`) |

## Notas y limitaciones conocidas

- **No hay login.** La app y las rutas `/api/*` no tienen autenticación; confían en que se despliega en una red interna controlada. Quien llegue a la app puede reenviar firmas y reprocesar documentos, y consultar logs con `DYNATRACE_TOKEN`.
- `https-proxy.ts` desactiva la verificación TLS para el backend (certificado autofirmado).
- No hay tests automatizados.
