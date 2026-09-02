import { describe, expect, it } from 'vitest';
import {
  conjuntoFeriados,
  contarDiasUteis,
  domingoDePascoa,
  ehDiaUtil,
  feriadosNacionais,
  intervaloDiasUteis,
  paraISO,
  proximoDiaUtil,
  somarDiasUteis,
  inicioDaSemana,
} from './dates';

describe('feriados', () => {
  it('calcula a Páscoa corretamente', () => {
    expect(paraISO(domingoDePascoa(2026))).toBe('2026-04-05');
    expect(paraISO(domingoDePascoa(2027))).toBe('2027-03-28');
    expect(paraISO(domingoDePascoa(2024))).toBe('2024-03-31');
  });

  it('deriva os feriados móveis de 2026 a partir da Páscoa', () => {
    const mapa = new Map(feriadosNacionais(2026).map((f) => [f.nome, f.data]));
    expect(mapa.get('Carnaval')).toBe('2026-02-17');
    expect(mapa.get('Sexta-feira Santa')).toBe('2026-04-03');
    expect(mapa.get('Corpus Christi')).toBe('2026-06-04');
  });

  it('inclui os fixos nacionais', () => {
    const datas = feriadosNacionais(2026).map((f) => f.data);
    expect(datas).toContain('2026-09-07');
    expect(datas).toContain('2026-11-20');
    expect(datas).toContain('2026-12-25');
  });
});

describe('dias úteis', () => {
  const feriados = conjuntoFeriados(2026, 1);
  const opcoes = { feriados };

  it('sábado e domingo não são úteis por padrão', () => {
    expect(ehDiaUtil('2026-03-07', opcoes)).toBe(false); // sábado
    expect(ehDiaUtil('2026-03-08', opcoes)).toBe(false); // domingo
    expect(ehDiaUtil('2026-03-09', opcoes)).toBe(true); // segunda
  });

  it('sábado vira útil com o toggle ligado', () => {
    expect(ehDiaUtil('2026-03-07', { ...opcoes, incluiSabado: true })).toBe(true);
    expect(ehDiaUtil('2026-03-08', { ...opcoes, incluiSabado: true })).toBe(false);
  });

  it('feriado nacional não é dia útil', () => {
    expect(ehDiaUtil('2026-09-07', opcoes)).toBe(false);
    expect(ehDiaUtil('2026-04-03', opcoes)).toBe(false); // Sexta-feira Santa
  });

  it('feriado customizado entra no conjunto', () => {
    const comRecesso = conjuntoFeriados(2026, 1, ['2026-03-10']);
    expect(ehDiaUtil('2026-03-10', { feriados: comRecesso })).toBe(false);
  });

  it('cronograma que começa na sexta joga o dia seguinte para segunda', () => {
    // 2026-03-06 é sexta; o próximo dia útil é 2026-03-09, segunda.
    expect(somarDiasUteis('2026-03-06', 1, opcoes)).toBe('2026-03-09');
    expect(proximoDiaUtil('2026-03-07', opcoes)).toBe('2026-03-09');
  });

  it('pula feriado ao somar dias úteis', () => {
    // 2026-04-03 é Sexta-feira Santa: quinta + 1 dia útil = segunda 06/04.
    expect(somarDiasUteis('2026-04-02', 1, opcoes)).toBe('2026-04-06');
  });

  it('intervalo de fase conta o próprio dia de início', () => {
    const r = intervaloDiasUteis('2026-03-02', 5, opcoes); // segunda
    expect(r.inicio).toBe('2026-03-02');
    expect(r.fim).toBe('2026-03-06'); // sexta
  });

  it('intervalo iniciado no sábado começa na segunda', () => {
    const r = intervaloDiasUteis('2026-03-07', 3, opcoes);
    expect(r.inicio).toBe('2026-03-09');
    expect(r.fim).toBe('2026-03-11');
  });

  it('conta dias úteis inclusive nas pontas, pulando feriado', () => {
    expect(contarDiasUteis('2026-03-02', '2026-03-06', opcoes)).toBe(5);
    expect(contarDiasUteis('2026-04-01', '2026-04-07', opcoes)).toBe(4); // sem 03 (feriado), 04 e 05 (fds)
  });
});

describe('semana', () => {
  it('ancora a coluna do Gantt na segunda-feira', () => {
    expect(inicioDaSemana('2026-03-07')).toBe('2026-03-02'); // sábado → segunda anterior
    expect(inicioDaSemana('2026-03-08')).toBe('2026-03-02'); // domingo → segunda anterior
    expect(inicioDaSemana('2026-03-09')).toBe('2026-03-09');
  });
});
