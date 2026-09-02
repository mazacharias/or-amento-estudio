'use client';

import { CircleDollarSign } from 'lucide-react';
import type { CronogramaCalculado } from '@/lib/schedule';
import { formatarData } from '@/lib/dates';
import { cn } from '@/lib/utils';

/**
 * Gantt em CSS grid, sem biblioteca. Precisa ser legível impresso em preto e
 * branco: a barra tem borda e hachura, o marco tem ícone — cor é reforço, não
 * a única informação.
 */
export function Gantt({ cronograma }: { cronograma: CronogramaCalculado }) {
  const colunas = cronograma.semanas.length;
  if (colunas === 0) return null;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div
          className="grid items-center gap-y-1"
          style={{ gridTemplateColumns: `220px repeat(${colunas}, minmax(48px, 1fr))` }}
        >
          <div className="sticky left-0 z-10 bg-papel pb-1 pr-3 text-2xs uppercase tracking-wider text-sutil">
            Fase
          </div>
          {cronograma.semanas.map((semana) => (
            <div
              key={semana.inicio}
              className="border-l border-linha pb-1 pl-1 text-2xs tabular-nums text-sutil"
            >
              {semana.rotulo}
            </div>
          ))}

          {cronograma.fases.map((fase) => (
            <FaseNoGantt key={fase.id} fase={fase} colunas={colunas} />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-2xs text-sutil">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-6 rounded-sm border border-tinta bg-tinta/15" /> duração da fase
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-6 rounded-sm border border-tinta bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,currentColor_3px,currentColor_4px)] text-tinta/40" />
            marco de pagamento
          </span>
          <span className="flex items-center gap-1.5">
            <CircleDollarSign className="h-3 w-3" /> recebimento previsto
          </span>
        </div>
      </div>
    </div>
  );
}

function FaseNoGantt({
  fase,
  colunas,
}: {
  fase: CronogramaCalculado['fases'][number];
  colunas: number;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 truncate bg-papel pr-3 text-xs" title={fase.nome}>
        {fase.ehMarcoPagamento ? <span aria-hidden>◆ </span> : null}
        {fase.nome}
      </div>
      <div
        className="relative col-span-full grid h-7 items-center"
        style={{
          gridColumn: `2 / span ${colunas}`,
          gridTemplateColumns: `repeat(${colunas}, minmax(48px, 1fr))`,
        }}
      >
        {Array.from({ length: colunas }, (_, i) => (
          <div key={i} className="h-full border-l border-linha/60" />
        ))}
        <div
          className={cn(
            'absolute flex h-5 items-center gap-1 overflow-hidden rounded-sm border border-tinta px-1.5 text-2xs',
            fase.ehMarcoPagamento
              ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgb(var(--c-tinta)/0.35)_3px,rgb(var(--c-tinta)/0.35)_4px)]'
              : 'bg-tinta/10',
          )}
          style={{
            left: `${((fase.colunaInicio - 1) / colunas) * 100}%`,
            width: `${(fase.colunaSpan / colunas) * 100}%`,
          }}
          title={`${fase.nome}: ${formatarData(fase.inicio)} → ${formatarData(fase.fim)}`}
        >
          {fase.ehMarcoPagamento ? <CircleDollarSign className="h-3 w-3 shrink-0" /> : null}
          <span className="truncate tabular-nums">
            {formatarData(fase.inicio)} → {formatarData(fase.fim)}
          </span>
        </div>
      </div>
    </>
  );
}
