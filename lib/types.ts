/**
 * Modelos de domínio da Atalho (spec §4).
 * Arquivo puro: sem React, sem banco, sem side effects.
 *
 * Todo campo monetário é inteiro em centavos; todo percentual é decimal
 * (0.25 = 25%).
 */

export type Moeda = 'BRL' | 'USD' | 'EUR';

export const MOEDAS: Moeda[] = ['BRL', 'USD', 'EUR'];

export interface ConfigEstudio {
  nome: string;
  cnpjOuCpf: string;
  email: string;
  telefone: string;
  site: string;
  endereco: string;
  /** Data URI (image/png|jpeg|webp) do logo, guardado no próprio banco. */
  logoPath: string | null;
  moedaPadrao: Moeda;
  custosFixosMensais: number; // centavos
  horasProdutivasMes: number;
  margemPadrao: number; // 0.25
  margemMinimaAceitavel: number; // 0.12
  aliquotaImposto: number; // 0.06
  taxaPagamento: number; // 0.03
  contingenciaPadrao: number; // 0.10
  validadePropostaDias: number; // 15
  horasPorDiaUtil: number; // 6
  textoCondicoesPadrao: string;
  textoDireitosUsoPadrao: string;
  /** Assinaturas já embutidas nos custos fixos — referência anti-dupla-cobrança. */
  custosFixosDetalhe: ItemCustoFixo[];
}

export interface ItemCustoFixo {
  id: string;
  nome: string;
  valor: number; // centavos/mês
  /** true quando é uma assinatura de software (aparece no passo 3 como referência). */
  ehSoftware: boolean;
}

export type CategoriaServico =
  | 'branding'
  | 'ui-ux'
  | 'web'
  | 'motion'
  | 'social'
  | 'ilustracao'
  | 'consultoria'
  | 'editorial'
  | 'outro';

export const CATEGORIAS_SERVICO: CategoriaServico[] = [
  'branding',
  'ui-ux',
  'web',
  'motion',
  'social',
  'ilustracao',
  'consultoria',
  'editorial',
  'outro',
];

export const ROTULO_CATEGORIA: Record<CategoriaServico, string> = {
  branding: 'Branding',
  'ui-ux': 'UI/UX',
  web: 'Web',
  motion: 'Motion',
  social: 'Social',
  ilustracao: 'Ilustração',
  consultoria: 'Consultoria',
  editorial: 'Editorial',
  outro: 'Outro',
};

export interface Servico {
  id: string;
  nome: string;
  categoria: CategoriaServico;
  descricao: string;
  horasEstimadasPadrao: number;
  custoHoraSugerido: number | null;
  entregaveisPadrao: string[];
  rodadasRevisaoPadrao: number;
  ativo: boolean;
}

export interface Cliente {
  id: string;
  nome: string;
  empresa: string;
  cnpjOuCpf: string;
  email: string;
  telefone: string;
  endereco: string;
  observacoes: string;
}

export interface LinhaHoras {
  id: string;
  servicoId: string | null;
  descricao: string;
  papel: string;
  horas: number;
  custoHora: number; // centavos
}

export interface LinhaEquipamento {
  id: string;
  nome: string;
  valorCompra: number;
  vidaUtilMeses: number; // default 36
  percentualAlocado: number; // 0..1
  alocacaoTotal: boolean; // ignora depreciação
}

export type TipoSoftware = 'recorrente-ja-no-fixo' | 'avulso-mensal' | 'avulso-unico';

export interface LinhaSoftware {
  id: string;
  nome: string;
  tipo: TipoSoftware;
  valor: number;
  percentualAlocado: number;
}

export interface LinhaTerceiro {
  id: string;
  fornecedor: string;
  escopo: string;
  valor: number;
}

export interface LinhaDespesa {
  id: string;
  descricao: string;
  valor: number;
}

export interface Parcela {
  id: string;
  rotulo: string;
  percentual: number; // deve somar 1.0
  marcoId: string | null;
}

export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'expirado';

export const STATUS_ORCAMENTO: StatusOrcamento[] = [
  'rascunho',
  'enviado',
  'aprovado',
  'recusado',
  'expirado',
];

export const ROTULO_STATUS: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  expirado: 'Expirado',
};

export interface Fase {
  id: string;
  nome: string;
  descricao: string;
  duracaoDiasUteis: number;
  dependeDe: string[]; // finish-to-start
  horasAlocadas: number;
  ehMarcoPagamento: boolean;
  entregaveis: string[];
}

export interface Cronograma {
  dataInicio: string; // ISO (yyyy-MM-dd)
  fases: Fase[];
  feriadosCustomizados: string[]; // ISO
  incluiSabado: boolean;
}

export interface Orcamento {
  id: string;
  codigo: string; // "ATL-2026-014"
  versao: number;
  orcamentoPaiId: string | null;
  clienteId: string;
  titulo: string;
  resumoProjeto: string;
  moeda: Moeda;
  status: StatusOrcamento;
  criadoEm: string;
  enviadoEm: string | null;
  validoAte: string;
  mesesProjeto: number;

  horas: LinhaHoras[];
  equipamentos: LinhaEquipamento[];
  softwares: LinhaSoftware[];
  terceiros: LinhaTerceiro[];
  despesas: LinhaDespesa[];

  contingencia: number;
  margemDesejada: number;
  aliquotaImposto: number;
  taxaPagamento: number;
  percentualDesconto: number;
  justificativaDesconto: string;

  entregaveis: string[];
  foraDoEscopo: string[];
  rodadasRevisao: number;
  custoRevisaoExtra: number;
  parcelas: Parcela[];
  textoCondicoes: string;
  textoDireitosUso: string;
  taxaCancelamento: number; // kill fee

  cronograma: Cronograma | null;
}

/** Campos denormalizados salvos junto do orçamento, para listagens e dashboard. */
export interface ResumoOrcamento {
  precoFinal: number; // centavos, já com desconto
  totalHoras: number;
  margemReal: number; // decimal
  valorHoraEfetivo: number; // centavos
}
