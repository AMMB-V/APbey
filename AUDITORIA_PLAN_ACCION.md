# Auditoría técnica y plan de acción — APbey Arena

Fecha de revisión: 2026-10-26  
Rama revisada: `ammb-v-audit-documentation-plan`  
Alcance: frontend, backend, motor de torneos, persistencia, Supabase, despliegue, seguridad, HCI, navegación, CI y cobertura del plan integrado adjunto.

## Conclusión ejecutiva

El plan adjunto **no está aplicado en su totalidad**, ni en frontend ni en backend. Hay una base funcional sólida para brackets, grupos, arbitraje, participantes, configuración y visualización, pero los controles necesarios para producción multiusuario todavía no están completos.

La mayor parte de la brecha no es visual: los roles del frontend no constituyen autorización, las rutas mutantes de Express no validan sesión ni permisos, la persistencia JSON no es adecuada para serverless, y la configuración de Vercel no publica el backend Express. También faltan automatizaciones y superficies completas del plan: Double Elimination real, reabrir combate, check-in automático con expiración, auto-drop/re-siembra, API de overlays, SSE/webhooks y pruebas automatizadas.

## Respuestas a los documentos iniciales

### `CLAUDE.md`

El archivo define una arquitectura objetivo de **Next.js 15 + App Router + Server Actions + Zod + Supabase Auth + Vitest/Playwright**. Esa arquitectura no coincide con el código que existe en esta rama:

| Decisión inicial | Estado real | Respuesta |
|---|---|---|
| Next.js App Router | No aplicado; existe Vite/React y `server.ts` | Es una migración arquitectónica pendiente, no una funcionalidad ausente que deba mezclarse gradualmente sin diseño. |
| Server Actions para mutaciones | No aplicado; se usan contexto, Supabase client y Express | Las mutaciones críticas deben salir del cliente confiable antes de cualquier migración visual. |
| Zod para cada entrada | No aplicado | Es requisito P0/P1 para contratos API y formularios. |
| Supabase Auth como única identidad | No aplicado; hay sesión/roles locales | Debe ser la autoridad única; eliminar la confianza en `localStorage`. |
| RLS en todas las tablas | Parcial | Hay RLS y funciones, pero faltan políticas y existe duplicidad de auditoría. |
| Motor puro sin I/O | Mayormente aplicado | `src/lib/engine` está separado; faltan cobertura y algunos formatos/reglas completas. |
| Vitest y Playwright | No aplicado | CI declara `test`, pero `package.json` no define script ni se encontraron suites. |
| Vistas públicas, admin, organizer y referee por rutas | Parcial | Existen vistas/tabbs, pero no rutas URL ni deep linking. |

**Respuesta de diseño:** no se debe afirmar que el proyecto sigue `CLAUDE.md` como guía de implementación vigente. Debe conservarse como especificación objetivo y decidir formalmente entre (a) estabilizar React/Vite/Express y adaptarlo a esos contratos, o (b) migrar a Next.js como iniciativa separada. La opción (a) es la de menor riesgo para cerrar el MVP actual.

### PDF de requisitos y esquema

El PDF define el alcance funcional (RF-01 a RF-29), requisitos no funcionales (RNF-01 a RNF-12) y el modelo SQL. El código cubre el núcleo de RF-01 a RF-04, RF-08 a RF-11, RF-13, parte de RF-14 a RF-22, RF-27 y RF-29. No cubre completamente RF-05 a RF-07, RF-12, RF-18, RF-23 a RF-26 y RF-28.

Los puntos del PDF que cambian la prioridad de implementación son:

1. **RNF-07/RNF-08:** la autenticación debe ser Supabase Auth y la plataforma no debe depender de estado en memoria/JSON para datos relacionales. Esto convierte la persistencia híbrida actual en bloqueo de producción.
2. **RNF-03/RNF-10:** el control de versión y el avance del bracket deben vivir en operaciones transaccionales. El `record_battle` SQL existe, pero el flujo frontend todavía muta estado local y sincroniza de forma parcial.
3. **RNF-09:** la validación debe ser uniforme y basada en esquema; actualmente no hay Zod ni contrato de error común.
4. **RNF-11/RNF-12:** Realtime requiere reconexión, idempotencia, observabilidad y regresiones; hoy la suscripción no está integrada de extremo a extremo.
5. **RF-23/RF-24/RF-25/RF-26:** la consola visual cubre parte del arbitraje, pero faltan 3on3 decisivo, reapertura autorizada, bitácora remota y Bey Check completo.
6. **Fuera del MVP:** el PDF deja decks/catálogo, pantalla de estadio, ranking, pagos y streaming para versiones posteriores. El plan integrado posterior los incluyó como brechas; deben mantenerse fuera del P0 salvo que cambie el alcance del producto.

