/**
 * Presets de cronograma por tipo de projeto (spec §5.6) — para não começar do
 * zero. As durações são referência; o cronograma é editável depois.
 */

import type { Fase } from './types';

export interface PresetCronograma {
  id: string;
  nome: string;
  descricao: string;
  fases: Array<{
    nome: string;
    descricao: string;
    dias: number;
    pesoHoras: number; // fração do total de horas do orçamento
    marco?: boolean;
    entregaveis: string[];
  }>;
}

export const PRESETS_CRONOGRAMA: PresetCronograma[] = [
  {
    id: 'branding',
    nome: 'Branding',
    descricao: 'Imersão → Estratégia → Conceito → Desenvolvimento → Aplicações → Manual → Entrega',
    fases: [
      { nome: 'Imersão', descricao: 'Briefing, entrevistas e diagnóstico.', dias: 5, pesoHoras: 0.1, marco: true, entregaveis: ['Relatório de imersão'] },
      { nome: 'Estratégia', descricao: 'Posicionamento e território de marca.', dias: 5, pesoHoras: 0.12, entregaveis: ['Plataforma de marca'] },
      { nome: 'Conceito', descricao: 'Rotas visuais e escolha de caminho.', dias: 8, pesoHoras: 0.2, marco: true, entregaveis: ['Apresentação de conceito'] },
      { nome: 'Desenvolvimento', descricao: 'Refino do sistema escolhido.', dias: 10, pesoHoras: 0.25, entregaveis: ['Sistema visual refinado'] },
      { nome: 'Aplicações', descricao: 'Peças e usos principais da marca.', dias: 8, pesoHoras: 0.18, entregaveis: ['Aplicações principais'] },
      { nome: 'Manual', descricao: 'Documentação de uso.', dias: 5, pesoHoras: 0.1, entregaveis: ['Manual de marca'] },
      { nome: 'Entrega', descricao: 'Arquivos abertos e passagem de bastão.', dias: 2, pesoHoras: 0.05, marco: true, entregaveis: ['Pacote final de arquivos'] },
    ],
  },
  {
    id: 'web',
    nome: 'Site',
    descricao: 'Descoberta → Arquitetura → Wireframes → UI → Handoff',
    fases: [
      { nome: 'Descoberta', descricao: 'Objetivos, público e conteúdo.', dias: 4, pesoHoras: 0.12, marco: true, entregaveis: ['Documento de descoberta'] },
      { nome: 'Arquitetura de informação', descricao: 'Mapa do site e fluxos.', dias: 4, pesoHoras: 0.13, entregaveis: ['Mapa do site'] },
      { nome: 'Wireframes', descricao: 'Estrutura de cada página.', dias: 6, pesoHoras: 0.2, marco: true, entregaveis: ['Wireframes aprovados'] },
      { nome: 'Interface', descricao: 'Design visual de todas as páginas.', dias: 12, pesoHoras: 0.4, entregaveis: ['Telas desktop e mobile'] },
      { nome: 'Handoff', descricao: 'Especificação e apoio ao desenvolvimento.', dias: 3, pesoHoras: 0.15, marco: true, entregaveis: ['Arquivo de handoff'] },
    ],
  },
  {
    id: 'produto',
    nome: 'Produto digital',
    descricao: 'Pesquisa → Fluxos → Protótipo → UI → Design system',
    fases: [
      { nome: 'Pesquisa', descricao: 'Entrevistas e análise do problema.', dias: 6, pesoHoras: 0.15, marco: true, entregaveis: ['Síntese da pesquisa'] },
      { nome: 'Fluxos', descricao: 'Jornadas e arquitetura do produto.', dias: 5, pesoHoras: 0.15, entregaveis: ['Mapa de fluxos'] },
      { nome: 'Protótipo', descricao: 'Baixa fidelidade e validação.', dias: 8, pesoHoras: 0.25, marco: true, entregaveis: ['Protótipo navegável'] },
      { nome: 'Interface', descricao: 'Telas em alta fidelidade.', dias: 10, pesoHoras: 0.3, entregaveis: ['Telas finais'] },
      { nome: 'Design system', descricao: 'Componentes e tokens documentados.', dias: 6, pesoHoras: 0.15, marco: true, entregaveis: ['Biblioteca de componentes'] },
    ],
  },
  {
    id: 'campanha',
    nome: 'Campanha',
    descricao: 'Briefing → Conceito → Peças → Adaptações → Entrega',
    fases: [
      { nome: 'Briefing', descricao: 'Alinhamento de objetivo e mensagem.', dias: 2, pesoHoras: 0.1, marco: true, entregaveis: ['Briefing aprovado'] },
      { nome: 'Conceito', descricao: 'Ideia central e direção visual.', dias: 5, pesoHoras: 0.25, marco: true, entregaveis: ['Conceito criativo'] },
      { nome: 'Peças principais', descricao: 'Produção das peças-chave.', dias: 8, pesoHoras: 0.35, entregaveis: ['Peças principais'] },
      { nome: 'Adaptações', descricao: 'Formatos e desdobramentos.', dias: 5, pesoHoras: 0.2, entregaveis: ['Kit de formatos'] },
      { nome: 'Entrega', descricao: 'Fechamento de arquivos.', dias: 2, pesoHoras: 0.1, marco: true, entregaveis: ['Arquivos finais'] },
    ],
  },
];

/** Gera as fases do preset, distribuindo as horas do orçamento pelos pesos. */
export function fasesDoPreset(
  preset: PresetCronograma,
  totalHoras: number,
  novoId: () => string,
): Fase[] {
  const ids = preset.fases.map(() => novoId());
  return preset.fases.map((f, i) => ({
    id: ids[i]!,
    nome: f.nome,
    descricao: f.descricao,
    duracaoDiasUteis: f.dias,
    dependeDe: i === 0 ? [] : [ids[i - 1]!],
    horasAlocadas: Math.round(totalHoras * f.pesoHoras * 10) / 10,
    ehMarcoPagamento: Boolean(f.marco),
    entregaveis: f.entregaveis,
  }));
}
