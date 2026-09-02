import { describe, expect, it } from 'vitest';
import {
  calcular,
  calcularCustoHoraFixo,
  calcularModoReverso,
  type EntradaCalculo,
} from './pricing';
import { formatarMoeda } from './money';

const reais = (v: number) => Math.round(v * 100);

/** Cenário do spec §3.8, ao pé da letra. */
function cenarioAceitacao(over: Partial<EntradaCalculo> = {}): EntradaCalculo {
  return {
    custosFixosMensais: reais(6000),
    horasProdutivasMes: 120,
    mesesProjeto: 2,
    horas: [
      {
        id: 'h1',
        servicoId: null,
        descricao: 'Design',
        papel: 'Designer sênior',
        horas: 80,
        custoHora: reais(50),
      },
    ],
    equipamentos: [
      {
        id: 'e1',
        nome: 'Monitor',
        valorCompra: reais(3000),
        vidaUtilMeses: 36,
        percentualAlocado: 0.5,
        alocacaoTotal: false,
      },
    ],
    softwares: [
      {
        id: 's1',
        nome: 'Licença avulsa',
        tipo: 'avulso-mensal',
        valor: reais(200),
        percentualAlocado: 1,
      },
    ],
    terceiros: [{ id: 't1', fornecedor: 'Ilustrador', escopo: 'Ilustrações', valor: reais(1500) }],
    despesas: [],
    contingencia: 0.1,
    margemDesejada: 0.25,
    aliquotaImposto: 0.06,
    taxaPagamento: 0.03,
    percentualDesconto: 0,
    margemMinimaAceitavel: 0.12,
    ...over,
  };
}

function ok(entrada: EntradaCalculo) {
  const r = calcular(entrada);
  if (!r.ok) throw new Error(`esperava cálculo válido, veio erro: ${r.erro.mensagem}`);
  return r.calculo;
}

describe('§3.8 — teste de aceitação da calculadora', () => {
  const c = ok(cenarioAceitacao());

  it('custoHoraFixo = R$ 50,00', () => {
    expect(c.custoHoraFixo).toBe(reais(50));
    // Intl usa espaço não separável entre símbolo e número.
    expect(formatarMoeda(c.custoHoraFixo).replace(/\u00a0/g, ' ')).toBe('R$ 50,00');
  });

  it('custoHoras = R$ 4.000,00', () => {
    expect(c.custoHoras).toBe(reais(4000));
  });

  it('custoEquipamento = R$ 83,33', () => {
    expect(c.custoEquipamentos).toBe(reais(83.33));
  });

  it('custoSoftware = R$ 400,00', () => {
    expect(c.custoSoftware).toBe(reais(400));
  });

  it('subtotalCustos = R$ 5.983,33', () => {
    expect(c.subtotalCustos).toBe(reais(5983.33));
  });

  it('baseComRisco = R$ 6.581,67', () => {
    expect(c.baseComRisco).toBe(reais(6581.67));
  });

  it('divisor = 0,66', () => {
    expect(c.divisor).toBeCloseTo(0.66, 10);
  });

  it('precoFinal = R$ 9.972,22', () => {
    expect(c.precoFinal).toBe(reais(9972.22));
  });

  it('valorHoraEfetivo = R$ 124,65', () => {
    expect(c.valorHoraEfetivo).toBe(reais(124.65));
  });

  it('a margem alvo se realiza quando não há desconto', () => {
    expect(c.margemReal).toBeCloseTo(0.25, 4);
    expect(c.alertaMargem.nivel).toBe('ok');
  });
});

describe('§3.5 — desconto e margem real', () => {
  it('desconto de 20% no cenário §3.8 derruba a margem para ~8,5% e dispara alerta', () => {
    const c = ok(cenarioAceitacao({ percentualDesconto: 0.2 }));
    expect(c.precoComDesconto).toBe(reais(7977.78));
    // (7977,78 × 0,91 − 6581,67) / 7977,78
    expect(c.margemReal).toBeCloseTo(0.085, 3);
    expect(c.margemReal).toBeLessThan(0.12);
    expect(c.alertaMargem.nivel).toBe('atencao');
    expect(c.alertaMargem.mensagem).toContain('derruba a margem');
  });

  it('desconto de 30% no mesmo cenário torna a margem negativa e dispara o alerta crítico', () => {
    const c = ok(cenarioAceitacao({ percentualDesconto: 0.3 }));
    expect(c.margemReal).toBeLessThan(0);
    expect(c.lucroLiquido).toBeLessThan(0);
    expect(c.alertaMargem.nivel).toBe('critico');
    expect(c.alertaMargem.mensagem).toContain('pagando para trabalhar');
  });

  it('o ponto de virada da margem fica entre 27% e 28% de desconto', () => {
    // Zero de margem em ~27,47%: preço × 0,91 = base com risco (R$ 6.581,67).
    expect(ok(cenarioAceitacao({ percentualDesconto: 0.27 })).margemReal).toBeGreaterThan(0);
    expect(ok(cenarioAceitacao({ percentualDesconto: 0.28 })).margemReal).toBeLessThan(0);
  });
});

