# Plan de acción para producción — APbey Arena

Fecha de elaboración: 2026-10-29  
Estado inicial estimado: **65% para producción multiusuario**  
Objetivo: llevar APbey a un lanzamiento controlado, seguro y operable para torneos reales.

Este documento convierte la auditoría técnica y el plan UX/HCI en una secuencia ejecutable. El porcentaje actual no significa que falte el 35% de una sola funcionalidad: la brecha está concentrada en persistencia, autorización, despliegue, pruebas y operación, que son las áreas que pueden causar pérdida de datos o fallos de seguridad.

## Avance implementado en esta continuación

- Se activó la suscripción realtime del torneo activo para recibir cambios de matches y nuevas batallas.
- Se añadió estado visible de canal (`SUBSCRIBED`, error, timeout o cierre) en el marcador.
- El registro de batallas ahora usa el RPC transaccional `record_battle`, informa errores de Supabase y usa control optimista de `version` para detectar escrituras concurrentes.
- Se dejaron explícitos los errores de sincronización; el sistema ya no trata una mutación remota fallida como confirmada.

Estas mejoras no eliminan todavía la dependencia de IDs locales ni convierten automáticamente toda la persistencia en transaccional. Esos puntos permanecen bloqueados hasta completar la migración de entidades a UUID y las funciones/RPC de Supabase.

## 1. Objetivo de lanzamiento

La versión de producción debe permitir que un administrador u organizador:

- cree y configure un torneo;
- invite usuarios con roles controlados;
- gestione participantes, check-in, siembra y etapas;
- inicie y opere brackets sin depender de datos locales;
- registre batallas y penalizaciones de forma transaccional;
- publique rankings mediante Excel con validación y trazabilidad;
- ofrezca una vista pública estable;
- recupere errores sin perder el estado del torneo;
- audite quién realizó cada mutación.

El alcance del lanzamiento no incluye migrar a Next.js ni añadir decks, pagos, streaming avanzado o catálogo de Beys. Esas iniciativas deben planificarse por separado después de estabilizar el MVP actual.

## 2. Criterios de no lanzamiento

APbey no debe publicarse como plataforma multiusuario si alguno de estos puntos sigue abierto:

1. `localStorage` o archivos JSON son la fuente efectiva de datos críticos.
2. Una mutación puede aparentar éxito cuando Supabase o el backend no la confirmó.
3. Un usuario puede leer o modificar datos de un torneo no autorizado.
4. Las migraciones RLS no se han aplicado y probado en un proyecto Supabase real.
5. El backend Express no está incluido en el despliegue elegido.
6. No existe una prueba reproducible de creación, inicio y finalización de un torneo.
7. No hay backups, logs, alertas y procedimiento de recuperación.
8. Las variables de entorno, dominios y cuentas administrativas no están documentados de forma segura.

## 3. Estrategia técnica decidida

### Fuente de verdad

Supabase será la autoridad única para identidad, torneos, participantes, etapas, matches, batallas, penalizaciones, invitaciones, rankings y auditoría.

- `localStorage` sólo conservará preferencias de interfaz no críticas.
- `data/*.json` quedará fuera del camino productivo o se eliminará después de migrar sus consumidores.
- Los IDs usados por el frontend serán UUID o identificadores devueltos por Supabase; no se crearán IDs locales incompatibles.
- Toda mutación crítica tendrá confirmación remota antes de actualizar la UI como exitosa.

### Despliegue

Antes de implementar el despliegue definitivo debe elegirse una de estas opciones:

| Opción | Uso | Condición |
|---|---|---|
| Express + Vite en un servicio Node | Opción recomendada para el stack actual | El servicio debe servir `dist`, `/api` y tener almacenamiento sólo externo. |
| Frontend estático + API separada | Válida si se desacopla el backend | CORS, autenticación, health checks y variables deben probarse entre dominios. |
| Migración a Next.js | Iniciativa futura | No mezclarla con el cierre del MVP ni usarla para ocultar riesgos actuales. |

## 4. Fases de ejecución

### Fase 0 — Congelación y preparación

**Objetivo:** impedir que nuevas funciones aumenten la superficie de riesgo.

Tareas:

