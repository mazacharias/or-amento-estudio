import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cabecalho } from '@/components/cabecalho';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { Alert } from '@/components/ui/alert';
import { Valor } from '@/components/valor';
import { TOM_STATUS } from '@/components/status';
import { listarClientes, listarServicos, obterConfig, obterOrcamento } from '@/lib/db/queries';
import { montarDadosProposta } from '@/lib/pdf/dados';
import { calcularCronograma } from '@/lib/schedule';
import { ROTULO_STATUS } from '@/lib/types';
import { formatarData } from '@/lib/dates';
import { formatarMoeda, formatarPercentual } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function VerOrcamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orcamento = obterOrcamento(id);
  if (!orcamento) notFound();

  const config = obterConfig();
  const cliente = listarClientes().find((c) => c.id === orcamento.clienteId) ?? null;
  const montagem = montarDadosProposta({
    orcamento,
    cliente,
    config,
    servicos: listarServicos(),
    detalhado: true,
  });

  if (!montagem.ok) {
    return (
      <>
        <Cabecalho titulo={orcamento.codigo} descricao={orcamento.titulo} />
        <Alert nivel="critico" titulo="Cálculo bloqueado">
          {montagem.erro}
        </Alert>
        <div className="mt-4">
          <Link href={`/orcamentos/${orcamento.id}/editar`} className="text-sm text-acento hover:underline">
            abrir no wizard para corrigir
          </Link>
        </div>
      </>
    );
  }

  const { calculo } = montagem.dados;
  const cronograma = orcamento.cronograma
    ? calcularCronograma(orcamento.cronograma, {
        totalHoras: calculo.totalHoras,
        horasPorDiaUtil: config.horasPorDiaUtil,
        mesesProjeto: orcamento.mesesProjeto,
        precoComDesconto: calculo.precoComDesconto,
        parcelas: orcamento.parcelas,
      })
    : null;

  return (
    <>
      <Cabecalho
        titulo={`${orcamento.codigo}${orcamento.versao > 1 ? ` v${orcamento.versao}` : ''}`}
        descricao={orcamento.titulo || 'Sem título'}
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tom={TOM_STATUS[orcamento.status]}>{ROTULO_STATUS[orcamento.status]}</Badge>
            <Link
              href={`/orcamentos/${orcamento.id}/editar`}
              className="inline-flex h-9 items-center rounded-marca border border-linha px-3 text-sm hover:bg-tinta/5"
            >
              Editar
            </Link>
            <Link
              href={`/orcamentos/${orcamento.id}/cronograma`}
              className="inline-flex h-9 items-center rounded-marca border border-linha px-3 text-sm hover:bg-tinta/5"
            >
              Cronograma
            </Link>
            <a
              href={`/api/orcamentos/${orcamento.id}/pdf?tipo=cliente`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center rounded-marca bg-acento px-3 text-sm font-medium text-white hover:bg-acento/90 dark:text-papel"
            >
              PDF da proposta
            </a>
            <a
              href={`/api/orcamentos/${orcamento.id}/pdf?tipo=interno`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center rounded-marca border border-linha px-3 text-sm hover:bg-tinta/5"
            >
              Resumo interno
            </a>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="cartao p-4">
            <h2 className="mb-3 text-sm font-semibold">Horas</h2>
            <Table>
              <thead>
                <tr>
                  <Th>Descrição</Th>
                  <Th>Papel</Th>
                  <Th className="text-right">Horas</Th>
                  <Th className="text-right">Custo-hora</Th>
                  <Th className="text-right">Subtotal</Th>
                </tr>
              </thead>
              <tbody>
                {orcamento.horas.map((l) => (
                  <Tr key={l.id}>
                    <Td>{l.descricao || '—'}</Td>
                    <Td className="text-sutil">{l.papel || '—'}</Td>
                    <Td className="num">{l.horas}h</Td>
                    <Td className="text-right">
                      <Valor centavos={l.custoHora} moeda={orcamento.moeda} className="text-xs" />
                    </Td>
                    <Td className="text-right">
                      <Valor centavos={Math.round(l.horas * l.custoHora)} moeda={orcamento.moeda} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <Bloco titulo="Custos">
              <Linha rotulo="Horas" valor={formatarMoeda(calculo.custoHoras, orcamento.moeda)} />
              <Linha rotulo="Equipamentos" valor={formatarMoeda(calculo.custoEquipamentos, orcamento.moeda)} />
              <Linha rotulo="Software" valor={formatarMoeda(calculo.custoSoftware, orcamento.moeda)} />
              <Linha rotulo="Terceiros" valor={formatarMoeda(calculo.custoTerceiros, orcamento.moeda)} />
              <Linha rotulo="Despesas" valor={formatarMoeda(calculo.custoDespesas, orcamento.moeda)} />
              <Linha rotulo="Subtotal" valor={formatarMoeda(calculo.subtotalCustos, orcamento.moeda)} destaque />
              <Linha
                rotulo={`Contingência (${formatarPercentual(orcamento.contingencia, 0)})`}
                valor={formatarMoeda(calculo.contingenciaValor, orcamento.moeda)}
              />
              <Linha rotulo="Base com risco" valor={formatarMoeda(calculo.baseComRisco, orcamento.moeda)} />
            </Bloco>

            <Bloco titulo="Escopo">
              <p className="rotulo mb-1">Entregáveis</p>
              <ul className="mb-3 space-y-0.5 text-sm">
                {orcamento.entregaveis.map((e, i) => (
                  <li key={i}>· {e}</li>
                ))}
              </ul>
              <p className="rotulo mb-1">Fora do escopo</p>
              <ul className="space-y-0.5 text-sm">
                {orcamento.foraDoEscopo.length === 0 ? (
                  <li className="text-alerta">nada listado</li>
                ) : (
                  orcamento.foraDoEscopo.map((e, i) => <li key={i}>· {e}</li>)
                )}
              </ul>
            </Bloco>
          </section>

          {cronograma?.ok ? (
            <section className="cartao p-4">
              <h2 className="mb-3 text-sm font-semibold">Cronograma</h2>
              <Table>
                <thead>
                  <tr>
                    <Th>Fase</Th>
                    <Th className="text-right">Horas</Th>
                    <Th className="text-right">Início</Th>
                    <Th className="text-right">Fim</Th>
                  </tr>
                </thead>
                <tbody>
                  {cronograma.cronograma.fases.map((f) => (
                    <Tr key={f.id}>
                      <Td>
                        {f.ehMarcoPagamento ? '◆ ' : ''}
                        {f.nome}
                      </Td>
                      <Td className="num">{f.horasAlocadas}h</Td>
                      <Td className="num text-xs">{formatarData(f.inicio)}</Td>
                      <Td className="num text-xs">{formatarData(f.fim)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <Card className="border-acento/30">
            <CardContent className="space-y-3">
              <div>
                <p className="rotulo">Preço final</p>
                <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-acento">
                  {formatarMoeda(calculo.precoComDesconto, orcamento.moeda)}
                </p>
              </div>
              <Linha rotulo="Margem real" valor={formatarPercentual(calculo.margemReal)} />
              <Linha rotulo="Valor-hora efetivo" valor={formatarMoeda(calculo.valorHoraEfetivo, orcamento.moeda)} />
              <Linha rotulo="Total de horas" valor={`${calculo.totalHoras}h`} />
              <Linha rotulo="Validade" valor={formatarData(orcamento.validoAte)} />
              {cliente ? <Linha rotulo="Cliente" valor={cliente.empresa || cliente.nome} /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2">
              <p className="rotulo">Pagamento</p>
              {orcamento.parcelas.map((p) => {
                const recebimento = cronograma?.ok
                  ? cronograma.cronograma.recebimentos.find((r) => r.parcelaId === p.id)
                  : null;
                return (
                  <div key={p.id} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-sutil">
                      {p.rotulo}
                      {recebimento?.data ? (
                        <span className="ml-1 text-xs">({formatarData(recebimento.data)})</span>
                      ) : null}
                    </span>
                    <Valor
                      centavos={Math.round(calculo.precoComDesconto * p.percentual)}
                      moeda={orcamento.moeda}
                      className="text-sm"
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {calculo.alertaMargem.nivel !== 'ok' ? (
            <Alert nivel={calculo.alertaMargem.nivel}>{calculo.alertaMargem.mensagem}</Alert>
          ) : null}
        </aside>
      </div>
    </>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="cartao p-4">
      <h2 className="mb-3 text-sm font-semibold">{titulo}</h2>
      {children}
    </div>
  );
}

function Linha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-sutil">{rotulo}</span>
      <span className={destaque ? 'font-mono font-semibold tabular-nums' : 'font-mono tabular-nums'}>{valor}</span>
    </div>
  );
}
