/**
 * Acesso a dados. Converte linha do banco ↔ modelo de domínio e concentra
 * as regras de código/versão do orçamento.
 */

import 'server-only';
import { and, desc, eq, gte, inArray, like, lte, sql } from 'drizzle-orm';
import { db } from './index';
import { clientes, config, orcamentos, servicos } from './schema';
import type {
  Cliente,
  ConfigEstudio,
  Cronograma,
  Moeda,
  Orcamento,
  ResumoOrcamento,
  Servico,
  StatusOrcamento,
} from '../types';
import { calcular } from '../pricing';
import { hojeISO, somarDiasCorridos } from '../dates';

export function novoId(): string {
  return globalThis.crypto.randomUUID();
}

/* ------------------------------- Config ---------------------------------- */

export function obterConfig(): ConfigEstudio {
  const row = db.select().from(config).where(eq(config.id, 'estudio')).get();
  if (!row) throw new Error('Configuração do estúdio não encontrada — o banco não foi semeado.');
  return {
    nome: row.nome,
    cnpjOuCpf: row.cnpjOuCpf,
    email: row.email,
    telefone: row.telefone,
    site: row.site,
    endereco: row.endereco,
    logoPath: row.logoPath,
    moedaPadrao: row.moedaPadrao as Moeda,
    custosFixosMensais: row.custosFixosMensais,
    horasProdutivasMes: row.horasProdutivasMes,
    margemPadrao: row.margemPadrao,
    margemMinimaAceitavel: row.margemMinimaAceitavel,
    aliquotaImposto: row.aliquotaImposto,
    taxaPagamento: row.taxaPagamento,
    contingenciaPadrao: row.contingenciaPadrao,
    validadePropostaDias: row.validadePropostaDias,
    horasPorDiaUtil: row.horasPorDiaUtil,
    textoCondicoesPadrao: row.textoCondicoesPadrao,
    textoDireitosUsoPadrao: row.textoDireitosUsoPadrao,
    custosFixosDetalhe: row.custosFixosDetalhe ?? [],
  };
}

export function salvarConfig(valores: ConfigEstudio): void {
  db.update(config)
    .set({
      nome: valores.nome,
      cnpjOuCpf: valores.cnpjOuCpf,
      email: valores.email,
      telefone: valores.telefone,
      site: valores.site,
      endereco: valores.endereco,
      logoPath: valores.logoPath,
      moedaPadrao: valores.moedaPadrao,
      custosFixosMensais: valores.custosFixosMensais,
      horasProdutivasMes: valores.horasProdutivasMes,
      margemPadrao: valores.margemPadrao,
      margemMinimaAceitavel: valores.margemMinimaAceitavel,
      aliquotaImposto: valores.aliquotaImposto,
      taxaPagamento: valores.taxaPagamento,
      contingenciaPadrao: valores.contingenciaPadrao,
      validadePropostaDias: valores.validadePropostaDias,
      horasPorDiaUtil: valores.horasPorDiaUtil,
      textoCondicoesPadrao: valores.textoCondicoesPadrao,
      textoDireitosUsoPadrao: valores.textoDireitosUsoPadrao,
      custosFixosDetalhe: valores.custosFixosDetalhe,
    })
    .where(eq(config.id, 'estudio'))
    .run();
}

/* ------------------------------ Serviços --------------------------------- */