- congelar el alcance del MVP;
- registrar variables de entorno requeridas y sus responsables;
- elegir npm como gestor único mientras `package-lock.json` sea el lockfile de CI;
- verificar que `npm ci`, `npm run lint`, `npm run test` y `npm run build` funcionen desde un checkout limpio;
- crear un proyecto Supabase de staging separado de producción;
- definir cuentas de prueba para admin, organizer, referee y blader;
- conservar datos ficticios únicamente en fixtures de prueba, nunca en el arranque de la aplicación.

**Salida:** entorno de staging disponible, alcance congelado y pipeline reproducible.

### Fase 1 — Persistencia y contratos de dominio

**Objetivo:** eliminar la ambigüedad entre estado local, backend y base de datos.

Tareas:

- inventariar cada lectura y escritura de `TournamentContext`;
- sustituir persistencia crítica local por consultas y mutaciones Supabase;
- migrar configuraciones de etapas y asignaciones de árbitros desde JSON a tablas o columnas JSONB controladas;
- corregir compatibilidad de IDs y validar relaciones con UUID;
- centralizar contratos de entrada y salida con esquemas Zod o una capa equivalente;
- definir un formato de error común: código, mensaje seguro, detalles de validación y request ID;
- usar `version` o control equivalente para rechazar escrituras obsoletas;
- hacer idempotentes las operaciones de registro de batallas, importación de rankings y reclamación de invitaciones.

**Criterio de aceptación:**

- detener o limpiar `localStorage` no impide recuperar un torneo desde Supabase;
- una caída de red no muestra una confirmación falsa;
- dos escrituras concurrentes no sobrescriben silenciosamente el estado anterior;
- todos los IDs persistidos son válidos en el esquema cloud.

### Fase 2 — Seguridad y autorización

**Objetivo:** convertir los roles visuales en controles verificables en backend y RLS.

Tareas:

- aplicar en staging las migraciones de seguridad, perfiles, rankings, invitaciones y entrega de correo;
- ejecutar los advisors de Supabase y corregir RLS sin políticas;
- auditar tabla por tabla `SELECT`, `INSERT`, `UPDATE` y `DELETE`;
- garantizar que `admin` pueda administrar globalmente, `organizer` sólo su torneo, `referee` sólo sus matches asignados y `blader` sólo sus datos permitidos;
- proteger operaciones de torneo por `tournament_id`, no sólo por rol global;
- revisar funciones `SECURITY DEFINER`, `search_path`, permisos `EXECUTE` e índices de claves foráneas;
- consolidar `audit_log` como tabla canónica;
- añadir rate limiting, límites de payload, CORS explícito, headers de seguridad y request IDs;
- evitar que secretos de Supabase, correo o proveedores externos lleguen al navegador;
- activar protección contra contraseñas filtradas y confirmar correo según la política del entorno.

**Criterio de aceptación:**

- cada acción no autorizada devuelve `401` o `403` sin filtrar datos;
- las pruebas con cuatro roles pasan en API y Supabase;
- cada mutación crítica genera auditoría con actor, recurso, acción y timestamp;
- no existen políticas permisivas que permitan saltarse el ámbito del torneo.

### Fase 3 — Integridad del motor de torneos

**Objetivo:** garantizar que los formatos y el marcador sean correctos bajo operaciones reales.

Tareas:

- completar Double Elimination, losers bracket, Gran Final y reset elegible;
- verificar Single Elimination con byes, rosters no potencia de dos y avance de ganador;
- cubrir Round Robin con número impar de participantes, empates y desempates;
- validar Swiss, Buchholz y emparejamientos sin revancha indebida;
- bloquear siembra y configuración incompatible después de iniciar una etapa;
- trasladar `record_battle`, penalizaciones, cierre de sets y avance de matches a operaciones transaccionales;
- implementar reabrir/undo con permisos, motivo obligatorio y auditoría;
- validar Best-of-N, puntos de finish y límites de batalla en servidor;
- probar tercer lugar, walk-over, descalificación, abandono y empate permitido.

**Criterio de aceptación:**

- un torneo completo puede avanzar desde registro hasta final sin editar la base manualmente;
- no se generan matches sin participantes válidos ni ciclos de bracket;
- un refresh o reconexión no duplica batallas ni cambia ganadores;
- las reglas rechazadas por el servidor también se bloquean en la interfaz.

### Fase 4 — Flujos de usuario y UX/HCI

**Objetivo:** cumplir el contrato de navegación y reducir errores operativos.

Tareas:

