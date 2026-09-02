'use client';

import * as React from 'react';
import { CalendarPlus, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Campo, Checkbox, Input, Select, Textarea } from '@/components/ui/field';
import { InputNumero } from '@/components/ui/inputs';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { ListaEditavel } from '@/components/lista-editavel';
import { Gantt } from '@/components/cronograma/gantt';
import { salvarOrcamentoAction } from '@/app/actions';
import { calcular } from '@/lib/pricing';
import { calcularCronograma } from '@/lib/schedule';
import { PRESETS_CRONOGRAMA, fasesDoPreset } from '@/lib/presets-cronograma';
import { formatarData, hojeISO } from '@/lib/dates';
import { formatarMoeda, formatarPercentual } from '@/lib/money';
import type { ConfigEstudio, Cronograma, Fase, Orcamento } from '@/lib/types';
import { cn, novoId } from '@/lib/utils';

function cronogramaVazio(): Cronograma {
  return { dataInicio: hojeISO(), fases: [], feriadosCustomizados: [], incluiSabado: false };
}

export function EditorCronograma({
  orcamentoInicial,
  config,
}: {
  orcamentoInicial: Orcamento;
  config: ConfigEstudio;
}) {
  const [orcamento, setOrcamento] = React.useState<Orcamento>({
    ...orcamentoInicial,
    cronograma: orcamentoInicial.cronograma ?? cronogramaVazio(),
  });
  const [salvando, setSalvando] = React.useState(false);
  const [mensagem, setMensagem] = React.useState<string | null>(null);
  const [arrastando, setArrastando] = React.useState<string | null>(null);

  const cronograma = orcamento.cronograma!;
  const moeda = orcamento.moeda;

  const calculo = React.useMemo(() => {
    const r = calcular({
      custosFixosMensais: config.custosFixosMensais,
      horasProdutivasMes: config.horasProdutivasMes,
      mesesProjeto: orcamento.mesesProjeto,
      horas: orcamento.horas,
      equipamentos: orcamento.equipamentos,
      softwares: orcamento.softwares,
      terceiros: orcamento.terceiros,
      despesas: orcamento.despesas,
      contingencia: orcamento.contingencia,
      margemDesejada: orcamento.margemDesejada,
      aliquotaImposto: orcamento.aliquotaImposto,
      taxaPagamento: orcamento.taxaPagamento,
      percentualDesconto: orcamento.percentualDesconto,
      margemMinimaAceitavel: config.margemMinimaAceitavel,
      qtdFases: cronograma.fases.length,
    });
    return r.ok ? r.calculo : null;
  }, [orcamento, config, cronograma.fases.length]);

  const resultado = React.useMemo(
    () =>
      calcularCronograma(cronograma, {
        totalHoras: calculo?.totalHoras ?? 0,
        horasPorDiaUtil: config.horasPorDiaUtil,
        mesesProjeto: orcamento.mesesProjeto,
        precoComDesconto: calculo?.precoComDesconto ?? 0,
        parcelas: orcamento.parcelas,
      }),
    [cronograma, calculo, config.horasPorDiaUtil, orcamento.mesesProjeto, orcamento.parcelas],
  );

  function setCronograma(patch: Partial<Cronograma>) {
    setOrcamento((o) => ({ ...o, cronograma: { ...o.cronograma!, ...patch } }));
    setMensagem(null);
  }

  function patchFase(id: string, valores: Partial<Fase>) {
    setCronograma({ fases: cronograma.fases.map((f) => (f.id === id ? { ...f, ...valores } : f)) });
  }

  function removerFase(id: string) {
    setCronograma({
      fases: cronograma.fases
        .filter((f) => f.id !== id)
        .map((f) => ({ ...f, dependeDe: f.dependeDe.filter((d) => d !== id) })),
    });
    setOrcamento((o) => ({
      ...o,
      parcelas: o.parcelas.map((p) => (p.marcoId === id ? { ...p, marcoId: null } : p)),
    }));
  }

  function reordenar(origemId: string, destinoId: string) {
    if (origemId === destinoId) return;
    const lista = [...cronograma.fases];
    const de = lista.findIndex((f) => f.id === origemId);
    const para = lista.findIndex((f) => f.id === destinoId);
    if (de < 0 || para < 0) return;
    const [movida] = lista.splice(de, 1);
    lista.splice(para, 0, movida!);
    setCronograma({ fases: lista });
  }

  async function salvar() {
    setSalvando(true);
    const r = await salvarOrcamentoAction(orcamento);
    setSalvando(false);
    setMensagem(r.ok ? 'Cronograma salvo.' : (r.erro ?? 'Erro ao salvar'));
  }

  const marcos = cronograma.fases.filter((f) => f.ehMarcoPagamento);

  return (
    <div className="space-y-6">
      <section className="cartao flex flex-wrap items-end gap-4 p-4">
        <Campo label="Início do projeto" className="w-48">
          <Input
            type="date"
            value={cronograma.dataInicio}
            onChange={(e) => setCronograma({ dataInicio: e.target.value })}
          />
        </Campo>
        <label className="flex items-center gap-2 pb-2.5 text-sm">
          <Checkbox
            checked={cronograma.incluiSabado}
            onChange={(e) => setCronograma({ incluiSabado: e.target.checked })}
          />
          Sábado conta como dia útil
        </label>
        <div className="ml-auto flex items-center gap-2">
          <Select
            className="w-56"
            value=""
            onChange={(e) => {
              const preset = PRESETS_CRONOGRAMA.find((p) => p.id === e.target.value);
              if (!preset) return;
              setCronograma({ fases: fasesDoPreset(preset, calculo?.totalHoras ?? 0, novoId) });
            }}
          >
            <option value="">Aplicar preset…</option>
            {PRESETS_CRONOGRAMA.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
          <Button variant="primario" onClick={() => void salvar()} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar cronograma'}
          </Button>
        </div>
        {mensagem ? <p className="w-full text-sm text-sutil">{mensagem}</p> : null}
      </section>

      {!resultado.ok ? (
        <Alert nivel="critico" titulo="Cronograma inválido">
          {resultado.erro.mensagem}
        </Alert>
      ) : null}

      {resultado.ok
        ? resultado.cronograma.alertas.map((alerta, i) => (
            <Alert key={i} nivel={alerta.nivel === 'critico' ? 'critico' : 'atencao'}>
              {alerta.mensagem}
            </Alert>
          ))
        : null}

      {resultado.ok && resultado.cronograma.fases.length > 0 ? (
        <section className="cartao space-y-4 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold">Linha do tempo</h2>
            <p className="text-xs text-sutil">
              {formatarData(resultado.cronograma.inicio)} → {formatarData(resultado.cronograma.fim)} ·{' '}
              {resultado.cronograma.duracaoDiasUteis} dias úteis ({resultado.cronograma.duracaoDiasCorridos} corridos)
            </p>
          </div>
          <Gantt cronograma={resultado.cronograma} />
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Fases</h2>
          <span className="text-xs text-sutil">
            Arraste pela alça para reordenar · horas alocadas:{' '}
            {cronograma.fases.reduce((acc, f) => acc + f.horasAlocadas, 0)}h de {calculo?.totalHoras ?? 0}h orçadas
          </span>
        </div>

        {cronograma.fases.map((fase) => {
          const calculada = resultado.ok ? resultado.cronograma.fases.find((f) => f.id === fase.id) : null;
          const sobrecarregada =
            fase.horasAlocadas > Math.max(1, fase.duracaoDiasUteis) * config.horasPorDiaUtil;
          return (
            <div
              key={fase.id}
              draggable
              onDragStart={() => setArrastando(fase.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (arrastando) reordenar(arrastando, fase.id);
                setArrastando(null);
              }}
              className={cn(
                'cartao space-y-3 p-4 transition',
                arrastando === fase.id && 'opacity-50',
                sobrecarregada && 'border-alerta/50',
              )}
            >
              <div className="flex items-start gap-3">
                <GripVertical className="mt-2 h-4 w-4 shrink-0 cursor-grab text-sutil" />
                <div className="grid flex-1 gap-3 sm:grid-cols-4">
                  <Campo label="Nome da fase" className="sm:col-span-2">
                    <Input value={fase.nome} onChange={(e) => patchFase(fase.id, { nome: e.target.value })} />
                  </Campo>
                  <Campo label="Duração (dias úteis)">
                    <InputNumero
                      valor={fase.duracaoDiasUteis}
                      min={1}
                      onValor={(v) => patchFase(fase.id, { duracaoDiasUteis: Math.max(1, Math.round(v)) })}
                    />
                  </Campo>
                  <Campo label="Horas alocadas">
                    <InputNumero
                      valor={fase.horasAlocadas}
                      onValor={(v) => patchFase(fase.id, { horasAlocadas: v })}
                    />
                  </Campo>
                  <Campo label="Descrição" className="sm:col-span-4">
                    <Textarea
                      rows={2}
                      value={fase.descricao}
                      onChange={(e) => patchFase(fase.id, { descricao: e.target.value })}
                    />
                  </Campo>
                  <div className="sm:col-span-2">
                    <Campo label="Depende de (finish-to-start)">
                      <div className="flex flex-wrap gap-1.5">
                        {cronograma.fases
                          .filter((f) => f.id !== fase.id)
                          .map((outra) => {
                            const marcada = fase.dependeDe.includes(outra.id);
                            return (
                              <button
                                key={outra.id}
                                type="button"
                                onClick={() =>
                                  patchFase(fase.id, {
                                    dependeDe: marcada
                                      ? fase.dependeDe.filter((d) => d !== outra.id)
                                      : [...fase.dependeDe, outra.id],
                                  })
                                }
                                className={cn(
                                  'rounded-full border px-2 py-0.5 text-2xs transition',
                                  marcada
                                    ? 'border-acento bg-acento/10 text-acento'
                                    : 'border-linha text-sutil hover:border-acento/40',
                                )}
                              >
                                {outra.nome || 'sem nome'}
                              </button>
                            );
                          })}
                        {cronograma.fases.length < 2 ? (
                          <span className="text-xs text-sutil">Adicione outra fase para criar dependências.</span>
                        ) : null}
                      </div>
                    </Campo>
                  </div>
                  <div className="sm:col-span-2">
                    <ListaEditavel
                      label="Entregáveis da fase"
                      itens={fase.entregaveis}
                      onItens={(itens) => patchFase(fase.id, { entregaveis: itens })}
                      placeholder="Ex.: apresentação de conceito"
                    />
                  </div>
                  <div className="flex items-center gap-4 sm:col-span-4">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={fase.ehMarcoPagamento}
                        onChange={(e) => patchFase(fase.id, { ehMarcoPagamento: e.target.checked })}
                      />
                      Marco de pagamento
                    </label>
                    {calculada ? (
                      <span className="text-xs text-sutil">
                        {formatarData(calculada.inicio)} → {formatarData(calculada.fim)} ·{' '}
                        {calculada.horasPorDia.toFixed(1).replace('.', ',')}h/dia
                      </span>
                    ) : null}
                    {sobrecarregada ? <Badge tom="alerta">sobrecarga</Badge> : null}
                    <Button
                      variant="fantasma"
                      size="icone"
                      aria-label="Remover fase"
                      className="ml-auto"
                      onClick={() => removerFase(fase.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <Button
          variant="fantasma"
          onClick={() =>
            setCronograma({
              fases: [
                ...cronograma.fases,
                {
                  id: novoId(),
                  nome: `Fase ${cronograma.fases.length + 1}`,
                  descricao: '',
                  duracaoDiasUteis: 5,
                  dependeDe: cronograma.fases.length > 0 ? [cronograma.fases[cronograma.fases.length - 1]!.id] : [],
                  horasAlocadas: 0,
                  ehMarcoPagamento: false,
                  entregaveis: [],
                },
              ],
            })
          }
        >
          <Plus className="h-4 w-4" /> Adicionar fase
        </Button>
      </section>

      <section className="cartao p-4">
        <h2 className="mb-3 text-sm font-semibold">Recebimentos e fluxo de caixa</h2>
        <Table>
          <thead>
            <tr>
              <Th>Parcela</Th>
              <Th>Marco</Th>
              <Th>Data prevista</Th>
              <Th className="text-right">%</Th>
              <Th className="text-right">Valor</Th>
              <Th className="text-right">Acumulado</Th>
            </tr>
          </thead>
          <tbody>
            {orcamento.parcelas.map((parcela, i) => {
              const recebimento = resultado.ok
                ? resultado.cronograma.recebimentos.find((r) => r.parcelaId === parcela.id)
                : null;
              const acumulado = orcamento.parcelas
                .slice(0, i + 1)
                .reduce((acc, p) => acc + Math.round((calculo?.precoComDesconto ?? 0) * p.percentual), 0);
              return (
                <Tr key={parcela.id}>
                  <Td>{parcela.rotulo || 'Parcela'}</Td>
                  <Td>
                    <Select
                      value={parcela.marcoId ?? ''}
                      onChange={(e) =>
                        setOrcamento((o) => ({
                          ...o,
                          parcelas: o.parcelas.map((p) =>
                            p.id === parcela.id ? { ...p, marcoId: e.target.value || null } : p,
                          ),
                        }))
                      }
                    >
                      <option value="">Sem vínculo</option>
                      {marcos.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                    </Select>
                  </Td>
                  <Td className="num text-xs">{recebimento?.data ? formatarData(recebimento.data) : '—'}</Td>
                  <Td className="num">{formatarPercentual(parcela.percentual, 0)}</Td>
                  <Td className="num">
                    {formatarMoeda(Math.round((calculo?.precoComDesconto ?? 0) * parcela.percentual), moeda)}
                  </Td>
                  <Td className="num text-sutil">{formatarMoeda(acumulado, moeda)}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
        {marcos.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-sutil">
            <CalendarPlus className="h-3.5 w-3.5" />
            Marque fases como marco de pagamento para prever as datas de recebimento.
          </p>
        ) : null}
      </section>
    </div>
  );
}
