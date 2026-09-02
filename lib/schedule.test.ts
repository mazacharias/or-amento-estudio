import { describe, expect, it } from 'vitest';
import { calcularCronograma, ordenarFases, type ContextoOrcamento } from './schedule';
import type { Cronograma, Fase } from './types';

function fase(id: string, over: Partial<Fase> = {}): Fase {
  return {
    id,
    nome: id.toUpperCase(),
    descricao: '',
    duracaoDiasUteis: 5,
    dependeDe: [],
    horasAlocadas: 30,
    ehMarcoPagamento: false,
    entregaveis: [],
    ...over,
  };
}

function cronograma(fases: Fase[], over: Partial<Cronograma> = {}): Cronograma {
  return {
    dataInicio: '2026-03-02', // segunda
    fases,
    feriadosCustomizados: [],
    incluiSabado: false,
    ...over,
  };
}

const contexto: ContextoOrcamento = {
  totalHoras: 60,
  horasPorDiaUtil: 6,
  mesesProjeto: 3,
  precoComDesconto: 1_000_000,
  parcelas: [],
};

function ok(c: Cronograma, ctx: ContextoOrcamento = contexto) {
  const r = calcularCronograma(c, ctx);
  if (!r.ok) throw new Error(`esperava cronograma válido: ${r.erro.mensagem}`);
  return r.cronograma;
}

