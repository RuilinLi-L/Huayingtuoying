/** Lightweight route and illustration metadata; no chapter content dependency. */
export const theoryTopics = [
  {
    id: '01',
    cardId: 'pitch-register',
    illustration: '/assets/ui/theory/music-book.png',
  },
  {
    id: '02',
    cardId: 'rhythm-meter',
    illustration: '/assets/ui/theory/metronome.png',
  },
  {
    id: '03',
    cardId: 'harmony-texture',
    illustration: '/assets/ui/theory/chord-circle.png',
  },
  { id: '04', cardId: 'harmony-progressions', illustration: '/assets/ui/theory/rhythm-controls.png' },
  { id: '05', cardId: 'western-modes', illustration: '/assets/ui/theory/dynamics.png' },
  { id: '06', cardId: 'accidentals-key-signatures', illustration: '/assets/ui/theory/accidentals.png' },
  { id: '07', cardId: 'chinese-modes', illustration: '/assets/ui/theory/guqin.png' },
] as const;
