# APbey Arena

Plataforma web para organizar y operar torneos de **Beyblade X**. APbey combina una interfaz React/TypeScript, un motor puro de generación y avance de torneos, un marcador para árbitros, una pantalla pública de estadio y una integración opcional con Supabase para autenticación, autorización, persistencia y sincronización en tiempo real.

> **Estado actual:** el núcleo funcional del MVP está implementado, pero la aplicación todavía no debe declararse lista para producción multiusuario. La fuente de verdad prevista para producción es Supabase; el modo local existe para desarrollo, demostraciones y pruebas. Las funciones parciales y los bloqueadores de producción están enumerados al final de este documento.

## Qué puede hacer actualmente

### Operación de torneos

- Crear, editar, duplicar y eliminar torneos.
- Configurar nombre, descripción, sede, país, fecha, cuota, límite de participantes y check-in.
- Configurar tres umbrales de puntos:
  - fase regular o grupos;
  - playoffs;
  - gran final.
- Configurar puntos por tipo de finalización:
  - `Spin`;
  - `Over`;
  - `Burst`;
  - `Xtreme`.
- Configurar faltas acumuladas, tarjetas y puntos otorgados al rival.
- Crear varias etapas dentro del mismo torneo.
- Elegir el tipo de etapa:
  - eliminación simple;
  - eliminación doble;
  - round robin;
  - Swiss;
  - fase de grupos.
- Configurar `best of`, tamaño de grupos, cantidad de clasificados, tercer lugar, gran final y criterios de desempate.
- Configurar la cantidad de rondas del Sistema Suizo desde la creación y desde el diseñador de etapas.
- Guardar la configuración de etapas en Supabase cuando existe una sesión autorizada.

### Participantes, registro y siembra

- Añadir participantes individualmente.
- Importar participantes en bloque para walk-ins.
- Registrar hasta tres combos del deck 3on3 por participante.
- Reordenar la siembra manualmente.
- Generar una siembra aleatoria mediante Fisher-Yates.
- Confirmar check-in individual o de todo el torneo.
- Marcar el `Bey Check` de cada participante.
- Retirar participantes.
- Exportar la lista a CSV.
- Imprimir una planilla de participantes y check-in.

### Motor de torneos

El motor está separado de React y de Supabase en `src/lib/engine`. Esto permite probar reglas y generación de estructuras sin depender del navegador.

#### Eliminación simple

- Genera el bracket hasta la siguiente potencia de dos.
- Calcula parejas según la siembra.
- Propaga `byes` a las rondas siguientes.
- Enlaza el avance del ganador.
- Puede añadir partido por el tercer lugar.
- Nombra rondas en español: octavos, cuartos, semifinales y gran final cuando corresponde.

#### Eliminación doble

- Genera el cuadro de ganadores.
- Genera rondas de perdedores.
- Genera la gran final.
- Puede crear un segundo match de reset de la gran final.

> La estructura base está implementada, pero la propagación completa de perdedores y todos los cruces de un formato de eliminación doble real todavía requieren completar validación y pruebas de flujo extremo a extremo.

#### Round robin

- Usa el algoritmo de círculo.
- Soporta número par o impar de participantes.
- Soporta una o dos vueltas.
- Genera jornadas y matches por grupo.

#### Swiss

- Genera la primera ronda.
- Permite configurar entre 1 y 20 rondas; cada ronda posterior se habilita cuando la anterior está completa.
- Empareja participantes por puntuación y siembra.
- Evita revancha cuando existe una pareja alternativa.
- Asigna `bye` cuando el número de participantes es impar.
- Permite generar rondas posteriores sólo cuando no quedan matches pendientes.

#### Grupos y avance a playoffs

- Distribuye participantes por siembra serpentina.
- Calcula tablas por grupo.
- Clasifica los primeros puestos configurados.
- Invierte los segundos puestos para reducir revancha temprana.
- Genera una nueva etapa de eliminación simple.
- Permite avanzar desde grupos o desde Swiss.

#### Desempates

El orden de desempate se configura por etapa. Están disponibles:

