import React, { useState } from 'react';
import { Shield, Sparkles, Filter, Award } from 'lucide-react';

interface TierItem {
  id: string;
  name: string;
  type: 'Blade' | 'Ratchet' | 'Bit';
  tier: 'S' | 'A' | 'B' | 'C';
  category: 'Ataque' | 'Defensa' | 'Resistencia' | 'Equilibrio';
  weight?: string;
  winRate: string;
  notes: string;
}

const TIER_DATA: TierItem[] = [
  // Tier S
  { id: '1', name: 'Phoenix Wing', type: 'Blade', tier: 'S', category: 'Ataque', weight: '38.2g', winRate: '68.4%', notes: 'Impacto destructivo superior y retención de inercia.' },
  { id: '2', name: '9-60', type: 'Ratchet', tier: 'S', category: 'Equilibrio', weight: '6.4g', winRate: '67.1%', notes: 'Máxima resistencia a desarmes Burst Finish.' },
  { id: '3', name: 'Ball (B)', type: 'Bit', tier: 'S', category: 'Resistencia', weight: '2.1g', winRate: '65.9%', notes: 'Estabilidad de giro prolongada y precesión óptima.' },
  { id: '4', name: 'Hells Scythe', type: 'Blade', tier: 'S', category: 'Equilibrio', weight: '33.8g', winRate: '64.5%', notes: 'Equilibrio todoterreno con retroceso controlado.' },
  { id: '5', name: 'Point (P)', type: 'Bit', tier: 'S', category: 'Equilibrio', weight: '2.3g', winRate: '63.8%', notes: 'Alternancia pasiva en el centro y agresión periférica.' },

  // Tier A
  { id: '6', name: 'Shark Edge', type: 'Blade', tier: 'A', category: 'Ataque', weight: '34.5g', winRate: '60.2%', notes: 'Cuchillas en rampa para Burst Finishes instantáneos.' },
  { id: '7', name: '3-60', type: 'Ratchet', tier: 'A', category: 'Ataque', weight: '6.2g', winRate: '59.8%', notes: 'Excelente centro de gravedad bajo para combos ofensivos.' },
  { id: '8', name: 'Flat (F)', type: 'Bit', tier: 'A', category: 'Ataque', weight: '2.2g', winRate: '58.7%', notes: 'Aceleración rápida sobre el Xtreme Line.' },
  { id: '9', name: 'Wizard Arrow', type: 'Blade', tier: 'A', category: 'Resistencia', weight: '31.9g', winRate: '57.4%', notes: 'Gran resistencia al giro exterior.' },
  { id: '10', name: '5-60', type: 'Ratchet', tier: 'A', category: 'Defensa', weight: '6.5g', winRate: '56.9%', notes: 'Distribución pentagonal que amortigua impactos.' },
  { id: '11', name: 'Rush (R)', type: 'Bit', tier: 'A', category: 'Ataque', weight: '2.2g', winRate: '56.1%', notes: 'Patrón ofensivo con mejor retención de estamina que Flat.' },

  // Tier B
  { id: '12', name: 'Knight Shield', type: 'Blade', tier: 'B', category: 'Defensa', weight: '32.4g', winRate: '51.3%', notes: 'Defensa sólida pero susceptible a sobregiro.' },
  { id: '13', name: '4-60', type: 'Ratchet', tier: 'B', category: 'Defensa', weight: '6.1g', winRate: '50.8%', notes: 'Estándar balanceado en 60mm.' },
  { id: '14', name: 'Needle (N)', type: 'Bit', tier: 'B', category: 'Defensa', weight: '2.1g', winRate: '49.5%', notes: 'Defensa central pero fácil de desestabilizar.' },
  { id: '15', name: 'Viper Tail', type: 'Blade', tier: 'B', category: 'Resistencia', weight: '34.1g', winRate: '48.9%', notes: 'Tres hojas descendentes con buen recoil.' },

  // Tier C
  { id: '16', name: 'Rhino Horn', type: 'Blade', tier: 'C', category: 'Defensa', weight: '33.1g', winRate: '43.2%', notes: 'Diámetro reducido y alcance limitado.' },
  { id: '17', name: '3-80', type: 'Ratchet', tier: 'C', category: 'Ataque', weight: '6.5g', winRate: '42.1%', notes: 'Altura de 80mm deja el trinquete muy expuesto.' },
  { id: '18', name: 'High Needle (HN)', type: 'Bit', tier: 'C', category: 'Defensa', weight: '2.4g', winRate: '41.0%', notes: 'Excesiva altura compromete estabilidad.' },
];

