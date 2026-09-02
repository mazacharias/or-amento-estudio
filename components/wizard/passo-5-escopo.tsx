'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Campo, Input, Select, Textarea } from '@/components/ui/field';
import { InputMoeda, InputNumero, InputPercentual } from '@/components/ui/inputs';
import { Alert } from '@/components/ui/alert';
import { ListaEditavel } from '@/components/lista-editavel';
import { Titulo } from '@/components/wizard/passo-1-projeto';
import { useWizard } from '@/lib/store/wizard';
import { PRESETS_PARCELAS, parcelasFecham } from '@/lib/validation';
import { formatarMoeda, formatarPercentual } from '@/lib/money';
import type { Calculo } from '@/lib/pricing';
import { novoId } from '@/lib/utils';
import type { Parcela } from '@/lib/types';
import type { DadosWizard } from '@/components/wizard/wizard';

export function Passo5Escopo({ dados, calculo }: { dados: DadosWizard; calculo: Calculo | null }) {
  const { orcamento, atualizar } = useWizard();
  if (!orcamento) return null;

  const moeda = orcamento.moeda;
  const preco = calculo?.precoComDesconto ?? 0;
  const soma = orcamento.parcelas.reduce((acc, p) => acc + p.percentual, 0);
  const fecha = parcelasFecham(orcamento.parcelas);
  const marcos = orcamento.cronograma?.fases.filter((f) => f.ehMarcoPagamento) ?? [];

  function patchParcela(id: string, valores: Partial<Parcela>) {
    atualizar({ parcelas: orcamento!.parcelas.map((p) => (p.id === id ? { ...p, ...valores } : p)) });
  }

  return (
    <div className="space-y-6">
      <Titulo
        titulo="Escopo e condições"
        descricao="A lista de fora do escopo é o campo que evita a maior parte dos conflitos. Trate como primeira classe."
      />

      <ListaEditavel
        label="Entregáveis"
        itens={orcamento.entregaveis}
        onItens={(itens) => atualizar({ entregaveis: itens })}
        placeholder="Ex.: manual de marca em PDF"
        dica="Pré-preenchido pelos serviços selecionados — edite à vontade."
      />

      <ListaEditavel
        label="Fora do escopo"
        itens={orcamento.foraDoEscopo}
        onItens={(itens) => atualizar({ foraDoEscopo: itens })}
        placeholder="Ex.: produção de fotografia, desenvolvimento do site"
        dica="Escrito aqui, não vira discussão depois. Itens fora do escopo são orçados separadamente."
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <Campo label="Rodadas de revisão incluídas">
          <InputNumero
            valor={orcamento.rodadasRevisao}
            onValor={(v) => atualizar({ rodadasRevisao: Math.round(v) })}
          />
        </Campo>
        <Campo label="Valor da rodada extra">
          <InputMoeda valor={orcamento.custoRevisaoExtra} onValor={(v) => atualizar({ custoRevisaoExtra: v })} />
        </Campo>
      </section>

      <section className="space-y-3 rounded-marca border border-linha p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Condições de pagamento</h3>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS_PARCELAS.map((preset) => (
              <Button
                key={preset.rotulo}
                size="sm"
                variant="fantasma"
                onClick={() =>
                  atualizar({
                    parcelas: preset.percentuais.map((p, i) => ({
                      id: novoId(),
                      rotulo: preset.nomes[i] ?? `Parcela ${i + 1}`,
                      percentual: p,
                      marcoId: null,
                    })),
                  })
                }
              >
                {preset.rotulo}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {orcamento.parcelas.map((parcela) => (
            <div key={parcela.id} className="grid items-end gap-2 sm:grid-cols-[1fr_110px_1fr_130px_40px]">
              <Campo label="Rótulo">
                <Input
                  value={parcela.rotulo}
                  onChange={(e) => patchParcela(parcela.id, { rotulo: e.target.value })}
                />
              </Campo>
              <Campo label="%">
                <InputPercentual
                  valor={parcela.percentual}
                  onValor={(v) => patchParcela(parcela.id, { percentual: v })}
                />
              </Campo>
              <Campo label="Marco do cronograma">
                <Select
                  value={parcela.marcoId ?? ''}
                  onChange={(e) => patchParcela(parcela.id, { marcoId: e.target.value || null })}
                >
                  <option value="">Sem vínculo</option>
                  {marcos.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </Select>
              </Campo>
              <div className="pb-2 text-right font-mono text-sm tabular-nums">
                {formatarMoeda(Math.round(preco * parcela.percentual), moeda)}
              </div>
              <Button
                variant="fantasma"
                size="icone"
                aria-label="Remover parcela"
                className="mb-1"
                onClick={() => atualizar({ parcelas: orcamento.parcelas.filter((p) => p.id !== parcela.id) })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="fantasma"
            size="sm"
            onClick={() =>
              atualizar({
                parcelas: [
                  ...orcamento.parcelas,
                  { id: novoId(), rotulo: '', percentual: 0, marcoId: null },
                ],
              })
            }
          >
            <Plus className="h-4 w-4" /> Adicionar parcela
          </Button>
        </div>

        <div className="flex items-center justify-between border-t border-linha pt-3 text-sm">
          <span className="text-sutil">Soma dos percentuais</span>
          <span className={fecha ? 'font-mono tabular-nums text-positivo' : 'font-mono tabular-nums text-critico'}>
            {formatarPercentual(soma)}
          </span>
        </div>
        {!fecha ? (
          <Alert nivel="critico">
            As parcelas somam {formatarPercentual(soma)}. Ajuste para 100% — o passo 6 só libera assim.
          </Alert>
        ) : null}
        {marcos.length === 0 ? (
          <p className="text-xs text-sutil">
            Ainda não há marcos de pagamento no cronograma. Monte o cronograma no passo 6 para vincular as parcelas a
            datas.
          </p>
        ) : null}
      </section>

      <section className="grid gap-4">
        <Campo label="Taxa de cancelamento (kill fee)" dica="Cobrada se o cliente encerrar o projeto em andamento.">
          <div className="max-w-xs">
            <InputMoeda valor={orcamento.taxaCancelamento} onValor={(v) => atualizar({ taxaCancelamento: v })} />
          </div>
        </Campo>
        <Campo label="Direitos de uso e cessão">
          <Textarea
            rows={6}
            value={orcamento.textoDireitosUso}
            onChange={(e) => atualizar({ textoDireitosUso: e.target.value })}
          />
        </Campo>
        <Campo label="Condições gerais">
          <Textarea
            rows={6}
            value={orcamento.textoCondicoes}
            onChange={(e) => atualizar({ textoCondicoes: e.target.value })}
          />
        </Campo>
        <button
          type="button"
          className="justify-self-start text-xs text-acento hover:underline"
          onClick={() =>
            atualizar({
              textoCondicoes: dados.config.textoCondicoesPadrao,
              textoDireitosUso: dados.config.textoDireitosUsoPadrao,
            })
          }
        >
          Restaurar textos padrão do estúdio
        </button>
      </section>
    </div>
  );
}
