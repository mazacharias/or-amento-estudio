/**
 * Schema Drizzle (SQLite local, `./data/atalho.db`).
 *
 * Listas aninhadas do orçamento (horas, equipamentos, parcelas, cronograma…)
 * ficam em colunas JSON: o app é local, mono-usuário, e o orçamento é sempre
 * lido e escrito inteiro. Os campos que a lista e o dashboard filtram ou
 * somam ficam em colunas próprias, denormalizados no salvamento.
 */

import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type {
  Cronograma,
  ItemCustoFixo,
  LinhaDespesa,
  LinhaEquipamento,
  LinhaHoras,
  LinhaSoftware,
  LinhaTerceiro,
  Parcela,
} from '../types';

export const config = sqliteTable('config', {
  id: text('id').primaryKey().default('estudio'),
  nome: text('nome').notNull().default('Atalho'),
  cnpjOuCpf: text('cnpj_ou_cpf').notNull().default(''),
  email: text('email').notNull().default(''),
  telefone: text('telefone').notNull().default(''),
  site: text('site').notNull().default(''),
  endereco: text('endereco').notNull().default(''),
  logoPath: text('logo_path'),
  moedaPadrao: text('moeda_padrao').notNull().default('BRL'),
  /** Centavos. */
  custosFixosMensais: integer('custos_fixos_mensais').notNull().default(0),
  horasProdutivasMes: integer('horas_produtivas_mes').notNull().default(120),
  margemPadrao: real('margem_padrao').notNull().default(0.25),
  margemMinimaAceitavel: real('margem_minima_aceitavel').notNull().default(0.12),
  aliquotaImposto: real('aliquota_imposto').notNull().default(0.06),
  taxaPagamento: real('taxa_pagamento').notNull().default(0.03),
  contingenciaPadrao: real('contingencia_padrao').notNull().default(0.1),
  validadePropostaDias: integer('validade_proposta_dias').notNull().default(15),
  horasPorDiaUtil: integer('horas_por_dia_util').notNull().default(6),
  textoCondicoesPadrao: text('texto_condicoes_padrao').notNull().default(''),
  textoDireitosUsoPadrao: text('texto_direitos_uso_padrao').notNull().default(''),
  custosFixosDetalhe: text('custos_fixos_detalhe', { mode: 'json' })
    .$type<ItemCustoFixo[]>()
    .notNull()
    .default(sql`'[]'`),
});

export const servicos = sqliteTable(
  'servicos',
  {
    id: text('id').primaryKey(),
    nome: text('nome').notNull(),
    categoria: text('categoria').notNull(),
    descricao: text('descricao').notNull().default(''),
    horasEstimadasPadrao: real('horas_estimadas_padrao').notNull().default(0),
    custoHoraSugerido: integer('custo_hora_sugerido'),
    entregaveisPadrao: text('entregaveis_padrao', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    rodadasRevisaoPadrao: integer('rodadas_revisao_padrao').notNull().default(2),
    ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  },
  (t) => ({ porCategoria: index('idx_servicos_categoria').on(t.categoria) }),
);

export const clientes = sqliteTable('clientes', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  empresa: text('empresa').notNull().default(''),
  cnpjOuCpf: text('cnpj_ou_cpf').notNull().default(''),
  email: text('email').notNull().default(''),
  telefone: text('telefone').notNull().default(''),
  endereco: text('endereco').notNull().default(''),
  observacoes: text('observacoes').notNull().default(''),
});

export const orcamentos = sqliteTable(
  'orcamentos',
  {
    id: text('id').primaryKey(),
    codigo: text('codigo').notNull(),
    versao: integer('versao').notNull().default(1),
    orcamentoPaiId: text('orcamento_pai_id'),
    clienteId: text('cliente_id').notNull().default(''),
    titulo: text('titulo').notNull().default(''),
    resumoProjeto: text('resumo_projeto').notNull().default(''),
    moeda: text('moeda').notNull().default('BRL'),
    status: text('status').notNull().default('rascunho'),
    criadoEm: text('criado_em').notNull(),
    atualizadoEm: text('atualizado_em').notNull(),
    enviadoEm: text('enviado_em'),
    validoAte: text('valido_ate').notNull(),
    mesesProjeto: real('meses_projeto').notNull().default(1),

    horas: text('horas', { mode: 'json' }).$type<LinhaHoras[]>().notNull().default(sql`'[]'`),
    equipamentos: text('equipamentos', { mode: 'json' })
      .$type<LinhaEquipamento[]>()
      .notNull()
      .default(sql`'[]'`),
    softwares: text('softwares', { mode: 'json' })
      .$type<LinhaSoftware[]>()
      .notNull()
      .default(sql`'[]'`),
    terceiros: text('terceiros', { mode: 'json' })
      .$type<LinhaTerceiro[]>()
      .notNull()
      .default(sql`'[]'`),
    despesas: text('despesas', { mode: 'json' })
      .$type<LinhaDespesa[]>()
      .notNull()
      .default(sql`'[]'`),

    contingencia: real('contingencia').notNull().default(0.1),
    margemDesejada: real('margem_desejada').notNull().default(0.25),
    aliquotaImposto: real('aliquota_imposto').notNull().default(0.06),
    taxaPagamento: real('taxa_pagamento').notNull().default(0.03),
    percentualDesconto: real('percentual_desconto').notNull().default(0),
    justificativaDesconto: text('justificativa_desconto').notNull().default(''),

    entregaveis: text('entregaveis', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
    foraDoEscopo: text('fora_do_escopo', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    rodadasRevisao: integer('rodadas_revisao').notNull().default(2),
    custoRevisaoExtra: integer('custo_revisao_extra').notNull().default(0),
    parcelas: text('parcelas', { mode: 'json' }).$type<Parcela[]>().notNull().default(sql`'[]'`),
    textoCondicoes: text('texto_condicoes').notNull().default(''),
    textoDireitosUso: text('texto_direitos_uso').notNull().default(''),
    taxaCancelamento: integer('taxa_cancelamento').notNull().default(0),

    cronograma: text('cronograma', { mode: 'json' }).$type<Cronograma | null>(),

    /** Denormalizados no salvamento — alimentam lista e dashboard. */
    precoFinal: integer('preco_final').notNull().default(0),
    totalHoras: real('total_horas').notNull().default(0),
    margemReal: real('margem_real').notNull().default(0),
    valorHoraEfetivo: integer('valor_hora_efetivo').notNull().default(0),
  },
  (t) => ({
    porStatus: index('idx_orcamentos_status').on(t.status),
    porCliente: index('idx_orcamentos_cliente').on(t.clienteId),
    porCodigo: index('idx_orcamentos_codigo').on(t.codigo),
  }),
);

export type ConfigRow = typeof config.$inferSelect;
export type ServicoRow = typeof servicos.$inferSelect;
export type ClienteRow = typeof clientes.$inferSelect;
export type OrcamentoRow = typeof orcamentos.$inferSelect;
