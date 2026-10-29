import React, { useState, useEffect } from 'react';
import { Layers, Shield, AlertTriangle, CheckCircle, Save, Sparkles, Copy, Check } from 'lucide-react';

interface BeySlot {
  blade: string;
  ratchet: string;
  bit: string;
  weightClass?: string;
  comboType?: 'Ataque' | 'Defensa' | 'Resistencia' | 'Equilibrio';
}

const OFFICIAL_BLADES = [
  'Dran Sword',
  'Hells Scythe',
  'Wizard Arrow',
  'Knight Shield',
  'Phoenix Wing',
  'Viper Tail',
  'Unicorn Sting',
  'Shark Edge',
  'Rhino Horn',
  'Wyvern Gale',
  'Cobalt Drake',
  'Dran Dagger',
  'Hells Chain',
  'Phoenix Rudder',
  'Tyranno Beat',
  'Silver Wolf',
];

const OFFICIAL_RATCHETS = [
  '3-60',
  '4-60',
  '5-60',
  '9-60',
  '3-80',
  '4-80',
  '5-80',
  '1-60',
  '7-60',
  '9-80',
];

const OFFICIAL_BITS = [
  'Flat (F)',
  'Taper (T)',
  'Ball (B)',
  'Needle (N)',
  'High Needle (HN)',
  'Point (P)',
  'Rush (R)',
  'Gear Flat (GF)',
  'Orb (O)',
  'Hexa (H)',
  'Gear Point (GP)',
  'Elevate (E)',
];

const DEFAULT_DECK: [BeySlot, BeySlot, BeySlot] = [
  { blade: '', ratchet: '', bit: '' },
  { blade: '', ratchet: '', bit: '' },
  { blade: '', ratchet: '', bit: '' },
];

