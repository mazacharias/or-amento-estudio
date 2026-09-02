import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cabecalho } from '@/components/cabecalho';
import { EditorCronograma } from '@/components/cronograma/editor';
import { obterConfig, obterOrcamento } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default async function PaginaCronograma({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orcamento = obterOrcamento(id);
  if (!orcamento) notFound();

  return (
    <>
      <Cabecalho
        titulo="Cronograma"
        descricao={`${orcamento.codigo}${orcamento.versao > 1 ? ` v${orcamento.versao}` : ''} · ${
          orcamento.titulo || 'Sem título'
        }`}
        acoes={
          <Link href={`/orcamentos/${orcamento.id}`} className="text-sm text-acento hover:underline">
            voltar ao orçamento
          </Link>
        }
      />
      <EditorCronograma orcamentoInicial={orcamento} config={obterConfig()} />
    </>
  );
}