describe('§3.4 — gross-up', () => {
  it('não confunde markup com margem: 25% de margem não é custo × 1,25', () => {
    const c = ok(
      cenarioAceitacao({ aliquotaImposto: 0, taxaPagamento: 0, contingencia: 0, equipamentos: [], softwares: [], terceiros: [] }),
    );
    expect(c.precoFinal).toBe(reais(5333.33)); // 4000 / 0,75
    expect(c.precoFinal).not.toBe(reais(5000)); // 4000 × 1,25 daria só 20% de margem
    expect(c.margemReal).toBeCloseTo(0.25, 4);
  });

  it('divisor <= 0,15 bloqueia o cálculo com mensagem explicativa', () => {
    const r = calcular(cenarioAceitacao({ margemDesejada: 0.8, aliquotaImposto: 0.06, taxaPagamento: 0.03 }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro.codigo).toBe('divisor-inviavel');
    expect(r.erro.divisor).toBeCloseTo(0.11, 10);
    expect(r.erro.mensagem).toContain('inviável');
  });

  it('divisor exatamente 0,15 também bloqueia', () => {
    const r = calcular(cenarioAceitacao({ margemDesejada: 0.76, aliquotaImposto: 0.06, taxaPagamento: 0.03 }));
    expect(r.ok).toBe(false);
  });
});

describe('§3.2 — custos do projeto', () => {
  it('alocação total ignora a depreciação e usa o valor cheio', () => {
    const c = ok(
      cenarioAceitacao({
        equipamentos: [
          {
            id: 'e1',
            nome: 'Dispositivo de teste',
            valorCompra: reais(3000),
            vidaUtilMeses: 36,
            percentualAlocado: 0.5,
            alocacaoTotal: true,
          },
        ],
      }),
    );
    expect(c.custoEquipamentos).toBe(reais(3000));
  });

  it('software recorrente já no custo fixo é informativo e não soma', () => {
    const c = ok(
      cenarioAceitacao({
        softwares: [
          { id: 's1', nome: 'Adobe CC', tipo: 'recorrente-ja-no-fixo', valor: reais(300), percentualAlocado: 1 },
          { id: 's2', nome: 'Fonte', tipo: 'avulso-unico', valor: reais(120), percentualAlocado: 1 },
        ],
      }),
    );
    expect(c.custoSoftware).toBe(reais(120));
    expect(c.detalheSoftwares[0]?.informativo).toBe(true);
    expect(c.detalheSoftwares[0]?.custo).toBe(0);
  });

  it('custoHoraFixo cai a zero quando não há horas produtivas informadas', () => {
    expect(calcularCustoHoraFixo(reais(6000), 0)).toBe(0);
  });
});

describe('§3.3 — contingência', () => {
  it('sugere 15–20% quando há mais de 2 terceiros', () => {
    const c = ok(
      cenarioAceitacao({
        terceiros: [
          { id: 't1', fornecedor: 'A', escopo: '', valor: reais(100) },
          { id: 't2', fornecedor: 'B', escopo: '', valor: reais(100) },
          { id: 't3', fornecedor: 'C', escopo: '', valor: reais(100) },
        ],
      }),
    );
    expect(c.sugestaoContingencia).toContain('3 terceiros');
  });

  it('não sugere nada quando a contingência já está em 15%', () => {
    const c = ok(cenarioAceitacao({ qtdFases: 5, contingencia: 0.15 }));
    expect(c.sugestaoContingencia).toBeNull();
  });
});

describe('§3.7 — modo reverso', () => {
  it('invertendo o cálculo, o preço final do §3.8 devolve exatamente as 80 horas', () => {
    const entrada = cenarioAceitacao();
    const r = calcularModoReverso(entrada, reais(9972.22));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reverso.horasMax).toBeCloseTo(80, 1);
    expect(r.reverso.baseMax).toBe(reais(6581.67));
    expect(r.reverso.mensagem).toContain('80h');
  });

  it('budget maior libera mais horas, e as linhas que não cabem vêm marcadas', () => {
    const entrada = cenarioAceitacao({
      horas: [
        { id: 'h1', servicoId: null, descricao: 'Identidade', papel: 'Designer', horas: 60, custoHora: reais(50) },
        { id: 'h2', servicoId: null, descricao: 'Manual', papel: 'Designer', horas: 40, custoHora: reais(50) },
      ],
    });
    const r = calcularModoReverso(entrada, reais(9972.22));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reverso.servicos[0]?.cabe).toBe(true);
    expect(r.reverso.servicos[1]?.cabe).toBe(false);
  });

  it('budget insuficiente avisa que nem os custos diretos cabem', () => {
    const r = calcularModoReverso(cenarioAceitacao(), reais(1000));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reverso.viavel).toBe(false);
    expect(r.reverso.horasMax).toBeLessThanOrEqual(0);
    expect(r.reverso.mensagem).toContain('não cobre nem os custos diretos');
  });

  it('ida e volta: as horas devolvidas, reprecificadas, reconstroem o preço-alvo', () => {
    const entrada = cenarioAceitacao();
    const alvo = reais(15000);
    const r = calcularModoReverso(entrada, alvo);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const reprecificado = ok({
      ...entrada,
      horas: [{ ...entrada.horas[0]!, horas: r.reverso.horasMax }],
    });
    // horasMax é arredondado para baixo em 0,1h, então o preço fica logo abaixo do alvo.
    expect(reprecificado.precoFinal).toBeLessThanOrEqual(alvo);
    expect(alvo - reprecificado.precoFinal).toBeLessThan(reais(10));
  });
});

