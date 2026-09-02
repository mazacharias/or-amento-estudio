import { Cabecalho } from '@/components/cabecalho';
import { CadastroClientes } from '@/components/cadastro-clientes';
import { listarClientes, listarOrcamentos } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default function PaginaClientes() {
  const clientes = listarClientes();
  const orcamentos = listarOrcamentos();
  const resumo = new Map<string, { quantidade: number; aprovado: number }>();
  for (const o of orcamentos) {
    const atual = resumo.get(o.clienteId) ?? { quantidade: 0, aprovado: 0 };
    resumo.set(o.clienteId, {
      quantidade: atual.quantidade + 1,
      aprovado: atual.aprovado + (o.status === 'aprovado' ? o.precoFinal : 0),
    });
  }

  return (
    <>
      <Cabecalho titulo="Clientes" descricao="Quem já pediu orçamento, o que foi aprovado e quanto." />
      <CadastroClientes
        inicial={clientes}
        resumo={Object.fromEntries(resumo)}
      />
    </>
  );
}
