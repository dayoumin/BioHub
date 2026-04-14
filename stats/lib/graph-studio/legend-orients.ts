export const LEGEND_ORIENTS = [
  'top',
  'bottom',
  'left',
  'right',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'none',
] as const;

export type LegendOrient = typeof LEGEND_ORIENTS[number];

export const TOP_LEGEND_ORIENTS = LEGEND_ORIENTS.filter((orient) =>
  orient === 'top' || orient === 'top-left' || orient === 'top-right',
);

export const BOTTOM_LEGEND_ORIENTS = LEGEND_ORIENTS.filter((orient) =>
  orient === 'bottom' || orient === 'bottom-left' || orient === 'bottom-right',
);
