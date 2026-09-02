/**
 * Motor de cálculo da Atalho (spec §3).
 *
 * Módulo puro: sem React, sem banco, sem I/O. Toda a aritmética monetária
 * passa por `lib/money.ts` — inteiros em centavos na borda, bigint em
 * micro-centavos por dentro. Nenhum valor monetário é float em ponto algum.
 */

import {
  type Cents,
  type Micro,
  type Rate,
  RATE_UM,
  dividirArredondando,
  dividirRate,
  multiplicarQuantidade,
  multiplicarRate,
  paraCentavos,
  paraMicro,
  paraRate,
  rateParaDecimal,
  somar,
} from './money';
import type {
  LinhaDespesa,
  LinhaEquipamento,
  LinhaHoras,
  LinhaSoftware,
  LinhaTerceiro,
} from './types';

/** Piso do divisor de gross-up. Abaixo disso o preço explode e o cálculo trava. */
export const DIVISOR_MINIMO = 0.15;

export interface EntradaCalculo {
  /** Custos fixos mensais do estúdio, em centavos. */
  custosFixosMensais: Cents;
  horasProdutivasMes: number;
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

  /** Piso de margem configurado no estúdio (default 0.12). */
  margemMinimaAceitavel: number;
  /** Quantidade de fases do cronograma — só alimenta a dica de contingência. */
  qtdFases?: number;
}

export type NivelAlerta = 'ok' | 'atencao' | 'critico';

export interface Alerta {
  nivel: NivelAlerta;
  mensagem: string;
}

export interface EtapaCascata {
  rotulo: string;
  valor: Cents;
  tipo: 'custo' | 'acrescimo' | 'total';
}

export interface DetalheLinha {
  id: string;
  nome: string;
  custo: Cents;
  /** Informativo = entra na lista mas não soma (software já no custo fixo). */
  informativo: boolean;
}

export interface Calculo {
  /** Piso que cada hora precisa cobrir só para o estúdio existir. */
  custoHoraFixo: Cents;

  totalHoras: number;
  custoHoraMedio: Cents;

  custoHoras: Cents;
  custoEquipamentos: Cents;
  custoSoftware: Cents;
  custoTerceiros: Cents;
  custoDespesas: Cents;
  custosNaoHora: Cents;
  subtotalCustos: Cents;

  contingenciaValor: Cents;
  baseComRisco: Cents;

  divisor: number;
  precoFinal: Cents;

  descontoValor: Cents;
  precoComDesconto: Cents;

  impostoValor: Cents;
  taxaValor: Cents;
  lucroLiquido: Cents;
  margemReal: number;
  margemAlvo: number;

  valorHoraEfetivo: Cents;

  cascata: EtapaCascata[];
  detalheEquipamentos: DetalheLinha[];
  detalheSoftwares: DetalheLinha[];

  alertaMargem: Alerta;
  capacidade: {
    horasDisponiveis: number;
    excedeCapacidade: boolean;
  };
  /** Dica (não imposição) de contingência maior — spec §3.3. */
  sugestaoContingencia: string | null;
}

export interface ErroCalculo {
  codigo: 'divisor-inviavel';
  mensagem: string;
  divisor: number;
}

export type ResultadoCalculo = { ok: true; calculo: Calculo } | { ok: false; erro: ErroCalculo };

/* -------------------------------------------------------------------------- */
/* Blocos de custo                                                            */
/* -------------------------------------------------------------------------- */

/** §3.1 — o valor-hora não é inventado, é derivado. */
export function calcularCustoHoraFixo(custosFixosMensais: Cents, horasProdutivasMes: number): Cents {
  if (!horasProdutivasMes || horasProdutivasMes <= 0) return 0;
  return paraCentavos(
    dividirArredondando(paraMicro(custosFixosMensais), BigInt(Math.round(horasProdutivasMes))),
  );
}

function custoHorasMicro(horas: LinhaHoras[]): Micro {
  return somar(...horas.map((l) => multiplicarQuantidade(paraMicro(l.custoHora), l.horas)));
}

/**
 * §3.2b — depreciação proporcional. Lançar o valor cheio da compra num único
 * projeto destrói o orçamento, então o default é ratear pela vida útil.
 */
export function custoEquipamentoMicro(linha: LinhaEquipamento, mesesProjeto: number): Micro {
  const valor = paraMicro(linha.valorCompra);
  if (linha.alocacaoTotal) return valor;
  const vidaUtil = linha.vidaUtilMeses > 0 ? linha.vidaUtilMeses : 36;
  const proporcional = dividirArredondando(
    multiplicarQuantidade(valor, mesesProjeto),
    BigInt(Math.round(vidaUtil)),
  );
  return multiplicarRate(proporcional, paraRate(linha.percentualAlocado));
}