describe('capacidade', () => {
  it('alerta quando as horas passam da capacidade do período', () => {
    const c = ok(
      cenarioAceitacao({
        mesesProjeto: 1,
        horas: [
          { id: 'h1', servicoId: null, descricao: 'Design', papel: 'Designer', horas: 200, custoHora: reais(50) },
        ],
      }),
    );
    expect(c.capacidade.horasDisponiveis).toBe(120);
    expect(c.capacidade.excedeCapacidade).toBe(true);
  });
});

describe('dinheiro é sempre inteiro', () => {
  it('nenhum campo monetário do resultado sai fracionado', () => {
    const c = ok(cenarioAceitacao({ percentualDesconto: 0.137, contingencia: 0.123 }));
    const monetarios = [
      c.custoHoraFixo,
      c.custoHoras,
      c.custoEquipamentos,
      c.custoSoftware,
      c.custoTerceiros,
      c.custoDespesas,
      c.subtotalCustos,
      c.contingenciaValor,
      c.baseComRisco,
      c.precoFinal,
      c.descontoValor,
      c.precoComDesconto,
      c.impostoValor,
      c.taxaValor,
      c.lucroLiquido,
      c.valorHoraEfetivo,
      c.custoHoraMedio,
    ];
    for (const v of monetarios) expect(Number.isInteger(v)).toBe(true);
  });

  it('a cascata fecha no preço final, com e sem desconto', () => {
    for (const desconto of [0, 0.2, 0.35]) {
      const c = ok(cenarioAceitacao({ percentualDesconto: desconto }));
      // O desconto não empilha: imposto, taxa e margem já saem do preço com desconto.
      const soma = c.cascata
        .filter((e) => e.tipo === 'custo' || e.tipo === 'acrescimo')
        .reduce((acc, e) => acc + e.valor, 0);
      const total = c.cascata.find((e) => e.tipo === 'total')!.valor;
      expect(Math.abs(soma - total)).toBeLessThanOrEqual(2); // tolerância de arredondamento
      expect(total).toBe(c.precoComDesconto);
    }
  });
});

describe('estado vazio', () => {
  it('orçamento em branco não acusa margem ruim', () => {
    const c = ok(cenarioAceitacao({ horas: [], equipamentos: [], softwares: [], terceiros: [], despesas: [] }));
    expect(c.subtotalCustos).toBe(0);
    expect(c.precoFinal).toBe(0);
    expect(c.alertaMargem.nivel).toBe('ok');
    expect(c.alertaMargem.mensagem).toContain('Sem custos lançados');
  });
});
