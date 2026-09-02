/**
 * Sementes do banco: catálogo inicial de serviços e configuração default do
 * estúdio (spec §5.3). Puro — sem I/O, para poder ser testado e reusado.
 */

import type { CategoriaServico, Servico } from '../types';

interface SementeServico {
  nome: string;
  categoria: CategoriaServico;
  horas: number;
  descricao: string;
  entregaveis: string[];
  revisoes?: number;
}

export const SERVICOS_SEMENTE: SementeServico[] = [
  {
    nome: 'Naming e verbal',
    categoria: 'branding',
    horas: 40,
    descricao: 'Construção do nome, território verbal e tom de voz da marca.',
    entregaveis: ['Território verbal', 'Rodada de nomes', 'Justificativa do nome escolhido', 'Busca de viabilidade (INPI e domínio)'],
  },
  {
    nome: 'Identidade visual completa',
    categoria: 'branding',
    horas: 120,
    descricao: 'Sistema visual completo, do conceito às aplicações.',
    entregaveis: ['Conceito e territórios visuais', 'Símbolo e logotipo', 'Paleta e tipografia', 'Grafismos e elementos de apoio', 'Aplicações principais', 'Arquivos abertos e exportações'],
    revisoes: 3,
  },
  {
    nome: 'Identidade visual essencial',
    categoria: 'branding',
    horas: 60,
    descricao: 'Pacote enxuto de identidade para quem está começando.',
    entregaveis: ['Logotipo e reduções', 'Paleta e tipografia', 'Três aplicações', 'Arquivos abertos'],
  },
  {
    nome: 'Manual de marca',
    categoria: 'branding',
    horas: 40,
    descricao: 'Documento de uso da marca, com regras e exemplos.',
    entregaveis: ['Manual em PDF', 'Regras de uso e usos incorretos', 'Malha construtiva e reduções'],
  },
  {
    nome: 'Landing page (design)',
    categoria: 'web',
    horas: 40,
    descricao: 'Design de página única orientada a conversão.',
    entregaveis: ['Wireframe', 'Design desktop e mobile', 'Especificação para desenvolvimento'],
  },
  {
    nome: 'Site institucional até 6 páginas',
    categoria: 'web',
    horas: 100,
    descricao: 'Arquitetura e design de site institucional.',
    entregaveis: ['Arquitetura de informação', 'Wireframes', 'Design de até 6 páginas', 'Versões mobile', 'Handoff para desenvolvimento'],
    revisoes: 3,
  },
  {
    nome: 'Design de app — fluxo principal',
    categoria: 'ui-ux',
    horas: 80,
    descricao: 'Desenho do fluxo central do produto, ponta a ponta.',
    entregaveis: ['Mapa do fluxo', 'Wireframes', 'Telas em alta fidelidade', 'Protótipo navegável'],
  },
  {
    nome: 'Design system',
    categoria: 'ui-ux',
    horas: 120,
    descricao: 'Biblioteca de componentes, tokens e documentação de uso.',
    entregaveis: ['Tokens (cor, tipografia, espaçamento)', 'Biblioteca de componentes', 'Documentação de uso', 'Arquivo Figma organizado'],
    revisoes: 3,
  },
  {
    nome: 'Auditoria de UX',
    categoria: 'consultoria',
    horas: 24,
    descricao: 'Avaliação heurística com plano de correções priorizado.',
    entregaveis: ['Relatório de achados', 'Priorização por impacto e esforço', 'Sessão de apresentação'],
    revisoes: 1,
  },
  {
    nome: 'Kit de social media (12 peças)',
    categoria: 'social',
    horas: 24,
    descricao: 'Grade de peças para redes, com templates editáveis.',
    entregaveis: ['12 peças finalizadas', 'Templates editáveis', 'Guia rápido de uso'],
  },
  {
    nome: 'Motion — abertura/vinheta',
    categoria: 'motion',
    horas: 32,
    descricao: 'Vinheta animada da marca, com trilha e variações de formato.',
    entregaveis: ['Storyboard', 'Animação finalizada', 'Versões 16:9, 1:1 e 9:16'],
  },
  {
    nome: 'Ilustração de campanha',
    categoria: 'ilustracao',
    horas: 40,
    descricao: 'Conjunto autoral de ilustrações para campanha.',
    entregaveis: ['Estudos de estilo', 'Ilustrações finalizadas', 'Arquivos vetoriais e exportações'],
  },
  {
    nome: 'Editorial / relatório anual',
    categoria: 'editorial',
    horas: 80,
    descricao: 'Projeto gráfico e diagramação de publicação extensa.',
    entregaveis: ['Projeto gráfico', 'Diagramação completa', 'Arquivo fechado para gráfica', 'Versão digital'],
  },
  {
    nome: 'Consultoria avulsa (hora)',
    categoria: 'consultoria',
    horas: 1,
    descricao: 'Hora de consultoria de design, cobrada avulsa.',
    entregaveis: ['Sessão de trabalho', 'Anotações e encaminhamentos'],
    revisoes: 0,
  },
];

export function servicosIniciais(novoId: () => string): Servico[] {
  return SERVICOS_SEMENTE.map((s) => ({
    id: novoId(),
    nome: s.nome,
    categoria: s.categoria,
    descricao: s.descricao,
    horasEstimadasPadrao: s.horas,
    custoHoraSugerido: null,
    entregaveisPadrao: s.entregaveis,
    rodadasRevisaoPadrao: s.revisoes ?? 2,
    ativo: true,
  }));
}

export const TEXTO_CONDICOES_PADRAO = `A proposta é válida pelo prazo indicado na capa. O prazo de execução começa a contar do recebimento da entrada e de todo o material necessário ao início do trabalho (textos, imagens, acessos e informações de marca).

Aprovações e devolutivas do cliente nas datas previstas são condição do cronograma: atrasos no retorno deslocam as entregas na mesma proporção.

Os valores são reajustados pelo IPCA em contratos com vigência superior a doze meses. Fica eleito o foro da comarca do estúdio para dirimir eventuais dúvidas.`;

export const TEXTO_DIREITOS_USO_PADRAO = `A cessão dos direitos patrimoniais sobre as peças aprovadas ocorre com a quitação integral do investimento, para uso do cliente nos meios e territórios acordados, por prazo indeterminado.

Estudos, alternativas não aprovadas e arquivos de trabalho permanecem com o estúdio. Fontes, imagens de banco e trilhas de terceiros seguem as licenças dos respectivos fornecedores, contratadas em nome do cliente.

O estúdio reserva o direito de exibir o trabalho em seu portfólio e materiais de divulgação após a publicação ou lançamento pelo cliente.`;

export const CUSTOS_FIXOS_SEMENTE = [
  { nome: 'Coworking', valor: 90_000, ehSoftware: false },
  { nome: 'Internet e telefone', valor: 25_000, ehSoftware: false },
  { nome: 'Contador', valor: 40_000, ehSoftware: false },
  { nome: 'Adobe Creative Cloud', valor: 30_000, ehSoftware: true },
  { nome: 'Figma (2 assentos)', valor: 18_000, ehSoftware: true },
  { nome: 'Google Workspace', valor: 8_000, ehSoftware: true },
  { nome: 'Pró-labore base', valor: 389_000, ehSoftware: false },
];
