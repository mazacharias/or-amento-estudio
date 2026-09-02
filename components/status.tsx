import type { StatusOrcamento } from '@/lib/types';

/** Tom de badge por status — usado na lista, no dashboard e na ficha. */
export const TOM_STATUS: Record<StatusOrcamento, 'neutro' | 'acento' | 'positivo' | 'alerta' | 'critico'> = {
  rascunho: 'neutro',
  enviado: 'acento',
  aprovado: 'positivo',
  recusado: 'critico',
  expirado: 'alerta',
};
