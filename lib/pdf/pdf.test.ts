/**
 * Testes do PDF: o da proposta não pode vazar dado interno, e os dois modelos
 * precisam paginar bem com 2 e com 12 fases (§9).
 */

import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import { Proposta } from './Proposta';
import { ResumoInterno } from './ResumoInterno';
import { montarDadosProposta, nomeArquivo, type DadosProposta } from './dados';
import type { Cliente, ConfigEstudio, Fase, Orcamento, Servico } from '../types';

const reais = (v: number) => Math.round(v * 100);

const config: ConfigEstudio = {
  nome: 'Atalho',
  cnpjOuCpf: '00.000.000/0001-00',
  email: 'ola@atalho.studio',
  telefone: '(11) 90000-0000',
  site: 'atalho.studio',
  endereco: 'São Paulo, SP',
  logoPath: null,
  moedaPadrao: 'BRL',
  custosFixosMensais: reais(6000),
  horasProdutivasMes: 120,
  margemPadrao: 0.25,
  margemMinimaAceitavel: 0.12,
  aliquotaImposto: 0.06,
  taxaPagamento: 0.03,
  contingenciaPadrao: 0.1,
  validadePropostaDias: 15,
  horasPorDiaUtil: 6,
  textoCondicoesPadrao: 'Condições padrão do estúdio.',
  textoDireitosUsoPadrao: 'Cessão mediante quitação.',
  custosFixosDetalhe: [],
};

const cliente: Cliente = {
  id: 'c1',
  nome: 'Marina Alves',
  empresa: 'Casa Pilar',
  cnpjOuCpf: '11.111.111/0001-11',
  email: 'marina@casapilar.com',
  telefone: '(11) 91111-1111',
  endereco: '',
  observacoes: '',
};

const servicos: Servico[] = [
  {
    id: 's1',
    nome: 'Identidade visual completa',
    categoria: 'branding',
    descricao: 'Sistema visual completo, do conceito às aplicações.',
    horasEstimadasPadrao: 120,
    custoHoraSugerido: null,
    entregaveisPadrao: ['Símbolo e logotipo', 'Paleta e tipografia'],
    rodadasRevisaoPadrao: 3,
    ativo: true,
  },
];

function fases(quantidade: number): Fase[] {
  return Array.from({ length: quantidade }, (_, i) => ({
    id: `f${i + 1}`,
    nome: `Fase ${i + 1} — etapa de trabalho`,
    descricao: 'Descrição da etapa.',
    duracaoDiasUteis: 5,
    dependeDe: i === 0 ? [] : [`f${i}`],
    horasAlocadas: 80 / quantidade,
    ehMarcoPagamento: i === 0 || i === quantidade - 1,
    entregaveis: ['Entrega da etapa'],
  }));
}

function orcamento(qtdFases: number): Orcamento {
  return {
    id: 'o1',
    codigo: 'ATL-2026-014',
    versao: 1,
    orcamentoPaiId: null,
    clienteId: 'c1',
    titulo: 'Identidade visual — Casa Pilar',
    resumoProjeto: 'Reposicionamento da marca e sistema visual completo.',
    moeda: 'BRL',
    status: 'rascunho',
    criadoEm: '2026-03-01T10:00:00.000Z',
    enviadoEm: null,
    validoAte: '2026-03-16',
    mesesProjeto: 2,
    horas: [
      { id: 'h1', servicoId: 's1', descricao: 'Identidade visual completa', papel: 'Designer sênior', horas: 80, custoHora: reais(50) },
    ],
    equipamentos: [
      { id: 'e1', nome: 'Monitor', valorCompra: reais(3000), vidaUtilMeses: 36, percentualAlocado: 0.5, alocacaoTotal: false },
    ],
    softwares: [{ id: 'sw1', nome: 'Licença', tipo: 'avulso-mensal', valor: reais(200), percentualAlocado: 1 }],
    terceiros: [{ id: 't1', fornecedor: 'Ilustrador', escopo: 'Ilustrações', valor: reais(1500) }],
    despesas: [],
    contingencia: 0.1,
    margemDesejada: 0.25,
    aliquotaImposto: 0.06,
    taxaPagamento: 0.03,
    percentualDesconto: 0,
    justificativaDesconto: '',
    entregaveis: ['Manual de marca', 'Arquivos abertos'],
    foraDoEscopo: ['Produção de fotografia', 'Desenvolvimento do site'],
    rodadasRevisao: 3,
    custoRevisaoExtra: reais(800),
    parcelas: [
      { id: 'p1', rotulo: 'Entrada', percentual: 0.5, marcoId: 'f1' },
      { id: 'p2', rotulo: 'Entrega final', percentual: 0.5, marcoId: `f${qtdFases}` },
    ],
    textoCondicoes: 'A proposta é válida pelo prazo indicado.',
    textoDireitosUso: 'Cessão mediante quitação integral.',
    taxaCancelamento: reais(2000),
    cronograma: {
      dataInicio: '2026-03-02',
      fases: fases(qtdFases),
      feriadosCustomizados: [],
      incluiSabado: false,
    },
  };
}

