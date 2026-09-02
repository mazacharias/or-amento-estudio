'use client';

import * as React from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { InputMoeda, InputNumero } from '@/components/ui/inputs';
import { Table, Td, Th, Tr, Vazio } from '@/components/ui/table';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Titulo } from '@/components/wizard/passo-1-projeto';
import { useWizard } from '@/lib/store/wizard';
import { calcularCustoHoraFixo, type Calculo } from '@/lib/pricing';
import { formatarMoeda } from '@/lib/money';
import { ROTULO_CATEGORIA, type LinhaHoras, type Servico } from '@/lib/types';
import { novoId, cn } from '@/lib/utils';
import type { DadosWizard } from '@/components/wizard/wizard';

export function Passo2Servicos({ dados, calculo }: { dados: DadosWizard; calculo: Calculo | null }) {
  const { orcamento, atualizar } = useWizard();
  const [busca, setBusca] = React.useState('');
  if (!orcamento) return null;

  const custoHoraFixo = calcularCustoHoraFixo(
    dados.config.custosFixosMensais,
    dados.config.horasProdutivasMes,
  );
  const selecionados = new Set(orcamento.horas.map((l) => l.servicoId).filter(Boolean) as string[]);
  const catalogo = dados.servicos
    .filter((s) => s.ativo)
    .filter((s) => `${s.nome} ${s.descricao}`.toLowerCase().includes(busca.toLowerCase()));

  function alternarServico(servico: Servico) {
    if (selecionados.has(servico.id)) {
      atualizar({
        horas: orcamento!.horas.filter((l) => l.servicoId !== servico.id),
        entregaveis: orcamento!.entregaveis.filter((e) => !servico.entregaveisPadrao.includes(e)),
      });
      return;
    }
    const linha: LinhaHoras = {
      id: novoId(),
      servicoId: servico.id,
      descricao: servico.nome,
      papel: 'Designer',
      horas: servico.horasEstimadasPadrao,
      custoHora: servico.custoHoraSugerido ?? custoHoraFixo,
    };
    const entregaveis = [...orcamento!.entregaveis];
    for (const e of servico.entregaveisPadrao) if (!entregaveis.includes(e)) entregaveis.push(e);
    atualizar({
      horas: [...orcamento!.horas, linha],
      entregaveis,
      rodadasRevisao: Math.max(orcamento!.rodadasRevisao, servico.rodadasRevisaoPadrao),
    });
  }

  function atualizarLinha(id: string, patch: Partial<LinhaHoras>) {
    atualizar({ horas: orcamento!.horas.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  }

  const totalHoras = orcamento.horas.reduce((acc, l) => acc + (l.horas || 0), 0);
  const capacidade = dados.config.horasProdutivasMes * orcamento.mesesProjeto;

  return (
    <div className="space-y-5">
      <Titulo
        titulo="Serviços e horas"
        descricao="Selecione do catálogo para trazer horas, entregáveis e rodadas de revisão. Ajuste o que for específico deste projeto."
      />

      <Input
        placeholder="Buscar no catálogo…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="max-w-xs"
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {catalogo.map((s) => {
          const ativo = selecionados.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => alternarServico(s)}
              className={cn(
                'rounded-marca border p-3 text-left transition',
                ativo ? 'border-acento bg-acento/5' : 'border-linha hover:border-acento/40',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium">{s.nome}</span>
                {ativo ? <Check className="h-4 w-4 shrink-0 text-acento" /> : null}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge>{ROTULO_CATEGORIA[s.categoria]}</Badge>
                <span className="font-mono text-xs tabular-nums text-sutil">{s.horasEstimadasPadrao}h</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="cartao">
        <Table>
          <thead>
            <tr>
              <Th>Descrição</Th>
              <Th>Papel</Th>
              <Th className="w-24 text-right">Horas</Th>
              <Th className="w-40 text-right">Custo-hora</Th>
              <Th className="w-32 text-right">Subtotal</Th>
              <Th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {orcamento.horas.length === 0 ? (
              <Vazio colSpan={6}>Nenhuma linha de horas. Selecione um serviço acima ou adicione uma linha livre.</Vazio>
            ) : (
              orcamento.horas.map((linha) => (
                <Tr key={linha.id}>
                  <Td>
                    <Input
                      value={linha.descricao}
                      onChange={(e) => atualizarLinha(linha.id, { descricao: e.target.value })}
                    />
                  </Td>
                  <Td>
                    <Input
                      value={linha.papel}
                      placeholder="Designer sênior"
                      onChange={(e) => atualizarLinha(linha.id, { papel: e.target.value })}
                    />
                  </Td>
                  <Td>
                    <InputNumero valor={linha.horas} onValor={(v) => atualizarLinha(linha.id, { horas: v })} />
                  </Td>
                  <Td>
                    <InputMoeda
                      valor={linha.custoHora}
                      onValor={(v) => atualizarLinha(linha.id, { custoHora: v })}
                    />
                  </Td>
                  <Td className="num">{formatarMoeda(Math.round(linha.horas * linha.custoHora), orcamento.moeda)}</Td>
                  <Td>
                    <Button
                      variant="fantasma"
                      size="icone"
                      aria-label="Remover linha"
                      onClick={() => atualizar({ horas: orcamento.horas.filter((l) => l.id !== linha.id) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linha px-3 py-3">
          <Button
            variant="fantasma"
            size="sm"
            onClick={() =>
              atualizar({
                horas: [
                  ...orcamento.horas,
                  {
                    id: novoId(),
                    servicoId: null,
                    descricao: '',
                    papel: '',
                    horas: 0,
                    custoHora: custoHoraFixo,
                  },
                ],
              })
            }
          >
            <Plus className="h-4 w-4" /> Linha livre
          </Button>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-sutil">
              Total: <span className="font-mono tabular-nums text-tinta">{totalHoras}h</span>
            </span>
            <span className="text-sutil">
              Custo das horas:{' '}
              <span className="font-mono tabular-nums text-tinta">
                {formatarMoeda(calculo?.custoHoras ?? 0, orcamento.moeda)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {capacidade > 0 && totalHoras > capacidade ? (
        <Alert nivel="atencao" titulo="O projeto não cabe na capacidade">
          {totalHoras}h em {orcamento.mesesProjeto} mês(es) exigem mais que as{' '}
          {dados.config.horasProdutivasMes}h produtivas mensais do estúdio ({capacidade}h no período). Aumente a
          duração, reduza escopo ou traga terceiros.
        </Alert>
      ) : null}

      <p className="text-xs text-sutil">
        Custo-hora do estúdio: {formatarMoeda(custoHoraFixo, orcamento.moeda)} — é o piso de cada linha. Hora de
        terceiro deve entrar pelo que ele cobra.
      </p>
    </div>
  );
}
