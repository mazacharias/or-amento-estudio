'use client';

import * as React from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Campo, Input, Textarea } from '@/components/ui/field';
import { Table, Td, Th, Tr, Vazio } from '@/components/ui/table';
import { Valor } from '@/components/valor';
import { removerClienteAction, salvarClienteAction } from '@/app/actions';
import type { Cliente } from '@/lib/types';
import { novoId } from '@/lib/utils';

function clienteVazio(): Cliente {
  return {
    id: novoId(),
    nome: '',
    empresa: '',
    cnpjOuCpf: '',
    email: '',
    telefone: '',
    endereco: '',
    observacoes: '',
  };
}

export function CadastroClientes({
  inicial,
  resumo,
}: {
  inicial: Cliente[];
  resumo: Record<string, { quantidade: number; aprovado: number }>;
}) {
  const [clientes, setClientes] = React.useState(inicial);
  const [busca, setBusca] = React.useState('');
  const [editando, setEditando] = React.useState<Cliente | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);

  const filtrados = clientes.filter((c) =>
    `${c.nome} ${c.empresa} ${c.email}`.toLowerCase().includes(busca.toLowerCase()),
  );

  async function salvar(cliente: Cliente) {
    const r = await salvarClienteAction(cliente);
    if (!r.ok) {
      setErro(r.erro ?? 'Erro ao salvar');
      return;
    }
    setClientes((lista) => {
      const existe = lista.some((c) => c.id === cliente.id);
      return (existe ? lista.map((c) => (c.id === cliente.id ? cliente : c)) : [...lista, cliente]).sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR'),
      );
    });
    setEditando(null);
    setErro(null);
  }

  async function remover(id: string) {
    const r = await removerClienteAction(id);
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível remover');
      return;
    }
    setClientes((lista) => lista.filter((c) => c.id !== id));
    setErro(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar cliente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="primario" className="ml-auto" onClick={() => setEditando(clienteVazio())}>
          <Plus className="h-4 w-4" /> Novo cliente
        </Button>
      </div>

      {erro ? <p className="text-sm text-critico">{erro}</p> : null}

      {editando ? (
        <EditorCliente cliente={editando} onCancelar={() => setEditando(null)} onSalvar={salvar} />
      ) : null}

      <div className="cartao">
        <Table>
          <thead>
            <tr>
              <Th>Cliente</Th>
              <Th>Contato</Th>
              <Th className="text-right">Orçamentos</Th>
              <Th className="text-right">Total aprovado</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <Vazio colSpan={5}>Nenhum cliente cadastrado.</Vazio>
            ) : (
              filtrados.map((c) => {
                const r = resumo[c.id] ?? { quantidade: 0, aprovado: 0 };
                return (
                  <Tr key={c.id}>
                    <Td>
                      <Link href={`/clientes/${c.id}`} className="font-medium hover:text-acento">
                        {c.empresa || c.nome}
                      </Link>
                      {c.empresa ? <div className="text-xs text-sutil">{c.nome}</div> : null}
                    </Td>
                    <Td className="text-sutil">
                      <div className="text-xs">{c.email}</div>
                      <div className="text-xs">{c.telefone}</div>
                    </Td>
                    <Td className="num">{r.quantidade}</Td>
                    <Td className="text-right">
                      <Valor centavos={r.aprovado} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="fantasma" size="icone" aria-label="Editar" onClick={() => setEditando(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="fantasma"
                          size="icone"
                          aria-label="Remover"
                          onClick={() => void remover(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

function EditorCliente({
  cliente,
  onCancelar,
  onSalvar,
}: {
  cliente: Cliente;
  onCancelar: () => void;
  onSalvar: (c: Cliente) => void | Promise<void>;
}) {
  const [rascunho, setRascunho] = React.useState(cliente);
  function set<K extends keyof Cliente>(campo: K, valor: Cliente[K]) {
    setRascunho((c) => ({ ...c, [campo]: valor }));
  }
  return (
    <div className="cartao space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Empresa">
          <Input value={rascunho.empresa} onChange={(e) => set('empresa', e.target.value)} />
        </Campo>
        <Campo label="Contato">
          <Input value={rascunho.nome} onChange={(e) => set('nome', e.target.value)} autoFocus />
        </Campo>
        <Campo label="CNPJ ou CPF">
          <Input value={rascunho.cnpjOuCpf} onChange={(e) => set('cnpjOuCpf', e.target.value)} />
        </Campo>
        <Campo label="E-mail">
          <Input value={rascunho.email} onChange={(e) => set('email', e.target.value)} />
        </Campo>
        <Campo label="Telefone">
          <Input value={rascunho.telefone} onChange={(e) => set('telefone', e.target.value)} />
        </Campo>
        <Campo label="Endereço">
          <Input value={rascunho.endereco} onChange={(e) => set('endereco', e.target.value)} />
        </Campo>
        <Campo label="Observações" className="sm:col-span-2">
          <Textarea rows={2} value={rascunho.observacoes} onChange={(e) => set('observacoes', e.target.value)} />
        </Campo>
      </div>
      <div className="flex gap-2">
        <Button variant="primario" onClick={() => void onSalvar(rascunho)}>
          Salvar cliente
        </Button>
        <Button variant="fantasma" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
