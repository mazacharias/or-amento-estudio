import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cabecalho } from '@/components/cabecalho';
import { Card, CardContent } from '@/components/ui/card';
import { Table, Td, Th, Tr, Vazio } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Valor } from '@/components/valor';
import { historicoCliente } from '@/lib/db/queries';
import { ROTULO_STATUS } from '@/lib/types';
import { formatarData } from '@/lib/dates';
import { TOM_STATUS } from '@/components/status';

export const dynamic = 'force-dynamic';

export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const historico = historicoCliente(id);
  if (!historico) notFound();

  const { cliente, orcamentos, totalAprovado } = historico;
  return (
    <>
      <Cabecalho
        titulo={cliente.empresa || cliente.nome}
        descricao={cliente.empresa ? `Contato: ${cliente.nome}` : undefined}
      />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardContent className="space-y-3 text-sm">
            <Linha rotulo="CNPJ/CPF" valor={cliente.cnpjOuCpf} />
            <Linha rotulo="E-mail" valor={cliente.email} />
            <Linha rotulo="Telefone" valor={cliente.telefone} />
            <Linha rotulo="Endereço" valor={cliente.endereco} />
            {cliente.observacoes ? (
              <div>
                <p className="rotulo">Observações</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{cliente.observacoes}</p>
              </div>
            ) : null}
            <div className="divisor pt-3">
              <p className="rotulo">Total aprovado</p>
              <p className="mt-1">
                <Valor centavos={totalAprovado} destaque />
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="cartao">
          <Table>
            <thead>
              <tr>
                <Th>Código</Th>
                <Th>Projeto</Th>
                <Th>Status</Th>
                <Th className="text-right">Valor</Th>
                <Th className="text-right">Criado</Th>
              </tr>
            </thead>
            <tbody>
              {orcamentos.length === 0 ? (
                <Vazio colSpan={5}>Nenhum orçamento para este cliente.</Vazio>
              ) : (
                orcamentos.map((o) => (
                  <Tr key={o.id}>
                    <Td className="font-mono text-xs">
                      <Link href={`/orcamentos/${o.id}`} className="hover:text-acento">
                        {o.codigo}
                        {o.versao > 1 ? ` v${o.versao}` : ''}
                      </Link>
                    </Td>
                    <Td>{o.titulo || 'Sem título'}</Td>
                    <Td>
                      <Badge tom={TOM_STATUS[o.status]}>{ROTULO_STATUS[o.status]}</Badge>
                    </Td>
                    <Td className="text-right">
                      <Valor centavos={o.precoFinal} moeda={o.moeda} />
                    </Td>
                    <Td className="num text-xs text-sutil">{formatarData(o.criadoEm.slice(0, 10))}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  if (!valor) return null;
  return (
    <div>
      <p className="rotulo">{rotulo}</p>
      <p className="mt-0.5">{valor}</p>
    </div>
  );
}
