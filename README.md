# Cambamatic Reprocessor (`bsol-firmador`)

Herramienta interna de diagnóstico y soporte para el flujo de **firma electrónica de créditos**. Permite a un operador:

1. Buscar en **Azure Application Insights** los logs de solicitudes de firma enviadas (`"signature sended"`) a partir de uno o varios GUID.
2. Cargar el JSON de cada solicitud encontrada y verlo como una tarjeta (documentos, firmantes, posiciones).
3. **Reenviar la solicitud de firma** al servicio de negocio (`/api/sign`).
4. **Registrar al dueño del documento** (titular / codeudor) cuando falta.
5. **Reprocesar** un documento por firmante y seguir el resultado en una página de detalle.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · MSAL (Microsoft Entra ID).

## Requisitos

- Node.js 20+
- Acceso de red al API de negocio (usa certificado autofirmado) y a Application Insights.

## Configuración

Crear `.env.local` (o `.env`) con:

| Variable | Alcance | Descripción |
|---|---|---|
| `BUSINESS_API_BASE_URL` | servidor | URL base del API de firma/negocio. No usar prefijo `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | cliente | Client ID de la app registrada en Entra ID. |
| `NEXT_PUBLIC_AZURE_TENANT_ID` | cliente | Tenant ID de Entra ID. |
| `NEXT_PUBLIC_APPINSIGHTS_APP_ID` | cliente/servidor | App ID de Application Insights (usado por `/api/logs/query`). |
| `NEXT_PUBLIC_AZURE_LOGS_URL` | cliente | Enlace al portal de logs de Azure mostrado en la UI. |
| `NEXT_PUBLIC_AUTH_DISABLED` | cliente | `true` desactiva el login MSAL (solo desarrollo). |

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

1. **`/`** (re-exporta `/signing-request`): pegar las líneas de log con GUIDs (opcionalmente `índice<TAB>guid`, una por línea). Para consultar Application Insights se usa el login MSAL o, en modo manual, un Bearer token pegado (se guarda en `sessionStorage`, solo en esa pestaña).
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
    constants.ts                -> nombres de documentos, etiquetas de firmantes, BUSINESS_API_BASE_URL
    https-proxy.ts              -> POST https con rejectUnauthorized:false (cert autofirmado)
    logs-query.ts               -> extracción de GUIDs, query KQL, parseo de resultados
    msal-config.ts              -> configuración MSAL y scopes
    reprocess-jobs.ts           -> CRUD de jobs en localStorage
  api/                          -> proxies server-side hacia el backend
```

### Rutas API (proxies)

| Ruta local | Destino |
|---|---|
| `POST /api/sign` | `{BUSINESS_API_BASE_URL}/test/loan/sign` (desenvuelve `Input` si viene) |
| `POST /api/document-owner/register` | `{BASE}/Bsol/BusinessApiSignature/v1/documentOwner/register` |
| `POST /api/reprocess/[documentId]` | `{BASE}/Bsol/BusinessApiSignature/v1/Reprocess/Documents/{documentId}/execute` |
| `POST /api/logs/query` | `https://api.applicationinsights.io/v1/apps/{appId}/query` (reenvía el header `Authorization`) |

### Autenticación

MSAL con `sessionStorage` y scope `User.Read` para login; para logs se pide el scope `https://api.applicationinsights.io/.default`. Con `NEXT_PUBLIC_AUTH_DISABLED=true` se omite el login.

## Notas y limitaciones conocidas

- Las rutas `/api/*` **no tienen autenticación propia**; confían en que la app se despliega en una red interna.
- `https-proxy.ts` desactiva la verificación TLS para el backend (certificado autofirmado).
- No hay tests automatizados.
- El `<title>` de `layout.tsx` sigue siendo el de `create-next-app`.