- puntos de tabla;
- diferencia de puntos;
- puntos a favor;
- promedio de puntos;
- ratio de puntos;
- sets ganados;
- enfrentamiento directo;
- Buchholz;
- Median-Buchholz;
- siembra inicial.

El cálculo contempla empates de dos participantes y mini-ligas para empates de varios participantes.

### Arbitraje y marcador

La vista **Mesa de Arbitraje y Marcador** permite:

- seleccionar un match oficial;
- ver score, sets, estación y estado;
- registrar `Spin`, `Over`, `Burst` y `Xtreme`;
- aplicar la puntuación configurada por torneo;
- cerrar sets y matches según el umbral de la etapa;
- registrar faltas y tarjetas amarillas o rojas;
- acumular faltas hasta otorgar puntos al rival;
- consultar el historial de batallas y penalizaciones;
- deshacer la última batalla;
- avanzar al siguiente combate;
- activar o silenciar sonidos;
- usar vibración en dispositivos compatibles;
- mostrar el estado de conexión y sincronización.

Las reglas de puntuación tienen una implementación pura en TypeScript (`src/lib/engine/arbitration.ts`) y una ruta transaccional en Supabase (`record_battle`, `record_penalty` y `undo_last_battle`). Cuando Supabase rechaza una operación, la aplicación muestra el error y no debe tratarla como confirmada.

### Árbitros, mesas y estadio

- Asignar árbitros a un torneo, etapa, grupo o match.
- Reclamar un match como árbitro.
- Desasignar un árbitro de todo un torneo.
- Repartir árbitros entre grupos automáticamente.
- Asignar una estación o mesa a un match.
- Convocar un match a una estación.
- Mostrar una alerta de convocatoria en la pantalla de estadio.
- Abrir un modo de pantalla completa para proyector.
- Mostrar combates activos, próximos combates, resultados, estación, ronda y último finish.
- Mostrar reloj en tiempo real.

La pantalla de estadio (`StadiumDisplay`) consume el mismo estado de matches, batallas y estaciones que el marcador. Con Supabase configurado, los cambios recibidos por Realtime pueden actualizar el marcador y la pantalla pública sin refrescar manualmente.

### Rankings, Salón de la Fama y decks

#### Rankings

- Consultar ranking por puntos.
- Consultar ranking ELO.
- Buscar bladers por nombre.
- Mostrar victorias, derrotas, torneos ganados y combo favorito.
- Consultar el Salón de la Fama.
- Importar publicaciones desde un libro `.xlsx`.
- Reemplazar la publicación anterior mediante el RPC `publish_rankings`.

El importador valida extensión, tamaño máximo de 10 MB, hojas, nombres, valores numéricos y IDs duplicados. Acepta encabezados en inglés y español.

Hojas reconocidas:

- `Rankings`, `Ranking`, `Bladers` o equivalentes.
- `HallOfFame`, `Hall of Fame`, `Salón de la Fama` o equivalentes.

#### Deck 3on3

- Construir tres Beyblades.
- Elegir Blade, Ratchet y Bit desde catálogos incluidos en la interfaz.
- Validar que no se repitan Blades, Ratchets ni Bits.
- Guardar el deck en `localStorage`.
- Copiar el deck al portapapeles.

#### Tier List

La vista existe y comunica que no hay una Tier List oficial publicada. No se muestran datos ficticios ni tiers de demostración.

### Autenticación, perfiles y administración

La aplicación distingue los roles:

| Rol | Uso previsto |
|---|---|
| `public` | Consultar las vistas públicas sin operar torneos. |
| `blader` | Cuenta de participante y acceso a sus datos permitidos. |
| `referee` | Registrar arbitrajes de matches asignados. |
| `organizer` | Crear y operar sus torneos. |
| `admin` | Administración global, usuarios, invitaciones, auditoría y rankings. |

Capacidades actuales:

- Inicio y cierre de sesión con Supabase Auth.
- Restauración de sesión al recargar.
- Validación del perfil remoto y su rol.
- Actualización de nombre, correo, contraseña y avatar.
- Invitaciones con código, rol y torneo opcional.
- Canje de invitación mediante el RPC transaccional `claim_invitation`.
- Revocación de invitaciones.
- Cambio de rol desde administración.
- Carga de perfiles administrativos.
- Carga de bitácora administrativa.
- Preparación de correo mediante `mailto:`.
- Edge Function preparada para entrega con Resend.