## Conflictos entre las fuentes y decisión recomendada

Las fuentes no son totalmente equivalentes y no deben combinarse sin una decisión de alcance:

| Tema | PDF de requisitos | `CLAUDE.md` | Implementación | Decisión recomendada |
|---|---|---|---|---|
| Stack | Next.js + Supabase | Next.js 15 + Server Actions | Vite + Express + React | Mantener el stack actual para estabilizar el MVP o planificar una migración separada; no mezclar ambos runtimes. |
| `match_type` | MVP: `1on1` y `3on3` | También `deck` y `5G` | SQL principal: `1on1` y `3on3` | Mantener `1on1`/`3on3` en el MVP y versionar `deck`/`5G` como ampliación. |
| Decks y catálogo | Fuera del MVP | Reglas descritas como producto | Implementación parcial de tipos/UI | No elevar a P0 sin cambio explícito de alcance. |
| Stadium/streaming | Fuera del MVP | Vista pública/Reatime, pero no necesariamente proyector | Stadium parcial | Priorizar vista pública y Realtime del MVP; dejar streaming/overlay para fase posterior. |
| `best_of` | 3 por defecto en eliminación, 1 en grupos/suizo | Best-of-N configurable | `stages.best_of` SQL tiene default 1 | Corregir el valor por etapa al generar configuración y validar que el default de eliminación sea 3. |
| Empates | Round robin admite empate y puntaje 3/1 | No contradice | Tipos y motores no cubren todos los casos | Añadir modelo explícito de empate sólo en formatos que lo permitan; no inferirlo desde `winner_id`. |

La respuesta funcional es conservar el alcance del PDF como contrato del MVP, usar `CLAUDE.md` como arquitectura objetivo y registrar cualquier ampliación como decisión de producto independiente.

### Cambios aplicados en esta revisión

- `index.html` ahora declara `lang="es"`, alineado con RNF-06.
- `README.md` documenta la diferencia entre arquitectura objetivo y arquitectura existente, y evita presentar `npm ci` como reproducible mientras sólo existe `bun.lock`.
- Esta auditoría incorpora la matriz de respuesta a `CLAUDE.md`, el PDF y el plan integrado.
- El login de interfaz usa Supabase Auth y reconstruye el rol desde `profiles`; ya no acepta una contraseña arbitraria ni un rol proveniente de `localStorage`.
- El cliente ya no permite cambiar roles mediante `switchRole`.
- Las mutaciones Express tienen límite de body, headers básicos, validación de payload, escritura atómica de JSON y middleware de Supabase Auth/RBAC cuando el backend está configurado.
- Las llamadas cliente al backend adjuntan el access token disponible.
- Se generó `package-lock.json`, se añadió `npm run test` con Vitest y se incorporaron dos regresiones del generador Single Elimination.
- Se añadió `supabase/migrations/20261026_security_rls_completion.sql` para completar políticas RLS de tablas relacionales y fijar `audit_log` como tabla canónica de nuevas escrituras.

Estos cambios son deliberadamente acotados: no se implementó una migración incompleta a Next.js ni autenticación ficticia para aparentar cumplimiento.

## Matriz de cobertura del plan

