/**
 * Validação de borda com zod. Server actions e formulários compartilham
 * estes schemas — o que entra no banco já entrou validado.
 */

import { z } from 'zod';
import { CATEGORIAS_SERVICO, MOEDAS, STATUS_ORCAMENTO } from './types';

const centavos = z.number().int('Valor monetário precisa ser inteiro em centavos').min(0);
const percentual = z.number().min(0).max(1);

export const itemCustoFixoSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1, 'Dê um nome ao custo'),
  valor: centavos,
  ehSoftware: z.boolean(),
});

export const configSchema = z.object({
  nome: z.string().min(1, 'O estúdio precisa de um nome'),
  cnpjOuCpf: z.string(),
  email: z.string().email('E-mail inválido').or(z.literal('')),
  telefone: z.string(),
  site: z.string(),
  endereco: z.string(),
  logoPath: z.string().nullable(),
  moedaPadrao: z.enum(MOEDAS as [string, ...string[]]),
  custosFixosMensais: centavos,
  horasProdutivasMes: z.number().int().min(1, 'Informe as horas produtivas do mês').max(400),
  margemPadrao: percentual,
  margemMinimaAceitavel: percentual,
  aliquotaImposto: percentual,
  taxaPagamento: percentual,
  contingenciaPadrao: percentual,
  validadePropostaDias: z.number().int().min(1).max(365),
  horasPorDiaUtil: z.number().int().min(1).max(24),
  textoCondicoesPadrao: z.string(),
  textoDireitosUsoPadrao: z.string(),
  custosFixosDetalhe: z.array(itemCustoFixoSchema),
});

export const servicoSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1, 'Nome do serviço é obrigatório'),
  categoria: z.enum(CATEGORIAS_SERVICO as [string, ...string[]]),
  descricao: z.string(),
  horasEstimadasPadrao: z.number().min(0).max(10000),
  custoHoraSugerido: centavos.nullable(),
  entregaveisPadrao: z.array(z.string()),
  rodadasRevisaoPadrao: z.number().int().min(0).max(20),
  ativo: z.boolean(),
});

export const clienteSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1, 'Nome do contato é obrigatório'),
  empresa: z.string(),
  cnpjOuCpf: z.string(),
  email: z.string().email('E-mail inválido').or(z.literal('')),
  telefone: z.string(),
  endereco: z.string(),
  observacoes: z.string(),
});

const linhaHorasSchema = z.object({
  id: z.string(),
  servicoId: z.string().nullable(),
  descricao: z.string(),
  papel: z.string(),
  horas: z.number().min(0).max(10000),
  custoHora: centavos,
});

const linhaEquipamentoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  valorCompra: centavos,
  vidaUtilMeses: z.number().int().min(1).max(600),
  percentualAlocado: percentual,
  alocacaoTotal: z.boolean(),
});

const linhaSoftwareSchema = z.object({
  id: z.string(),
  nome: z.string(),
  tipo: z.enum(['recorrente-ja-no-fixo', 'avulso-mensal', 'avulso-unico']),
  valor: centavos,
  percentualAlocado: percentual,
});

const linhaTerceiroSchema = z.object({
  id: z.string(),
  fornecedor: z.string(),
  escopo: z.string(),
  valor: centavos,
});

const linhaDespesaSchema = z.object({
  id: z.string(),
  descricao: z.string(),
  valor: centavos,
});

export const parcelaSchema = z.object({
  id: z.string(),
  rotulo: z.string(),
  percentual,
  marcoId: z.string().nullable(),
});

export const faseSchema = z.object({
  id: z.string(),
  nome: z.string(),
  descricao: z.string(),
  duracaoDiasUteis: z.number().min(1).max(500),
  dependeDe: z.array(z.string()),
  horasAlocadas: z.number().min(0).max(10000),
  ehMarcoPagamento: z.boolean(),
  entregaveis: z.array(z.string()),
});

export const cronogramaSchema = z.object({
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato aaaa-mm-dd'),
  fases: z.array(faseSchema),
  feriadosCustomizados: z.array(z.string()),
  incluiSabado: z.boolean(),
});

export const orcamentoSchema = z.object({
  id: z.string().min(1),
  codigo: z.string().min(1),
  versao: z.number().int().min(1),
  orcamentoPaiId: z.string().nullable(),
  clienteId: z.string(),
  titulo: z.string(),
  resumoProjeto: z.string(),
  moeda: z.enum(MOEDAS as [string, ...string[]]),
  status: z.enum(STATUS_ORCAMENTO as [string, ...string[]]),
  criadoEm: z.string(),
  enviadoEm: z.string().nullable(),
  validoAte: z.string(),
  mesesProjeto: z.number().min(0.5).max(120),
  horas: z.array(linhaHorasSchema),
  equipamentos: z.array(linhaEquipamentoSchema),
  softwares: z.array(linhaSoftwareSchema),
  terceiros: z.array(linhaTerceiroSchema),
  despesas: z.array(linhaDespesaSchema),
  contingencia: percentual,
  margemDesejada: percentual,
  aliquotaImposto: percentual,
  taxaPagamento: percentual,
  percentualDesconto: percentual,
  justificativaDesconto: z.string(),
  entregaveis: z.array(z.string()),
  foraDoEscopo: z.array(z.string()),
  rodadasRevisao: z.number().int().min(0).max(50),
  custoRevisaoExtra: centavos,
  parcelas: z.array(parcelaSchema),
  textoCondicoes: z.string(),
  textoDireitosUso: z.string(),
  taxaCancelamento: centavos,
  cronograma: cronogramaSchema.nullable(),
});

/** Soma dos percentuais das parcelas fecha em 100%? (spec §5.5, passo 5) */
export function parcelasFecham(parcelas: { percentual: number }[]): boolean {
  if (parcelas.length === 0) return false;
  const soma = parcelas.reduce((acc, p) => acc + p.percentual, 0);
  return Math.abs(soma - 1) < 0.0005;
}

export const PRESETS_PARCELAS: Array<{ rotulo: string; percentuais: number[]; nomes: string[] }> = [
  { rotulo: '50/50', percentuais: [0.5, 0.5], nomes: ['Entrada', 'Entrega final'] },
  {
    rotulo: '40/30/30',
    percentuais: [0.4, 0.3, 0.3],
    nomes: ['Entrada', 'Aprovação do conceito', 'Entrega final'],
  },
  {
    rotulo: '30/40/30',
    percentuais: [0.3, 0.4, 0.3],
    nomes: ['Entrada', 'Aprovação do conceito', 'Entrega final'],
  },
  { rotulo: '100% antecipado', percentuais: [1], nomes: ['Pagamento integral'] },
];
