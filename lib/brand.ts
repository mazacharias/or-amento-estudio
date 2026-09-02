/**
 * Tokens visuais da Atalho.
 *
 * Fonte única da verdade para marca — usada pela UI (via Tailwind, em
 * `tailwind.config.ts`) e pelo PDF (via `lib/pdf/*`). Ajustar a marca é
 * ajustar este arquivo.
 */
export const brand = {
  nome: 'Atalho',
  cores: {
    tinta: '#111111',
    papel: '#FAFAF8',
    acento: '#2F6BFF',
    sutil: '#6B6B6B',
    positivo: '#0E7C5A',
    alerta: '#B54708',
    critico: '#B42318',
  },
  fontes: { titulo: 'Inter', corpo: 'Inter', mono: 'JetBrains Mono' },
  radius: 10,
} as const;

/** Variação escura, derivada da paleta acima — mesma marca, papel invertido. */
export const brandDark = {
  tinta: '#F2F2F0',
  papel: '#0E0E0F',
  acento: '#6E9BFF',
  sutil: '#9A9A96',
  positivo: '#3DBF93',
  alerta: '#E8913C',
  critico: '#F97066',
} as const;

export type BrandColor = keyof typeof brand.cores;
