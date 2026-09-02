/**
 * Dias úteis e feriados brasileiros (spec §5.6).
 *
 * Datas circulam como string ISO `yyyy-MM-dd` — sem hora, sem fuso. Por dentro
 * viram `Date` ancorado ao meio-dia local, o que imuniza a aritmética contra
 * horário de verão e contra o off-by-one clássico de meia-noite UTC.
 */

import { addDays, format, getDay, isValid, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type DataISO = string; // yyyy-MM-dd

export interface Feriado {
  data: DataISO;
  nome: string;
}

export interface OpcoesDiaUtil {
  /** Sábado conta como dia útil (default: não). */
  incluiSabado?: boolean;
  /** Conjunto de datas ISO não úteis (nacionais + customizadas). */
  feriados?: ReadonlySet<DataISO>;
}

/** ISO → Date ao meio-dia local. */
export function paraData(iso: DataISO): Date {
  const d = parse(iso, 'yyyy-MM-dd', new Date());
  if (!isValid(d)) throw new Error(`Data inválida: ${iso}`);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Date → ISO `yyyy-MM-dd`. */
export function paraISO(data: Date): DataISO {
  return format(data, 'yyyy-MM-dd');
}

/** Formata para leitura ("12 de março de 2026"). */
export function formatarDataLonga(iso: DataISO): string {
  return format(paraData(iso), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/** Formata curto ("12/03/2026"). */
export function formatarData(iso: DataISO): string {
  return format(paraData(iso), 'dd/MM/yyyy');
}

export function hojeISO(): DataISO {
  return paraISO(new Date());
}

export function somarDiasCorridos(iso: DataISO, dias: number): DataISO {
  return paraISO(addDays(paraData(iso), dias));
}

/**
 * Domingo de Páscoa pelo algoritmo de Meeus/Jones/Butcher (calendário
 * gregoriano). É daqui que saem Carnaval, Sexta-feira Santa e Corpus Christi.
 */
export function domingoDePascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = março, 4 = abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  const data = new Date(ano, mes - 1, dia);
  data.setHours(12, 0, 0, 0);
  return data;
}

const FIXOS: Array<{ mes: number; dia: number; nome: string }> = [
  { mes: 1, dia: 1, nome: 'Confraternização Universal' },
  { mes: 4, dia: 21, nome: 'Tiradentes' },
  { mes: 5, dia: 1, nome: 'Dia do Trabalho' },
  { mes: 9, dia: 7, nome: 'Independência do Brasil' },
  { mes: 10, dia: 12, nome: 'Nossa Senhora Aparecida' },
  { mes: 11, dia: 2, nome: 'Finados' },
  { mes: 11, dia: 15, nome: 'Proclamação da República' },
  { mes: 11, dia: 20, nome: 'Consciência Negra' },
  { mes: 12, dia: 25, nome: 'Natal' },
];

/** Feriados nacionais de um ano — fixos e móveis. */
export function feriadosNacionais(ano: number): Feriado[] {
  const pascoa = domingoDePascoa(ano);
  const moveis: Feriado[] = [
    { data: paraISO(addDays(pascoa, -48)), nome: 'Carnaval (segunda)' },
    { data: paraISO(addDays(pascoa, -47)), nome: 'Carnaval' },
    { data: paraISO(addDays(pascoa, -46)), nome: 'Quarta-feira de Cinzas (até 14h)' },
    { data: paraISO(addDays(pascoa, -2)), nome: 'Sexta-feira Santa' },
    { data: paraISO(addDays(pascoa, 60)), nome: 'Corpus Christi' },
  ];
  const fixos: Feriado[] = FIXOS.map(({ mes, dia, nome }) => {
    const d = new Date(ano, mes - 1, dia);
    d.setHours(12, 0, 0, 0);
    return { data: paraISO(d), nome };
  });
  return [...fixos, ...moveis].sort((a, b) => a.data.localeCompare(b.data));
}

/** Feriados nacionais de uma faixa de anos (o cronograma usa ano corrente + seguinte). */
export function feriadosNoIntervalo(anoInicial: number, anoFinal: number): Feriado[] {
  const out: Feriado[] = [];
  for (let ano = anoInicial; ano <= anoFinal; ano++) out.push(...feriadosNacionais(ano));
  return out;
}

/**
 * Conjunto de datas não úteis para um cronograma: nacionais dos anos
 * cobertos + customizados do estúdio.
 */
export function conjuntoFeriados(
  anoInicial: number,
  anosAdiante = 2,
  customizados: DataISO[] = [],
): Set<DataISO> {
  const set = new Set<DataISO>();
  for (const f of feriadosNoIntervalo(anoInicial, anoInicial + anosAdiante)) set.add(f.data);
  for (const c of customizados) if (c) set.add(c);
  return set;
}

/** Mapa data → nome, para tooltip no Gantt. */
export function mapaFeriados(anoInicial: number, anosAdiante = 2): Map<DataISO, string> {
  const mapa = new Map<DataISO, string>();
  for (const f of feriadosNoIntervalo(anoInicial, anoInicial + anosAdiante)) {
    if (!mapa.has(f.data)) mapa.set(f.data, f.nome);
  }
  return mapa;
}

export function ehFimDeSemana(data: Date, incluiSabado = false): boolean {
  const dia = getDay(data);
  if (dia === 0) return true; // domingo nunca é útil
  if (dia === 6) return !incluiSabado;
  return false;
}

export function ehDiaUtil(iso: DataISO, opcoes: OpcoesDiaUtil = {}): boolean {
  const data = paraData(iso);
  if (ehFimDeSemana(data, opcoes.incluiSabado)) return false;
  return !opcoes.feriados?.has(iso);
}

/** Primeiro dia útil a partir de `iso` (inclusive). */
export function proximoDiaUtil(iso: DataISO, opcoes: OpcoesDiaUtil = {}): DataISO {
  let atual = iso;
  for (let guarda = 0; guarda < 400; guarda++) {
    if (ehDiaUtil(atual, opcoes)) return atual;
    atual = somarDiasCorridos(atual, 1);
  }
  throw new Error('Não foi possível encontrar um dia útil em 400 dias');
}

/** Soma `dias` dias úteis a partir do dia útil seguinte a `iso`. */
export function somarDiasUteis(iso: DataISO, dias: number, opcoes: OpcoesDiaUtil = {}): DataISO {
  let atual = iso;
  let restantes = Math.max(0, Math.round(dias));
  let guarda = 0;
  while (restantes > 0) {
    atual = somarDiasCorridos(atual, 1);
    if (ehDiaUtil(atual, opcoes)) restantes--;
    if (++guarda > 5000) throw new Error('Loop de dias úteis excedeu o limite');
  }
  return atual;
}

/**
 * Intervalo de uma fase: começa no primeiro dia útil a partir de `inicio` e
 * ocupa `duracao` dias úteis (a duração inclui o dia de início).
 */
export function intervaloDiasUteis(
  inicio: DataISO,
  duracao: number,
  opcoes: OpcoesDiaUtil = {},
): { inicio: DataISO; fim: DataISO } {
  const dias = Math.max(1, Math.round(duracao));
  const primeiro = proximoDiaUtil(inicio, opcoes);
  const ultimo = somarDiasUteis(primeiro, dias - 1, opcoes);
  return { inicio: primeiro, fim: ultimo };
}

/** Conta dias úteis entre duas datas, inclusive nas pontas. */
export function contarDiasUteis(inicio: DataISO, fim: DataISO, opcoes: OpcoesDiaUtil = {}): number {
  if (fim < inicio) return 0;
  let total = 0;
  let atual = inicio;
  let guarda = 0;
  while (atual <= fim) {
    if (ehDiaUtil(atual, opcoes)) total++;
    atual = somarDiasCorridos(atual, 1);
    if (++guarda > 5000) break;
  }
  return total;
}

/** Diferença em dias corridos (fim − início). */
export function diferencaEmDias(inicio: DataISO, fim: DataISO): number {
  const ms = paraData(fim).getTime() - paraData(inicio).getTime();
  return Math.round(ms / 86_400_000);
}

/** Segunda-feira da semana de uma data — âncora das colunas do Gantt. */
export function inicioDaSemana(iso: DataISO): DataISO {
  const data = paraData(iso);
  const dia = getDay(data); // 0 = domingo
  const recuo = dia === 0 ? 6 : dia - 1;
  return paraISO(addDays(data, -recuo));
}
