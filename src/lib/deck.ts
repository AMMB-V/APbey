export interface BeySlot {
  blade: string;
  ratchet: string;
  bit: string;
  weightClass?: string;
  comboType?: 'Ataque' | 'Defensa' | 'Resistencia' | 'Equilibrio';
}

export type Deck = [BeySlot, BeySlot, BeySlot];

export const DECK_STORAGE_KEY = 'apbey_deck_3on3';

export const OFFICIAL_BLADES = [
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

export const OFFICIAL_RATCHETS = [
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

export const OFFICIAL_BITS = [
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

export function createEmptyDeck(): Deck {
  return [
    { blade: '', ratchet: '', bit: '' },
    { blade: '', ratchet: '', bit: '' },
    { blade: '', ratchet: '', bit: '' },
  ];
}

export function createDefaultStarterDeck(): Deck {
  return [
    { blade: 'Dran Sword', ratchet: '3-60', bit: 'Flat (F)' },
    { blade: 'Hells Scythe', ratchet: '4-60', bit: 'Ball (B)' },
    { blade: 'Wizard Arrow', ratchet: '5-80', bit: 'Taper (T)' },
  ];
}

export function loadDeck(): Deck {
  if (typeof window === 'undefined') return createDefaultStarterDeck();

  const saved = window.localStorage.getItem(DECK_STORAGE_KEY);
  if (!saved) return createDefaultStarterDeck();

  try {
    const parsed = JSON.parse(saved) as Deck;
    if (
      Array.isArray(parsed) &&
      parsed.length === 3 &&
      parsed.some((slot) => slot && slot.blade)
    ) {
      return parsed;
    }
    return createDefaultStarterDeck();
  } catch {
    return createDefaultStarterDeck();
  }
}

export function getDeckValidationErrors(deck: Deck): string[] {
  const validationErrors: string[] = [];

  // Check if any slot is missing components
  const emptySlots: number[] = [];
  deck.forEach((slot, index) => {
    if (!slot.blade.trim() || !slot.ratchet.trim() || !slot.bit.trim()) {
      emptySlots.push(index + 1);
    }
  });

  if (emptySlots.length > 0) {
    validationErrors.push(
      `El Deck está incompleto: configura Blade, Ratchet y Bit en ${
        emptySlots.length === 3
          ? 'los 3 Beyblades'
          : `el Beyblade #${emptySlots.join(', #')}`
      }.`
    );
  }

  const pieces = [
    {
      label: 'Blade',
      values: deck.map((slot) => slot.blade.trim()),
      message: (value: string) => `Blade repetida: "${value}" no puede usarse en más de un Beyblade.`,
    },
    {
      label: 'Ratchet',
      values: deck.map((slot) => slot.ratchet.trim()),
      message: (value: string) => `Ratchet repetido: "${value}" infringe la regla de piezas únicas WBO.`,
    },
    {
      label: 'Bit',
      values: deck.map((slot) => slot.bit.trim()),
      message: (value: string) => `Bit repetido: "${value}" infringe la regla de piezas únicas WBO.`,
    },
  ];

  for (const piece of pieces) {
    const seen = new Set<string>();
    for (const value of piece.values) {
      if (value && seen.has(value)) {
        validationErrors.push(piece.message(value));
        break;
      }
      if (value) seen.add(value);
    }
  }

  return validationErrors;
}
