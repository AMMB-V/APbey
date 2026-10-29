import React, { useState } from 'react';
import { Users, BookOpen, Shield, Flame, AlertTriangle, ExternalLink, HelpCircle, Sparkles } from 'lucide-react';

export const CommunityView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'rules' | 'finishes' | 'clubs' | 'glossary'>('rules');

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 w-full flex flex-col gap-5">
      {/* View Header with accessible h1 */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--hueso)] font-display tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-teal-400 shrink-0" aria-hidden="true" />
          <span>Comunidad & Reglamento Oficial WBO</span>
        </h1>
        <p className="text-xs text-[var(--acero)] mt-0.5">
          Reglamento estandarizado de Beyblade X, glosario técnico y sedes oficiales de juego
        </p>
      </div>

      {/* Navigation tabs */}
      <div
        role="tablist"
        aria-label="Secciones de comunidad"
        className="grid grid-cols-2 sm:grid-cols-4 p-1 bg-[var(--chasis)] border border-[var(--costura)] rounded-2xl gap-1"
      >
        <button
          role="tab"
          type="button"
          aria-selected={activeSection === 'rules'}
          onClick={() => setActiveSection('rules')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
            activeSection === 'rules'
              ? 'bg-[var(--cobalto)] text-[var(--tinta)] font-black shadow-xs'
              : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Reglas WBO</span>
        </button>

        <button
          role="tab"
          type="button"
          aria-selected={activeSection === 'finishes'}
          onClick={() => setActiveSection('finishes')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
            activeSection === 'finishes'
              ? 'bg-[var(--cobalto)] text-[var(--tinta)] font-black shadow-xs'
              : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Puntajes & Finishes</span>
        </button>

        <button
          role="tab"
          type="button"
          aria-selected={activeSection === 'glossary'}
          onClick={() => setActiveSection('glossary')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
            activeSection === 'glossary'
              ? 'bg-[var(--cobalto)] text-[var(--tinta)] font-black shadow-xs'
              : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Glosario Técnico</span>
        </button>

        <button
          role="tab"
          type="button"
          aria-selected={activeSection === 'clubs'}
          onClick={() => setActiveSection('clubs')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
            activeSection === 'clubs'
              ? 'bg-[var(--cobalto)] text-[var(--tinta)] font-black shadow-xs'
              : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Clubes & Sedes</span>
        </button>
      </div>

      {/* Rules Section */}
      {activeSection === 'rules' && (
        <div className="flex flex-col gap-4 bg-[var(--chasis)] border border-[var(--costura)] rounded-3xl p-5 shadow-xl">
          <h2 className="text-base font-black text-[var(--hueso)] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[var(--cobalto)]" />
            <span>Procedimiento Oficial de Combate WBO</span>
          </h2>

          <div className="space-y-3 text-xs sm:text-sm text-[var(--hueso)]/90 leading-relaxed">
            <div className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)]">
              <span className="font-bold text-[var(--cobalto)] block text-xs uppercase mb-1">
                1. Selección de Deck (Formato 3on3)
              </span>
              <p>
                Cada blader presenta una caja o soporte con exactamente tres Beyblades válidos. Ningún componente
                (Blade, Ratchet o Bit) puede repetirse en los tres Beys del deck. El orden de combate se decide en secreto o con cartas de orden según el formato de la ronda.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)]">
              <span className="font-bold text-[var(--cobre)] block text-xs uppercase mb-1">
                2. Llamada de Lanzamiento Oficial
              </span>
              <p>
                El árbitro da la señal y ambos jugadores deben sincronizarse con la llamada reglamentaria:
                <strong className="text-[var(--hueso)] block mt-1 font-mono text-sm">
                  &quot;3... 2... 1... GO SHOOT!&quot;
                </strong>
                El lanzamiento debe ejecutarse de manera que el Bey caiga limpiamente dentro del estadio Xtreme sin invadir la línea central antes del contacto con el piso.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)]">
              <span className="font-bold text-emerald-400 block text-xs uppercase mb-1">
                3. Meta de Puntuación
              </span>
              <p>
                Los partidos estándar se disputan a <strong>4 puntos</strong> (primero en alcanzar 4 gana el match).
                Las finales de campeonato o de cuadro principal pueden extenderse a <strong>7 puntos</strong> al mejor de 3 sets por decisión de los organizadores.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Finishes Section */}
      {activeSection === 'finishes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-3xl bg-[var(--chasis)] border-2 border-[var(--costura)] flex flex-col justify-between gap-3 shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black text-[var(--hueso)]">Spin Finish</span>
                <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full bg-[var(--grafito)] text-[var(--cobalto)] border border-[var(--costura)]">
                  +1 Punto
                </span>
              </div>
              <p className="text-xs text-[var(--acero)] leading-relaxed">
                Ocurre cuando el Beyblade rival se detiene por completo mientras tu Beyblade continúa girando dentro del estadio.
              </p>
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold font-mono">
              Frecuencia: ~40% de los combates
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-[var(--chasis)] border-2 border-emerald-900/60 flex flex-col justify-between gap-3 shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black text-emerald-300">Over Finish</span>
                <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  +2 Puntos
                </span>
              </div>
              <p className="text-xs text-[var(--acero)] leading-relaxed">
                El Beyblade rival sale despedido de la zona de batalla hacia cualquiera de los bolsillos laterales (Over Zones) y no regresa.
              </p>
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold font-mono">
              Frecuencia: ~30% de los combates
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-[var(--chasis)] border-2 border-pink-900/60 flex flex-col justify-between gap-3 shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black text-pink-300">Burst Finish</span>
                <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full bg-pink-950 text-pink-400 border border-pink-800">
                  +2 Puntos
                </span>
              </div>
              <p className="text-xs text-[var(--acero)] leading-relaxed">
                El impacto provoca que el Beyblade rival se desarme en sus componentes individuales (Blade, Ratchet y Bit separados).
              </p>
            </div>
            <div className="text-[11px] text-pink-400 font-semibold font-mono">
              Frecuencia: ~20% de los combates
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-[var(--chasis)] border-2 border-purple-900/60 flex flex-col justify-between gap-3 shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black text-purple-200">Xtreme Finish</span>
                <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                  +3 Puntos
                </span>
              </div>
              <p className="text-xs text-[var(--acero)] leading-relaxed">
                El Beyblade rival es expulsado a través de la zona de escape acelerada por el Xtreme Dash Pocket (apertura central).
              </p>
            </div>
            <div className="text-[11px] text-purple-300 font-semibold font-mono">
              Frecuencia: ~10% de los combates (Máxima puntuación)
            </div>
          </div>
        </div>
      )}

      {/* Glossary Section */}
      {activeSection === 'glossary' && (
        <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-3xl p-5 shadow-xl flex flex-col gap-3">
          <h2 className="text-base font-black text-[var(--hueso)] mb-1">
            Glosario Oficial de Términos Beyblade X
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)]">
              <dt className="font-black text-[var(--cobalto)] text-sm mb-0.5">Xtreme Line</dt>
              <dd className="text-[var(--acero)] leading-snug">
                Engranaje perimetral dentado del estadio donde los Bits con piñón se enganchan para acelerar a velocidades supersónicas.
              </dd>
            </div>
            <div className="p-3 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)]">
              <dt className="font-black text-[var(--cobre)] text-sm mb-0.5">Ratchet</dt>
              <dd className="text-[var(--acero)] leading-snug">
                Parte intermedia del Beyblade que bloquea la cuchilla y determina la altura (60mm u 80mm) y el número de salientes.
              </dd>
            </div>
            <div className="p-3 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)]">
              <dt className="font-black text-emerald-400 text-sm mb-0.5">Bit</dt>
              <dd className="text-[var(--acero)] leading-snug">
                Punta inferior que tiene contacto con el suelo y posee engranajes integrados para el mecanismo Xtreme Dash.
              </dd>
            </div>
            <div className="p-3 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)]">
              <dt className="font-black text-purple-400 text-sm mb-0.5">Deck 3on3</dt>
              <dd className="text-[var(--acero)] leading-snug">
                Alineación reglamentaria de tres Beys con componentes estrictamente únicos y sin repetición de piezas.
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Clubs & Venues Section */}
      {activeSection === 'clubs' && (
        <div className="flex flex-col gap-4">
          <div className="p-5 rounded-3xl bg-[var(--chasis)] border border-[var(--costura)] shadow-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-[var(--hueso)]">
                Comunidad Oficial Beyblade Panamá
              </h2>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold">
                Activa
              </span>
            </div>
            <p className="text-xs text-[var(--acero)] leading-relaxed">
              Sede oficial para torneos presenciales, rankings mensuales y clínicas de armado de decks competitivos en Ciudad de Panamá.
            </p>
            <div className="flex items-center gap-3 text-xs text-[var(--hueso)] mt-2 font-mono">
              <span>📍 Parque Omar & Albrook Mall</span>
              <span>• Frecuencia: Quincenal</span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-[var(--chasis)] border border-[var(--costura)] shadow-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-[var(--hueso)]">
                World Beyblade Organization (WBO)
              </h2>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 font-bold">
                Internacional
              </span>
            </div>
            <p className="text-xs text-[var(--acero)] leading-relaxed">
              Organismo rector internacional que homologa las reglas, medidas de seguridad y el formato competitivo global de Beyblade X.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