/** §3.2c — software recorrente já no custo fixo é informativo e não soma. */
export function custoSoftwareMicro(linha: LinhaSoftware, mesesProjeto: number): Micro {
  if (linha.tipo === 'recorrente-ja-no-fixo') return 0n;
  const valor = paraMicro(linha.valor);
  const base = linha.tipo === 'avulso-mensal' ? multiplicarQuantidade(valor, mesesProjeto) : valor;
  return multiplicarRate(base, paraRate(linha.percentualAlocado));
}

/* -------------------------------------------------------------------------- */
/* Cálculo principal                                                          */
/* -------------------------------------------------------------------------- */

export function calcular(entrada: EntradaCalculo): ResultadoCalculo {
  const mesesProjeto = entrada.mesesProjeto > 0 ? entrada.mesesProjeto : 1;

  const rateContingencia = paraRate(entrada.contingencia);
  const rateMargem = paraRate(entrada.margemDesejada);
  const rateImposto = paraRate(entrada.aliquotaImposto);
  const rateTaxa = paraRate(entrada.taxaPagamento);
  const rateDesconto = paraRate(entrada.percentualDesconto);

  // §3.4 — margem, imposto e taxa incidem sobre o preço de venda, num divisor só.
  const rateDivisor: Rate = RATE_UM - (rateMargem + rateImposto + rateTaxa);
  const divisor = rateParaDecimal(rateDivisor);

  if (divisor <= DIVISOR_MINIMO) {
    return {
      ok: false,
      erro: {
        codigo: 'divisor-inviavel',
        divisor,
        mensagem:
          `Margem (${pct(entrada.margemDesejada)}) + imposto (${pct(entrada.aliquotaImposto)}) + ` +
          `taxa (${pct(entrada.taxaPagamento)}) somam ${pct(
            entrada.margemDesejada + entrada.aliquotaImposto + entrada.taxaPagamento,
          )} do preço de venda. ` +
          `O divisor resultante (${virgula(divisor)}) é inviável: o preço tenderia ao infinito. ` +
          `Reduza a margem ou revise o regime tributário até o divisor passar de ${virgula(DIVISOR_MINIMO)}.`,
      },
    };
  }

  const custoHoraFixo = calcularCustoHoraFixo(entrada.custosFixosMensais, entrada.horasProdutivasMes);

  const totalHoras = entrada.horas.reduce((acc, l) => acc + (l.horas || 0), 0);
  const mCustoHoras = custoHorasMicro(entrada.horas);

  const detalheEquipamentos: DetalheLinha[] = entrada.equipamentos.map((l) => {
    const m = custoEquipamentoMicro(l, mesesProjeto);
    return { id: l.id, nome: l.nome, custo: paraCentavos(m), informativo: false };
  });
  const mEquipamentos = somar(
    ...entrada.equipamentos.map((l) => custoEquipamentoMicro(l, mesesProjeto)),
  );

  const detalheSoftwares: DetalheLinha[] = entrada.softwares.map((l) => {
    const m = custoSoftwareMicro(l, mesesProjeto);
    return {
      id: l.id,
      nome: l.nome,
      custo: paraCentavos(m),
      informativo: l.tipo === 'recorrente-ja-no-fixo',
    };
  });
  const mSoftware = somar(...entrada.softwares.map((l) => custoSoftwareMicro(l, mesesProjeto)));

  const mTerceiros = somar(...entrada.terceiros.map((l) => paraMicro(l.valor)));
  const mDespesas = somar(...entrada.despesas.map((l) => paraMicro(l.valor)));

  const mCustosNaoHora = somar(mEquipamentos, mSoftware, mTerceiros, mDespesas);
  const mSubtotal = mCustoHoras + mCustosNaoHora;

  // §3.3 — contingência sobre o subtotal.
  const mBaseComRisco = multiplicarRate(mSubtotal, RATE_UM + rateContingencia);
  const mContingencia = mBaseComRisco - mSubtotal;

  // §3.4 — gross-up.
  const mPrecoFinal = dividirRate(mBaseComRisco, rateDivisor);

  // §3.5 — desconto depois, sobre o preço final.
  const mPrecoComDesconto = multiplicarRate(mPrecoFinal, RATE_UM - rateDesconto);
  const mDesconto = mPrecoFinal - mPrecoComDesconto;

  const mImposto = multiplicarRate(mPrecoComDesconto, rateImposto);
  const mTaxa = multiplicarRate(mPrecoComDesconto, rateTaxa);
  const mLucro = mPrecoComDesconto - mImposto - mTaxa - mBaseComRisco;

  const margemReal =
    mPrecoComDesconto === 0n ? 0 : Number((mLucro * 1_000_000n) / mPrecoComDesconto) / 1_000_000;

  // §3.6 — o número que a Atalho compara com o mercado.
  const mValorHora =
    totalHoras > 0
      ? dividirArredondando(mPrecoComDesconto * 1_000_000n, BigInt(Math.round(totalHoras * 1_000_000)))
      : 0n;

  const custoHoraMedio =
    totalHoras > 0
      ? paraCentavos(
          dividirArredondando(mCustoHoras * 1_000_000n, BigInt(Math.round(totalHoras * 1_000_000))),
        )
      : custoHoraFixo;

  const subtotalCustos = paraCentavos(mSubtotal);
  const baseComRisco = paraCentavos(mBaseComRisco);
  const precoFinal = paraCentavos(mPrecoFinal);
  const precoComDesconto = paraCentavos(mPrecoComDesconto);

  const horasDisponiveis = entrada.horasProdutivasMes * mesesProjeto;

  const calculo: Calculo = {
    custoHoraFixo,
    totalHoras,
    custoHoraMedio,
    custoHoras: paraCentavos(mCustoHoras),
    custoEquipamentos: paraCentavos(mEquipamentos),
    custoSoftware: paraCentavos(mSoftware),
    custoTerceiros: paraCentavos(mTerceiros),
    custoDespesas: paraCentavos(mDespesas),
    custosNaoHora: paraCentavos(mCustosNaoHora),
    subtotalCustos,
    contingenciaValor: paraCentavos(mContingencia),
    baseComRisco,
    divisor,
    precoFinal,
    descontoValor: paraCentavos(mDesconto),
    precoComDesconto,
    impostoValor: paraCentavos(mImposto),
    taxaValor: paraCentavos(mTaxa),
    lucroLiquido: paraCentavos(mLucro),
    margemReal,
    margemAlvo: entrada.margemDesejada,
    valorHoraEfetivo: paraCentavos(mValorHora),
    cascata: montarCascata({
      subtotalCustos,
      contingencia: paraCentavos(mContingencia),
      imposto: paraCentavos(mImposto),
      taxa: paraCentavos(mTaxa),
      lucro: paraCentavos(mLucro),
      desconto: paraCentavos(mDesconto),
      precoComDesconto,
    }),
    detalheEquipamentos,
    detalheSoftwares,
    alertaMargem: avaliarMargem(
      margemReal,
      entrada.margemMinimaAceitavel,
      entrada.percentualDesconto,
      subtotalCustos,
    ),
    capacidade: {
      horasDisponiveis,
      excedeCapacidade: horasDisponiveis > 0 && totalHoras > horasDisponiveis,
    },
    sugestaoContingencia: sugerirContingencia(entrada),
  };

  return { ok: true, calculo };
}

