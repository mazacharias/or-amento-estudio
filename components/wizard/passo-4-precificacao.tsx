'use client';

import * as React from 'react';
import { Campo, Textarea } from '@/components/ui/field';
import { InputMoeda, InputPercentual, SliderPercentual } from '@/components/ui/inputs';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Titulo } from '@/components/wizard/passo-1-projeto';
import { useWizard } from '@/lib/store/wizard';
import { calcularModoReverso, type Calculo, type ErroCalculo } from '@/lib/pricing';
import { formatarMoeda, formatarPercentual } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { DadosWizard } from '@/components/wizard/wizard';

export function Passo4Precificacao({
  dados,
  calculo,
  erro,
}: {
  dados: DadosWizard;
  calculo: Calculo | null;
  erro: ErroCalculo | null;
}) {
  const { orcamento, atualizar } = useWizard();
  const [modoReverso, setModoReverso] = React.useState(false);
  const [precoAlvo, setPrecoAlvo] = React.useState(0);
  if (!orcamento) return null;

  const moeda = orcamento.moeda;
  const entrada = {
    custosFixosMensais: dados.config.custosFixosMensais,
    horasProdutivasMes: dados.config.horasProdutivasMes,
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
    margemMinimaAceitavel: dados.config.margemMinimaAceitavel,
    qtdFases: orcamento.cronograma?.fases.length ?? 0,
  };
  const reverso = modoReverso ? calcularModoReverso(entrada, precoAlvo) : null;

  return (
    <div className="space-y-6">
      <Titulo
        titulo="Precificação"
        descricao="Margem, imposto e taxa incidem sobre o preço de venda — o app aplica tudo num divisor só, sem confundir markup com margem."
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <SliderPercentual
          label="Contingência"
          valor={orcamento.contingencia}
          onValor={(v) => atualizar({ contingencia: v })}
          max={50}
          dica={calculo?.sugestaoContingencia ?? 'Cobre retrabalho e escopo que escapa.'}
        />
        <SliderPercentual
          label="Margem desejada"
          valor={orcamento.margemDesejada}
          onValor={(v) => atualizar({ margemDesejada: v })}
          max={70}
          dica="Margem líquida alvo, já descontados imposto e taxa."
        />
        <SliderPercentual
          label="Alíquota de imposto"
          valor={orcamento.aliquotaImposto}
          onValor={(v) => atualizar({ aliquotaImposto: v })}
          max={30}
          dica="A efetiva do regime — MEI, Simples Anexo III/V, PJ."
        />
        <SliderPercentual
          label="Taxa de pagamento"
          valor={orcamento.taxaPagamento}
          onValor={(v) => atualizar({ taxaPagamento: v })}
          max={20}
          dica="Adquirente, plataforma ou câmbio."
        />
      </div>

      {erro ? (
        <Alert nivel="critico" titulo="Cálculo bloqueado">
          {erro.mensagem}
        </Alert>
      ) : null}

      {calculo ? <Cascata calculo={calculo} moeda={moeda} /> : null}

      <section className="space-y-3 rounded-marca border border-linha p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">Desconto</h3>
            <p className="text-xs text-sutil">Aplicado depois, sobre o preço final. A margem real é recalculada.</p>
          </div>
          <div className="w-28">
            <InputPercentual
              valor={orcamento.percentualDesconto}
              onValor={(v) => atualizar({ percentualDesconto: v })}
              max={90}
            />
          </div>
        </div>

        {orcamento.percentualDesconto > 0 ? (
          <>
            <Campo
              label="Justificativa do desconto"
              erro={orcamento.justificativaDesconto.trim() ? null : 'Obrigatória quando há desconto.'}
            >
              <Textarea
                rows={2}
                value={orcamento.justificativaDesconto}
                placeholder="Ex.: cliente recorrente, pagamento antecipado, projeto de portfólio"
                onChange={(e) => atualizar({ justificativaDesconto: e.target.value })}
              />
            </Campo>
            {calculo ? (
              <Alert nivel={calculo.alertaMargem.nivel === 'ok' ? 'ok' : calculo.alertaMargem.nivel}>
                {calculo.alertaMargem.mensagem} Preço com desconto:{' '}
                {formatarMoeda(calculo.precoComDesconto, moeda)} (menos{' '}
                {formatarMoeda(calculo.descontoValor, moeda)}).
              </Alert>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="space-y-3 rounded-marca border border-linha p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">Modo reverso — &ldquo;o cliente tem X&rdquo;</h3>
            <p className="text-xs text-sutil">Dado o budget, quantas horas cabem mantendo margem, imposto e taxa.</p>
          </div>
          <Button variant={modoReverso ? 'primario' : 'secundario'} size="sm" onClick={() => setModoReverso((v) => !v)}>
            {modoReverso ? 'Desligar' : 'Ligar'}
          </Button>
        </div>

        {modoReverso ? (
          <div className="space-y-3">
            <Campo label="Budget do cliente">
              <InputMoeda valor={precoAlvo} onValor={setPrecoAlvo} />
            </Campo>
            {reverso?.ok ? (
              <>
                <Alert nivel={reverso.reverso.viavel ? 'ok' : 'critico'}>{reverso.reverso.mensagem}</Alert>
                {reverso.reverso.viavel ? (
                  <div className="space-y-2">
                    <div className="grid gap-2 text-xs sm:grid-cols-3">
                      <Info rotulo="Base máxima de custo" valor={formatarMoeda(reverso.reverso.baseMax, moeda)} />
                      <Info rotulo="Custos não-hora" valor={formatarMoeda(reverso.reverso.custosNaoHora, moeda)} />
                      <Info rotulo="Sobra para horas" valor={formatarMoeda(reverso.reverso.custoHorasMax, moeda)} />
                    </div>
                    <ul className="divide-y divide-linha/60 text-sm">
                      {reverso.reverso.servicos.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-3 py-1.5">
                          <span className={cn(!s.cabe && 'text-sutil line-through')}>{s.descricao}</span>
                          <span className="flex items-center gap-3">
                            <span className="font-mono text-xs tabular-nums text-sutil">{s.horas}h</span>
                            {s.cabe ? (
                              <span className="text-2xs uppercase tracking-wide text-positivo">cabe</span>
                            ) : (
                              <span className="text-2xs uppercase tracking-wide text-alerta">não cabe</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : reverso && !reverso.ok ? (
              <Alert nivel="critico">{reverso.erro.mensagem}</Alert>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

/** Cascata custo → contingência → imposto → taxa → margem → preço. */
function Cascata({ calculo, moeda }: { calculo: Calculo; moeda: string }) {
  // A escala é o preço cheio: com desconto, a barra do total encolhe dentro
  // dela e a faixa descontada fica visível à direita.
  const escala = Math.max(calculo.precoFinal, calculo.precoComDesconto, 1);
  const pct = (valor: number) => Math.min(100, Math.max(0, (valor / escala) * 100));
  let acumulado = 0;

  return (
    <section className="space-y-2 rounded-marca border border-linha p-4">
      <h3 className="text-sm font-medium">Do custo ao preço</h3>
      <div className="space-y-1.5">
        {calculo.cascata.map((etapa) => {
          let inicio: number;
          let largura: number;
          if (etapa.tipo === 'total') {
            inicio = 0;
            largura = pct(calculo.precoComDesconto);
          } else if (etapa.tipo === 'desconto') {
            // Desenhado da ponta do preço final até o preço cheio.
            inicio = pct(calculo.precoComDesconto);
            largura = pct(Math.abs(etapa.valor));
          } else {
            const de = acumulado;
            acumulado += etapa.valor;
            inicio = pct(Math.min(de, acumulado));
            largura = pct(Math.abs(etapa.valor));
          }
          return (
            <div key={etapa.rotulo} className="grid grid-cols-[150px_1fr_120px] items-center gap-3 text-xs">
              <span className={cn('text-sutil', etapa.tipo === 'total' && 'font-medium text-tinta')}>
                {etapa.rotulo}
              </span>
              <div className="relative h-4 overflow-hidden rounded bg-tinta/[0.04]">
                <div
                  className={cn(
                    'absolute inset-y-0 rounded',
                    etapa.tipo === 'total'
                      ? 'bg-acento'
                      : etapa.tipo === 'desconto'
                        ? 'bg-critico/50'
                        : etapa.valor < 0
                          ? 'bg-critico/60'
                          : etapa.tipo === 'custo'
                            ? 'bg-tinta/40'
                            : 'bg-tinta/20',
                  )}
                  style={{ left: `${inicio}%`, width: `${Math.max(largura, 0.6)}%` }}
                />
              </div>
              <span
                className={cn(
                  'text-right font-mono tabular-nums',
                  etapa.tipo === 'total' && 'font-semibold text-acento',
                  etapa.valor < 0 && 'text-critico',
                )}
              >
                {formatarMoeda(etapa.valor, moeda)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="grid gap-2 border-t border-linha pt-3 text-xs sm:grid-cols-3">
        <Info rotulo="Divisor" valor={calculo.divisor.toFixed(4)} />
        <Info rotulo="Margem real" valor={formatarPercentual(calculo.margemReal)} />
        <Info rotulo="Valor-hora efetivo" valor={formatarMoeda(calculo.valorHoraEfetivo, moeda)} />
      </div>
    </section>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="rotulo">{rotulo}</p>
      <p className="font-mono text-sm tabular-nums">{valor}</p>
    </div>
  );
}