El rol mostrado en la interfaz sólo controla la experiencia de usuario. La autorización real debe proceder de Supabase Auth, RLS y las funciones transaccionales.

### Navegación y experiencia de uso

Las vistas activas de `src/App.tsx` son:

| Vista | Identificador | Función |
|---|---|---|
| Torneos | `torneos` | Selección y gestión de torneos. |
| Bracket | `bracket` | Llaves, grupos, rondas y standings. |
| Marcador | `marcador` | Operación oficial de combates. |
| Árbitro | `referee` | Alias histórico que conduce al marcador unificado. |
| Rankings | `rankings` | Ranking por puntos, ELO y Salón de la Fama. |
| Deck | `deck` | Constructor de deck 3on3. |
| Tier List | `tierlist` | Estado de publicación de la Tier List. |
| Perfil | `profile` | Perfil del blader autenticado. |
| Participantes | `participants` | Registro, check-in, Bey Check y siembra. |
| Diseñador | `wizard` | Configuración de torneo y etapas. |
| Administración | `admin` | Árbitros, invitaciones, roles, rankings y Supabase. |

También están disponibles:

- `Ctrl+K` o `Cmd+K` para abrir la paleta de comandos.
- `Esc` para cerrar modales y la paleta.
- parámetros URL `view`, `tournament`, `stage` y `ranking`;
- restauración de la vista, torneo y etapa después de un refresh;
- navegación back/forward del navegador;
- navegación móvil inferior;
- estados de carga, vacío, error y sincronización.

## Cómo se interconecta el sistema

```mermaid
flowchart TD
  UI[React 19 + Vite] --> APP[src/App.tsx]
  APP --> CTX[TournamentContext]
  CTX --> ENGINE[src/lib/engine]
  CTX --> LOCAL[src/lib/storage]
  CTX --> SUPA[src/lib/supabase]
  SUPA --> AUTH[Supabase Auth]
  SUPA --> DB[(PostgreSQL + RLS)]
  SUPA --> RT[Supabase Realtime]
  RT --> CTX
  DB --> DATA[Torneos, etapas, grupos, rondas, matches]
  DB --> EVENTS[Batallas, penalizaciones, auditoría]
  UI --> SCORE[Marcador]
  UI --> STADIUM[Stadium Display]
  SCORE --> CTX
  STADIUM --> CTX
  SERVER[Express + Vite] --> UI
  SERVER --> HEALTH[/api/health]
```

### Flujo de datos

1. `src/App.tsx` compone la navegación y mantiene el contexto de torneo, etapa y usuario.
2. `TournamentContext` centraliza el estado de torneos, participantes, etapas, matches, batallas, penalizaciones, usuarios e invitaciones.
3. `src/lib/engine` calcula brackets, standings, desempates, avances y reglas de arbitraje sin hacer I/O.
4. `src/lib/storage` contiene IDs, fixtures, migraciones de datos locales e importación de rankings.
5. `src/lib/supabase/client.ts` crea el cliente autenticado y comprueba la conexión.
6. `src/lib/supabase/supabaseService.ts` carga snapshots, publica torneos y rankings, ejecuta RPC transaccionales y registra Realtime.
7. El esquema SQL y las migraciones definen tablas, funciones, índices, RLS, auditoría y publicación.
8. El marcador y el estadio consumen el mismo estado; por eso una actualización de un match puede reflejarse en ambas superficies.

### Persistencia local frente a persistencia remota

Cuando Supabase **no está configurado**, el modo local usa fixtures y `localStorage` para:

- datos de demostración;
- sesión de interfaz;
- preferencias de navegación;
- rankings locales de previsualización;
- deck personal;
- estado local migrado.

Cuando Supabase **está configurado**:

- los torneos se hidratan desde Supabase;
- Supabase Auth determina la identidad;
- RLS determina qué datos puede leer o modificar cada sesión;
- las batallas y penalizaciones usan control de versión;
- Realtime notifica cambios de matches, batallas, penalizaciones y entidades relacionadas;
- una mutación crítica no debe considerarse exitosa si Supabase no la confirma.

