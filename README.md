# APbey Arena

Plataforma web para organizar y operar torneos de Beyblade X. La aplicación combina una interfaz React/TypeScript, un motor local de generación y avance de torneos, un backend Express para operaciones auxiliares y una integración opcional con Supabase.

## Estado actual

La aplicación cuenta con vistas funcionales para:

- listado y selección de torneos;
- brackets y etapas de grupos;
- consola de árbitro;
- participantes, check-in y siembra;
- administración y asignación de árbitros;
- visualización pública tipo estadio;
- autenticación de interfaz mediante roles;
- configuración de puntuación, desempates y persistencia opcional en Supabase.

**Importante:** la implementación actual no debe considerarse lista para producción multiusuario. Supabase Auth y RLS son la autoridad prevista; persisten archivos JSON auxiliares, autorización incompleta por torneo y un despliegue Vercel estático que no publica el backend Express.

El login y el canje de invitaciones usan Supabase Auth cuando está configurado; el backend valida access tokens para sus mutaciones protegidas. La persistencia JSON y la autorización completa por torneo siguen en transición; consultar `AUDITORIA_PLAN_ACCION.md` antes de desplegar.

## Relación con los documentos de diseño iniciales

Los documentos iniciales (`CLAUDE.md` y `Plataforma de Torneos Beyblade Requisitos y Esquema de Base de Datos.pdf`) describen una arquitectura objetivo basada en Next.js App Router, Server Actions, Zod, Vitest/Playwright y Supabase Auth/RLS como única autoridad. El repositorio actual implementa otra etapa tecnológica: React + Vite + Express, tabs internas y persistencia híbrida.

Por tanto, el documento inicial se trata como **contrato de producto y seguridad**, no como evidencia de que esas tecnologías ya estén presentes. La diferencia arquitectónica está documentada en `AUDITORIA_PLAN_ACCION.md`; no se recomienda migrar a Next.js de forma aislada antes de cerrar autenticación, persistencia y pruebas.

## Arquitectura

```text
React 19 + TypeScript + Vite
├── src/App.tsx                         Composición de vistas y navegación por tabs
├── src/context/TournamentContext.tsx   Estado global y mutaciones del torneo
├── src/components/                     Vistas de bracket, árbitro, admin y estadio
├── src/lib/engine/                     Formatos, siembra, avance y desempates
├── src/lib/storage/                    Persistencia local y datos de demostración
├── src/lib/supabase/                   Cliente, sincronización y asignaciones
└── supabase/                           Esquema, RLS y funciones transaccionales

Express + tsx
└── server.ts                            API auxiliar y persistencia temporal JSON
```

La persistencia actual es híbrida:

1. `localStorage` para el estado de sesión y torneo en el navegador.
2. Archivos JSON en `data/` para configuraciones auxiliares del backend.
3. Supabase para el esquema cloud y sincronización opcional.

La auditoría técnica recomienda elegir una única fuente de verdad antes de habilitar operaciones críticas en producción.

## Requisitos

- Node.js compatible con TypeScript/Vite del proyecto.
- npm o Bun; el repositorio contiene `bun.lock`, por lo que debe definirse una estrategia única para CI y despliegue.
- Variables de entorno de Supabase sólo si se necesita persistencia remota.

## Instalación y ejecución

```powershell
npm install
npm run dev
```

La aplicación se sirve normalmente en `http://localhost:3000`. El endpoint de salud local es:

```text
GET /api/health
```

Variables disponibles en `.env.example`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ALLOWED_ORIGINS`
- `SUPABASE_SERVICE_ROLE_KEY` (sólo backend/mantenimiento; nunca exponerla al navegador)
- `GEMINI_API_KEY` (opcional)

## Comandos

```powershell
npm run dev       # Vite + Express mediante server.ts
npm run build     # Compilación de producción con Vite
npm run lint      # TypeScript sin emitir archivos
npm run preview   # Previsualización del bundle
```

El repositorio contiene `bun.lock`, mientras que los scripts y CI usan npm. Debe elegirse un gestor único y generar su lockfile reproducible antes de usar `npm ci` en CI. El pipeline referencia `npm run test`, pero actualmente no existe ese script ni una suite de pruebas registrada. Esta discrepancia es un bloqueo de calidad documentado en `AUDITORIA_PLAN_ACCION.md`.

## Navegación y vistas

La navegación actual usa tabs persistidas en `localStorage` y se compone en `src/App.tsx`. Las vistas principales son:

| Vista | Propósito |
|---|---|
| Torneos | Seleccionar y gestionar torneos |
| Bracket | Consultar etapas, rondas y resultados |
| Árbitro | Registrar batallas, faltas y cierres |
| Participantes | Gestionar roster, siembra y check-in |
| Admin | Configurar torneo, invitaciones y árbitros |
| Docs | Guía interna de ingeniería |
| Estadio | Visualización pública y convocatorias |

La siguiente evolución recomendada es migrar a rutas URL reales con guards visuales, deep links e historial del navegador. Los guards del frontend no sustituyen autorización de backend.

## Datos y Supabase

El esquema principal está en `supabase/schema.sql` y las migraciones en `supabase/migrations/`. Incluye torneos, etapas, grupos, matches, batallas, penalizaciones, perfiles, invitaciones, auditoría, RLS y la función transaccional `record_battle`.

Antes de producción deben resolverse:

- la duplicidad entre `audit_log` y `audit_logs`;
- políticas RLS faltantes para varias tablas;
- compatibilidad de IDs locales con UUID de Supabase;
- errores parciales que hoy pueden quedar sólo en consola;
- uso de archivos JSON como almacenamiento mutable del backend.

## Seguridad y operación

No usar la autenticación de interfaz actual como control de seguridad. Las operaciones de escritura deben pasar por Supabase Auth/RLS o por un backend con sesión, autorización por torneo y validación de payloads. También se requieren rate limiting, límites de body, headers de seguridad, logs estructurados y protección contra reclamaciones concurrentes de invitaciones.

No se deben commitear `node_modules`, `dist`, cachés de Vite/TypeScript, logs ni variables de entorno. Las exclusiones están centralizadas en `.gitignore`.

## Documentación del estado

- `AUDITORIA_PLAN_ACCION.md`: auditoría completa, cobertura del plan adjunto, riesgos y hoja de ruta priorizada.
- `supabase/schema.sql`: modelo de datos y políticas actuales.
- `.github/workflows/ci.yml`: validaciones declaradas por CI.
- `src/components/docs/SoftwareEngineeringGuide.tsx`: guía visible dentro de la aplicación.

## Criterio de aceptación para producción

Antes de publicar una versión multiusuario deben existir autenticación real, RBAC backend, persistencia transaccional, pruebas del motor y API, rutas de despliegue funcionales, políticas RLS completas, pruebas de accesibilidad y una estrategia explícita de migración desde `localStorage`.