export const TierListView: React.FC = () => {
  const [filterType, setFilterType] = useState<'All' | 'Blade' | 'Ratchet' | 'Bit'>('All');
  const [filterCategory, setFilterCategory] = useState<'All' | 'Ataque' | 'Defensa' | 'Resistencia' | 'Equilibrio'>('All');

  const filteredItems = TIER_DATA.filter((item) => {
    if (filterType !== 'All' && item.type !== filterType) return false;
    if (filterCategory !== 'All' && item.category !== filterCategory) return false;
    return true;
  });

  const tierColors = {
    S: { badge: 'bg-rose-500 text-black', border: 'border-rose-500/60', title: 'Tier S — Meta Dominante' },
    A: { badge: 'bg-amber-400 text-black', border: 'border-amber-400/60', title: 'Tier A — Altamente Competitivo' },
    B: { badge: 'bg-emerald-400 text-black', border: 'border-emerald-400/60', title: 'Tier B — Opciones Viables' },
    C: { badge: 'bg-blue-400 text-black', border: 'border-blue-400/60', title: 'Tier C — Situacional / Especial' },
  };

  const tiers: Array<'S' | 'A' | 'B' | 'C'> = ['S', 'A', 'B', 'C'];

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 w-full flex flex-col gap-5">
      {/* View Header with accessible h1 */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--hueso)] font-display tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-rose-400 shrink-0" aria-hidden="true" />
          <span>Tier List Competitiva Beyblade X</span>
        </h1>
        <p className="text-xs text-[var(--acero)] mt-0.5">
          Clasificación oficial basada en ratio de victorias en torneos WBO
        </p>
      </div>

      {/* Filter Bar with accessible buttons */}
      <div className="bg-[var(--chasis)] border border-[var(--costura)] p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        {/* Component Type Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-[var(--acero)] mr-1">Pieza:</span>
          {(['All', 'Blade', 'Ratchet', 'Bit'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold min-h-[38px] transition-colors ${
                filterType === t
                  ? 'bg-[var(--cobalto)] text-[var(--tinta)] shadow-xs'
                  : 'bg-[var(--grafito)] text-[var(--acero)] hover:text-[var(--hueso)]'
              }`}
            >
              {t === 'All' ? 'Todas' : t}
            </button>
          ))}
        </div>

        {/* Archetype Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-[var(--acero)] mr-1">Tipo:</span>
          {(['All', 'Ataque', 'Defensa', 'Resistencia', 'Equilibrio'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilterCategory(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold min-h-[38px] transition-colors ${
                filterCategory === c
                  ? 'bg-amber-400 text-black shadow-xs'
                  : 'bg-[var(--grafito)] text-[var(--acero)] hover:text-[var(--hueso)]'
              }`}
            >
              {c === 'All' ? 'Todos' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Tier Sections */}
      <div className="flex flex-col gap-6">
        {tiers.map((tier) => {
          const itemsInTier = filteredItems.filter((item) => item.tier === tier);
          if (itemsInTier.length === 0) return null;
          const meta = tierColors[tier];

          return (
            <section
              key={tier}
              aria-labelledby={`tier-heading-${tier}`}
              className={`bg-[var(--chasis)] border-2 ${meta.border} rounded-3xl p-4 sm:p-5 flex flex-col gap-3 shadow-xl`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--costura)]">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center ${meta.badge}`}>
                    {tier}
                  </span>
                  <h2 id={`tier-heading-${tier}`} className="text-sm sm:text-base font-black text-[var(--hueso)]">
                    {meta.title}
                  </h2>
                </div>
                <span className="text-xs text-[var(--acero)] font-mono">
                  {itemsInTier.length} {itemsInTier.length === 1 ? 'componente' : 'componentes'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {itemsInTier.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] flex flex-col justify-between gap-2 shadow-xs hover:border-[var(--acero)] transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-black text-[var(--hueso)] truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--chasis)] text-[var(--acero)]">
                          {item.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--acero)] mb-1.5">
                        <span className="font-semibold text-amber-400">{item.category}</span>
                        {item.weight && <span>• {item.weight}</span>}
                        <span className="text-emerald-400 font-bold">• Win: {item.winRate}</span>
                      </div>
                      <p className="text-xs text-[var(--hueso)]/80 leading-snug">
                        {item.notes}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
