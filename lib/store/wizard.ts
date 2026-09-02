'use client';

/**
 * Estado do orçamento em edição.
 *
 * Zustand com `persist`: o rascunho vive no localStorage a cada tecla, então
 * fechar o navegador no meio do wizard e reabrir recupera exatamente onde
 * parou (§9). O banco recebe o mesmo rascunho por auto-save debounced —
 * localStorage é a rede de segurança, o SQLite é a verdade.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Orcamento } from '@/lib/types';

export const TOTAL_PASSOS = 6;

interface EstadoWizard {
  orcamento: Orcamento | null;
  passo: number;
  visitados: number[];
  sujo: boolean;
  salvoEm: string | null;

  iniciar: (orcamento: Orcamento, forcar?: boolean) => void;
  atualizar: (patch: Partial<Orcamento>) => void;
  irPara: (passo: number) => void;
  marcarSalvo: () => void;
  limpar: () => void;
}

export const useWizard = create<EstadoWizard>()(
  persist(
    (set, get) => ({
      orcamento: null,
      passo: 1,
      visitados: [1],
      sujo: false,
      salvoEm: null,

      iniciar: (orcamento, forcar = false) => {
        const atual = get().orcamento;
        // Retomar o rascunho persistido, a menos que seja outro orçamento.
        if (!forcar && atual && atual.id === orcamento.id) return;
        if (!forcar && atual && orcamento.status !== 'rascunho') {
          // Abrindo um orçamento salvo diferente: o dele manda.
        }
        set({ orcamento, passo: 1, visitados: [1], sujo: false, salvoEm: null });
      },

      atualizar: (patch) => {
        const atual = get().orcamento;
        if (!atual) return;
        set({ orcamento: { ...atual, ...patch }, sujo: true });
      },

      irPara: (passo) => {
        const alvo = Math.min(Math.max(passo, 1), TOTAL_PASSOS);
        set((s) => ({
          passo: alvo,
          visitados: s.visitados.includes(alvo) ? s.visitados : [...s.visitados, alvo],
        }));
      },

      marcarSalvo: () => set({ sujo: false, salvoEm: new Date().toISOString() }),

      limpar: () => set({ orcamento: null, passo: 1, visitados: [1], sujo: false, salvoEm: null }),
    }),
    {
      name: 'atalho-wizard',
      partialize: (s) => ({ orcamento: s.orcamento, passo: s.passo, visitados: s.visitados }),
    },
  ),
);