export const DeckBuilder: React.FC = () => {
  const [deck, setDeck] = useState<[BeySlot, BeySlot, BeySlot]>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('apbey_deck_3on3');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore error
        }
      }
    }
    return DEFAULT_DECK;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Validation logic: check for duplicate Blades, Ratchets, or Bits across the 3 slots
  const validationErrors: string[] = [];

  const blades = deck.map((b) => b.blade.trim());
  const ratchets = deck.map((b) => b.ratchet.trim());
  const bits = deck.map((b) => b.bit.trim());

  // Check Blade duplicates
  if (blades[0] && (blades[0] === blades[1] || blades[0] === blades[2])) {
    validationErrors.push(`Blade repetida: "${blades[0]}" no puede usarse en más de un Beyblade.`);
  } else if (blades[1] && blades[1] === blades[2]) {
    validationErrors.push(`Blade repetida: "${blades[1]}" no puede usarse en más de un Beyblade.`);
  }

  // Check Ratchet duplicates
  if (ratchets[0] && (ratchets[0] === ratchets[1] || ratchets[0] === ratchets[2])) {
    validationErrors.push(`Ratchet repetido: "${ratchets[0]}" infringe la regla de piezas únicas WBO.`);
  } else if (ratchets[1] && ratchets[1] === ratchets[2]) {
    validationErrors.push(`Ratchet repetido: "${ratchets[1]}" infringe la regla de piezas únicas WBO.`);
  }

  // Check Bit duplicates
  if (bits[0] && (bits[0] === bits[1] || bits[0] === bits[2])) {
    validationErrors.push(`Bit repetido: "${bits[0]}" infringe la regla de piezas únicas WBO.`);
  } else if (bits[1] && bits[1] === bits[2]) {
    validationErrors.push(`Bit repetido: "${bits[1]}" infringe la regla de piezas únicas WBO.`);
  }

  const isDeckValid = validationErrors.length === 0;

  const updateSlot = (index: 0 | 1 | 2, field: keyof BeySlot, value: string) => {
    setDeck((prev) => {
      const copy = [...prev] as [BeySlot, BeySlot, BeySlot];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveDeck = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('apbey_deck_3on3', JSON.stringify(deck));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleCopyDeck = () => {
    const text = deck
      .map((b, i) => `Bey ${i + 1}: ${b.blade} ${b.ratchet} ${b.bit}`)
      .join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 w-full flex flex-col gap-5">
      {/* View Header with accessible h1 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--hueso)] font-display tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-cyan-400 shrink-0" aria-hidden="true" />
            <span>Deck 3on3 Competitivo</span>
          </h1>
          <p className="text-xs text-[var(--acero)] mt-0.5">
            Constructor de tercia oficial de Beyblades según el reglamento oficial WBO
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyDeck}
            className="px-3 py-2 rounded-xl bg-[var(--chasis)] border border-[var(--costura)] hover:border-[var(--acero)] text-xs font-semibold text-[var(--hueso)] min-h-[44px] flex items-center gap-1.5 transition-colors"
          >
            {copiedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSuccess ? '¡Copiado!' : 'Compartir'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveDeck}
            className="px-4 py-2 rounded-xl bg-[var(--cobalto)] text-[var(--tinta)] hover:opacity-90 text-xs font-bold min-h-[44px] flex items-center gap-1.5 transition-all shadow-md"
          >
            {savedSuccess ? <CheckCircle className="w-4 h-4 text-black" /> : <Save className="w-4 h-4" />}
            <span>{savedSuccess ? 'Guardado' : 'Guardar Deck'}</span>
          </button>
        </div>
      </div>

      {/* Real-time WBO Validation Banner */}
      <div
        role="region"
        aria-label="Estado de validación reglamentaria"
        className={`p-4 rounded-2xl border-2 flex items-start gap-3 transition-colors ${
          isDeckValid
            ? 'bg-emerald-950/40 border-emerald-600/70 text-emerald-200'
            : 'bg-rose-950/60 border-rose-600/90 text-rose-200'
        }`}
      >
        {isDeckValid ? (
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
        )}

        <div className="flex-1">
          <div className="text-xs sm:text-sm font-black">
            {isDeckValid
              ? 'Deck 3on3 Válido para Torneos Oficiales WBO'
              : 'Deck No Válido: Se detectaron infracciones reglamentarias'}
          </div>
          {isDeckValid ? (
            <p className="text-xs text-emerald-300/80 mt-0.5">
              Cumple con la regla de componentes únicos (sin Blades, Ratchets ni Bits repetidos).
            </p>
          ) : (
            <ul className="mt-1 space-y-1 text-xs text-rose-300">
              {validationErrors.map((err, i) => (
                <li key={i} className="flex items-center gap-1.5 font-medium">
                  <span>•</span>
                  <span>{err}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 3 Bey Slots Grid with visible labels for every field per WCAG/HCI audit */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((idx) => {
          const slotIndex = idx as 0 | 1 | 2;
          const bey = deck[slotIndex];
          const slotColor = idx === 0 ? 'text-[var(--cobalto)]' : idx === 1 ? 'text-[var(--cobre)]' : 'text-purple-400';
          const slotBorder = idx === 0 ? 'border-[var(--cobalto)]/50' : idx === 1 ? 'border-[var(--cobre)]/50' : 'border-purple-500/50';

          return (
            <div
              key={idx}
              className={`bg-[var(--chasis)] border-2 ${slotBorder} rounded-3xl p-5 flex flex-col gap-4 shadow-xl`}
            >
              {/* Slot Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[var(--costura)]">
                <span className={`text-xs font-black tracking-wider uppercase ${slotColor}`}>
                  Beyblade #{idx + 1}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--grafito)] text-[var(--acero)]">
                  Slot {idx + 1}
                </span>
              </div>

              {/* Combo Summary Tag */}
              <div className="p-2.5 rounded-xl bg-[var(--grafito)] border border-[var(--costura)] text-center">
                <div className="text-xs font-black text-[var(--hueso)] truncate">
                  {bey.blade} {bey.ratchet} {bey.bit}
                </div>
              </div>

              {/* Field 1: Blade with visible label */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`blade-select-${idx}`}
                  className="text-xs font-bold text-[var(--hueso)] flex items-center justify-between"
                >
                  <span>Blade (Cuchilla)</span>
                  <span className="text-[10px] text-[var(--acero)]">Metal exterior</span>
                </label>
                <select
                  id={`blade-select-${idx}`}
                  value={bey.blade}
                  onChange={(e) => updateSlot(slotIndex, 'blade', e.target.value)}
                  className="w-full bg-[var(--grafito)] border border-[var(--costura)] rounded-xl px-3 py-2.5 text-xs text-[var(--hueso)] focus:border-[var(--cobalto)] outline-hidden min-h-[44px]"
                >
                  {OFFICIAL_BLADES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2: Ratchet with visible label */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`ratchet-select-${idx}`}
                  className="text-xs font-bold text-[var(--hueso)] flex items-center justify-between"
                >
                  <span>Ratchet (Trinquete)</span>
                  <span className="text-[10px] text-[var(--acero)]">Altura & salientes</span>
                </label>
                <select
                  id={`ratchet-select-${idx}`}
                  value={bey.ratchet}
                  onChange={(e) => updateSlot(slotIndex, 'ratchet', e.target.value)}
                  className="w-full bg-[var(--grafito)] border border-[var(--costura)] rounded-xl px-3 py-2.5 text-xs text-[var(--hueso)] focus:border-[var(--cobalto)] outline-hidden min-h-[44px]"
                >
                  {OFFICIAL_RATCHETS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 3: Bit with visible label */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`bit-select-${idx}`}
                  className="text-xs font-bold text-[var(--hueso)] flex items-center justify-between"
                >
                  <span>Bit (Punta de Eje)</span>
                  <span className="text-[10px] text-[var(--acero)]">Tracción Xtreme</span>
                </label>
                <select
                  id={`bit-select-${idx}`}
                  value={bey.bit}
                  onChange={(e) => updateSlot(slotIndex, 'bit', e.target.value)}
                  className="w-full bg-[var(--grafito)] border border-[var(--costura)] rounded-xl px-3 py-2.5 text-xs text-[var(--hueso)] focus:border-[var(--cobalto)] outline-hidden min-h-[44px]"
                >
                  {OFFICIAL_BITS.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
