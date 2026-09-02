import { NextResponse } from 'next/server';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { Proposta } from '@/lib/pdf/Proposta';
import { ResumoInterno } from '@/lib/pdf/ResumoInterno';
import { montarDadosProposta, nomeArquivo } from '@/lib/pdf/dados';
import { listarServicos, obterCliente, obterConfig, obterOrcamento } from '@/lib/db/queries';
import React from 'react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const tipo = url.searchParams.get('tipo') === 'interno' ? 'interno' : 'cliente';
  const detalhado = url.searchParams.get('detalhado') !== '0';

  const orcamento = obterOrcamento(id);
  if (!orcamento) {
    return NextResponse.json({ erro: 'Orçamento não encontrado' }, { status: 404 });
  }

  const montagem = montarDadosProposta({
    orcamento,
    cliente: orcamento.clienteId ? obterCliente(orcamento.clienteId) : null,
    config: obterConfig(),
    servicos: listarServicos(),
    detalhado,
  });

  if (!montagem.ok) {
    return NextResponse.json({ erro: montagem.erro }, { status: 422 });
  }

  // Os componentes devolvem <Document>; o tipo do renderer não enxerga isso
  // através do componente de função, daí o cast.
  const elemento = (
    tipo === 'interno'
      ? React.createElement(ResumoInterno, { dados: montagem.dados })
      : React.createElement(Proposta, { dados: montagem.dados })
  ) as unknown as React.ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(elemento);
  const nome = nomeArquivo(montagem.dados, tipo === 'interno' ? '_interno' : '');

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${nome}"`,
      'Cache-Control': 'no-store',
    },
  });
}