`localStorage` no debe considerarse una fuente multiusuario ni un respaldo válido de producción.

## Arquitectura del repositorio

```text
src/
├── App.tsx
├── components/
│   ├── admin/          Administración, Supabase y asignación de árbitros
│   ├── auth/           Login, invitaciones y perfil
│   ├── bracket/        Brackets y grupos
│   ├── common/         Header, navegación, paleta y estados compartidos
│   ├── deck/           Deck Builder y Tier List
│   ├── docs/           Guía técnica visible dentro de la aplicación
│   ├── participants/   Registro, check-in y Bey Check
│   ├── rankings/       Rankings y Salón de la Fama
│   ├── referee/        Consola de árbitro
│   ├── scoreboard/     Marcador oficial
│   ├── stadium/        Pantalla pública/proyector
│   └── tournament/     Lista y wizard de torneos
├── context/
│   └── tournament/     Estado global y coordinación de operaciones
├── lib/
│   ├── engine/         Motor puro de torneo y arbitraje
│   ├── storage/        Persistencia local, migraciones e importadores
│   └── supabase/       Cliente, servicios, esquema y asignaciones
└── types/              Tipos de torneo y rankings

supabase/
├── migrations/         Cambios versionados de base de datos
├── functions/          Edge Functions, incluida send-invitation
├── tests/              Pruebas SQL y de autorización
├── schema.sql          Esquema de referencia completo
└── config.toml

server.ts               Express, Vite en desarrollo, estáticos en producción y health check
scripts/                Limpieza, versiones de migraciones y soporte Supabase en Windows
```

## Modelo de datos remoto

El esquema principal se encuentra en `supabase/schema.sql` y se mantiene con migraciones versionadas. Las entidades principales son:

- `profiles`;
- `tournaments`;
- `tournament_finish_points`;
- `tournament_referees`;
- `participants`;
- `stages`;
- `groups`;
- `group_participants`;
- `rounds`;
- `matches`;
- `battles`;
- `penalties`;
- `invitations`;
- `ranking_entries`;
- `hall_of_fame_entries`;
- `audit_log`.

Las relaciones siguen la jerarquía:

```text
Tournament
└── Stages
    ├── Groups
    └── Rounds
        └── Matches
            ├── Battles
            └── Penalties
```

Las operaciones sensibles incluyen funciones SQL para:

- registrar batallas;
- registrar penalizaciones;
- deshacer la última batalla;
- publicar rankings;
- publicar torneos;
- reclamar invitaciones;
- gestionar invitaciones;
- listar perfiles y auditoría administrativa.

## Requisitos

- Node.js 22 recomendado, coincidente con CI.
- npm.
- Docker Desktop con el motor WSL 2 si se van a ejecutar pruebas locales de Supabase.
- Supabase CLI para migraciones y pruebas de base de datos.

## Instalación y ejecución

```powershell
npm install
npm run dev
```

La aplicación se sirve normalmente en `http://localhost:3000`. El health check de Express es:

```text
GET /api/health
```

Para una compilación de producción:

```powershell
npm run build
npm run start
```

En producción, `server.ts` sirve `dist` y conserva `/api/health`. `vercel.json` sólo cubre el frontend estático; por tanto, un despliegue en Vercel no publica automáticamente el proceso Express.

## Variables de entorno

Copia `.env.example` a `.env` y completa sólo las variables necesarias:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
ALLOWED_ORIGINS=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

Reglas:

- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` se usan en el navegador.
- `SUPABASE_URL` y `SUPABASE_ANON_KEY` se usan para procesos del servidor cuando corresponda.
- `SUPABASE_SERVICE_ROLE_KEY` es secreta y nunca debe llegar al bundle ni al navegador.
- `ALLOWED_ORIGINS` debe contener sólo los orígenes permitidos.
- `GEMINI_API_KEY` está preparada como variable opcional; no debe asumirse una funcionalidad de IA operativa sólo por existir en `.env.example`.

Para invitaciones con confirmación de correo, configura en Supabase **Authentication → URL Configuration**:

1. la URL pública como **Site URL**;
2. la URL local como **Redirect URL**;
3. la migración `20261105000016_invitation_profile_activation.sql`.

Para entrega automática con Resend, despliega `supabase/functions/send-invitation` y configura sus secretos:

- `RESEND_API_KEY`;
- `INVITATION_FROM_EMAIL`;
- `APP_URL`.

Un estado `sent` confirma que Resend aceptó el mensaje, no que llegó a la bandeja de entrada.

## Comandos

```powershell
npm run dev                 # Vite + Express en desarrollo
npm run build               # Bundle de producción
npm run start               # Express sirviendo el bundle
npm run preview             # Preview de Vite
npm run lint                # TypeScript sin emitir archivos
npm run test                # Suite Vitest
npm run check:migrations    # Valida versiones de migraciones
npm run clean               # Limpia artefactos generados
npm run supabase:windows:test
                            # Reset local y pruebas SQL en Windows
