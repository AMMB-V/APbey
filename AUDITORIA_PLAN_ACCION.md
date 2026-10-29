# Auditoría técnica y plan de acción — APbey Arena

Fecha de revisión: 2026-10-26  
Rama revisada: `ammb-v-audit-documentation-plan`  
Alcance: frontend, backend, motor de torneos, persistencia, Supabase, despliegue, seguridad, HCI, navegación, CI y cobertura del plan integrado adjunto.

## Conclusión ejecutiva

El plan adjunto **no está aplicado en su totalidad**, ni en frontend ni en backend. Hay una base funcional sólida para brackets, grupos, arbitraje, participantes, configuración y visualización, pero los controles necesarios para producción multiusuario todavía no están completos.

La mayor parte de la brecha no es visual: los roles del frontend no constituyen autorización por sí solos y la configuración de Vercel no publica el backend Express. Las rutas mutantes auxiliares que dependían de JSON fueron retiradas; las configuraciones y asignaciones ahora se escriben directamente en Supabase con RLS. También faltan automatizaciones y superficies completas del plan: Double Elimination real, reabrir combate, check-in automático con expiración, auto-drop/re-siembra, API de overlays, SSE/webhooks y pruebas automatizadas.

## Respuestas a los documentos iniciales

### `CLAUDE.md`

El archivo define una arquitectura objetivo de **Next.js 15 + App Router + Server Actions + Zod + Supabase Auth + Vitest/Playwright**. Esa arquitectura no coincide con el código que existe en esta rama:

| Decisión inicial | Estado real | Respuesta |
|---|---|---|
| Next.js App Router | No aplicado; existe Vite/React y `server.ts` | Es una migración arquitectónica pendiente, no una funcionalidad ausente que deba mezclarse gradualmente sin diseño. |
| Server Actions para mutaciones | No aplicado; se usan contexto, Supabase client y Express | Las mutaciones críticas deben salir del cliente confiable antes de cualquier migración visual. |
| Zod para cada entrada | No aplicado | Es requisito P0/P1 para contratos API y formularios. |
| Supabase Auth como única identidad | Parcial avanzado; flujo activo usa Supabase Auth y perfil cloud | Completar eliminación de confianza en estado local y probar confirmación de correo. |
| RLS en todas las tablas | Parcial | Hay RLS y funciones, pero faltan políticas y existe duplicidad de auditoría. |
| Motor puro sin I/O | Mayormente aplicado | `src/lib/engine` está separado; faltan cobertura y algunos formatos/reglas completas. |
| Vitest y Playwright | No aplicado | CI declara `test`, pero `package.json` no define script ni se encontraron suites. |
| Vistas públicas, admin, organizer y referee por rutas | Parcial avanzado | Existen vistas/tabs y ahora se conservan `view`, `tournament` y `stage` en la URL; aún faltan guards de autorización y rutas separadas por rol. |

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
- El backend Express conserva límites de body y headers básicos, pero ya no persiste JSON ni ofrece una ruta alternativa de mutaciones; las configuraciones críticas se guardan directamente mediante Supabase Auth/RLS.
- Las llamadas cliente al backend adjuntan el access token disponible.
- Se generó `package-lock.json`, se añadió `npm run test` con Vitest y se incorporaron dos regresiones del generador Single Elimination.
- Se añadió `supabase/migrations/20261026_security_rls_completion.sql` para completar políticas RLS de tablas relacionales y fijar `audit_log` como tabla canónica de nuevas escrituras.
- Se eliminó el bloque duplicado `audit_logs` de los esquemas mantenidos en el repositorio; las nuevas migraciones usan `audit_log`.
- El canje de invitaciones dejó de crear perfiles locales: ahora crea la cuenta con Supabase Auth y ejecuta el RPC transaccional `claim_invitation`, que bloquea el código, valida correo y asigna el rol desde la base de datos.
- Las invitaciones ya se persisten en `public.invitations` cuando existe una sesión admin con Supabase configurado; el modo local sólo queda como fallback de demostración. La invitación por correo aún no es transaccional: el panel genera código/enlace y prepara un `mailto:`; falta configurar SMTP o una función backend para enviar y registrar la entrega.
- Se añadió la Edge Function `send-invitation` para Resend y la migración de estado de entrega. Queda pendiente desplegar la función, configurar el dominio/remitente y validar una entrega real; `sent` sólo significa aceptación por Resend.
- El auditor de Supabase detectó RLS sin políticas en siete tablas, funciones `SECURITY DEFINER` expuestas y claves foráneas sin índices. Se añadieron `supabase/migrations/20261026_security_hardening.sql` y `supabase/migrations/20261029_restrict_internal_rpc.sql`; las helpers internas ya no son ejecutables por `anon` ni `authenticated`. Los advisors posteriores sólo mantienen advertencias intencionales para RPC públicas autenticadas (`claim_invitation`, `record_battle`, `record_penalty`, `publish_rankings`, `update_my_profile`) y la protección contra contraseñas filtradas, que se activa desde el Dashboard.
- Las persistencias locales ya no devuelven éxito cuando el backend autorizado no confirmó la escritura.

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
| Realtime | Parcial avanzado | `src/lib/supabase/supabaseService.ts` | El contexto recibe matches, batallas y penalizaciones del torneo activo y limpia el canal al desmontar; faltan pruebas multi-cliente y resolución avanzada de conflictos. |
| Check-in manual | Completo | `TournamentContext.tsx`, `ParticipantManager.tsx` | Mantener cobertura. |
| Check-in móvil, temporizador, auto-drop y re-siembra | No aplicado | No existe flujo/scheduler operativo | Implementar ventana temporal, job transaccional y regeneración segura. |
| Decks 3on3 y Bey Check | Parcial | `types/tournament.ts`, vistas de participantes/bracket | Crear entidad, persistencia, validación de tres combos e historial de inspección. |
| Walk-ins | Parcial | `TournamentContext.tsx`, `mockData.ts` | Persistir invitados y asociar identidad segura. |
| Bracket, zoom, pan y gestos | Parcial/no aplicado | `BracketViewer.tsx` | Añadir pointer events, arrastre, pinch/zoom y layout escalable. |
| Overlays, API pública y streaming | No aplicado | `server.ts` no expone esas rutas | Crear API versionada de sólo lectura y SSE/webhooks firmados. |
| RBAC frontend | Parcial | `Header.tsx`, `App.tsx` | Mantenerlo como UX, no como control de seguridad. |
| RBAC backend | Parcial | Supabase Auth/RLS y mutaciones directas desde el cliente | Añadir pruebas API con tokens reales y autorización completa por torneo/match. |
| RLS | Avanzado | `supabase/migrations/20261026_security_rls_completion.sql`, `supabase/migrations/20261029_rankings_import.sql`, `supabase/migrations/20261029_restrict_internal_rpc.sql`, `supabase/tests/rls_authorization.sql` | Migraciones aplicadas en la instancia Supabase conectada; helpers internos sin `EXECUTE` para roles API y matriz rollback-only por roles ejecutada con 9/9 comprobaciones. Falta repetir con cuentas persistentes y sesiones Auth reales cuando el rate limit de signup lo permita. |
| Auditoría | Parcial avanzado | `audit_log`, migración de unificación y RPC de invitaciones | Persistir actor autenticado en todas las mutaciones y completar auditoría de correcciones. |
| CI y pruebas | Parcial avanzado | `.github/workflows/ci.yml`, `package.json`, Vitest | Añadir pruebas API, RLS, integración, E2E y accesibilidad. |
| Migración de memoria a SQL | Parcial avanzado | `TournamentContext.tsx`, `supabaseService.ts` | La hidratación remota carga el snapshot completo de torneos, etapas, grupos, rondas, matches, participantes, batallas y penalizaciones; las mutaciones de batalla y penalización usan RPC con control de versión. Aún faltan pruebas E2E multi-cliente y cuentas reales por rol. |

