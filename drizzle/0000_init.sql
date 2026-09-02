CREATE TABLE IF NOT EXISTS `config` (
  `id` text PRIMARY KEY NOT NULL DEFAULT 'estudio',
  `nome` text NOT NULL DEFAULT 'Atalho',
  `cnpj_ou_cpf` text NOT NULL DEFAULT '',
  `email` text NOT NULL DEFAULT '',
  `telefone` text NOT NULL DEFAULT '',
  `site` text NOT NULL DEFAULT '',
  `endereco` text NOT NULL DEFAULT '',
  `logo_path` text,
  `moeda_padrao` text NOT NULL DEFAULT 'BRL',
  `custos_fixos_mensais` integer NOT NULL DEFAULT 0,
  `horas_produtivas_mes` integer NOT NULL DEFAULT 120,
  `margem_padrao` real NOT NULL DEFAULT 0.25,
  `margem_minima_aceitavel` real NOT NULL DEFAULT 0.12,
  `aliquota_imposto` real NOT NULL DEFAULT 0.06,
  `taxa_pagamento` real NOT NULL DEFAULT 0.03,
  `contingencia_padrao` real NOT NULL DEFAULT 0.1,
  `validade_proposta_dias` integer NOT NULL DEFAULT 15,
  `horas_por_dia_util` integer NOT NULL DEFAULT 6,
  `texto_condicoes_padrao` text NOT NULL DEFAULT '',
  `texto_direitos_uso_padrao` text NOT NULL DEFAULT '',
  `custos_fixos_detalhe` text NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS `servicos` (
  `id` text PRIMARY KEY NOT NULL,
  `nome` text NOT NULL,
  `categoria` text NOT NULL,
  `descricao` text NOT NULL DEFAULT '',
  `horas_estimadas_padrao` real NOT NULL DEFAULT 0,
  `custo_hora_sugerido` integer,
  `entregaveis_padrao` text NOT NULL DEFAULT '[]',
  `rodadas_revisao_padrao` integer NOT NULL DEFAULT 2,
  `ativo` integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS `idx_servicos_categoria` ON `servicos` (`categoria`);

CREATE TABLE IF NOT EXISTS `clientes` (
  `id` text PRIMARY KEY NOT NULL,
  `nome` text NOT NULL,
  `empresa` text NOT NULL DEFAULT '',
  `cnpj_ou_cpf` text NOT NULL DEFAULT '',
  `email` text NOT NULL DEFAULT '',
  `telefone` text NOT NULL DEFAULT '',
  `endereco` text NOT NULL DEFAULT '',
  `observacoes` text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS `orcamentos` (
  `id` text PRIMARY KEY NOT NULL,
  `codigo` text NOT NULL,
  `versao` integer NOT NULL DEFAULT 1,
  `orcamento_pai_id` text,
  `cliente_id` text NOT NULL DEFAULT '',
  `titulo` text NOT NULL DEFAULT '',
  `resumo_projeto` text NOT NULL DEFAULT '',
  `moeda` text NOT NULL DEFAULT 'BRL',
  `status` text NOT NULL DEFAULT 'rascunho',
  `criado_em` text NOT NULL,
  `atualizado_em` text NOT NULL,
  `enviado_em` text,
  `valido_ate` text NOT NULL,
  `meses_projeto` real NOT NULL DEFAULT 1,
  `horas` text NOT NULL DEFAULT '[]',
  `equipamentos` text NOT NULL DEFAULT '[]',
  `softwares` text NOT NULL DEFAULT '[]',
  `terceiros` text NOT NULL DEFAULT '[]',
  `despesas` text NOT NULL DEFAULT '[]',
  `contingencia` real NOT NULL DEFAULT 0.1,
  `margem_desejada` real NOT NULL DEFAULT 0.25,
  `aliquota_imposto` real NOT NULL DEFAULT 0.06,
  `taxa_pagamento` real NOT NULL DEFAULT 0.03,
  `percentual_desconto` real NOT NULL DEFAULT 0,
  `justificativa_desconto` text NOT NULL DEFAULT '',
  `entregaveis` text NOT NULL DEFAULT '[]',
  `fora_do_escopo` text NOT NULL DEFAULT '[]',
  `rodadas_revisao` integer NOT NULL DEFAULT 2,
  `custo_revisao_extra` integer NOT NULL DEFAULT 0,
  `parcelas` text NOT NULL DEFAULT '[]',
  `texto_condicoes` text NOT NULL DEFAULT '',
  `texto_direitos_uso` text NOT NULL DEFAULT '',
  `taxa_cancelamento` integer NOT NULL DEFAULT 0,
  `cronograma` text,
  `preco_final` integer NOT NULL DEFAULT 0,
  `total_horas` real NOT NULL DEFAULT 0,
  `margem_real` real NOT NULL DEFAULT 0,
  `valor_hora_efetivo` integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS `idx_orcamentos_status` ON `orcamentos` (`status`);
CREATE INDEX IF NOT EXISTS `idx_orcamentos_cliente` ON `orcamentos` (`cliente_id`);
CREATE INDEX IF NOT EXISTS `idx_orcamentos_codigo` ON `orcamentos` (`codigo`);
