'use client';

import * as React from 'react';
import { CalendarRange, FileDown, Lock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/field';
import { Alert } from '@/components/ui/alert';
import { Titulo } from '@/components/wizard/passo-1-projeto';
import { useWizard } from '@/lib/store/wizard';
import { mudarStatusAction } from '@/app/actions';
import type { Calculo } from '@/lib/pricing';
import { formatarMoeda, formatarPercentual } from '@/lib/money';
import { formatarData } from '@/lib/dates';
import { parcelasFecham } from '@/lib/validation';
import type { DadosWizard } from '@/components/wizard/wizard';

export function Passo6Revisao({
  dados,
  calculo,
  onSalvar,
  onCronograma,
}: {
  dados: DadosWizard;
  calculo: Calculo | null;
  onSalvar: () => Promise<{ ok: boolean; erro?: string }>;
  onCronograma: () => Promise<void>;
}) {
  const { orcamento, atualizar } = useWizard();
  const [detalharPdf, setDetalharPdf] = React.useState(true);
  const [mensagem, setMensagem] = React.useState<string | null>(null);
  if (!orcamento) return null;

  const cliente = dados.clientes.find((c) => c.id === orcamento.clienteId);
  const moeda = orcamento.moeda;
  const fecha = parcelasFecham(orcamento.parcelas);

  async function baixarPdf(tipo: 'cliente' | 'interno') {
    const r = await onSalvar();
    if (!r.ok) {
      setMensagem(r.erro ?? 'Não foi possível salvar antes de gerar o PDF.');
      return;
    }
    const url = `/api/orcamentos/${orcamento!.id}/pdf?tipo=${tipo}&detalhado=${detalharPdf ? '1' : '0'}`;
    window.open(url, '_blank');
  }

  async function marcarEnviado() {
    const r = await onSalvar();
    if (!r.ok) {
      setMensagem(r.erro ?? 'Erro ao salvar');
      return;
    }
    await mudarStatusAction(orcamento!.id, 'enviado');
    atualizar({ status: 'enviado' });
    setMensagem('Orçamento marcado como enviado.');
  }

  return (
    <div className="space-y-6">
      <Titulo titulo="Revisão" descricao="Confira antes de gerar a proposta." />

      <section className="grid gap-4 sm:grid-cols-2">
        <Bloco titulo="Projeto">
          <Linha rotulo="Código" valor={`${orcamento.codigo}${orcamento.versao > 1 ? ` v${orcamento.versao}` : ''}`} />
          <Linha rotulo="Título" valor={orcamento.titulo || '—'} />
          <Linha rotulo="Cliente" valor={cliente ? cliente.empresa || cliente.nome : 'Sem cliente selecionado'} />
          <Linha rotulo="Duração" valor={`${orcamento.mesesProjeto} mês(es)`} />
          <Linha rotulo="Validade" valor={formatarData(orcamento.validoAte)} />
        </Bloco>

        <Bloco titulo="Números">
          <Linha rotulo="Total de horas" valor={`${calculo?.totalHoras ?? 0}h`} />
          <Linha rotulo="Custos diretos" valor={formatarMoeda(calculo?.subtotalCustos ?? 0, moeda)} />
          <Linha rotulo="Base com risco" valor={formatarMoeda(calculo?.baseComRisco ?? 0, moeda)} />
          <Linha rotulo="Preço final" valor={formatarMoeda(calculo?.precoComDesconto ?? 0, moeda)} destaque />
          <Linha rotulo="Margem real" valor={formatarPercentual(calculo?.margemReal ?? 0)} />
          <Linha rotulo="Valor-hora efetivo" valor={formatarMoeda(calculo?.valorHoraEfetivo ?? 0, moeda)} />
        </Bloco>

        <Bloco titulo={`Entregáveis (${orcamento.entregaveis.length})`}>
          {orcamento.entregaveis.length === 0 ? (
            <p className="text-sm text-sutil">Nenhum entregável listado.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {orcamento.entregaveis.map((e, i) => (
                <li key={`${e}-${i}`}>· {e}</li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco titulo={`Fora do escopo (${orcamento.foraDoEscopo.length})`}>
          {orcamento.foraDoEscopo.length === 0 ? (
            <p className="text-sm text-alerta">
              Nada listado como fora do escopo — é aqui que nascem os conflitos.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {orcamento.foraDoEscopo.map((e, i) => (
                <li key={`${e}-${i}`}>· {e}</li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco titulo="Pagamento">
          {orcamento.parcelas.map((p) => (
            <Linha
              key={p.id}
              rotulo={`${p.rotulo || 'Parcela'} (${formatarPercentual(p.percentual, 0)})`}
              valor={formatarMoeda(Math.round((calculo?.precoComDesconto ?? 0) * p.percentual), moeda)}
            />
          ))}
          {!fecha ? <p className="mt-2 text-xs text-critico">As parcelas não fecham 100%.</p> : null}
        </Bloco>

        <Bloco titulo="Cronograma">
          {orcamento.cronograma ? (
            <>
              <Linha rotulo="Início" valor={formatarData(orcamento.cronograma.dataInicio)} />
              <Linha rotulo="Fases" valor={String(orcamento.cronograma.fases.length)} />
              <Linha
                rotulo="Marcos de pagamento"
                valor={String(orcamento.cronograma.fases.filter((f) => f.ehMarcoPagamento).length)}
              />
            </>
          ) : (
            <p className="text-sm text-sutil">Nenhum cronograma montado ainda.</p>
          )}
        </Bloco>
      </section>

      {calculo && calculo.alertaMargem.nivel !== 'ok' ? (
        <Alert nivel={calculo.alertaMargem.nivel} titulo="Atenção à margem">
          {calculo.alertaMargem.mensagem} A decisão é da Atalho — o orçamento continua salvável.
        </Alert>
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={detalharPdf} onChange={(e) => setDetalharPdf(e.target.checked)} />
        Detalhar investimento por serviço no PDF do cliente
      </label>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primario"
          onClick={async () => {
            const r = await onSalvar();
            setMensagem(r.ok ? 'Rascunho salvo.' : (r.erro ?? 'Erro ao salvar'));
          }}
        >
          Salvar rascunho
        </Button>
        <Button onClick={() => void baixarPdf('cliente')}>
          <FileDown className="h-4 w-4" /> Gerar PDF da proposta
        </Button>
        <Button variant="fantasma" onClick={() => void baixarPdf('interno')}>
          <Lock className="h-4 w-4" /> Resumo interno
        </Button>
        <Button onClick={() => void marcarEnviado()}>
          <Send className="h-4 w-4" /> Marcar como enviado
        </Button>
        <Button onClick={() => void onCronograma()}>
          <CalendarRange className="h-4 w-4" /> Montar cronograma
        </Button>
      </div>

      {mensagem ? <p className="text-sm text-sutil">{mensagem}</p> : null}
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-marca border border-linha p-4">
      <h3 className="mb-2 text-sm font-medium">{titulo}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Linha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-sutil">{rotulo}</span>
      <span className={destaque ? 'font-mono font-semibold tabular-nums text-acento' : 'font-mono tabular-nums'}>
        {valor}
      </span>
    </div>
  );
}