| Área | Estado | Evidencia | Acción requerida |
|---|---|---|---|
| Single Elimination | Completo | `src/lib/engine/formats/singleElimination.ts` | Añadir pruebas de byes y avance. |
| Double Elimination, losers y Gran Final | Parcial | `src/lib/engine/formats/doubleElimination.ts` | Modelar cruces reales, propagación de perdedores y reset elegible. |
| Round Robin | Completo | `src/lib/engine/formats/roundRobin.ts` | Cubrir rosters impares y byes. |
| Swiss y Buchholz | Parcial/no completo | `src/lib/engine/formats/swiss.ts`, `src/lib/engine/tiebreakers.ts` | Implementar emparejamiento robusto, revancha y Buchholz con mini-ligas estáticas. |
| Siembra | Completo/parcial | `src/lib/engine/seeding.ts`, `TournamentContext.tsx` | Bloquear cambios al iniciar y probar balance. |
| BeyScore y puntuación configurable | Completo en UI | `RefereeConsole.tsx`, `TournamentContext.tsx`, `supabase/schema.sql` | Trasladar mutaciones a operaciones autorizadas y validar límites en servidor. |
| Penalizaciones y Best-of-N | Parcial | `RefereeConsole.tsx`, `supabase/schema.sql` | Persistir remotamente, cerrar sets correctamente y validar árbitro asignado. |
| Undo y reabrir combate | Parcial/no aplicado | `TournamentContext.tsx`; acción `reopen` sólo tipada | Crear endpoint, permisos, recomputación, auditoría y control de concurrencia. |
| Mesas, convocatoria y Stadium Display | Parcial | `TournamentContext.tsx`, `App.tsx`, `StadiumDisplay.tsx` | Persistir estación, emitir eventos desde backend y mostrar desconexión. |
| Realtime | Parcial | `src/lib/supabase/supabaseService.ts` | Integrar suscripciones en el contexto, filtrar por torneo y limpiar canales. |
| Check-in manual | Completo | `TournamentContext.tsx`, `ParticipantManager.tsx` | Mantener cobertura. |
| Check-in móvil, temporizador, auto-drop y re-siembra | No aplicado | No existe flujo/scheduler operativo | Implementar ventana temporal, job transaccional y regeneración segura. |
| Decks 3on3 y Bey Check | Parcial | `types/tournament.ts`, vistas de participantes/bracket | Crear entidad, persistencia, validación de tres combos e historial de inspección. |
| Walk-ins | Parcial | `TournamentContext.tsx`, `mockData.ts` | Persistir invitados y asociar identidad segura. |
| Bracket, zoom, pan y gestos | Parcial/no aplicado | `BracketViewer.tsx` | Añadir pointer events, arrastre, pinch/zoom y layout escalable. |
| Overlays, API pública y streaming | No aplicado | `server.ts` no expone esas rutas | Crear API versionada de sólo lectura y SSE/webhooks firmados. |
| RBAC frontend | Parcial | `Header.tsx`, `App.tsx` | Mantenerlo como UX, no como control de seguridad. |
| RBAC backend | No aplicado | `server.ts` no usa middleware de sesión/roles | Integrar Supabase Auth/JWT y autorización por torneo/match. |
| RLS | Parcial | `supabase/schema.sql` | Completar políticas para participantes, etapas, grupos, batallas, faltas, asignaciones y auditoría. |
| Auditoría | Parcial | `audit_log`/`audit_logs`, contexto y servicios Supabase | Unificar tabla, actor autenticado y persistencia remota obligatoria. |
| CI y pruebas | Parcial | `.github/workflows/ci.yml`, `package.json` | Añadir script `test`, suite del motor, API, RLS, integración, E2E y accesibilidad. |
| Migración de memoria a SQL | Parcial | `TournamentContext.tsx`, `supabaseService.ts` | Convertir Supabase en fuente de verdad y controlar conflictos/versiones. |

## Hallazgos críticos

### P0 — Seguridad y autorización

1. `src/context/TournamentContext.tsx` permite que la sesión y el rol dependan de estado cliente/localStorage. Un usuario puede manipularlos desde DevTools.
2. Las rutas mutantes de `server.ts` para etapas, invitaciones y asignaciones no exigen autenticación ni rol.
3. El reclamo de invitaciones usa leer-modificar-escribir sobre JSON y puede aceptar dos reclamaciones concurrentes.
4. La autorización del frontend sólo oculta vistas; no protege recursos.

**Avance de esta iteración:** el login ya valida contraseña mediante Supabase Auth, la restauración de sesión obtiene el rol desde `profiles`, `switchRole` dejó de modificar privilegios y las mutaciones Express aceptan sólo Bearer tokens con roles permitidos cuando Supabase está configurado. Esto reduce el riesgo de escalamiento desde el cliente, pero no cierra todavía la migración completa a persistencia cloud ni el flujo seguro de invitaciones.