function montarCascata(v: {
  subtotalCustos: Cents;
  contingencia: Cents;
  imposto: Cents;
  taxa: Cents;
  lucro: Cents;
  desconto: Cents;
  precoComDesconto: Cents;
}): EtapaCascata[] {
  const etapas: EtapaCascata[] = [
    { rotulo: 'Custos diretos', valor: v.subtotalCustos, tipo: 'custo' },
    { rotulo: 'Contingência', valor: v.contingencia, tipo: 'acrescimo' },
    { rotulo: 'Imposto', valor: v.imposto, tipo: 'acrescimo' },
    { rotulo: 'Taxa de pagamento', valor: v.taxa, tipo: 'acrescimo' },
    { rotulo: 'Margem', valor: v.lucro, tipo: 'acrescimo' },
  ];
  if (v.desconto !== 0) {
    etapas.push({ rotulo: 'Desconto', valor: -v.desconto, tipo: 'acrescimo' });
  }
  etapas.push({ rotulo: 'Preço final', valor: v.precoComDesconto, tipo: 'total' });
  return etapas;
}

function avaliarMargem(
  margemReal: number,
  minima: number,
  desconto: number,
  subtotalCustos: Cents,
): Alerta {
  // Orçamento em branco não tem margem ruim — tem orçamento em branco.
  if (subtotalCustos === 0) {
    return { nivel: 'ok', mensagem: 'Sem custos lançados ainda — preencha as horas para ver a margem.' };
  }
  if (margemReal < 0) {
    return {
      nivel: 'critico',
      mensagem: `Você está pagando para trabalhar: a margem real é ${pct(margemReal)}.`,
    };
  }
  if (margemReal < minima) {
    const causa = desconto > 0 ? `este desconto derruba a margem para ${pct(margemReal)}` : `a margem real é ${pct(margemReal)}`;
    return {
      nivel: 'atencao',
      mensagem: `${causa[0]!.toUpperCase()}${causa.slice(1)} — abaixo do piso de ${pct(minima)}.`,
    };
  }
  return { nivel: 'ok', mensagem: `Margem real de ${pct(margemReal)}.` };
}