- mantener la selección de torneo desde la tarjeta y mostrar siempre el contexto activo;
- añadir rutas o parámetros URL estables para deep links, refresh y back/forward;
- conservar Herramientas como menú superpuesto sin crear una segunda barra;
- revisar responsive en móvil, tablet, proyector y escritorio;
- implementar estados de carga, vacío, error, éxito y reintento para cada operación remota;
- completar foco, teclado, labels, `aria-*`, contraste y mensajes de validación;
- hacer accesibles las tarjetas de torneo, tabs, modales y controles de icono;
- añadir zoom/pan del bracket sólo si no compromete la navegación táctil;
- verificar que no queden enlaces huérfanos a Comunidad, modo libre o documentación retirada;
- documentar el significado de estados `draft`, `registration`, `in_progress`, `completed` y `cancelled`.

**Criterio de aceptación:**

- un usuario puede llegar a un torneo y etapa concretos mediante URL;
- ningún viewport soportado produce scroll horizontal accidental;
- los errores remotos son visibles y accionables;
- una auditoría automatizada de accesibilidad no reporta errores críticos.

### Fase 5 — Rankings e importación Excel

**Objetivo:** hacer confiable la publicación administrativa de rankings.

Tareas:

- validar extensión, tamaño, hojas, encabezados, tipos y rangos numéricos del `.xlsx`;
- rechazar filas duplicadas, nombres vacíos y valores no finitos;
- mostrar una previsualización antes de reemplazar la publicación actual;
- exigir confirmación administrativa para la operación destructiva;
- guardar versión, usuario, fecha, hash del archivo y cantidad de filas importadas;
- usar una transacción o estrategia de publicación por versión para evitar rankings parcialmente reemplazados;
- permitir rollback de la última importación válida;
- probar que un archivo inválido no altera la publicación anterior;
- verificar políticas RLS y visibilidad pública de rankings publicados.

**Criterio de aceptación:**

- un admin puede importar, previsualizar, confirmar y revertir;
- un usuario no admin no puede importar ni modificar rankings;
- una importación parcial nunca se muestra como publicación completa;
- el sistema conserva trazabilidad del archivo y del actor.

### Fase 6 — Pruebas, observabilidad y despliegue

**Objetivo:** demostrar que la versión candidata funciona en un entorno parecido a producción.

Tareas:

- ampliar Vitest para motor, reglas, contratos y errores;
- añadir pruebas de integración API con tokens y roles reales de staging;
- añadir pruebas RLS mediante usuarios de prueba;
- incorporar Playwright para login, creación de torneo, selección, bracket, árbitro, rankings y vista pública;
- añadir pruebas de accesibilidad con axe;
- ejecutar pruebas responsive en tamaños críticos;
- generar cobertura y fijar umbrales mínimos acordados;
- añadir health check que verifique dependencias esenciales sin exponer secretos;
- implementar logs estructurados, request ID, métricas básicas y alertas;
- documentar rollback, backup, restauración y rotación de secretos;
- desplegar una candidata en staging y ejecutar smoke tests antes de producción.

**Criterio de aceptación:**

- CI falla ante type errors, tests, build o auditoría de dependencias;
- los flujos críticos pasan en un entorno desplegado;
- existe evidencia de backup y restauración;
- el equipo puede identificar una petición fallida y su actor mediante logs.

## 5. Backlog priorizado

| Prioridad | Entregable | Dependencias | Resultado |
|---|---|---|---|
| P0 | Fuente única Supabase | Fase 0 | Sin pérdida por divergencia local/cloud |
| P0 | RLS y autorización por torneo | Persistencia y staging | Aislamiento real entre torneos |
| P0 | Despliegue Express + frontend | Fuente única | API disponible en producción |
| P0 | Registro transaccional de batallas | RLS, contratos | Marcador confiable |
| P0 | Migraciones aplicadas y verificadas | Proyecto Supabase | Esquema reproducible |
| P1 | Pruebas API/RLS/E2E | Flujos estabilizados | Regresión detectable |
| P1 | Observabilidad y recuperación | Despliegue | Operación mantenible |
| P1 | Deep links y accesibilidad | UX base | Navegación usable |
| P1 | Importación versionada de rankings | RLS y persistencia | Publicación auditable |
| P2 | Double Elimination completo | Motor actual | Cobertura funcional ampliada |
| P2 | Check-in automático, auto-drop y re-siembra | Scheduler y persistencia | Operación de eventos grandes |
| P2 | Realtime, overlays y webhooks | API estable | Integraciones externas |