**Decisión requerida para la siguiente fase:** Supabase Auth + RLS como autoridad, o un servicio backend con JWT. No mantener roles confiables en localStorage.

### P0 — Despliegue y persistencia

1. `vercel.json` reescribe todas las rutas a `index.html`; no despliega `server.ts`.
2. `data/*.json` no ofrece persistencia compartida ni fiable en serverless.
3. La aplicación puede mostrar éxito local mientras una sincronización remota falla parcialmente.

### P1 — Modelo de datos y consistencia

- `audit_log` y `audit_logs` representan dos contratos distintos.
- El frontend usa IDs legibles/locales mientras varias columnas SQL esperan UUID.
- Hay RLS habilitado sin políticas completas.
- El estado monolítico de `TournamentContext.tsx` mezcla autenticación, dominio, UI y persistencia.

### P1 — Calidad y accesibilidad

- CI ejecuta `npm run test`, pero `package.json` no define `test`.
- No se localizaron pruebas `test`/`spec`.
- `tsconfig.json` no activa `strict` y permite JS.
- `index.html` declara idioma inglés pese a una interfaz española.
- El modal de autenticación y varios controles de icono carecen de semántica ARIA/foco completo.
- La navegación no tiene rutas URL ni deep linking.

## Plan de acción priorizado

### Fase 0 — Bloqueo de producción

1. Definir proveedor de identidad y eliminar roles confiables del cliente.
2. Proteger todas las mutaciones con autenticación, autorización y validación de payload.
3. Mover invitaciones, puntuación, penalizaciones y auditoría a operaciones transaccionales.
4. Elegir despliegue: backend separado o funciones serverless; retirar JSON mutable del camino productivo.
5. Unificar `audit_log`/`audit_logs` y completar RLS.
6. Crear pruebas mínimas del motor, API y autorización antes de nuevas funciones.

### Fase 1 — Corrección funcional

1. Completar Double Elimination, losers, Gran Final y bracket reset.
2. Implementar Buchholz, desempates transitivos y validación centralizada del dominio.
3. Implementar reabrir combate, undo remoto, Best-of-N y concurrencia por versión.
4. Implementar check-in móvil, temporizador, auto-drop y re-siembra transaccional.
5. Persistir decks 3on3, Bey Check, walk-ins, estaciones y convocatorias.
6. Integrar realtime con estado de conexión, cleanup y resolución de conflictos.

### Fase 2 — UX, navegación y rendimiento

1. Añadir rutas URL, historial, deep links y guards de UX.
2. Hacer accesibles modal, tabs, botones de icono, tarjetas y estados.
3. Añadir pan/zoom táctil y layout de bracket escalable.
4. Reducir serialización completa de `localStorage`, paginar consultas y virtualizar listas.
5. Medir con Lighthouse, axe y React Profiler.

### Fase 3 — Operación y mantenimiento

1. Elegir npm o Bun y fijar la estrategia en CI.
2. Añadir `npm run test`, cobertura, E2E, pruebas RLS y auditoría de dependencias.
3. Activar `strict` progresivamente y eliminar dependencias no usadas.
4. Añadir logging estructurado, request IDs, alertas y documentación de despliegue.
5. Publicar API de overlays/streaming sólo después de cerrar autenticación y límites.

## Validación realizada

Se revisó la estructura, configuración, código fuente, esquema SQL, CI y estado Git. El árbol de trabajo estaba limpio antes de generar esta documentación.

La validación de esta iteración sí pasó:

- `npm.cmd run lint`
- `npm.cmd run test` — 1 archivo, 2 pruebas.
- `npm.cmd run build` — bundle generado; Vite mantiene un aviso de chunk principal superior a 500 kB.

Para repetir la validación desde un checkout limpio:

```powershell
npm ci
npm run lint
npm run build
npm run test
```

## Higiene de caché y artefactos

No se borraron datos funcionales, migraciones ni assets existentes. Se ampliaron las exclusiones de Git para impedir que cachés locales y artefactos de compilación entren al repositorio. Antes de una limpieza manual debe conservarse `data/` y cualquier asset utilizado por la aplicación; `dist/`, `node_modules/` y cachés pueden regenerarse.
