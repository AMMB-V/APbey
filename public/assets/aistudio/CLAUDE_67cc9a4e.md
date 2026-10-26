# CLAUDE.md — Beyblade Tournament Platform

> Este archivo es la fuente de verdad para Claude Code. Léelo al inicio de cada sesión.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router, TypeScript strict) |
| Estilos | Tailwind CSS + shadcn/ui |
| Base de datos | Supabase (Postgres 15, RLS, Realtime) |
| Auth | Supabase Auth (email magic link + OAuth Google) |
| Hosting | Vercel |
| CI/CD | GitHub Actions |
| Tests unitarios | Vitest |
| Tests E2E | Playwright |
| Migraciones | Supabase CLI (`supabase/migrations/`) |

---

## Estructura del proyecto

```
src/
  app/                      # Next.js App Router
    (public)/               # Rutas públicas (vista de torneo)
    (admin)/                # Panel admin
    (organizer)/            # Panel organizador
    (referee)/              # Panel árbitro (mobile-first)
    api/                    # Route Handlers
  components/
    ui/                     # shadcn/ui primitivos
    tournament/             # Bracket, grupos, standings
    referee/                # Widgets de arbitraje
  lib/
    supabase/               # Clientes server/client/middleware
    engine/                 # Motor de torneos (puro, sin I/O)
      formats/              # single-elim, double-elim, round-robin, swiss
      seeding.ts
      advancement.ts
      tiebreakers.ts
    validations/            # zod schemas
  types/                    # tipos globales (derivados de DB)
supabase/
  migrations/               # SQL versionado
  seed.sql                  # Datos de prueba
```

---

## Convenciones de código

- **TypeScript strict**: no `any`, no `as`, siempre inferir desde tipos de Supabase generados.
- **Server Components por defecto**. Usar `"use client"` solo cuando sea necesario (eventos, estado local).
- **Mutations vía Server Actions** (`"use server"`), nunca fetch desde cliente a `/api` para mutaciones.
- **Route Handlers** (`/api/...`) solo para webhooks y SSE (Realtime público).
- **zod** para validar todos los inputs (forms y API).
- Nombres de archivo: `kebab-case`. Nombres de función/componente: `PascalCase` (componentes), `camelCase` (funciones).
- Cada feature en su propia rama: `feat/<nombre>`. Un PR por feature. Tests obligatorios antes de merge.
- Commits en español, en imperativo: `Agrega motor Swiss`, `Corrige cálculo de desempates`.

---

## Reglas de negocio — Torneos de Beyblade

### Roles
| Rol | Capacidades |
|-----|------------|
| `admin` | Todo. Crea/elimina organizadores y árbitros por invitación. |
| `organizer` | Crea y edita torneos, añade participantes, configura etapas. |
| `referee` | Registra resultados de partidas en torneos asignados. |
| `blader` | Jugador registrado. Puede ver su historial. |
| `public` | Solo lectura (bracket, standings en tiempo real, sin cuenta). |

### Formatos de torneo
- **Single Elimination**: pierde = eliminado.
- **Double Elimination**: pierde una vez = bracket de perdedores; pierde dos = eliminado.
- **Round Robin**: todos contra todos en el grupo.
- **Swiss**: rondas por puntaje similar, sin eliminación.
- **Etapas encadenadas**: el torneo puede tener N etapas en secuencia (ej: Swiss → Grupos → SE desde 16vos).

### Tipos de match (WBO)
- `1on1`: 1 Bey cada uno.
- `deck`: mazo de 3 combos, se declara antes de cada batalla.
- `3on3`: cada jugador usa 3 combos distintos.
- `5G`: formato legacy.

### Puntuación de batallas (valores por defecto, configurables por torneo)
| Finish | Puntos |
|--------|--------|
| Spin (sobrevive) | 1 |
| Over (sale de la arena) | 2 |
| Burst (se desintegra) | 2 |
| Xtreme (toca zona Xtreme) | 3 |

### Puntos para ganar un match (configurables por etapa)
- Fase de grupos: 4 puntos.
- Eliminatoria final: 7 puntos.

### Avance de fase
- Grupos: pasan los primeros N de cada grupo (configurable por el organizador).
- Swiss: corte al top N tras las rondas definidas.
- Falta: el rival recibe 1 punto por defecto.

### Desempates (configurables por etapa, en orden)
1. Victorias (W)
2. Diferencia de puntos (Δpts)
3. Enfrentamiento directo (head-to-head)
4. Buchholz (Swiss)
5. Sorteo

### Reglas de deck (3on3)
- 3 combos distintos; no puede repetir partes con el mismo nombre de pieza.
- Lista de partes prohibidas configurable por torneo.
- Reordenamiento secreto del mazo en ronda decisiva (4ª batalla si hay empate en 3on3).

### Arbitraje
- Cada batalla se registra individualmente: combo usado, tipo de finish, puntos anotados.
- Un match puede reabrirse con bitácora de cambios (quién, cuándo, motivo).
- Tarjetas: amarilla (repetición sin puntos), roja (descalificación de batalla).
- Bey Check: inspección previa al match, con posibilidad de sustitución (1 por GP final).

---

## Comandos frecuentes

```bash
# Desarrollo local
pnpm dev

# Supabase local
supabase start
supabase db reset        # aplica todas las migraciones + seed
supabase gen types typescript --local > src/types/supabase.ts

# Tests
pnpm test                # vitest
pnpm test:e2e            # playwright

# Lint y formato
pnpm lint
pnpm format
```

---

## Variables de entorno necesarias

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # solo en servidor, nunca en cliente
```

---

## Orden de desarrollo (MVP)

1. **Migraciones SQL + RLS** (esquema completo).
2. **Motor de torneos** (`src/lib/engine/`) con tests unitarios.
3. **Server Actions** (crear torneo, añadir participantes, registrar resultado).
4. **UI — Editor de torneo** (bracket + grupos, drag & drop seeding).
5. **UI — Panel árbitro** (mobile-first, captura de batallas).
6. **UI — Vista pública** (Realtime via SSE).
7. **E2E y CI/CD**.
