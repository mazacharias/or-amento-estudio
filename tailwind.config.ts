import type { Config } from 'tailwindcss';
import { brand } from './lib/brand';

export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tinta: 'rgb(var(--c-tinta) / <alpha-value>)',
        papel: 'rgb(var(--c-papel) / <alpha-value>)',
        acento: 'rgb(var(--c-acento) / <alpha-value>)',
        sutil: 'rgb(var(--c-sutil) / <alpha-value>)',
        positivo: 'rgb(var(--c-positivo) / <alpha-value>)',
        alerta: 'rgb(var(--c-alerta) / <alpha-value>)',
        critico: 'rgb(var(--c-critico) / <alpha-value>)',
        linha: 'rgb(var(--c-linha) / <alpha-value>)',
        superficie: 'rgb(var(--c-superficie) / <alpha-value>)',
      },
      borderRadius: {
        marca: `${brand.radius}px`,
      },
      fontFamily: {
        titulo: [brand.fontes.titulo, 'ui-sans-serif', 'system-ui', 'sans-serif'],
        corpo: [brand.fontes.corpo, 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: [brand.fontes.mono, 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
} satisfies Config;