function sugerirContingencia(entrada: EntradaCalculo): string | null {
  const muitasFases = (entrada.qtdFases ?? 0) > 3;
  const muitosTerceiros = entrada.terceiros.length > 2;
  if (!muitasFases && !muitosTerceiros) return null;
  if (entrada.contingencia >= 0.15) return null;
  const motivo = [
    muitasFases ? `${entrada.qtdFases} fases` : null,
    muitosTerceiros ? `${entrada.terceiros.length} terceiros` : null,
  ]
    .filter(Boolean)
    .join(' e ');
  return `Projeto com ${motivo}: considere contingência entre 15% e 20%.`;
}

function virgula(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

function pct(decimal: number): string {
  return `${(decimal * 100).toFixed(1).replace('.', ',')}%`;
}

/* -------------------------------------------------------------------------- */
/* §3.7 — Modo reverso: "o cliente tem X"                                     */
/* -------------------------------------------------------------------------- */

export interface ServicoCabe {
  id: string;
  descricao: string;
  horas: number;
  horasAcumuladas: number;
  cabe: boolean;
}

export interface ModoReverso {
  precoAlvo: Cents;
  divisor: number;
  baseMax: Cents;
  custosNaoHora: Cents;
  custoHorasMax: Cents;
  custoHoraMedio: Cents;
  horasMax: number;
  viavel: boolean;
  mensagem: string;
  servicos: ServicoCabe[];
}

export function calcularModoReverso(
  entrada: EntradaCalculo,
  precoAlvo: Cents,
): { ok: true; reverso: ModoReverso } | { ok: false; erro: ErroCalculo } {
  const base = calcular({ ...entrada, percentualDesconto: 0 });
  if (!base.ok) return base;

  const c = base.calculo;
  const rateContingencia = paraRate(entrada.contingencia);
  const rateDivisor = paraRate(c.divisor);

  const mBaseMax = multiplicarRate(paraMicro(precoAlvo), rateDivisor);
  const mCustoHorasMax =
    dividirRate(mBaseMax, RATE_UM + rateContingencia) - paraMicro(c.custosNaoHora);

  const custoHoraMedio = c.custoHoraMedio > 0 ? c.custoHoraMedio : c.custoHoraFixo;
  const horasMaxBruto =
    custoHoraMedio > 0 ? Number(mCustoHorasMax) / 1_000_000 / custoHoraMedio : 0;
  const horasMax = Math.floor(horasMaxBruto * 10) / 10;

  const viavel = horasMax > 0;

  let acumulado = 0;
  const servicos: ServicoCabe[] = entrada.horas.map((l) => {
    acumulado += l.horas || 0;
    return {
      id: l.id,
      descricao: l.descricao || l.papel || 'Linha de horas',
      horas: l.horas || 0,
      horasAcumuladas: acumulado,
      cabe: viavel && acumulado <= horasMax,
    };
  });

  const mensagem = viavel
    ? `Com ${fmt(precoAlvo)} você tem ${formatarHoras(horasMax)} disponíveis.`
    : `Este budget não cobre nem os custos diretos do projeto — eles já somam ${fmt(c.custosNaoHora)}.`;

  return {
    ok: true,
    reverso: {
      precoAlvo,
      divisor: c.divisor,
      baseMax: paraCentavos(mBaseMax),
      custosNaoHora: c.custosNaoHora,
      custoHorasMax: paraCentavos(mCustoHorasMax),
      custoHoraMedio,
      horasMax,
      viavel,
      mensagem,
      servicos,
    },
  };
}

function fmt(centavos: Cents): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100,
  );
}

function formatarHoras(horas: number): string {
  const texto = Number.isInteger(horas) ? String(horas) : horas.toFixed(1).replace('.', ',');
  return `${texto}h`;
}

/** Entrada vazia — usada pelo wizard antes de qualquer preenchimento. */
export function entradaVazia(
  base: Pick<
    EntradaCalculo,
    | 'custosFixosMensais'
    | 'horasProdutivasMes'
    | 'contingencia'
    | 'margemDesejada'
    | 'aliquotaImposto'
    | 'taxaPagamento'
    | 'margemMinimaAceitavel'
  >,
): EntradaCalculo {
  return {
    ...base,
    mesesProjeto: 1,
    horas: [],
    equipamentos: [],
    softwares: [],
    terceiros: [],
    despesas: [],
    percentualDesconto: 0,
  };
}