```

CI ejecuta:

```text
npm ci
npm run check:migrations
npm run lint
npm run test
npm run build
supabase db reset --local
supabase test db
```

### Supabase local en Windows

```powershell
npm install --global supabase
npm run supabase:windows -- start
npm run supabase:windows -- reset
npm run supabase:windows -- test
npm run supabase:windows -- status
npm run supabase:windows -- stop
```

El script usa `supabase.cmd` y `ExecutionPolicy Bypass` sólo para ese proceso. Si aparece `LocalDbRunningError`, inicia Docker Desktop y verifica que el engine WSL 2 esté disponible.

## Seguridad y operación

- Supabase Auth es la autoridad de identidad.
- RLS es la autoridad de acceso a datos.
- El frontend sólo oculta o muestra superficies; no sustituye autorización.
- El registro de batalla usa control optimista de `version` para detectar concurrencia.
- Las funciones `SECURITY DEFINER` y sus permisos se mantienen mediante migraciones.
- Las tablas sensibles tienen RLS y políticas específicas por operación.
- `audit_log` es la tabla canónica de auditoría.
- Express limita el body JSON a 100 KB y añade headers básicos de seguridad.
- CORS se limita mediante `ALLOWED_ORIGINS`.
- No se deben incluir contraseñas, service role keys, tokens ni datos reales en el repositorio.
- Las cuentas administrativas deben crearse desde Supabase Dashboard y recibir rol explícito en `profiles`.

## Estado real: implementado, parcial y pendiente

| Área | Estado actual | Qué falta para considerarla completa |
|---|---|---|
| React/Vite/Express | Implementado | Elegir y validar un despliegue que publique también Express. |
| Torneos, participantes y check-in | Implementado en UI y contexto | Pruebas E2E y cierre de reglas operativas. |
| Eliminación simple | Implementado y probado parcialmente | Más casos de integración y avance persistido. |
| Eliminación doble | Parcial | Cruces reales del losers bracket, propagación y reset elegible. |
| Round robin | Implementado | Más cobertura de empates, byes y dos vueltas. |
| Swiss | Avanzado | Rondas configurables, emparejamiento por puntuación, BYEs y prevención de revancha; faltan escenarios E2E. |
| Desempates | Implementado en motor | Buchholz, Median-Buchholz y puntos configurables se aplican al cálculo; faltan casos oficiales adicionales. |
| Marcador local | Implementado | Trasladar todo el flujo crítico a operaciones remotas verificadas. |
| Batallas y penalizaciones RPC | Avanzado | Pruebas multi-cliente con cuentas reales. |
| Undo | Parcial avanzado | Permisos, motivo obligatorio, auditoría completa y reapertura autorizada. |
| Realtime | Implementado de forma parcial | Reconexión, idempotencia y pruebas de concurrencia en staging. |
| Stadium Display | Implementado | Desconexión visible, API pública y overlays externos. |
| RBAC y RLS | Avanzado | Matriz completa con cuentas persistentes de admin, organizer, referee y blader. |
| Invitaciones | Implementado con fallback de `mailto` | Desplegar y comprobar entrega transaccional de correo. |
| Rankings Excel | Implementado | Previsualización, versionado, rollback y auditoría del archivo. |
| Deck 3on3 | Implementado como herramienta local | Entidad persistente, asociación segura e historial de inspección. |
| Tier List | Placeholder honesto | Fuente oficial, publicación y trazabilidad de tiers. |
| Accesibilidad | Parcial | Auditoría automatizada, foco completo, teclado y axe. |
| Pruebas | Unitarias y SQL en crecimiento | Integración API, RLS por rol, E2E, accesibilidad y responsive. |

## Qué falta para cumplir el lanzamiento multiusuario

No se debe publicar como plataforma multiusuario hasta cerrar estos puntos:

### Bloqueadores P0

- [ ] Aplicar todas las migraciones en un proyecto Supabase de staging.
- [ ] Verificar RLS con cuentas reales de `admin`, `organizer`, `referee` y `blader`.
- [ ] Confirmar que ningún usuario puede leer o mutar un torneo fuera de su ámbito.
- [ ] Elegir un despliegue que publique frontend y Express, o separar formalmente la API.
- [ ] Probar creación, configuración, inicio, operación y cierre de un torneo desde un checkout limpio.
- [ ] Confirmar que no existe confirmación falsa cuando falla la red o Supabase.
- [ ] Probar backup y restauración.
- [ ] Mantener secretos fuera del bundle, repositorio, logs y tickets.

### Integridad del motor

- [ ] Completar eliminación doble real.
- [ ] Cubrir todos los casos de Swiss y desempates con pruebas.
- [ ] Definir reglas de empate por formato.
- [ ] Bloquear cambios incompatibles después de iniciar una etapa.
- [ ] Completar avance de matches, walk-over, descalificación, abandono y tercer lugar.
- [ ] Implementar reapertura autorizada con motivo y auditoría.

### Operación y datos

- [ ] Hacer persistentes los decks y el historial de Bey Check si forman parte del alcance del MVP.
- [ ] Implementar check-in con ventana temporal, auto-drop y re-siembra sólo si el producto lo requiere.
- [ ] Versionar importaciones de rankings y permitir rollback.
- [ ] Registrar actor, recurso, acción y timestamp en cada mutación crítica.
- [ ] Añadir logs estructurados, request IDs, métricas y alertas.
- [ ] Documentar rollback, rotación de secretos y recuperación ante incidentes.

### Calidad

- [ ] Añadir pruebas de integración con tokens y roles reales.
- [ ] Añadir pruebas E2E de login, invitación, torneo, bracket, arbitraje, rankings y estadio.
- [ ] Añadir auditoría de accesibilidad y pruebas en móvil, tablet, escritorio y proyector.
- [ ] Ejecutar `npm run lint`, `npm run test`, `npm run build` y las pruebas SQL desde checkout limpio.
- [ ] Ejecutar un smoke test del despliegue publicado, incluyendo `/api/health` y una mutación autenticada.

## Documentación relacionada

- `AUDITORIA_PLAN_ACCION.md`: auditoría técnica, cobertura del plan y riesgos conocidos.
- `PLAN_ACCION_PRODUCCION.md`: fases, backlog, criterios de aceptación y puertas de salida.
- `supabase/schema.sql`: esquema de referencia, RLS y funciones SQL.
- `supabase/migrations/`: historial reproducible de cambios de base de datos.
- `supabase/tests/`: pruebas SQL y de autorización.
- `.github/workflows/ci.yml`: validaciones de CI.
- `src/components/docs/SoftwareEngineeringGuide.tsx`: guía técnica visible dentro de APbey.

## Definición de listo

APbey podrá declararse listo para producción multiusuario cuando todos los bloqueadores P0 estén cerrados y exista evidencia de un torneo de staging con:

1. los cuatro roles operativos;
2. participantes cuyo número no sea potencia de dos;
3. generación y avance de etapas;
4. batallas, penalizaciones y undo;
5. refresh y reconexión durante la operación;
6. actualización Realtime en marcador y estadio;
7. importación y rollback de rankings;
8. revisión de auditoría;
9. backup y restauración;
10. despliegue reproducible desde un commit limpio.

La aplicación ya tiene una base funcional amplia; el trabajo restante debe priorizar autorización, persistencia transaccional, pruebas y operación antes de añadir más superficies de producto.
