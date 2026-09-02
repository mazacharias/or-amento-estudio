/**
 * Cronograma (spec §5.6): ordena fases por dependência finish-to-start,
 * calcula datas em dias úteis, monta o Gantt e cruza com o orçamento.
 *
 * Módulo puro — recebe dados, devolve dados. Sem React, sem banco.
 */

import {
  type DataISO,
  type OpcoesDiaUtil,
  conjuntoFeriados,
  contarDiasUteis,
  diferencaEmDias,
  inicioDaSemana,
  intervaloDiasUteis,
  paraData,
  proximoDiaUtil,
  somarDiasCorridos,
  somarDiasUteis,
} from './dates';
import type { Cronograma, Fase, Parcela } from './types';

export interface FaseCalculada extends Fase {
  ordem: number;
  inicio: DataISO;
  fim: DataISO;
  /** Coluna inicial (1-based) e span em semanas, para o CSS grid do Gantt. */
  colunaInicio: number;
  colunaSpan: number;
  /** Horas por dia útil que a fase exige — base do alerta de sobrecarga. */
  horasPorDia: number;
}

export interface SemanaGantt {
  /** Segunda-feira da semana. */
  inicio: DataISO;
  rotulo: string;
}

export interface RecebimentoPrevisto {
  parcelaId: string;
  rotulo: string;
  percentual: number;
  valor: number; // centavos
  marcoId: string | null;
  marcoNome: string | null;
  data: DataISO | null;
}

export type CodigoAlertaCronograma =
  | 'horas-divergentes'
  | 'fase-sobrecarregada'
  | 'prazo-estourado'
  | 'parcela-sem-marco';

export interface AlertaCronograma {
  codigo: CodigoAlertaCronograma;
  nivel: 'atencao' | 'critico';
  mensagem: string;
  faseId?: string;
}

export interface CronogramaCalculado {
  fases: FaseCalculada[];
  inicio: DataISO;
  fim: DataISO;
  duracaoDiasUteis: number;
  duracaoDiasCorridos: number;
  semanas: SemanaGantt[];
  recebimentos: RecebimentoPrevisto[];
  alertas: AlertaCronograma[];
}

export interface ErroCronograma {
  codigo: 'ciclo' | 'dependencia-invalida';
  mensagem: string;
  fasesEnvolvidas: string[];
}

export type ResultadoCronograma =
  | { ok: true; cronograma: CronogramaCalculado }
  | { ok: false; erro: ErroCronograma };

export interface ContextoOrcamento {
  totalHoras: number;
  horasPorDiaUtil: number;
  mesesProjeto: number;
  precoComDesconto: number; // centavos
  parcelas: Parcela[];
}

/**
 * Ordena as fases respeitando finish-to-start. Detecta ciclo (Kahn: sobrou
 * nó com grau de entrada > 0) e dependência apontando para fase inexistente.
 */
export function ordenarFases(fases: Fase[]): { ok: true; ordem: Fase[] } | { ok: false; erro: ErroCronograma } {
  const porId = new Map(fases.map((f) => [f.id, f]));

  for (const fase of fases) {
    for (const dep of fase.dependeDe) {
      if (dep === fase.id) {
        return {
          ok: false,
          erro: {
            codigo: 'ciclo',
            mensagem: `A fase "${fase.nome}" depende de si mesma.`,
            fasesEnvolvidas: [fase.id],
          },
        };
      }
      if (!porId.has(dep)) {
        return {
          ok: false,
          erro: {
            codigo: 'dependencia-invalida',
            mensagem: `A fase "${fase.nome}" depende de uma fase que não existe mais.`,
            fasesEnvolvidas: [fase.id],
          },
        };
      }
    }
  }

  const grau = new Map<string, number>(fases.map((f) => [f.id, f.dependeDe.length]));
  const dependentes = new Map<string, string[]>();
  for (const fase of fases) {
    for (const dep of fase.dependeDe) {
      dependentes.set(dep, [...(dependentes.get(dep) ?? []), fase.id]);
    }
  }

  // Mantém a ordem em que o usuário arrastou as fases entre as elegíveis.
  const fila = fases.filter((f) => (grau.get(f.id) ?? 0) === 0).map((f) => f.id);
  const ordem: Fase[] = [];

  while (fila.length > 0) {
    const id = fila.shift()!;
    const fase = porId.get(id)!;
    ordem.push(fase);
    for (const dependente of dependentes.get(id) ?? []) {
      const novo = (grau.get(dependente) ?? 0) - 1;
      grau.set(dependente, novo);
      if (novo === 0) fila.push(dependente);
    }
  }

  if (ordem.length !== fases.length) {
    const presos = fases.filter((f) => !ordem.some((o) => o.id === f.id));
    const nomes = presos.map((f) => `"${f.nome}"`).join(' → ');
    return {
      ok: false,
      erro: {
        codigo: 'ciclo',
        mensagem: `Dependência circular entre as fases ${nomes}. Uma fase não pode esperar, direta ou indiretamente, por outra que espera por ela.`,
        fasesEnvolvidas: presos.map((f) => f.id),
      },
    };
  }

  return { ok: true, ordem };
}

