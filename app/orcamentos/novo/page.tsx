import { Cabecalho } from '@/components/cabecalho';
import { Wizard } from '@/components/wizard/wizard';
import { listarClientes, listarServicos, obterConfig, orcamentoNovo } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default function NovoOrcamento() {
  const config = obterConfig();
  return (
    <>
      <Cabecalho
        titulo="Novo orçamento"
        descricao="Auto-save a cada mudança: fechar o navegador no meio não perde o rascunho."
      />
      <Wizard
        orcamentoInicial={orcamentoNovo(config)}
        dados={{ config, servicos: listarServicos(), clientes: listarClientes() }}
        retomarRascunho
      />
    </>
  );
}