## Hallazgos críticos

### P0 — Seguridad y autorización

1. `src/context/TournamentContext.tsx` conserva estado de sesión en cliente para UX; la autoridad efectiva debe seguir siendo Supabase Auth/RLS.
2. Las rutas mutantes JSON de `server.ts` fueron retiradas; las mutaciones de configuración y arbitraje requieren sesión Supabase y las políticas RLS de sus tablas.
3. El canje de invitaciones ya no usa leer-modificar-escribir sobre JSON: el flujo activo usa el RPC transaccional `claim_invitation`.
4. La autorización del frontend sólo oculta vistas; no protege recursos.

**Avance de esta iteración:** el login valida contraseña mediante Supabase Auth, la restauración obtiene el rol desde `profiles`, las invitaciones usan `claim_invitation`, y la configuración de etapas/asignaciones de árbitros se persiste directamente en Supabase. La autorización por torneo ya tiene una prueba rollback-only contra la instancia conectada; aún falta repetirla con cuentas reales de organizer, referee y blader, además de pruebas API desplegadas.

**Decisión adoptada:** Supabase Auth + RLS es la autoridad; no se deben mantener roles confiables en localStorage.

### P0 — Despliegue y persistencia

1. `vercel.json` reescribe todas las rutas a `index.html`; no despliega `server.ts`.
2. El backend ya no usa `data/*.json`; el despliegue debe publicar Express o separar la API.
3. Las mutaciones críticas de batalla y penalización revierten el estado optimista si Supabase rechaza la operación.
4. El estado local sólo se restaura en modo sin Supabase; con Supabase configurado, un fallo de hidratación limpia los datos de demostración para no presentar un falso snapshot remoto. Las escrituras de estado crítico y caché de rankings también quedan bloqueadas en ese modo.

### P1 — Modelo de datos y consistencia

