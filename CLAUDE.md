# CLAUDE.md

App interna Next.js 16 (App Router) + React 19 + Tailwind 4 para reenviar/reprocesar solicitudes de firma de créditos. Ver `README.md` para el detalle de flujo, variables de entorno y rutas.

## Comandos

- `npm run dev` · `npm run build` · `npm run lint` (no hay tests)

## Convenciones

- UI y mensajes de error en **español**.
- Las rutas `app/api/*` son proxies delgados hacia el backend; el backend usa cert autofirmado, por eso todo POST pasa por `app/lib/https-proxy.ts`. Reutilizarlo, no usar `fetch` directo (excepto Application Insights).
- `BUSINESS_API_BASE_URL` es solo servidor: nunca con prefijo `NEXT_PUBLIC_`.
- Estado del cliente en `localStorage` (`signing requests`, `reprocess_jobs`) y `sessionStorage` (token manual, caché MSAL).
- Next 16: `RouteContext<"/api/...">` para tipar `ctx.params` (es una Promise).
- No commitear valores reales de `.env`.
