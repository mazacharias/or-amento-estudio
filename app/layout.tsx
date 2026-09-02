import type { Metadata } from 'next';
import './globals.css';
import { Navegacao } from '@/components/navegacao';
import { brand } from '@/lib/brand';

export const metadata: Metadata = {
  title: `${brand.nome} · Orçamentos`,
  description: 'Gerador de orçamentos e cronogramas do estúdio Atalho.',
};

/**
 * Dark mode por classe, respeitando `prefers-color-scheme` e a escolha
 * salva. O script roda antes da pintura para não piscar branco.
 */
const SCRIPT_TEMA = `
try {
  var salvo = localStorage.getItem('atalho-tema');
  var escuro = salvo ? salvo === 'escuro' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (escuro) document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-screen">
        <Navegacao />
        <main className="mx-auto w-full max-w-[1400px] px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