export function listarServicos(incluirInativos = true): Servico[] {
  const rows = incluirInativos
    ? db.select().from(servicos).all()
    : db.select().from(servicos).where(eq(servicos.ativo, true)).all();
  return rows
    .map((r) => ({
      id: r.id,
      nome: r.nome,
      categoria: r.categoria as Servico['categoria'],
      descricao: r.descricao,
      horasEstimadasPadrao: r.horasEstimadasPadrao,
      custoHoraSugerido: r.custoHoraSugerido,
      entregaveisPadrao: r.entregaveisPadrao ?? [],
      rodadasRevisaoPadrao: r.rodadasRevisaoPadrao,
      ativo: r.ativo,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function salvarServico(servico: Servico): Servico {
  const existe = db.select({ id: servicos.id }).from(servicos).where(eq(servicos.id, servico.id)).get();
  if (existe) {
    db.update(servicos).set(servico).where(eq(servicos.id, servico.id)).run();
  } else {
    db.insert(servicos).values(servico).run();
  }
  return servico;
}

export function removerServico(id: string): void {
  db.delete(servicos).where(eq(servicos.id, id)).run();
}

/* ------------------------------ Clientes --------------------------------- */

export function listarClientes(): Cliente[] {
  return db
    .select()
    .from(clientes)
    .all()
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function obterCliente(id: string): Cliente | null {
  return db.select().from(clientes).where(eq(clientes.id, id)).get() ?? null;
}

export function salvarCliente(cliente: Cliente): Cliente {
  const existe = db.select({ id: clientes.id }).from(clientes).where(eq(clientes.id, cliente.id)).get();
  if (existe) {
    db.update(clientes).set(cliente).where(eq(clientes.id, cliente.id)).run();
  } else {
    db.insert(clientes).values(cliente).run();
  }
  return cliente;
}

export function removerCliente(id: string): { ok: boolean; motivo?: string } {
  const vinculados = db
    .select({ n: sql<number>`count(*)` })
    .from(orcamentos)
    .where(eq(orcamentos.clienteId, id))
    .get();
  if ((vinculados?.n ?? 0) > 0) {
    return { ok: false, motivo: `Cliente tem ${vinculados!.n} orçamento(s) vinculado(s).` };
  }
  db.delete(clientes).where(eq(clientes.id, id)).run();
  return { ok: true };
}

/* ----------------------------- Orçamentos -------------------------------- */

type OrcamentoRow = typeof orcamentos.$inferSelect;

function paraDominio(r: OrcamentoRow): Orcamento {
  return {
    id: r.id,
    codigo: r.codigo,
    versao: r.versao,
    orcamentoPaiId: r.orcamentoPaiId,
    clienteId: r.clienteId,
    titulo: r.titulo,
    resumoProjeto: r.resumoProjeto,
    moeda: r.moeda as Moeda,
    status: r.status as StatusOrcamento,
    criadoEm: r.criadoEm,
    enviadoEm: r.enviadoEm,
    validoAte: r.validoAte,
    mesesProjeto: r.mesesProjeto,
    horas: r.horas ?? [],
    equipamentos: r.equipamentos ?? [],
    softwares: r.softwares ?? [],
    terceiros: r.terceiros ?? [],
    despesas: r.despesas ?? [],
    contingencia: r.contingencia,
    margemDesejada: r.margemDesejada,
    aliquotaImposto: r.aliquotaImposto,
    taxaPagamento: r.taxaPagamento,
    percentualDesconto: r.percentualDesconto,
    justificativaDesconto: r.justificativaDesconto,
    entregaveis: r.entregaveis ?? [],
    foraDoEscopo: r.foraDoEscopo ?? [],
    rodadasRevisao: r.rodadasRevisao,
    custoRevisaoExtra: r.custoRevisaoExtra,
    parcelas: r.parcelas ?? [],
    textoCondicoes: r.textoCondicoes,
    textoDireitosUso: r.textoDireitosUso,
    taxaCancelamento: r.taxaCancelamento,
    cronograma: (r.cronograma as Cronograma | null) ?? null,
  };
}

/** Recalcula os campos denormalizados a partir do motor de cálculo. */
function resumir(orcamento: Orcamento, cfg: ConfigEstudio): ResumoOrcamento {
  const r = calcular({
    custosFixosMensais: cfg.custosFixosMensais,
    horasProdutivasMes: cfg.horasProdutivasMes,
    mesesProjeto: orcamento.mesesProjeto,
    horas: orcamento.horas,
    equipamentos: orcamento.equipamentos,
    softwares: orcamento.softwares,
    terceiros: orcamento.terceiros,
    despesas: orcamento.despesas,
    contingencia: orcamento.contingencia,
    margemDesejada: orcamento.margemDesejada,
    aliquotaImposto: orcamento.aliquotaImposto,
    taxaPagamento: orcamento.taxaPagamento,
    percentualDesconto: orcamento.percentualDesconto,
    margemMinimaAceitavel: cfg.margemMinimaAceitavel,
  });
  if (!r.ok) {
    return { precoFinal: 0, totalHoras: 0, margemReal: 0, valorHoraEfetivo: 0 };
  }
  return {
    precoFinal: r.calculo.precoComDesconto,
    totalHoras: r.calculo.totalHoras,
    margemReal: r.calculo.margemReal,
    valorHoraEfetivo: r.calculo.valorHoraEfetivo,
  };
}

export interface OrcamentoListado extends ResumoOrcamento {
  id: string;
  codigo: string;
  versao: number;
  titulo: string;
  clienteId: string;
  clienteNome: string;
  status: StatusOrcamento;
  criadoEm: string;
  validoAte: string;
  moeda: Moeda;
  orcamentoPaiId: string | null;
}

export interface FiltroOrcamentos {
  status?: StatusOrcamento[];
  clienteId?: string;
  de?: string;
  ate?: string;
  busca?: string;
  limite?: number;
}

export function listarOrcamentos(filtro: FiltroOrcamentos = {}): OrcamentoListado[] {
  const condicoes = [];
  if (filtro.status?.length) condicoes.push(inArray(orcamentos.status, filtro.status));
  if (filtro.clienteId) condicoes.push(eq(orcamentos.clienteId, filtro.clienteId));
  if (filtro.de) condicoes.push(gte(orcamentos.criadoEm, filtro.de));
  if (filtro.ate) condicoes.push(lte(orcamentos.criadoEm, `${filtro.ate}T23:59:59`));
  if (filtro.busca) condicoes.push(like(orcamentos.titulo, `%${filtro.busca}%`));

  const base = db
    .select({
      id: orcamentos.id,
      codigo: orcamentos.codigo,
      versao: orcamentos.versao,
      titulo: orcamentos.titulo,
      clienteId: orcamentos.clienteId,
      clienteNome: sql<string>`coalesce(${clientes.empresa}, '')`,
      clienteContato: sql<string>`coalesce(${clientes.nome}, '')`,
      status: orcamentos.status,
      criadoEm: orcamentos.criadoEm,
      validoAte: orcamentos.validoAte,
      moeda: orcamentos.moeda,
      orcamentoPaiId: orcamentos.orcamentoPaiId,
      precoFinal: orcamentos.precoFinal,
      totalHoras: orcamentos.totalHoras,
      margemReal: orcamentos.margemReal,
      valorHoraEfetivo: orcamentos.valorHoraEfetivo,
    })
    .from(orcamentos)
    .leftJoin(clientes, eq(clientes.id, orcamentos.clienteId))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(desc(orcamentos.criadoEm));

  const rows = filtro.limite ? base.limit(filtro.limite).all() : base.all();
  return rows.map((r) => ({
    ...r,
    status: r.status as StatusOrcamento,
    moeda: r.moeda as Moeda,
    clienteNome: r.clienteNome || r.clienteContato || 'Sem cliente',
  }));
}

export function obterOrcamento(id: string): Orcamento | null {
  const row = db.select().from(orcamentos).where(eq(orcamentos.id, id)).get();
  return row ? paraDominio(row) : null;
}

/** Próximo código sequencial do ano: ATL-2026-014. */
export function proximoCodigo(ano = new Date().getFullYear()): string {
  const prefixo = `ATL-${ano}-`;
  const rows = db
    .select({ codigo: orcamentos.codigo })
    .from(orcamentos)
    .where(like(orcamentos.codigo, `${prefixo}%`))
    .all();
  const maior = rows.reduce((acc, r) => {
    const n = Number.parseInt(r.codigo.slice(prefixo.length), 10);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `${prefixo}${String(maior + 1).padStart(3, '0')}`;
}

export function orcamentoNovo(cfg: ConfigEstudio): Orcamento {
  const hoje = hojeISO();
  return {
    id: novoId(),
    codigo: proximoCodigo(),
    versao: 1,
    orcamentoPaiId: null,
    clienteId: '',
    titulo: '',
    resumoProjeto: '',
    moeda: cfg.moedaPadrao,
    status: 'rascunho',
    criadoEm: new Date().toISOString(),
    enviadoEm: null,
    validoAte: somarDiasCorridos(hoje, cfg.validadePropostaDias),
    mesesProjeto: 2,
    horas: [],
    equipamentos: [],
    softwares: [],
    terceiros: [],
    despesas: [],
    contingencia: cfg.contingenciaPadrao,
    margemDesejada: cfg.margemPadrao,
    aliquotaImposto: cfg.aliquotaImposto,
    taxaPagamento: cfg.taxaPagamento,
    percentualDesconto: 0,
    justificativaDesconto: '',
    entregaveis: [],
    foraDoEscopo: [],
    rodadasRevisao: 2,
    custoRevisaoExtra: 0,
    parcelas: [
      { id: novoId(), rotulo: 'Entrada', percentual: 0.5, marcoId: null },
      { id: novoId(), rotulo: 'Entrega final', percentual: 0.5, marcoId: null },
    ],
    textoCondicoes: cfg.textoCondicoesPadrao,
    textoDireitosUso: cfg.textoDireitosUsoPadrao,
    taxaCancelamento: 0,
    cronograma: null,
  };
}

export function salvarOrcamento(orcamento: Orcamento): Orcamento {
  const cfg = obterConfig();
  const resumo = resumir(orcamento, cfg);
  const valores = {
    ...orcamento,
    atualizadoEm: new Date().toISOString(),
    ...resumo,
  };
  const existe = db.select({ id: orcamentos.id }).from(orcamentos).where(eq(orcamentos.id, orcamento.id)).get();
  if (existe) {
    db.update(orcamentos).set(valores).where(eq(orcamentos.id, orcamento.id)).run();
  } else {
    db.insert(orcamentos).values(valores).run();
  }
  return orcamento;
}

export function mudarStatus(id: string, status: StatusOrcamento): void {
  db.update(orcamentos)
    .set({
      status,
      enviadoEm: status === 'enviado' ? new Date().toISOString() : undefined,
      atualizadoEm: new Date().toISOString(),
    })
    .where(eq(orcamentos.id, id))
    .run();
}

/** Duplicar: mesmos dados, código novo, sem vínculo com o original. */
export function duplicarOrcamento(id: string): Orcamento | null {
  const original = obterOrcamento(id);
  if (!original) return null;
  const cfg = obterConfig();
  const copia: Orcamento = {
    ...structuredClone(original),
    id: novoId(),
    codigo: proximoCodigo(),
    versao: 1,
    orcamentoPaiId: null,
    titulo: `${original.titulo} (cópia)`,
    status: 'rascunho',
    criadoEm: new Date().toISOString(),
    enviadoEm: null,
    validoAte: somarDiasCorridos(hojeISO(), cfg.validadePropostaDias),
  };
  return salvarOrcamento(copia);
}

/** Nova versão: mantém o código, incrementa a versão e aponta para o pai. */
export function novaVersaoOrcamento(id: string): Orcamento | null {
  const original = obterOrcamento(id);
  if (!original) return null;
  const cfg = obterConfig();
  const raizId = original.orcamentoPaiId ?? original.id;
  const versoes = db
    .select({ versao: orcamentos.versao })
    .from(orcamentos)
    .where(eq(orcamentos.codigo, original.codigo))
    .all();
  const maiorVersao = versoes.reduce((acc, v) => Math.max(acc, v.versao), original.versao);
  const nova: Orcamento = {
    ...structuredClone(original),
    id: novoId(),
    versao: maiorVersao + 1,
    orcamentoPaiId: raizId,
    status: 'rascunho',
    criadoEm: new Date().toISOString(),
    enviadoEm: null,
    validoAte: somarDiasCorridos(hojeISO(), cfg.validadePropostaDias),
  };
  return salvarOrcamento(nova);
}

export function removerOrcamento(id: string): void {
  db.delete(orcamentos).where(eq(orcamentos.id, id)).run();
}

/** Marca como expirados os orçamentos enviados cuja validade passou. */
export function expirarVencidos(): void {
  db.update(orcamentos)
    .set({ status: 'expirado' })
    .where(and(eq(orcamentos.status, 'enviado'), lte(orcamentos.validoAte, hojeISO())))
    .run();
}

/* ------------------------------ Dashboard -------------------------------- */

export interface MetricasDashboard {
  emAberto: { quantidade: number; valor: number };
  aprovadosNoMes: { quantidade: number; valor: number };
  conversao90Dias: { taxa: number; enviados: number; aprovados: number };
  valorHoraMedioAprovados: number;
}

export function metricasDashboard(): MetricasDashboard {
  const hoje = hojeISO();
  const inicioMes = `${hoje.slice(0, 7)}-01`;
  const noventaDias = somarDiasCorridos(hoje, -90);

  const todos = db
    .select({
      status: orcamentos.status,
      precoFinal: orcamentos.precoFinal,
      valorHoraEfetivo: orcamentos.valorHoraEfetivo,
      criadoEm: orcamentos.criadoEm,
      enviadoEm: orcamentos.enviadoEm,
    })
    .from(orcamentos)
    .all();

  const emAberto = todos.filter((o) => o.status === 'rascunho' || o.status === 'enviado');
  const aprovadosMes = todos.filter(
    (o) => o.status === 'aprovado' && o.criadoEm.slice(0, 10) >= inicioMes,
  );
  const janela = todos.filter((o) => o.criadoEm.slice(0, 10) >= noventaDias);
  const enviados = janela.filter((o) => o.status !== 'rascunho').length;
  const aprovados = janela.filter((o) => o.status === 'aprovado').length;
  const todosAprovados = todos.filter((o) => o.status === 'aprovado' && o.valorHoraEfetivo > 0);

  return {
    emAberto: {
      quantidade: emAberto.length,
      valor: emAberto.reduce((acc, o) => acc + o.precoFinal, 0),
    },
    aprovadosNoMes: {
      quantidade: aprovadosMes.length,
      valor: aprovadosMes.reduce((acc, o) => acc + o.precoFinal, 0),
    },
    conversao90Dias: {
      taxa: enviados > 0 ? aprovados / enviados : 0,
      enviados,
      aprovados,
    },
    valorHoraMedioAprovados:
      todosAprovados.length > 0
        ? Math.round(
            todosAprovados.reduce((acc, o) => acc + o.valorHoraEfetivo, 0) / todosAprovados.length,
          )
        : 0,
  };
}

export interface HistoricoCliente {
  cliente: Cliente;
  orcamentos: OrcamentoListado[];
  totalAprovado: number;
}

export function historicoCliente(clienteId: string): HistoricoCliente | null {
  const cliente = obterCliente(clienteId);
  if (!cliente) return null;
  const lista = listarOrcamentos({ clienteId });
  return {
    cliente,
    orcamentos: lista,
    totalAprovado: lista.filter((o) => o.status === 'aprovado').reduce((acc, o) => acc + o.precoFinal, 0),
  };
}
