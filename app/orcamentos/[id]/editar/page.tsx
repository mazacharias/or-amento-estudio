import { notFound } from 'next/navigation';
import { Cabecalho } from '@/components/cabecalho';
import { Wizard } from '@/components/wizard/wizard';
import { listarClientes, listarServicos, obterConfig, obterOrcamento } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default async function EditarOrcamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orcamento = obterOrcamento(id);
  if (!orcamento) notFound();
  const config = obterConfig();

  return (
    <>
      <Cabecalho titulo={`${orcamento.codigo}${orcamento.versao > 1 ? ` v${orcamento.versao}` : ''}`} descricao={orcamento.titulo} />
      <Wizard
        orcamentoInicial={orcamento}
        dados={{ config, servicos: listarServicos(), clientes: listarClientes() }}
        retomarRascunho={false}
      />
    </>
  );
}