function dados(qtdFases: number, detalhado = true): DadosProposta {
  const r = montarDadosProposta({
    orcamento: orcamento(qtdFases),
    cliente,
    config,
    servicos,
    detalhado,
  });
  if (!r.ok) throw new Error(r.erro);
  return r.dados;
}

/**
 * O extrator devolve os títulos com o letter-spacing do layout ("E S C O P
 * O"), então comparamos sem espaços e sem caixa — o que importa é o conteúdo
 * ter (ou não ter) chegado ao papel.
 */
function normalizar(texto: string): string {
  return texto.replace(/\s+/g, '').toLowerCase();
}

function contem(texto: string, termo: string): boolean {
  return normalizar(texto).includes(normalizar(termo));
}

async function texto(elemento: React.ReactElement<unknown>) {
  const buffer = await renderToBuffer(elemento as unknown as React.ReactElement<DocumentProps>);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const resultado = await parser.getText();
    return { texto: resultado.text, paginas: resultado.pages.length, bytes: buffer.length };
  } finally {
    await parser.destroy();
  }
}

describe('PDF da proposta', () => {
  it('gera com 2 fases', async () => {
    const r = await texto(React.createElement(Proposta, { dados: dados(2) }));
    expect(r.bytes).toBeGreaterThan(1000);
    expect(r.paginas).toBeGreaterThanOrEqual(2);
    expect(contem(r.texto, 'ATL-2026-014')).toBe(true);
    expect(contem(r.texto, 'Casa Pilar')).toBe(true);
    expect(contem(r.texto, 'Fase 1 — etapa')).toBe(true);
    expect(contem(r.texto, 'Fase 2 — etapa')).toBe(true);
  }, 30_000);

  it('gera com 12 fases, paginando a tabela de prazo', async () => {
    const duas = await texto(React.createElement(Proposta, { dados: dados(2) }));
    const doze = await texto(React.createElement(Proposta, { dados: dados(12) }));
    expect(doze.paginas).toBeGreaterThanOrEqual(duas.paginas);
    // Todas as fases aparecem, nenhuma some na quebra de página.
    for (let i = 1; i <= 12; i++) expect(contem(doze.texto, `Fase ${i} — etapa`)).toBe(true);
  }, 40_000);

  it('não vaza nenhum dado interno de custo, margem ou alíquota', async () => {
    const r = await texto(React.createElement(Proposta, { dados: dados(4) }));
    const proibidos = [
      'margem',
      'custo',
      'contingência',
      'alíquota',
      'imposto',
      'divisor',
      'uso interno',
      'terceiro',
      'Ilustrador',
      'depreciação',
      'valor-hora',
    ];
    for (const termo of proibidos) expect([termo, contem(r.texto, termo)]).toEqual([termo, false]);

    // Nem os valores internos do cenário: base com risco, custo das horas,
    // subtotal e valor-hora efetivo.
    const valoresProibidos = ['6.581,67', '4.000,00', '5.983,33', '1.500,00', '124,65'];
    for (const valor of valoresProibidos) expect([valor, contem(r.texto, valor)]).toEqual([valor, false]);

    // E mostra o que deve mostrar.
    expect(contem(r.texto, '9.972,22')).toBe(true);
    expect(contem(r.texto, 'Fora do escopo')).toBe(true);
  }, 30_000);

  it('sem detalhamento, não lista participação por serviço', async () => {
    const r = await texto(React.createElement(Proposta, { dados: dados(2, false) }));
    expect(contem(r.texto, 'Investimento')).toBe(true);
    expect(contem(r.texto, 'Participação')).toBe(false);
  }, 30_000);
});

describe('Resumo interno', () => {
  it('traz custo, margem, valor-hora e breakdown de terceiros', async () => {
    const r = await texto(React.createElement(ResumoInterno, { dados: dados(4) }));
    expect(contem(r.texto, 'USO INTERNO')).toBe(true);
    expect(contem(r.texto, 'Margem real')).toBe(true);
    expect(contem(r.texto, '124,65')).toBe(true); // valor-hora efetivo
    expect(contem(r.texto, '6.581,67')).toBe(true); // base com risco
    expect(contem(r.texto, 'Ilustrador')).toBe(true);
    expect(contem(r.texto, 'Terceiros')).toBe(true);
  }, 30_000);

  it('gera com 12 fases sem quebrar', async () => {
    const r = await texto(React.createElement(ResumoInterno, { dados: dados(12) }));
    expect(r.bytes).toBeGreaterThan(1000);
    expect(contem(r.texto, 'Fluxo de caixa previsto')).toBe(true);
  }, 40_000);
});

describe('nome do arquivo', () => {
  it('segue o padrão CÓDIGO_Cliente_vN.pdf', () => {
    expect(nomeArquivo(dados(2))).toBe('ATL-2026-014_Casa-Pilar_v1.pdf');
    expect(nomeArquivo(dados(2), '_interno')).toBe('ATL-2026-014_Casa-Pilar_v1_interno.pdf');
  });
});
