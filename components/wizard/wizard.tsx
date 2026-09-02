'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PainelCalculo } from '@/components/wizard/painel';
import { Passo1Projeto } from '@/components/wizard/passo-1-projeto';
import { Passo2Servicos } from '@/components/wizard/passo-2-servicos';
import { Passo3Custos } from '@/components/wizard/passo-3-custos';
import { Passo4Precificacao } from '@/components/wizard/passo-4-precificacao';
import { Passo5Escopo } from '@/components/wizard/passo-5-escopo';
import { Passo6Revisao } from '@/components/wizard/passo-6-revisao';
import { TOTAL_PASSOS, useWizard } from '@/lib/store/wizard';
import { salvarOrcamentoAction } from '@/app/actions';
import { calcular } from '@/lib/pricing';
import { parcelasFecham } from '@/lib/validation';
import type { Cliente, ConfigEstudio, Orcamento, Servico } from '@/lib/types';
import { cn } from '@/lib/utils';

const TITULOS = [
  'Projeto e cliente',
  'Serviços e horas',
  'Custos',
  'Precificação',
  'Escopo e condições',
  'Revisão',
];

export interface DadosWizard {
  config: ConfigEstudio;
  servicos: Servico[];
  clientes: Cliente[];
}

export function Wizard({
  orcamentoInicial,
  dados,
  retomarRascunho,
}: {
  orcamentoInicial: Orcamento;
  dados: DadosWizard;
  /** Em /orcamentos/novo, um rascunho persistido tem prioridade sobre o esqueleto novo. */
  retomarRascunho: boolean;
}) {
  const router = useRouter();
  const { orcamento, passo, visitados, sujo, salvoEm, iniciar, atualizar, irPara, marcarSalvo } = useWizard();
  const [hidratado, setHidratado] = React.useState(false);
  const [retomado, setRetomado] = React.useState(false);

  React.useEffect(() => {
    const persistido = useWizard.getState().orcamento;
    const retomavel = retomarRascunho && persistido && persistido.status === 'rascunho';
    if (!retomavel) iniciar(orcamentoInicial, true);
    else setRetomado(true);
    setHidratado(true);
    // Só na montagem: depois disso o estado do wizard manda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save debounced a cada mudança.
  React.useEffect(() => {
    if (!hidratado || !orcamento || !sujo) return;
    const timer = setTimeout(async () => {
      const r = await salvarOrcamentoAction(orcamento);
      if (r.ok) marcarSalvo();
    }, 700);
    return () => clearTimeout(timer);
  }, [orcamento, sujo, hidratado, marcarSalvo]);

  const resultado = React.useMemo(() => {
    if (!orcamento) return null;
    return calcular({
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
    });
  }, [orcamento, dados.config]);

  if (!hidratado || !orcamento) {
    return <p className="text-sm text-sutil">Carregando rascunho…</p>;
  }

  const calculo = resultado?.ok ? resultado.calculo : null;
  const erro = resultado && !resultado.ok ? resultado.erro : null;

  // Passo 5 só libera com as parcelas fechando 100% (§9).
  const bloqueioPasso5 = passo === 5 && !parcelasFecham(orcamento.parcelas)
    ? 'A soma dos percentuais das parcelas precisa fechar 100% para avançar.'
    : null;

  async function salvarAgora() {
    const r = await salvarOrcamentoAction(orcamento!);
    if (r.ok) marcarSalvo();
    return r;
  }

  return (
    <div className="space-y-6">
      {retomado ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-marca border border-acento/30 bg-acento/5 px-4 py-2.5 text-sm">
          <span>
            Rascunho recuperado: <strong className="font-mono">{orcamento.codigo}</strong>
            {orcamento.titulo ? ` · ${orcamento.titulo}` : ''}
          </span>
          <Button
            size="sm"
            variant="fantasma"
            onClick={() => {
              iniciar(orcamentoInicial, true);
              setRetomado(false);
            }}
          >
            Começar um orçamento em branco
          </Button>
        </div>
      ) : null}

      <BarraProgresso passo={passo} visitados={visitados} onIr={irPara} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="cartao p-5">
            {passo === 1 ? <Passo1Projeto dados={dados} /> : null}
            {passo === 2 ? <Passo2Servicos dados={dados} calculo={calculo} /> : null}
            {passo === 3 ? <Passo3Custos dados={dados} calculo={calculo} /> : null}
            {passo === 4 ? <Passo4Precificacao dados={dados} calculo={calculo} erro={erro} /> : null}
            {passo === 5 ? <Passo5Escopo dados={dados} calculo={calculo} /> : null}
            {passo === 6 ? (
              <Passo6Revisao
                dados={dados}
                calculo={calculo}
                onSalvar={salvarAgora}
                onCronograma={async () => {
                  await salvarAgora();
                  router.push(`/orcamentos/${orcamento!.id}/cronograma`);
                }}
              />
            ) : null}
          </div>

          {bloqueioPasso5 ? <p className="text-sm text-critico">{bloqueioPasso5}</p> : null}

          <div className="flex items-center justify-between">
            <Button variant="fantasma" onClick={() => irPara(passo - 1)} disabled={passo === 1}>
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
            <span className="text-xs text-sutil">
              Passo {passo} de {TOTAL_PASSOS} · {TITULOS[passo - 1]}
            </span>
            <Button
              variant="primario"
              onClick={() => irPara(passo + 1)}
              disabled={passo === TOTAL_PASSOS || Boolean(bloqueioPasso5)}
            >
              Avançar <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <PainelCalculo
          calculo={calculo}
          erro={erro}
          moeda={orcamento.moeda}
          salvoEm={salvoEm}
          sujo={sujo}
        />
      </div>
    </div>
  );
}

function BarraProgresso({
  passo,
  visitados,
  onIr,
}: {
  passo: number;
  visitados: number[];
  onIr: (p: number) => void;
}) {
  return (
    <ol className="flex flex-wrap gap-1.5">
      {TITULOS.map((titulo, i) => {
        const numero = i + 1;
        const visitado = visitados.includes(numero);
        const atual = numero === passo;
        return (
          <li key={titulo} className="flex-1">
            <button
              type="button"
              onClick={() => visitado && onIr(numero)}
              disabled={!visitado}
              className={cn(
                'w-full rounded-marca border px-3 py-2 text-left transition',
                atual
                  ? 'border-acento bg-acento/10'
                  : visitado
                    ? 'border-linha hover:border-acento/40'
                    : 'border-linha/60 opacity-50',
              )}
            >
              <span className="block text-2xs uppercase tracking-wider text-sutil">Passo {numero}</span>
              <span className={cn('block text-xs font-medium', atual && 'text-acento')}>{titulo}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
