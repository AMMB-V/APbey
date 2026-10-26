import React, { useState } from 'react';
import { SUPABASE_MIGRATION_SQL } from '../../lib/supabase/schema';
import {
  BookOpen,
  Copy,
  Check,
  Download,
  Terminal,
  Database,
  Globe,
  GitBranch,
  ShieldCheck,
  Cpu,
  Layers,
} from 'lucide-react';

export const SoftwareEngineeringGuide: React.FC = () => {
  const [copiedSql, setCopiedSql] = useState(false);

  const copySql = () => {
    navigator.clipboard.writeText(SUPABASE_MIGRATION_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const downloadSqlFile = () => {
    const blob = new Blob([SUPABASE_MIGRATION_SQL], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '20260301_initial_schema.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Banner Principal de Ingeniería */}
      <div className="bg-neutral-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-neutral-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--polvo)] uppercase tracking-widest mb-1">
              <span>Arquitectura & Ciclo de Software</span>
              <span>·</span>
              <span>Documentación Técnica</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Especificación de Ingeniería para Torneos Beyblade X
            </h1>
            <p className="text-neutral-300 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
              Guía técnica para ejecutar el proyecto en AI Studio, sincronizar con GitHub, desplegar en Vercel y conectar con Supabase (PostgreSQL 15, RLS y Realtime).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadSqlFile}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar SQL Schema (.sql)
            </button>
          </div>
        </div>
      </div>

      {/* 1. ¿Qué se necesita para realizar el proyecto en AI Studio? */}
      <section className="bg-[var(--chasis)] rounded-xl border border-[var(--costura)] p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--costura)]">
          <Terminal className="w-5 h-5 text-[var(--hueso)]" />
          <h2 className="text-base font-bold text-[var(--hueso)]">
            1. Requisitos para Desarrollar el Proyecto a través de AI Studio
          </h2>
        </div>

        <div className="text-xs text-[var(--polvo)] space-y-3 leading-relaxed">
          <p>
            AI Studio provee un entorno de desarrollo completo con servidor Vite/Node.js, soporte para TypeScript estricto, Tailwind CSS y componentes React interactivos. Para llevar este prototipo funcional a producción se articulan los siguientes componentes:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-[var(--fondo)] rounded-lg border border-[var(--costura)]">
              <div className="font-bold text-[var(--hueso)] mb-1 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[var(--polvo)]" /> Motor TypeScript Puro
              </div>
              <p className="text-[var(--polvo)] text-[11px]">
                Desacoplado de la base de datos en <code className="bg-neutral-200 px-1 rounded">src/lib/engine/</code>. Permite generar brackets, resolver desempates y calcular siembras con pruebas unitarias rápidas.
              </p>
            </div>

            <div className="p-4 bg-[var(--fondo)] rounded-lg border border-[var(--costura)]">
              <div className="font-bold text-[var(--hueso)] mb-1 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-700" /> Supabase Backend
              </div>
              <p className="text-[var(--polvo)] text-[11px]">
                PostgreSQL relacional con RLS, RPC transaccional <code className="bg-neutral-200 px-1 rounded">record_battle</code> para evitar condiciones de carrera entre árbitros, y Supabase Realtime.
              </p>
            </div>

            <div className="p-4 bg-[var(--fondo)] rounded-lg border border-[var(--costura)]">
              <div className="font-bold text-[var(--hueso)] mb-1 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-700" /> Vercel Hosting
              </div>
              <p className="text-[var(--polvo)] text-[11px]">
                Arquitectura sin estado en Vercel con Server Actions / Route Handlers, optimizada para móviles para que los árbitros puntúen desde el borde del estadio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Flujo de Trabajo en GitHub y CI/CD */}
      <section className="bg-[var(--chasis)] rounded-xl border border-[var(--costura)] p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--costura)]">
          <GitBranch className="w-5 h-5 text-[var(--hueso)]" />
          <h2 className="text-base font-bold text-[var(--hueso)]">
            2. Repositorio en GitHub y Estrategia de Ramas
          </h2>
        </div>

        <div className="text-xs text-[var(--polvo)] space-y-3 leading-relaxed">
          <p>
            Siguiendo las mejores prácticas de ingeniería de software (y las pautas de <code className="font-mono bg-[var(--fondo)] px-1 py-0.5 rounded">CLAUDE.md</code>):
          </p>

          <ul className="list-disc pl-5 space-y-1.5 text-[var(--polvo)]">
            <li>
              <strong>Rama principal (<code className="font-mono text-[var(--hueso)]">main</code>):</strong> Código de producción desplegado automáticamente a Vercel.
            </li>
            <li>
              <strong>Ramas por feature (<code className="font-mono text-[var(--hueso)]">feat/nombre-feature</code>):</strong> Cada módulo (ej: <code className="font-mono">feat/swiss-engine</code>, <code className="font-mono">feat/referee-mobile</code>) se desarrolla en su propia rama con pull request y revisión de tests.
            </li>
            <li>
              <strong>CI/CD con GitHub Actions:</strong> Configurar un workflow <code className="font-mono text-[var(--hueso)]">.github/workflows/ci.yml</code> que ejecute:
              <div className="bg-neutral-950 text-neutral-200 p-3 rounded-lg font-mono text-[11px] mt-1.5 space-y-1">
                <div>- npm run lint</div>
                <div>- npm run test # Vitest unit test suite para src/lib/engine/</div>
                <div>- npm run build # Verificación de compilación limpia</div>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* 3. Base de Datos Supabase (PostgreSQL 15, RLS & Procedimientos) */}
      <section className="bg-[var(--chasis)] rounded-xl border border-[var(--costura)] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--costura)]">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-[var(--hueso)]">
              3. Esquema SQL para Supabase (Migración Completa)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copySql}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-[var(--costura)] hover:bg-[var(--fondo)] text-[var(--hueso)] transition-colors flex items-center gap-1.5"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSql ? 'Copiado' : 'Copiar SQL'}
            </button>
          </div>
        </div>

        <div className="text-xs text-[var(--polvo)] space-y-2">
          <p>
            Este script SQL incluye todas las tablas de la especificación (perfiles, torneos, etapas, grupos, rondas, matches, batallas, tarjetas y bitácora de auditoría), junto con sus políticas de seguridad RLS y la función transaccional <code className="font-mono bg-[var(--fondo)] px-1 py-0.5 rounded text-[var(--hueso)]">record_battle</code>.
          </p>

          <div className="relative">
            <pre className="bg-neutral-950 text-neutral-200 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72 leading-relaxed">
              {SUPABASE_MIGRATION_SQL.slice(0, 1800)}
              {'\n... [Haz clic en "Descargar SQL Schema" para ver las 350 líneas completas] ...'}
            </pre>
          </div>
        </div>
      </section>

      {/* 4. Despliegue en Vercel */}
      <section className="bg-[var(--chasis)] rounded-xl border border-[var(--costura)] p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--costura)]">
          <Globe className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-[var(--hueso)]">
            4. Despliegue en Vercel & Variables de Entorno
          </h2>
        </div>

        <div className="text-xs text-[var(--polvo)] space-y-3 leading-relaxed">
          <p>
            Para desplegar en Vercel con conexión a Supabase, agrega las siguientes variables de entorno en el panel de Vercel (<code className="font-mono bg-[var(--fondo)] px-1 py-0.5 rounded">Project Settings → Environment Variables</code>):
          </p>

          <div className="bg-[var(--fondo)] border border-[var(--costura)] rounded-lg p-3 font-mono text-[11px] space-y-1.5 text-[var(--hueso)]">
            <div><span className="text-blue-700 font-bold">NEXT_PUBLIC_SUPABASE_URL</span>=https://xyzcompany.supabase.co</div>
            <div><span className="text-blue-700 font-bold">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</div>
            <div><span className="text-rose-700 font-bold">SUPABASE_SERVICE_ROLE_KEY</span>=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... <span className="text-[var(--polvo)] font-sans italic">(Solo servidor)</span></div>
          </div>
        </div>
      </section>

      {/* 5. Etapas de Desarrollo (Plan de 8 Fases del PDF) */}
      <section className="bg-[var(--chasis)] rounded-xl border border-[var(--costura)] p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--costura)]">
          <Layers className="w-5 h-5 text-[var(--hueso)]" />
          <h2 className="text-base font-bold text-[var(--hueso)]">
            5. Plan de Ejecución por Etapas de Desarrollo (Fases 1 a 8)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-[var(--fondo)] rounded-lg border border-[var(--costura)] space-y-1">
            <span className="font-mono text-[10px] font-bold text-blue-700 uppercase">Fase 1 · Fundamentos</span>
            <div className="font-bold text-[var(--hueso)]">Repositorio, Supabase & Auth</div>
            <p className="text-[var(--polvo)] text-[11px]">
              Estructura Next.js/Vite, migraciones SQL en Supabase, perfiles y políticas RLS para control de acceso estricto.
            </p>
          </div>

          <div className="p-3.5 bg-[var(--fondo)] rounded-lg border border-[var(--costura)] space-y-1">
            <span className="font-mono text-[10px] font-bold text-blue-700 uppercase">Fase 2 · Motor de Torneos</span>
            <div className="font-bold text-[var(--hueso)]">Funciones Puras TypeScript</div>
            <p className="text-[var(--polvo)] text-[11px]">
              Single Elim, Double Elim, Round Robin y Swiss implementados en <code className="font-mono">src/lib/engine/</code> con cobertura unitaria.
            </p>
          </div>

          <div className="p-3.5 bg-[var(--fondo)] rounded-lg border border-[var(--costura)] space-y-1">
            <span className="font-mono text-[10px] font-bold text-blue-700 uppercase">Fase 3 · Participantes</span>
            <div className="font-bold text-[var(--hueso)]">Inscripción Manual & Siembra</div>
            <p className="text-[var(--polvo)] text-[11px]">
              Carga individual y en bloque (walk-in), check-in individual y masivo, ordenamiento manual y aleatorio de siembras.
            </p>
          </div>

          <div className="p-3.5 bg-[var(--fondo)] rounded-lg border border-[var(--costura)] space-y-1">
            <span className="font-mono text-[10px] font-bold text-blue-700 uppercase">Fase 4 · Brackets & Grupos</span>
            <div className="font-bold text-[var(--hueso)]">Diseño Challonge Interactivo</div>
            <p className="text-[var(--polvo)] text-[11px]">
              Visualización de llaves con horizontal scroll, tablas de posiciones en tiempo real y cálculo de clasificados.
            </p>
          </div>

          <div className="p-3.5 bg-[var(--fondo)] rounded-lg border border-[var(--costura)] space-y-1">
            <span className="font-mono text-[10px] font-bold text-blue-700 uppercase">Fase 5 · Panel de Árbitro</span>
            <div className="font-bold text-[var(--hueso)]">Consola Móvil de Estadio</div>
            <p className="text-[var(--polvo)] text-[11px]">
              Botones táctiles grandes para Spin, Over, Burst y Xtreme. Sistema de faltas (+1 pt al rival), tarjetas y deshacer.
            </p>
          </div>

          <div className="p-3.5 bg-[var(--fondo)] rounded-lg border border-[var(--costura)] space-y-1">
            <span className="font-mono text-[10px] font-bold text-blue-700 uppercase">Fase 6 · Tiempo Real & Público</span>
            <div className="font-bold text-[var(--hueso)]">Supabase Realtime & Compartir</div>
            <p className="text-[var(--polvo)] text-[11px]">
              Actualización instantánea para espectadores sin recargar la página, exportación CSV de resultados y enlaces públicos.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