export function calcularCronograma(
  cronograma: Cronograma,
  contexto: ContextoOrcamento,
): ResultadoCronograma {
  const ordenacao = ordenarFases(cronograma.fases);
  if (!ordenacao.ok) return ordenacao;

  const anoInicial = paraData(cronograma.dataInicio).getFullYear();
  const opcoes: OpcoesDiaUtil = {
    incluiSabado: cronograma.incluiSabado,
    feriados: conjuntoFeriados(anoInicial, 2, cronograma.feriadosCustomizados),
  };

  const calculadas = new Map<string, FaseCalculada>();
  const inicioProjeto = proximoDiaUtil(cronograma.dataInicio, opcoes);

  for (const [i, fase] of ordenacao.ordem.entries()) {
    // Finish-to-start: começa no primeiro dia útil após o fim da última
    // dependência concluída.
    let inicioDesejado = inicioProjeto;
    for (const depId of fase.dependeDe) {
      const dep = calculadas.get(depId);
      if (!dep) continue;
      const apos = somarDiasUteis(dep.fim, 1, opcoes);
      if (apos > inicioDesejado) inicioDesejado = apos;
    }

    const { inicio, fim } = intervaloDiasUteis(inicioDesejado, fase.duracaoDiasUteis, opcoes);
    const dias = Math.max(1, Math.round(fase.duracaoDiasUteis));
    calculadas.set(fase.id, {
      ...fase,
      ordem: i,
      inicio,
      fim,
      colunaInicio: 0, // preenchido depois, quando conhecemos a semana zero
      colunaSpan: 0,
      horasPorDia: dias > 0 ? fase.horasAlocadas / dias : fase.horasAlocadas,
    });
  }

  const fases = ordenacao.ordem.map((f) => calculadas.get(f.id)!);
  const inicio = fases.length > 0 ? fases.reduce((a, f) => (f.inicio < a ? f.inicio : a), fases[0]!.inicio) : inicioProjeto;
  const fim = fases.length > 0 ? fases.reduce((a, f) => (f.fim > a ? f.fim : a), fases[0]!.fim) : inicioProjeto;

  const semanas = montarSemanas(inicio, fim);
  const semanaZero = semanas[0]?.inicio ?? inicioDaSemana(inicio);
  for (const fase of fases) {
    const colInicio = Math.floor(diferencaEmDias(semanaZero, inicioDaSemana(fase.inicio)) / 7) + 1;
    const colFim = Math.floor(diferencaEmDias(semanaZero, inicioDaSemana(fase.fim)) / 7) + 1;
    fase.colunaInicio = colInicio;
    fase.colunaSpan = Math.max(1, colFim - colInicio + 1);
  }

  const recebimentos = montarRecebimentos(contexto, fases, inicio);
  const alertas = validarCronograma(fases, contexto, inicio, fim, opcoes);

  return {
    ok: true,
    cronograma: {
      fases,
      inicio,
      fim,
      duracaoDiasUteis: contarDiasUteis(inicio, fim, opcoes),
      duracaoDiasCorridos: diferencaEmDias(inicio, fim) + 1,
      semanas,
      recebimentos,
      alertas,
    },
  };
}

function montarSemanas(inicio: DataISO, fim: DataISO): SemanaGantt[] {
  const semanas: SemanaGantt[] = [];
  let atual = inicioDaSemana(inicio);
  const ultima = inicioDaSemana(fim);
  let guarda = 0;
  while (atual <= ultima && guarda++ < 520) {
    const [, mes, dia] = atual.split('-');
    semanas.push({ inicio: atual, rotulo: `${dia}/${mes}` });
    atual = somarDiasCorridos(atual, 7);
  }
  return semanas;
}

