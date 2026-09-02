'use client';

import { AlertTriangle, OctagonAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatarMoeda, formatarPercentual } from '@/lib/money';
import type { Calculo, ErroCalculo } from '@/lib/pricing';
import { cn } from '@/lib/utils';

/**
 * Painel lateral fixo do wizard: preço, margem e valor-hora recalculados a
 * cada tecla, sem botão de "calcular".
 */
export function PainelCalculo({
  calculo,
  erro,
  moeda,
  salvoEm,
  sujo,
}: {
  calculo: Calculo | null;
  erro: ErroCalculo | null;
  moeda: string;
  salvoEm: string | null;
  sujo: boolean;
}) {
  return (
    <aside className="lg:sticky lg:top-20 lg:h-fit">
      <Card className={cn('overflow-hidden', erro ? 'border-critico/40' : 'border-acento/30')}>
        <CardContent className="space-y-4">
          {erro ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-critico">
                <OctagonAlert className="h-4 w-4" />
                <p className="text-sm font-semibold">Cálculo bloqueado</p>
              </div>
              <p className="text-xs leading-relaxed text-critico">{erro.mensagem}</p>
            </div>
          ) : calculo ? (
            <>
              <div>
                <p className="rotulo">Preço final</p>
                <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-acento">
                  {formatarMoeda(calculo.precoComDesconto, moeda)}
                </p>
                {calculo.descontoValor > 0 ? (
                  <p className="mt-1 text-xs text-sutil line-through">
                    {formatarMoeda(calculo.precoFinal, moeda)}
                  </p>
                ) : null}
              </div>

              <div
                className={cn(
                  'rounded-marca border p-2.5 text-xs leading-relaxed',
                  calculo.alertaMargem.nivel === 'critico'
                    ? 'border-critico/40 bg-critico/10 text-critico'
                    : calculo.alertaMargem.nivel === 'atencao'
                      ? 'border-alerta/40 bg-alerta/10 text-alerta'
                      : 'border-positivo/30 bg-positivo/10 text-positivo',
                )}
              >
                <div className="flex items-start gap-2">
                  {calculo.alertaMargem.nivel !== 'ok' ? (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  ) : null}
                  <span>{calculo.alertaMargem.mensagem}</span>
                </div>
              </div>

              <dl className="divisor space-y-2 pt-3 text-sm">
                <Linha rotulo="Custos diretos" valor={formatarMoeda(calculo.subtotalCustos, moeda)} />
                <Linha rotulo="Com contingência" valor={formatarMoeda(calculo.baseComRisco, moeda)} />
                <Linha
                  rotulo="Margem real"
                  valor={formatarPercentual(calculo.margemReal)}
                  destaque={calculo.margemReal < 0 ? 'critico' : undefined}
                />
                <Linha rotulo="Total de horas" valor={`${formatarHoras(calculo.totalHoras)}`} />
                <Linha
                  rotulo="Valor-hora efetivo"
                  valor={formatarMoeda(calculo.valorHoraEfetivo, moeda)}
                  destaque="acento"
                />
              </dl>

              {calculo.capacidade.excedeCapacidade ? (
                <p className="rounded-marca border border-alerta/40 bg-alerta/10 p-2.5 text-xs text-alerta">
                  {formatarHoras(calculo.totalHoras)} não cabem na capacidade do período
                  ({formatarHoras(calculo.capacidade.horasDisponiveis)}).
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-sutil">Preencha as horas para ver o preço.</p>
          )}

          <p className="divisor pt-3 text-2xs text-sutil">
            {sujo ? 'Salvando rascunho…' : salvoEm ? `Rascunho salvo ${horaCurta(salvoEm)}` : 'Rascunho não salvo ainda'}
          </p>
        </CardContent>
      </Card>
    </aside>
  );
}

function Linha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: 'acento' | 'critico';
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-sutil">{rotulo}</dt>
      <dd
        className={cn(
          'font-mono text-sm tabular-nums',
          destaque === 'acento' && 'font-semibold text-acento',
          destaque === 'critico' && 'font-semibold text-critico',
        )}
      >
        {valor}
      </dd>
    </div>
  );
}

function formatarHoras(horas: number): string {
  const texto = Number.isInteger(horas) ? String(horas) : horas.toFixed(1).replace('.', ',');
  return `${texto}h`;
}

function horaCurta(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
