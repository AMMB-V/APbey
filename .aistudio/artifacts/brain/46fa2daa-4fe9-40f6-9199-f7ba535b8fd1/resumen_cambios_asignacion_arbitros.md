# Reporte de Implementación: Asignación de Árbitros & Sistema Acero v1.0

Este documento reúne el desglose exhaustivo de los cambios realizados en el repositorio, la arquitectura de persistencia en Supabase PostgreSQL, los endpoints de backend implementados y la guía de navegación para la vista **"Asignación de Árbitros"**.

---

## 1. Resumen de Archivos Creados y Modificados

### A. Archivos Creados
| Archivo | Propósito |
| :--- | :--- |
| `src/acero.css` | Especificación completa de tokens de diseño **Acero Design System v1.0** (paleta oscura grafito/chasis/costura/acero/hueso/cobalto/cobre/target, tipografía `Plus Jakarta Sans` y `JetBrains Mono`). |
| `public/acero-iconos.svg` | Sprite SVG con iconos vectoriales oficiales del sistema Acero (`#i-arbitro`, `#i-grupos`, `#i-trofeo`, `#i-todos`, `#i-llave`, `#i-ok`, `#i-alerta`, `#i-reloj`, etc.). |
| `src/components/common/AceroIcon.tsx` | Componente React reutilizable y tipado para renderizar de manera limpia y eficiente los símbolos SVG del sprite Acero con control de dimensiones y color. |
| `src/lib/supabase/refereeAssignments.ts` | Capa de persistencia e integración con Supabase PostgreSQL. Gestiona la actualización de `groups.referee_id`, `matches.referee_id`, `tournament_referees` y `audit_log`, genera sentencias SQL reproducibles y provee sincronización dual (Supabase API REST + Backend Express + LocalStorage). |
| `src/components/admin/RefereeAssignmentView.tsx` | Vista principal de **"Asignación de Árbitros"** con interfaz Drag & Drop, panel de árbitros con badges de carga, zonas de soltado por etapa y por grupo, selector accesible para móviles, balanceo automático y visor modal de scripts SQL Supabase. |
| `data/referee_assignments.json` | Almacén JSON de persistencia local en el backend Express para registrar asignaciones y estados de sincronización. |

### B. Archivos Modificados
| Archivo | Modificación |
| :--- | :--- |
| `src/index.css` | Importación de `@import "./acero.css";` y clases utilitarias para soporte de animaciones, scrollbars estilizados y tokens de acero. |
| `src/context/TournamentContext.tsx` | Extensión del estado global de torneos con métodos dedicados: `assignRefereeToStage`, `unassignRefereeFromAll` y `autoBalanceRefereesAcrossGroups`. |
| `src/components/admin/AdminPanel.tsx` | Integración de pestañas en el panel de administración con selector activo para la vista **"Asignación de Árbitros"** (con conteo en vivo de asignados) y **"Invitaciones & Roles (RBAC)"**. |
| `server.ts` | Creación de endpoints RESTful: `GET /api/referees/assignments/:tournamentId` y `PUT /api/referees/assignments/:tournamentId` con persistencia en archivo y log de auditoría. |

---

## 2. Esquema de Base de Datos en Supabase (PostgreSQL)

La solución mapea las asignaciones de árbitros directamente a las tablas de Supabase:

```sql
-- 1. Tabla de Árbitros por Torneo (Relación M:N con estado)
CREATE TABLE IF NOT EXISTS tournament_referees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL,
    referee_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'standby', 'retired')),
    assigned_groups_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_id, referee_id)
);

-- 2. Asignación directa en Grupos de Fase de Grupos
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS referee_id TEXT;

-- 3. Asignación directa en Partidos
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS referee_id TEXT;

-- 4. Registro de Auditoría de Asignaciones
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    performed_by TEXT DEFAULT 'admin',
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Operaciones de Persistencia Generadas
Al asignar un árbitro a un grupo o fase, el módulo ejecuta:
1. `UPDATE groups SET referee_id = 'ref-1' WHERE id = 'group-a';`
2. `UPDATE matches SET referee_id = 'ref-1' WHERE stage_id = 'stage-1' AND group_id = 'group-a';`
3. `INSERT INTO tournament_referees ... ON CONFLICT (tournament_id, referee_id) DO UPDATE ...;`
4. `INSERT INTO audit_log (event_type, table_name, record_id, payload) VALUES ('REFEREE_ASSIGNED', 'groups', 'group-a', '{"referee_id":"ref-1"}');`

---

## 3. Endpoints del Backend Express

El servidor local (`server.ts`) expone las siguientes rutas con validación de datos:

- **`GET /api/referees/assignments/:tournamentId`**:
  Obtiene el mapeo actual de asignaciones por grupo y por fase para el torneo especificado.
  
- **`PUT /api/referees/assignments/:tournamentId`**:
  Actualiza atómicamente el mapa de asignaciones, calcula las cargas de trabajo por árbitro y genera la entrada correspondiente en el registro de auditoría.

---

## 4. Características de la Interfaz "Asignación de Árbitros"

1. **Panel Lateral de Árbitros (Pool de Jueces)**:
   - Filtro por nombre o alias.
   - Indicadores de carga de trabajo (p. ej., `0 grupos`, `1 grupo`, etc.).
   - Tarjetas arrastrables con atributo HTML5 nativo `draggable="true"` e icono `#i-arbitro`.
   - Botón de auto-distribución equitativa (*"Distribuir Equitativamente"*).

2. **Zonas de Soltado (Drop Targets)**:
   - **Soltado Global por Fase**: Permite asignar un juez supervisor a toda la etapa.
   - **Soltado por Grupo Individual**: Tarjetas representativas para `Grupo A`, `Grupo B`, `Grupo C`, etc., que reaccionan visualmente con un resplandor cobalto al arrastrar sobre ellas (`dragover` y `drop`).
   - Botón individual de desasignación rápida (`✕`).
   - Selector alternativo desplegable `<select>` en cada tarjeta para garantizar accesibilidad completa en pantallas táctiles y dispositivos móviles.

3. **Herramientas de Sincronización y Supabase**:
   - Botón **"Guardar en Supabase"**: Dispara la persistencia concurrente con feedback visual y badge de sincronización.
   - Botón **"Ver SQL Supabase"**: Abre un modal con el script SQL generado en tiempo real, listo para inspeccionar o copiar directamente al SQL Editor de Supabase.