function montarRecebimentos(
  contexto: ContextoOrcamento,
  fases: FaseCalculada[],
  inicioProjeto: DataISO,
): RecebimentoPrevisto[] {
  const porId = new Map(fases.map((f) => [f.id, f]));
  return contexto.parcelas.map((parcela) => {
    const marco = parcela.marcoId ? porId.get(parcela.marcoId) : undefined;
    return {
      parcelaId: parcela.id,
      rotulo: parcela.rotulo,
      percentual: parcela.percentual,
      // Percentual é decimal; o valor volta a inteiro em centavos.
      valor: Math.round(contexto.precoComDesconto * parcela.percentual),
      marcoId: parcela.marcoId,
      marcoNome: marco?.nome ?? null,
      data: marco ? marco.fim : parcela.marcoId === null && parcela.rotulo.toLowerCase().includes('entrada') ? inicioProjeto : null,
    };
  });
}

function validarCronograma(
  fases: FaseCalculada[],
  contexto: ContextoOrcamento,
  inicio: DataISO,
  fim: DataISO,
  opcoes: OpcoesDiaUtil,
): AlertaCronograma[] {
  const alertas: AlertaCronograma[] = [];

  const horasFases = fases.reduce((acc, f) => acc + (f.horasAlocadas || 0), 0);
  if (contexto.totalHoras > 0 && Math.abs(horasFases - contexto.totalHoras) > 0.01) {
    const diferenca = horasFases - contexto.totalHoras;
    alertas.push({
      codigo: 'horas-divergentes',
      nivel: 'atencao',
      mensagem:
        diferenca > 0
          ? `As fases somam ${fmtHoras(horasFases)}, ${fmtHoras(diferenca)} a mais que as ${fmtHoras(contexto.totalHoras)} orçadas.`
          : `As fases somam ${fmtHoras(horasFases)}, faltam ${fmtHoras(-diferenca)} para as ${fmtHoras(contexto.totalHoras)} orçadas.`,
    });
  }

  const horasPorDiaUtil = contexto.horasPorDiaUtil > 0 ? contexto.horasPorDiaUtil : 6;
  for (const fase of fases) {
    const capacidade = Math.max(1, Math.round(fase.duracaoDiasUteis)) * horasPorDiaUtil;
    if (fase.horasAlocadas > capacidade) {
      const folga = Math.ceil((fase.horasAlocadas - capacidade) / horasPorDiaUtil);
      alertas.push({
        codigo: 'fase-sobrecarregada',
        nivel: 'atencao',
        faseId: fase.id,
        mensagem: `"${fase.nome}": ${fmtHoras(fase.horasAlocadas)} em ${fase.duracaoDiasUteis} dias úteis cabem só ${fmtHoras(capacidade)}. Precisa de mais ${folga} dia(s) úteis de folga.`,
      });
    }
  }

  if (contexto.mesesProjeto > 0) {
    const limite = somarDiasCorridos(inicio, Math.round(contexto.mesesProjeto * 30));
    if (fim > limite) {
      const dias = diferencaEmDias(limite, fim);
      alertas.push({
        codigo: 'prazo-estourado',
        nivel: 'atencao',
        mensagem: `O cronograma termina ${dias} dia(s) depois dos ${contexto.mesesProjeto} mês(es) informados no passo 1 — a depreciação de equipamento e o software avulso foram orçados por esse prazo.`,
      });
    }
  }

  const marcos = new Set(fases.filter((f) => f.ehMarcoPagamento).map((f) => f.id));
  for (const parcela of contexto.parcelas) {
    if (parcela.marcoId && !marcos.has(parcela.marcoId)) {
      alertas.push({
        codigo: 'parcela-sem-marco',
        nivel: 'atencao',
        mensagem: `A parcela "${parcela.rotulo}" aponta para uma fase que não é marco de pagamento.`,
      });
    }
  }

  void opcoes;
  return alertas;
}

function fmtHoras(horas: number): string {
  const texto = Number.isInteger(horas) ? String(horas) : horas.toFixed(1).replace('.', ',');
  return `${texto}h`;
}
