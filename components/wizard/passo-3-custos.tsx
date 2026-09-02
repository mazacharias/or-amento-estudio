'use client';

import * as React from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Campo, Checkbox, Input, Select } from '@/components/ui/field';
import { InputMoeda, InputNumero, InputPercentual } from '@/components/ui/inputs';
import { Badge } from '@/components/ui/badge';
import { Titulo } from '@/components/wizard/passo-1-projeto';
import { useWizard } from '@/lib/store/wizard';
import { custoEquipamentoMicro, custoSoftwareMicro, type Calculo } from '@/lib/pricing';
import { formatarMoeda, paraCentavos } from '@/lib/money';
import type {
  LinhaDespesa,
  LinhaEquipamento,
  LinhaSoftware,
  LinhaTerceiro,
  TipoSoftware,
} from '@/lib/types';
import { cn, novoId } from '@/lib/utils';
import type { DadosWizard } from '@/components/wizard/wizard';

export function Passo3Custos({ dados, calculo }: { dados: DadosWizard; calculo: Calculo | null }) {
  const { orcamento, atualizar } = useWizard();
  if (!orcamento) return null;
  const moeda = orcamento.moeda;
  const softwaresNoFixo = dados.config.custosFixosDetalhe.filter((c) => c.ehSoftware);

  return (
    <div className="space-y-5">
      <Titulo
        titulo="Custos do projeto"
        descricao="Equipamento entra depreciado, não pelo valor cheio. Software já pago no custo fixo não entra de novo."
      />

      <Secao titulo="Equipamentos" subtotal={calculo?.custoEquipamentos ?? 0} moeda={moeda} aberta>
        <div className="space-y-3">
          {orcamento.equipamentos.map((linha) => {
            const custo = paraCentavos(custoEquipamentoMicro(linha, orcamento.mesesProjeto));
            return (
              <div key={linha.id} className="cartao space-y-3 p-3">
                <div className="grid gap-3 sm:grid-cols-4">
                  <Campo label="Equipamento" className="sm:col-span-2">
                    <Input
                      value={linha.nome}
                      placeholder="Ex.: MacBook Pro"
                      onChange={(e) => patch<LinhaEquipamento>(linha.id, { nome: e.target.value }, 'equipamentos')}
                    />
                  </Campo>
                  <Campo label="Valor de compra">
                    <InputMoeda
                      valor={linha.valorCompra}
                      onValor={(v) => patch<LinhaEquipamento>(linha.id, { valorCompra: v }, 'equipamentos')}
                    />
                  </Campo>
                  <Campo label="Vida útil (meses)">
                    <InputNumero
                      valor={linha.vidaUtilMeses}
                      min={1}
                      onValor={(v) => patch<LinhaEquipamento>(linha.id, { vidaUtilMeses: Math.round(v) }, 'equipamentos')}
                      disabled={linha.alocacaoTotal}
                    />
                  </Campo>
                  <Campo label="% alocado ao projeto">
                    <InputPercentual
                      valor={linha.percentualAlocado}
                      onValor={(v) => patch<LinhaEquipamento>(linha.id, { percentualAlocado: v }, 'equipamentos')}
                      disabled={linha.alocacaoTotal}
                    />
                  </Campo>
                  <div className="flex items-end sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={linha.alocacaoTotal}
                        onChange={(e) =>
                          patch<LinhaEquipamento>(linha.id, { alocacaoTotal: e.target.checked }, 'equipamentos')
                        }
                      />
                      Alocar 100% neste projeto (compra dedicada)
                    </label>
                  </div>
                  <div className="flex items-end justify-end gap-3 sm:col-span-1">
                    <div className="text-right">
                      <p className="rotulo">Custo</p>
                      <p className="font-mono text-sm tabular-nums">{formatarMoeda(custo, moeda)}</p>
                    </div>
                    <Button
                      variant="fantasma"
                      size="icone"
                      aria-label="Remover equipamento"
                      onClick={() => remover(linha.id, 'equipamentos')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {!linha.alocacaoTotal ? (
                  <p className="text-xs text-sutil">
                    {formatarMoeda(linha.valorCompra, moeda)} × ({orcamento.mesesProjeto} ÷ {linha.vidaUtilMeses} meses)
                    × {(linha.percentualAlocado * 100).toFixed(0)}%
                  </p>
                ) : (
                  <p className="text-xs text-alerta">Valor cheio lançado neste projeto — sem depreciação.</p>
                )}
              </div>
            );
          })}
          <Button
            variant="fantasma"
            size="sm"
            onClick={() =>
              adicionar('equipamentos', {
                id: novoId(),
                nome: '',
                valorCompra: 0,
                vidaUtilMeses: 36,
                percentualAlocado: 1,
                alocacaoTotal: false,
              } satisfies LinhaEquipamento)
            }
          >
            <Plus className="h-4 w-4" /> Adicionar equipamento
          </Button>
        </div>
      </Secao>

      <Secao titulo="Software" subtotal={calculo?.custoSoftware ?? 0} moeda={moeda}>
        <div className="space-y-3">
          {softwaresNoFixo.length > 0 ? (
            <div className="rounded-marca border border-linha bg-tinta/[0.02] p-3">
              <p className="rotulo mb-2">Já contabilizado nos custos fixos</p>
              <div className="flex flex-wrap gap-2">
                {softwaresNoFixo.map((s) => (
                  <Badge key={s.id}>
                    {s.nome} · {formatarMoeda(s.valor, moeda)}/mês
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-sutil">
                Estas assinaturas já estão no custo-hora. Lançar de novo aqui cobraria duas vezes.
              </p>
            </div>
          ) : null}

          {orcamento.softwares.map((linha) => {
            const custo = paraCentavos(custoSoftwareMicro(linha, orcamento.mesesProjeto));
            return (
              <div key={linha.id} className="grid gap-3 rounded-marca border border-linha p-3 sm:grid-cols-5">
                <Campo label="Software" className="sm:col-span-2">
                  <Input
                    value={linha.nome}
                    placeholder="Ex.: banco de imagens"
                    onChange={(e) => patch<LinhaSoftware>(linha.id, { nome: e.target.value }, 'softwares')}
                  />
                </Campo>
                <Campo label="Tipo">
                  <Select
                    value={linha.tipo}
                    onChange={(e) => patch<LinhaSoftware>(linha.id, { tipo: e.target.value as TipoSoftware }, 'softwares')}
                  >
                    <option value="avulso-mensal">Avulso mensal</option>
                    <option value="avulso-unico">Avulso único</option>
                    <option value="recorrente-ja-no-fixo">Recorrente (já no fixo)</option>
                  </Select>
                </Campo>
                <Campo label={linha.tipo === 'avulso-mensal' ? 'Valor mensal' : 'Valor'}>
                  <InputMoeda
                    valor={linha.valor}
                    onValor={(v) => patch<LinhaSoftware>(linha.id, { valor: v }, 'softwares')}
                  />
                </Campo>
                <div className="flex items-end justify-between gap-2">
                  <div className="flex-1">
                    <Campo label="% alocado">
                      <InputPercentual
                        valor={linha.percentualAlocado}
                        onValor={(v) => patch<LinhaSoftware>(linha.id, { percentualAlocado: v }, 'softwares')}
                        disabled={linha.tipo === 'recorrente-ja-no-fixo'}
                      />
                    </Campo>
                  </div>
                  <Button
                    variant="fantasma"
                    size="icone"
                    aria-label="Remover software"
                    onClick={() => remover(linha.id, 'softwares')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-sutil sm:col-span-5">
                  {linha.tipo === 'recorrente-ja-no-fixo'
                    ? 'Informativo: não soma ao custo do projeto.'
                    : `Custo no projeto: ${formatarMoeda(custo, moeda)}`}
                </p>
              </div>
            );
          })}
          <Button
            variant="fantasma"
            size="sm"
            onClick={() =>
              adicionar('softwares', {
                id: novoId(),
                nome: '',
                tipo: 'avulso-mensal',
                valor: 0,
                percentualAlocado: 1,
              } satisfies LinhaSoftware)
            }
          >
            <Plus className="h-4 w-4" /> Adicionar software
          </Button>
        </div>
      </Secao>

      <Secao titulo="Terceiros" subtotal={calculo?.custoTerceiros ?? 0} moeda={moeda}>
        <div className="space-y-3">
          {orcamento.terceiros.map((linha) => (
            <div key={linha.id} className="grid gap-3 rounded-marca border border-linha p-3 sm:grid-cols-4">
              <Campo label="Fornecedor">
                <Input
                  value={linha.fornecedor}
                  placeholder="Ex.: ilustrador"
                  onChange={(e) => patch<LinhaTerceiro>(linha.id, { fornecedor: e.target.value }, 'terceiros')}
                />
              </Campo>
              <Campo label="Escopo" className="sm:col-span-2">
                <Input
                  value={linha.escopo}
                  onChange={(e) => patch<LinhaTerceiro>(linha.id, { escopo: e.target.value }, 'terceiros')}
                />
              </Campo>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Campo label="Valor fechado">
                    <InputMoeda
                      valor={linha.valor}
                      onValor={(v) => patch<LinhaTerceiro>(linha.id, { valor: v }, 'terceiros')}
                    />
                  </Campo>
                </div>
                <Button
                  variant="fantasma"
                  size="icone"
                  aria-label="Remover terceiro"
                  onClick={() => remover(linha.id, 'terceiros')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="fantasma"
            size="sm"
            onClick={() =>
              adicionar('terceiros', { id: novoId(), fornecedor: '', escopo: '', valor: 0 } satisfies LinhaTerceiro)
            }
          >
            <Plus className="h-4 w-4" /> Adicionar terceiro
          </Button>
        </div>
      </Secao>

      <Secao titulo="Despesas diretas" subtotal={calculo?.custoDespesas ?? 0} moeda={moeda}>
        <div className="space-y-3">
          {orcamento.despesas.map((linha) => (
            <div key={linha.id} className="flex items-end gap-2">
              <div className="flex-1">
                <Campo label="Descrição">
                  <Input
                    value={linha.descricao}
                    placeholder="Ex.: impressão de protótipo"
                    onChange={(e) => patch<LinhaDespesa>(linha.id, { descricao: e.target.value }, 'despesas')}
                  />
                </Campo>
              </div>
              <div className="w-44">
                <Campo label="Valor">
                  <InputMoeda valor={linha.valor} onValor={(v) => patch<LinhaDespesa>(linha.id, { valor: v }, 'despesas')} />
                </Campo>
              </div>
              <Button
                variant="fantasma"
                size="icone"
                aria-label="Remover despesa"
                onClick={() => remover(linha.id, 'despesas')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="fantasma"
            size="sm"
            onClick={() => adicionar('despesas', { id: novoId(), descricao: '', valor: 0 } satisfies LinhaDespesa)}
          >
            <Plus className="h-4 w-4" /> Adicionar despesa
          </Button>
        </div>
      </Secao>

      <div className="flex items-center justify-between border-t border-linha pt-4 text-sm">
        <span className="text-sutil">Subtotal de custos diretos (com horas)</span>
        <span className="font-mono text-base font-semibold tabular-nums">
          {formatarMoeda(calculo?.subtotalCustos ?? 0, moeda)}
        </span>
      </div>
    </div>
  );

  type Colecao = 'equipamentos' | 'softwares' | 'terceiros' | 'despesas';

  function patch<T extends { id: string }>(id: string, valores: Partial<T>, colecao: Colecao) {
    const lista = orcamento![colecao] as unknown as T[];
    atualizar({ [colecao]: lista.map((l) => (l.id === id ? { ...l, ...valores } : l)) } as never);
  }

  function adicionar(colecao: Colecao, linha: unknown) {
    const lista = orcamento![colecao] as unknown[];
    atualizar({ [colecao]: [...lista, linha] } as never);
  }

  function remover(id: string, colecao: Colecao) {
    const lista = orcamento![colecao] as unknown as { id: string }[];
    atualizar({ [colecao]: lista.filter((l) => l.id !== id) } as never);
  }
}

function Secao({
  titulo,
  subtotal,
  moeda,
  aberta,
  children,
}: {
  titulo: string;
  subtotal: number;
  moeda: string;
  aberta?: boolean;
  children: React.ReactNode;
}) {
  const [expandida, setExpandida] = React.useState(Boolean(aberta));
  return (
    <section className="rounded-marca border border-linha">
      <button
        type="button"
        onClick={() => setExpandida((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <ChevronDown className={cn('h-4 w-4 transition', !expandida && '-rotate-90')} />
          {titulo}
        </span>
        <span className="font-mono text-sm tabular-nums text-sutil">{formatarMoeda(subtotal, moeda)}</span>
      </button>
      {expandida ? <div className="border-t border-linha p-4">{children}</div> : null}
    </section>
  );
}
