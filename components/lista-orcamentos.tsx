'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, FileDown, GitBranch, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Table, Td, Th, Tr, Vazio } from '@/components/ui/table';
import { Valor } from '@/components/valor';
import { TOM_STATUS } from '@/components/status';
import {
  duplicarOrcamentoAction,
  mudarStatusAction,
  novaVersaoAction,
  removerOrcamentoAction,
} from '@/app/actions';
import type { OrcamentoListado } from '@/lib/db/queries';
import { ROTULO_STATUS, STATUS_ORCAMENTO, type Cliente, type StatusOrcamento } from '@/lib/types';
import { formatarData } from '@/lib/dates';
import { formatarPercentual } from '@/lib/money';

export function ListaOrcamentos({
  inicial,
  clientes,
}: {
  inicial: OrcamentoListado[];
  clientes: Cliente[];
}) {
  const router = useRouter();
  const [lista, setLista] = React.useState(inicial);
  const [status, setStatus] = React.useState<StatusOrcamento | 'todos'>('todos');
  const [clienteId, setClienteId] = React.useState('todos');
  const [de, setDe] = React.useState('');
  const [ate, setAte] = React.useState('');
  const [busca, setBusca] = React.useState('');

  React.useEffect(() => setLista(inicial), [inicial]);

  const filtrados = lista.filter((o) => {
    if (status !== 'todos' && o.status !== status) return false;
    if (clienteId !== 'todos' && o.clienteId !== clienteId) return false;
    const dia = o.criadoEm.slice(0, 10);
    if (de && dia < de) return false;
    if (ate && dia > ate) return false;
    if (busca && !`${o.codigo} ${o.titulo} ${o.clienteNome}`.toLowerCase().includes(busca.toLowerCase())) {
      return false;
    }
    return true;
  });

  const total = filtrados.reduce((acc, o) => acc + o.precoFinal, 0);

  async function duplicar(id: string) {
    const r = await duplicarOrcamentoAction(id);
    if (r.ok && r.dados) router.push(`/orcamentos/${r.dados}/editar`);
  }

  async function novaVersao(id: string) {
    const r = await novaVersaoAction(id);
    if (r.ok && r.dados) router.push(`/orcamentos/${r.dados}/editar`);
  }

  async function alterarStatus(id: string, novo: StatusOrcamento) {
    await mudarStatusAction(id, novo);
    setLista((l) => l.map((o) => (o.id === id ? { ...o, status: novo } : o)));
  }

  async function remover(id: string) {
    await removerOrcamentoAction(id);
    setLista((l) => l.filter((o) => o.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por código, projeto ou cliente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value as StatusOrcamento | 'todos')} className="w-40">
          <option value="todos">Todos os status</option>
          {STATUS_ORCAMENTO.map((s) => (
            <option key={s} value={s}>
              {ROTULO_STATUS[s]}
            </option>
          ))}
        </Select>
        <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-48">
          <option value="todos">Todos os clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.empresa || c.nome}
            </option>
          ))}
        </Select>
        <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="w-40" aria-label="De" />
        <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="w-40" aria-label="Até" />
        <span className="ml-auto text-xs text-sutil">
          {filtrados.length} orçamento(s) · <Valor centavos={total} className="text-xs" />
        </span>
      </div>

      <div className="cartao">
        <Table>
          <thead>
            <tr>
              <Th>Código</Th>
              <Th>Cliente</Th>
              <Th>Projeto</Th>
              <Th className="text-right">Horas</Th>
              <Th className="text-right">Valor-hora</Th>
              <Th className="text-right">Margem</Th>
              <Th className="text-right">Valor</Th>
              <Th>Status</Th>
              <Th>Validade</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <Vazio colSpan={10}>Nenhum orçamento com esses filtros.</Vazio>
            ) : (
              filtrados.map((o) => (
                <Tr key={o.id}>
                  <Td className="whitespace-nowrap font-mono text-xs">
                    <Link href={`/orcamentos/${o.id}`} className="hover:text-acento">
                      {o.codigo}
                    </Link>
                    {o.versao > 1 ? <Badge className="ml-1.5">v{o.versao}</Badge> : null}
                  </Td>
                  <Td>{o.clienteNome}</Td>
                  <Td>{o.titulo || 'Sem título'}</Td>
                  <Td className="num text-xs">{o.totalHoras}h</Td>
                  <Td className="text-right">
                    <Valor centavos={o.valorHoraEfetivo} moeda={o.moeda} className="text-xs" />
                  </Td>
                  <Td
                    className={`num text-xs ${o.margemReal < 0 ? 'text-critico' : o.margemReal < 0.12 ? 'text-alerta' : ''}`}
                  >
                    {formatarPercentual(o.margemReal, 0)}
                  </Td>
                  <Td className="text-right">
                    <Valor centavos={o.precoFinal} moeda={o.moeda} />
                  </Td>
                  <Td>
                    <Select
                      value={o.status}
                      onChange={(e) => void alterarStatus(o.id, e.target.value as StatusOrcamento)}
                      className="h-7 py-0 text-xs"
                      aria-label={`Status de ${o.codigo}`}
                    >
                      {STATUS_ORCAMENTO.map((s) => (
                        <option key={s} value={s}>
                          {ROTULO_STATUS[s]}
                        </option>
                      ))}
                    </Select>
                  </Td>
                  <Td className="num text-xs text-sutil">{formatarData(o.validoAte)}</Td>
                  <Td>
                    <div className="flex justify-end gap-0.5">
                      <Link
                        href={`/orcamentos/${o.id}/editar`}
                        className="rounded-marca p-1.5 text-sutil transition hover:bg-tinta/5 hover:text-tinta"
                        aria-label="Editar"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <a
                        href={`/api/orcamentos/${o.id}/pdf?tipo=cliente`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-marca p-1.5 text-sutil transition hover:bg-tinta/5 hover:text-tinta"
                        aria-label="Exportar PDF"
                        title="Exportar PDF"
                      >
                        <FileDown className="h-4 w-4" />
                      </a>
                      <Button
                        variant="fantasma"
                        size="icone"
                        aria-label="Duplicar"
                        title="Duplicar"
                        onClick={() => void duplicar(o.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="fantasma"
                        size="icone"
                        aria-label="Nova versão"
                        title="Nova versão"
                        onClick={() => void novaVersao(o.id)}
                      >
                        <GitBranch className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="fantasma"
                        size="icone"
                        aria-label="Remover"
                        title="Remover"
                        onClick={() => void remover(o.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