describe('ordenação e dependências', () => {
  it('respeita finish-to-start: a fase começa no dia útil seguinte ao fim da dependência', () => {
    const c = ok(
      cronograma([
        fase('a', { duracaoDiasUteis: 5 }),
        fase('b', { duracaoDiasUteis: 3, dependeDe: ['a'] }),
      ]),
    );
    const [a, b] = c.fases;
    expect(a!.inicio).toBe('2026-03-02');
    expect(a!.fim).toBe('2026-03-06'); // sexta
    expect(b!.inicio).toBe('2026-03-09'); // segunda seguinte, não sábado
    expect(b!.fim).toBe('2026-03-11');
  });

  it('fase com duas dependências espera a mais longa', () => {
    const c = ok(
      cronograma([
        fase('a', { duracaoDiasUteis: 3 }),
        fase('b', { duracaoDiasUteis: 8 }),
        fase('c', { duracaoDiasUteis: 2, dependeDe: ['a', 'b'] }),
      ]),
    );
    const porId = new Map(c.fases.map((f) => [f.id, f]));
    expect(porId.get('b')!.fim).toBe('2026-03-11');
    expect(porId.get('c')!.inicio).toBe('2026-03-12');
  });

  it('fases independentes rodam em paralelo', () => {
    const c = ok(cronograma([fase('a'), fase('b')]));
    expect(c.fases[0]!.inicio).toBe(c.fases[1]!.inicio);
  });

  it('detecta e bloqueia dependência circular com mensagem clara', () => {
    const r = calcularCronograma(
      cronograma([fase('a', { dependeDe: ['b'] }), fase('b', { dependeDe: ['a'] })]),
      contexto,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro.codigo).toBe('ciclo');
    expect(r.erro.mensagem).toContain('circular');
    expect(r.erro.fasesEnvolvidas.sort()).toEqual(['a', 'b']);
  });

  it('detecta ciclo indireto de três fases', () => {
    const r = calcularCronograma(
      cronograma([
        fase('a', { dependeDe: ['c'] }),
        fase('b', { dependeDe: ['a'] }),
        fase('c', { dependeDe: ['b'] }),
      ]),
      contexto,
    );
    expect(r.ok).toBe(false);
  });

  it('detecta autodependência', () => {
    const r = calcularCronograma(cronograma([fase('a', { dependeDe: ['a'] })]), contexto);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro.mensagem).toContain('si mesma');
  });

  it('acusa dependência apontando para fase removida', () => {
    const r = calcularCronograma(cronograma([fase('a', { dependeDe: ['fantasma'] })]), contexto);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro.codigo).toBe('dependencia-invalida');
  });

  it('ordenarFases devolve ordem topológica', () => {
    const r = ordenarFases([fase('c', { dependeDe: ['b'] }), fase('b', { dependeDe: ['a'] }), fase('a')]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ordem.map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('dias úteis e feriados', () => {
  it('começando numa sexta, a fase seguinte cai na segunda', () => {
    const c = ok(
      cronograma([fase('a', { duracaoDiasUteis: 1 }), fase('b', { duracaoDiasUteis: 1, dependeDe: ['a'] })], {
        dataInicio: '2026-03-06', // sexta
      }),
    );
    expect(c.fases[0]!.fim).toBe('2026-03-06');
    expect(c.fases[1]!.inicio).toBe('2026-03-09');
  });

  it('pula feriado nacional dentro da fase', () => {
    // 2026-04-03 é Sexta-feira Santa: 5 dias úteis a partir de 30/03 vão até 07/04.
    const c = ok(cronograma([fase('a', { duracaoDiasUteis: 5 })], { dataInicio: '2026-03-30' }));
    expect(c.fases[0]!.fim).toBe('2026-04-06'); // 30, 31, 01, 02 e — pulando a Sexta-feira Santa e o fim de semana — 06
  });

  it('feriado customizado também é pulado', () => {
    const c = ok(
      cronograma([fase('a', { duracaoDiasUteis: 3 })], {
        dataInicio: '2026-03-02',
        feriadosCustomizados: ['2026-03-03'],
      }),
    );
    expect(c.fases[0]!.fim).toBe('2026-03-05');
  });

  it('com sábado ligado, o projeto encurta', () => {
    const semSabado = ok(cronograma([fase('a', { duracaoDiasUteis: 6 })]));
    const comSabado = ok(cronograma([fase('a', { duracaoDiasUteis: 6 })], { incluiSabado: true }));
    expect(comSabado.fim < semSabado.fim).toBe(true);
    expect(comSabado.fim).toBe('2026-03-07'); // sábado é útil
  });

  it('início em fim de semana escorrega para o dia útil seguinte', () => {
    const c = ok(cronograma([fase('a')], { dataInicio: '2026-03-08' })); // domingo
    expect(c.inicio).toBe('2026-03-09');
  });
});

describe('Gantt', () => {
  it('monta colunas semanais cobrindo todo o projeto', () => {
    const c = ok(
      cronograma([fase('a', { duracaoDiasUteis: 5 }), fase('b', { duracaoDiasUteis: 5, dependeDe: ['a'] })]),
    );
    expect(c.semanas.map((s) => s.inicio)).toEqual(['2026-03-02', '2026-03-09']);
    expect(c.fases[0]!.colunaInicio).toBe(1);
    expect(c.fases[1]!.colunaInicio).toBe(2);
    expect(c.fases[1]!.colunaSpan).toBe(1);
  });

  it('fase que atravessa semanas ganha span maior', () => {
    const c = ok(cronograma([fase('a', { duracaoDiasUteis: 10 })]));
    expect(c.fases[0]!.colunaSpan).toBe(2);
  });
});

describe('validações cruzadas com o orçamento', () => {
  it('alerta quando a soma de horas das fases diverge do orçamento', () => {
    const c = ok(cronograma([fase('a', { horasAlocadas: 20 })]), { ...contexto, totalHoras: 60 });
    const alerta = c.alertas.find((a) => a.codigo === 'horas-divergentes');
    expect(alerta?.mensagem).toContain('faltam 40h');
  });

  it('não alerta quando as horas batem', () => {
    const c = ok(cronograma([fase('a', { horasAlocadas: 30 }), fase('b', { horasAlocadas: 30 })]));
    expect(c.alertas.some((a) => a.codigo === 'horas-divergentes')).toBe(false);
  });

  it('alerta sobrecarga mostrando a folga necessária', () => {
    const c = ok(
      cronograma([fase('a', { duracaoDiasUteis: 2, horasAlocadas: 30 })]),
      { ...contexto, totalHoras: 30 },
    );
    const alerta = c.alertas.find((a) => a.codigo === 'fase-sobrecarregada');
    expect(alerta?.mensagem).toContain('mais 3 dia(s)');
  });

  it('alerta quando o projeto estoura os meses informados', () => {
    const c = ok(cronograma([fase('a', { duracaoDiasUteis: 60, horasAlocadas: 60 })]), {
      ...contexto,
      mesesProjeto: 1,
      totalHoras: 60,
    });
    expect(c.alertas.some((a) => a.codigo === 'prazo-estourado')).toBe(true);
  });
});

describe('fluxo de caixa', () => {
  it('vincula parcelas a marcos e prevê a data de cada recebimento', () => {
    const c = ok(
      cronograma([
        fase('a', { duracaoDiasUteis: 5, ehMarcoPagamento: true, horasAlocadas: 30 }),
        fase('b', { duracaoDiasUteis: 5, dependeDe: ['a'], ehMarcoPagamento: true, horasAlocadas: 30 }),
      ]),
      {
        ...contexto,
        precoComDesconto: 1_000_000, // R$ 10.000,00
        parcelas: [
          { id: 'p1', rotulo: 'Entrada', percentual: 0.5, marcoId: 'a' },
          { id: 'p2', rotulo: 'Entrega', percentual: 0.5, marcoId: 'b' },
        ],
      },
    );
    expect(c.recebimentos).toHaveLength(2);
    expect(c.recebimentos[0]!.valor).toBe(500_000);
    expect(c.recebimentos[0]!.data).toBe('2026-03-06');
    expect(c.recebimentos[1]!.data).toBe('2026-03-13');
    expect(c.recebimentos[1]!.marcoNome).toBe('B');
  });

  it('parcela apontando para fase que não é marco gera alerta', () => {
    const c = ok(cronograma([fase('a', { horasAlocadas: 60 })]), {
      ...contexto,
      parcelas: [{ id: 'p1', rotulo: 'Entrada', percentual: 1, marcoId: 'a' }],
    });
    expect(c.alertas.some((a) => a.codigo === 'parcela-sem-marco')).toBe(true);
  });

  it('entrada sem marco cai na data de início do projeto', () => {
    const c = ok(cronograma([fase('a', { horasAlocadas: 60 })]), {
      ...contexto,
      parcelas: [{ id: 'p1', rotulo: 'Entrada', percentual: 1, marcoId: null }],
    });
    expect(c.recebimentos[0]!.data).toBe('2026-03-02');
  });
});