## 6. Puertas de salida

### Gate A — Seguridad

- [ ] Todas las migraciones aplicadas en staging.
- [ ] RLS probado con cada rol.
- [ ] Autorización por torneo verificada en API y base de datos.
- [ ] No hay secretos en el bundle ni en el repositorio.
- [ ] Rate limiting, CORS, headers y límites de payload activos.

### Gate B — Datos

- [ ] Supabase es la fuente de verdad.
- [ ] No se usan JSON mutables para datos productivos.
- [ ] Escrituras críticas son transaccionales e idempotentes.
- [ ] Backup y restauración probados.
- [ ] Auditoría registra las mutaciones principales.

### Gate C — Producto

- [ ] Creación, configuración, inicio y cierre de torneo probados.
- [ ] Eliminación directa con byes validada.
- [ ] Batallas, penalizaciones y avance de matches validados.
- [ ] Rankings Excel importados y revertidos correctamente.
- [ ] Estados vacíos, carga y errores revisados.

### Gate D — Calidad y operación

- [ ] Lint, tests, build y audit pasan desde checkout limpio.
- [ ] Pruebas API, RLS, E2E y accesibilidad pasan.
- [ ] Staging desplegado con smoke tests satisfactorios.
- [ ] Logs, alertas, health check y rollback documentados.
- [ ] El equipo de operación tiene acceso a procedimientos sin exponer credenciales.

## 7. Definición de listo

APbey podrá declararse listo para producción multiusuario cuando todos los gates anteriores estén completos y exista una ejecución documentada de un torneo de prueba con:

1. cuatro roles de usuario;
2. al menos un torneo con participantes no potencia de dos;
3. registro de batallas y penalizaciones;
4. reconexión y refresh durante el torneo;
5. publicación y reversión de rankings;
6. revisión de auditoría;
7. restauración desde backup;
8. despliegue desde un commit reproducible.

El porcentaje de preparación deberá actualizarse por evidencia, no por cantidad de pantallas. Como referencia, el objetivo es superar **90%** sólo después de cerrar todos los bloqueadores P0 y demostrar los gates en staging; la publicación final requiere **100% de los gates**, aunque algunas funciones P2 permanezcan fuera del alcance del MVP.

## 8. Orden recomendado de ejecución

1. Congelar alcance y preparar staging.
2. Elegir despliegue y fuente única de verdad.
3. Migrar persistencia crítica y contratos.
4. Aplicar RLS y autorización por torneo.
5. Hacer transaccional el marcador y las operaciones críticas.
6. Completar pruebas de motor, API y seguridad.
7. Validar UX, accesibilidad y deep links.
8. Versionar importaciones de rankings.
9. Añadir observabilidad, backups y rollback.
10. Ejecutar staging completo y aprobar los gates.
11. Publicar una beta controlada.
12. Revisar métricas y abrir producción general.

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Migración de IDs locales a UUID | Script de migración, fixture de staging y validación de referencias antes de cortar el modo local. |
| Dependencia accidental de JSON | Buscar consumidores, fallar explícitamente en producción y eliminar rutas después de migrar. |
| RLS demasiado permisivo o restrictivo | Matriz de permisos por rol y pruebas negativas automatizadas. |
| Conflictos al registrar batallas | Control de versión, idempotency key y transacción en Supabase. |
| Despliegue sin backend | Smoke test externo de `/api/health` y una mutación autenticada. |
| Importación corrupta de Excel | Validación completa, previsualización, transacción y rollback. |
| Regresiones visuales | Playwright en viewport crítico, axe y revisión manual de estados de error. |
| Falta de recuperación operativa | Backup restaurado en staging antes de aprobar producción. |

## 10. Evidencia requerida para la aprobación

La aprobación final debe adjuntar:

- commit candidato y artefacto de build;
- resultado de CI;
- versión y lista de migraciones aplicadas;
- matriz de permisos y resultados RLS;
- reporte de pruebas E2E y accesibilidad;
- evidencia de smoke tests de staging;
- comprobación de backup/restauración;
- configuración de alertas y health check;
- procedimiento de rollback;
- lista de variables de entorno sin valores secretos.