- `audit_log` y `audit_logs` representan dos contratos distintos.
- El frontend todavía conserva IDs legibles/locales en el fallback y en entidades heredadas, mientras varias columnas SQL esperan UUID.
- Hay RLS habilitado sin políticas completas.
- El estado monolítico de `TournamentContext.tsx` mezcla autenticación, dominio, UI y persistencia.
- La sincronización completa de torneos ahora propaga los errores de tablas relacionadas en lugar de devolver éxito después de una persistencia parcial.
- La selección del torneo activo se restaura únicamente si existe en el snapshot remoto; el wizard reinicia sus campos al cambiar de torneo o etapa para evitar configuraciones cruzadas entre dispositivos.
- `saveState` y la caché local de rankings sólo funcionan sin cliente Supabase; con Supabase configurado no se guarda una copia local que pueda sobrescribir el snapshot remoto.

### P1 — Calidad y accesibilidad

- El workflow CI anterior era una lista de comandos sin `name`, `on` ni `jobs`, por lo que GitHub no generaba check runs. Se reemplazó por un workflow ejecutable con Node 22, `npm ci`, type-check, tests y build.
- `package.json` define `npm run test` y existen suites Vitest para arbitraje, desempates y Single Elimination.
- La cobertura automatizada actual es de 3 archivos y 8 pruebas Vitest; aún faltan integración API, RLS, E2E y accesibilidad.
- El middleware de autenticación del backend contiene un mensaje de error malformado; no cambia el código HTTP, pero debe corregirse antes del despliegue para evitar respuestas confusas.
- `tsconfig.json` no activa `strict` y permite JS.
- `index.html` ya declara `lang="es"`; debe conservarse una revisión de metadatos/SEO porque algunos textos sociales siguen en inglés.
- El modal de autenticación y varios controles de icono carecen de semántica ARIA/foco completo.
- La navegación conserva `view`, `tournament` y `stage` en la URL y soporta refresh/back-forward; aún faltan guards de autorización y rutas separadas por rol.

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

1. Añadir guards de autorización y rutas separadas por rol; el deep linking base de vista, torneo y etapa ya está implementado.
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
- `npm.cmd run test` — 3 archivos, 8 pruebas.
- `supabase/tests/rls_authorization.sql` — ejecutada contra la instancia Supabase conectada; 4 pruebas rollback-only pasaron.
- `npm.cmd run build` — bundle generado; Vite mantiene un aviso de chunk principal superior a 500 kB.
- `npm.cmd audit --omit=dev` — sin vulnerabilidades de producción detectadas.
- `git diff --check`

La validación remota del workflow debe repetirse al publicar este cambio; el fallo anterior de GitHub se debía a que el archivo no definía jobs, no a una prueba de aplicación fallida.

Para repetir la validación desde un checkout limpio:

```powershell
npm ci
npm run lint
npm run build
npm run test
```

## Hallazgos de la auditoría actual

| Severidad | Área | Hallazgo | Estado |
|---|---|---|---|
| Alta | Rankings | La publicación de Rankings y Salón de la Fama debía reemplazar dos tablas con varias llamadas desde el cliente. | Corregido y verificado en Supabase: `publish_rankings(jsonb, jsonb)` es `SECURITY DEFINER`, valida al administrador y reemplaza ambas tablas dentro de una única transacción; sólo `authenticated` conserva `EXECUTE`, mientras las tablas permiten lectura pública y escritura administrativa por RLS. La prueba rollback-only confirmó publicación administrativa transaccional. El importador rechaza extensiones, tamaños, números inválidos e IDs duplicados antes de publicar. |
| Alta | Persistencia | `syncTournamentToSupabase` podía devolver éxito aunque fallara una tabla relacionada. | Corregido: los errores de participantes, etapas, grupos, rondas, matches y batallas ahora abortan la sincronización. |
| Alta | Consistencia multiusuario | La hidratación omitía grupos, rondas, batallas y penalizaciones, y podía conservar mocks cuando fallaba Supabase. | Corregido: snapshot completo, espera de sesión Auth, aplicación atómica, limpieza explícita ante error remoto y bloqueo de persistencia crítica local cuando Supabase está configurado. |
| Media | Consistencia multiusuario | `recordPenalty` sólo modificaba estado local y el wizard conservaba campos del torneo anterior. | Corregido: RPC `record_penalty` con rollback por conflicto/fallo y reinicialización completa del formulario. |
| Media | Calidad | El middleware de autenticación contiene un mensaje de error malformado aunque el código HTTP sea correcto. | Pendiente de limpieza antes del despliegue. |

La auditoría local del backend confirmó `/api/health` con HTTP 200 y rechazó una mutación sin autenticación cuando el backend no tiene Supabase configurado con HTTP 503. La matriz rollback-only contra la instancia Supabase real cubrió organizer, referee, blader, usuario no relacionado y admin con 9/9 comprobaciones; crea usuarios Auth/profiles sólo dentro de una transacción que termina en `rollback`. Esto valida RLS y RPC sin dejar cuentas ni torneos de prueba persistentes, pero no sustituye una sesión Auth persistente extremo a extremo.

## Higiene de caché y artefactos

No se borraron datos funcionales, migraciones ni assets existentes. Se ampliaron las exclusiones de Git para impedir que cachés locales y artefactos de compilación entren al repositorio. Antes de una limpieza manual debe conservarse `data/` y cualquier asset utilizado por la aplicación; `dist/`, `node_modules/` y cachés pueden regenerarse.