/**
 * Monta o pacote de dados que os dois PDFs consomem. Roda no servidor, onde
 * o cálculo e o cronograma são resolvidos uma vez só.
 */

import type { Cliente, ConfigEstudio, Orcamento, Servico } from '../types';
import { calcular, type Calculo } from '../pricing';
import { calcularCronograma, type CronogramaCalculado } from '../schedule';

export interface DadosProposta {
  orcamento: Orcamento;
  cliente: Cliente | null;
  config: ConfigEstudio;
  calculo: Calculo;
  cronograma: CronogramaCalculado | null;
  servicosPorId: Record<string, Servico>;
  /** Detalhar investimento por serviço no PDF do cliente. */
  detalhado: boolean;
}

export function montarDadosProposta(args: {
  orcamento: Orcamento;
  cliente: Cliente | null;
  config: ConfigEstudio;
  servicos: Servico[];
  detalhado: boolean;
}): { ok: true; dados: DadosProposta } | { ok: false; erro: string } {
  const { orcamento, config } = args;
  const resultado = calcular({
    custosFixosMensais: config.custosFixosMensais,
    horasProdutivasMes: config.horasProdutivasMes,
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
    margemMinimaAceitavel: config.margemMinimaAceitavel,
    qtdFases: orcamento.cronograma?.fases.length ?? 0,
  });

  if (!resultado.ok) return { ok: false, erro: resultado.erro.mensagem };

  let cronograma: CronogramaCalculado | null = null;
  if (orcamento.cronograma && orcamento.cronograma.fases.length > 0) {
    const r = calcularCronograma(orcamento.cronograma, {
      totalHoras: resultado.calculo.totalHoras,
      horasPorDiaUtil: config.horasPorDiaUtil,
      mesesProjeto: orcamento.mesesProjeto,
      precoComDesconto: resultado.calculo.precoComDesconto,
      parcelas: orcamento.parcelas,
    });
    // Cronograma com ciclo não impede a proposta: sai sem a seção de prazo.
    if (r.ok) cronograma = r.cronograma;
  }

  return {
    ok: true,
    dados: {
      orcamento,
      cliente: args.cliente,
      config,
      calculo: resultado.calculo,
      cronograma,
      servicosPorId: Object.fromEntries(args.servicos.map((s) => [s.id, s])),
      detalhado: args.detalhado,
    },
  };
}

/** ATL-2026-014_Casa-Pilar_v1.pdf */
export function nomeArquivo(dados: DadosProposta, sufixo = ''): string {
  const cliente = (dados.cliente?.empresa || dados.cliente?.nome || 'Cliente')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${dados.orcamento.codigo}_${cliente}_v${dados.orcamento.versao}${sufixo}.pdf`;
}
