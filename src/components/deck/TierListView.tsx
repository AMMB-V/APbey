import React from 'react';
import { Shield } from 'lucide-react';

export const TierListView: React.FC = () => (
  <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 w-full flex flex-col gap-5">
    <div>
      <h1 className="text-xl sm:text-2xl font-black text-[var(--hueso)] font-display tracking-tight flex items-center gap-2">
        <Shield className="w-6 h-6 text-rose-400 shrink-0" aria-hidden="true" />
        <span>Tier List Competitiva Beyblade X</span>
      </h1>
      <p className="text-xs text-[var(--acero)] mt-0.5">
        La clasificación se publicará únicamente cuando exista evidencia competitiva oficial.
      </p>
    </div>
    <div className="bg-[var(--chasis)] border border-dashed border-[var(--costura)] rounded-3xl p-8 text-center">
      <p className="text-sm font-semibold text-[var(--hueso)]">No hay una Tier List oficial publicada.</p>
      <p className="text-xs text-[var(--acero)] mt-2">Se retiraron los datos de demostración para evitar presentar puntajes o tiers ficticios como resultados reales.</p>
    </div>
  </div>
);
