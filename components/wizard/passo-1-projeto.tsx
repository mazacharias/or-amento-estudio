'use client';

import * as React from 'react';
import { Campo, Input, Select, Textarea } from '@/components/ui/field';
import { InputNumero } from '@/components/ui/inputs';
import { Button } from '@/components/ui/button';
import { salvarClienteAction } from '@/app/actions';
import { useWizard } from '@/lib/store/wizard';
import { MOEDAS, type Cliente, type Moeda } from '@/lib/types';
import { hojeISO, somarDiasCorridos } from '@/lib/dates';
import { novoId } from '@/lib/utils';
import type { DadosWizard } from '@/components/wizard/wizard';

export function Passo1Projeto({ dados }: { dados: DadosWizard }) {
  const { orcamento, atualizar } = useWizard();
  const [clientes, setClientes] = React.useState(dados.clientes);
  const [criandoCliente, setCriandoCliente] = React.useState(false);
  const [novoCliente, setNovoCliente] = React.useState<Cliente | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);

  if (!orcamento) return null;

  async function salvarNovoCliente() {
    if (!novoCliente) return;
    const r = await salvarClienteAction(novoCliente);
    if (!r.ok || !r.dados) {
      setErro(r.erro ?? 'Erro ao salvar cliente');
      return;
    }
    setClientes((lista) => [...lista, r.dados!]);
    atualizar({ clienteId: r.dados.id });
    setCriandoCliente(false);
    setNovoCliente(null);
    setErro(null);
  }

  return (
    <div className="space-y-5">
      <Titulo
        titulo="Projeto e cliente"
        descricao="A duração em meses alimenta a depreciação de equipamento e o rateio de software avulso."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Cliente" className="sm:col-span-2">
          <div className="flex gap-2">
            <Select
              value={orcamento.clienteId}
              onChange={(e) => atualizar({ clienteId: e.target.value })}
              className="flex-1"
            >
              <option value="">Selecione um cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.empresa ? `${c.empresa} — ${c.nome}` : c.nome}
                </option>
              ))}
            </Select>
            <Button
              onClick={() => {
                setCriandoCliente(true);
                setNovoCliente({
                  id: novoId(),
                  nome: '',
                  empresa: '',
                  cnpjOuCpf: '',
                  email: '',
                  telefone: '',
                  endereco: '',
                  observacoes: '',
                });
              }}
            >
              Novo cliente
            </Button>
          </div>
        </Campo>

        {criandoCliente && novoCliente ? (
          <div className="cartao space-y-3 p-4 sm:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="Empresa">
                <Input
                  value={novoCliente.empresa}
                  onChange={(e) => setNovoCliente({ ...novoCliente, empresa: e.target.value })}
                />
              </Campo>
              <Campo label="Contato">
                <Input
                  value={novoCliente.nome}
                  onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                  autoFocus
                />
              </Campo>
              <Campo label="E-mail">
                <Input
                  value={novoCliente.email}
                  onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
                />
              </Campo>
              <Campo label="CNPJ ou CPF">
                <Input
                  value={novoCliente.cnpjOuCpf}
                  onChange={(e) => setNovoCliente({ ...novoCliente, cnpjOuCpf: e.target.value })}
                />
              </Campo>
            </div>
            {erro ? <p className="text-xs text-critico">{erro}</p> : null}
            <div className="flex gap-2">
              <Button variant="primario" size="sm" onClick={() => void salvarNovoCliente()}>
                Salvar e selecionar
              </Button>
              <Button variant="fantasma" size="sm" onClick={() => setCriandoCliente(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        <Campo label="Título do projeto" className="sm:col-span-2">
          <Input
            value={orcamento.titulo}
            placeholder="Ex.: Identidade visual e site — Casa Pilar"
            onChange={(e) => atualizar({ titulo: e.target.value })}
          />
        </Campo>

        <Campo label="Resumo do projeto" className="sm:col-span-2" dica="Vira a apresentação da proposta em PDF.">
          <Textarea
            rows={4}
            value={orcamento.resumoProjeto}
            onChange={(e) => atualizar({ resumoProjeto: e.target.value })}
          />
        </Campo>

        <Campo label="Moeda">
          <Select value={orcamento.moeda} onChange={(e) => atualizar({ moeda: e.target.value as Moeda })}>
            {MOEDAS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Campo>

        <Campo label="Duração estimada (meses)">
          <InputNumero
            valor={orcamento.mesesProjeto}
            onValor={(v) => atualizar({ mesesProjeto: Math.max(0.5, v) })}
            step={0.5}
            min={0.5}
          />
        </Campo>

        <Campo label="Válido até">
          <Input
            type="date"
            value={orcamento.validoAte}
            onChange={(e) => atualizar({ validoAte: e.target.value })}
          />
        </Campo>

        <Campo label="Código">
          <Input value={orcamento.codigo} onChange={(e) => atualizar({ codigo: e.target.value })} />
        </Campo>
      </div>

      <button
        type="button"
        className="text-xs text-acento hover:underline"
        onClick={() =>
          atualizar({ validoAte: somarDiasCorridos(hojeISO(), dados.config.validadePropostaDias) })
        }
      >
        Recalcular validade ({dados.config.validadePropostaDias} dias a partir de hoje)
      </button>
    </div>
  );
}

export function Titulo({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold">{titulo}</h2>
      {descricao ? <p className="mt-1 text-sm text-sutil">{descricao}</p> : null}
    </div>
  );
}
