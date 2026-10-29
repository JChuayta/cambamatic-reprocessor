# CLAUDE.md

App interna Next.js 16 (App Router) + React 19 + Tailwind 4 para reenviar/reprocesar solicitudes de firma de créditos. Ver `README.md` para el detalle de flujo, variables de entorno y rutas.

## Comandos

- `npm run dev` · `npm run build` · `npm run lint` (no hay tests)

## Convenciones

- UI y mensajes de error en **español**.
- Las rutas `app/api/*` son proxies delgados hacia el backend; el backend usa cert autofirmado, por eso todo POST pasa por `app/lib/https-proxy.ts`. Reutilizarlo, no usar `fetch` directo (excepto Dynatrace en `/api/logs/query`).
- Variables de entorno centralizadas: `app/lib/env.server.ts` (secretos, solo rutas `app/api/*`) y `app/lib/env.public.ts` (`NEXT_PUBLIC_*`). No leer `process.env` en otros archivos. Plantilla en `.env.example`.
- Los logs se consultan en Dynatrace (Grail, DQL) con `DYNATRACE_TOKEN` en el servidor; el navegador solo envía GUIDs.
- Estado del cliente en `localStorage` (`signing requests`, `reprocess_jobs`).
- Next 16: `RouteContext<"/api/...">` para tipar `ctx.params` (es una Promise).
- No commitear valores reales de `.env`.
