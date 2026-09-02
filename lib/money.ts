/**
 * Dinheiro na Atalho.
 *
 * Regra dura: todo valor monetário persistido e transportado é INTEIRO em
 * centavos (`Cents`). Float nunca toca dinheiro.
 *
 * Para o cálculo intermediário — onde aparecem divisões como 2/36 meses de
 * depreciação ou o gross-up por um divisor — usamos uma escala interna de
 * micro-centavos (`Micro`, 1 centavo = 1_000_000 µ¢) em `bigint`. Assim a
 * conta é exata e determinística, e o arredondamento acontece uma vez só, na
 * saída, com meio-para-cima (afastando do zero).
 *
 * Percentuais seguem o modelo do spec — decimal (0.25 = 25%) na borda — mas
 * são convertidos para taxa inteira em micro (`Rate`, 1_000_000 = 100%) antes
 * de qualquer aritmética, para não herdar a imprecisão binária de 0.06.
 */

/** Valor monetário em centavos. Sempre inteiro. */
export type Cents = number;
/** Valor monetário em micro-centavos (1e6 por centavo). Sempre bigint. */
export type Micro = bigint;
/** Taxa em micro (1_000_000 = 100%). Sempre bigint. */
export type Rate = bigint;

export const MICRO_POR_CENTAVO = 1_000_000n;
export const RATE_UM: Rate = 1_000_000n;

/** Centavos (inteiro) → micro-centavos. */
export function paraMicro(centavos: Cents): Micro {
  return BigInt(Math.round(centavos)) * MICRO_POR_CENTAVO;
}

/** Divisão de bigint com arredondamento meio-para-cima, afastando do zero. */
export function dividirArredondando(numerador: bigint, denominador: bigint): bigint {
  if (denominador === 0n) throw new Error('Divisão por zero no cálculo monetário');
  const negativo = numerador < 0n !== denominador < 0n;
  const n = numerador < 0n ? -numerador : numerador;
  const d = denominador < 0n ? -denominador : denominador;
  const q = (n * 2n + d) / (d * 2n);
  return negativo ? -q : q;
}

/** Micro-centavos → centavos inteiros (arredonda meio-para-cima). */
export function paraCentavos(micro: Micro): Cents {
  return Number(dividirArredondando(micro, MICRO_POR_CENTAVO));
}

/** Percentual decimal do spec (0.25) → taxa inteira em micro (250000). */
export function paraRate(decimal: number): Rate {
  if (!Number.isFinite(decimal)) throw new Error('Percentual inválido');
  return BigInt(Math.round(decimal * 1_000_000));
}

/** Taxa em micro → decimal (para exibição e persistência). */
export function rateParaDecimal(rate: Rate): number {
  return Number(rate) / 1_000_000;
}

/** Multiplica dinheiro por uma taxa: `valor × rate`. */
export function multiplicarRate(valor: Micro, rate: Rate): Micro {
  return dividirArredondando(valor * rate, RATE_UM);
}

/** Divide dinheiro por uma taxa: `valor ÷ rate`. */
export function dividirRate(valor: Micro, rate: Rate): Micro {
  return dividirArredondando(valor * RATE_UM, rate);
}

/** Multiplica dinheiro por uma quantidade inteira ou fracionária de unidades. */
export function multiplicarQuantidade(valor: Micro, quantidade: number): Micro {
  // Quantidades (horas, meses) admitem uma casa fracionária; escalamos por 1e6
  // e voltamos, mantendo a conta em inteiros.
  const q = BigInt(Math.round(quantidade * 1_000_000));
  return dividirArredondando(valor * q, 1_000_000n);
}

export function somar(...valores: Micro[]): Micro {
  return valores.reduce((acc, v) => acc + v, 0n);
}

const LOCALE_POR_MOEDA: Record<string, string> = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'de-DE',
};

/** Formata centavos como moeda. Entrada inteira, saída para leitura humana. */
export function formatarMoeda(centavos: Cents, moeda: string = 'BRL'): string {
  const locale = LOCALE_POR_MOEDA[moeda] ?? 'pt-BR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: moeda,
  }).format(centavos / 100);
}

/** Formata centavos sem símbolo (para tabelas alinhadas à direita). */
export function formatarNumero(centavos: Cents): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

/** Percentual decimal → texto ("0.2456" → "24,6%"). */
export function formatarPercentual(decimal: number, casas = 1): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(decimal);
}

/**
 * Texto digitado ("1.234,56", "1234.56", "R$ 1.234,56") → centavos inteiros.
 * Retorna 0 para entrada vazia e ignora o que não for dígito ou separador.
 */
export function parseMoeda(texto: string): Cents {
  const limpo = texto.replace(/[^\d,.-]/g, '').trim();
  if (!limpo) return 0;
  const temVirgula = limpo.includes(',');
  const normalizado = temVirgula
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo;
  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return 0;
  return Math.round(numero * 100);
}
