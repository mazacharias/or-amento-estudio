import Link from 'next/link';
import { Cabecalho } from '@/components/cabecalho';
import { Card, CardContent } from '@/components/ui/card';
import { Table, Td, Th, Tr, Vazio } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Valor } from '@/components/valor';
import { TOM_STATUS } from '@/components/status';
import { expirarVencidos, listarOrcamentos, metricasDashboard, obterConfig } from '@/lib/db/queries';
import { ROTULO_STATUS } from '@/lib/types';
import { formatarData, hojeISO, diferencaEmDias } from '@/lib/dates';
import { formatarMoeda, formatarPercentual } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default function Dashboard() {
  expirarVencidos();
  const config = obterConfig();
  const metricas = metricasDashboard();
  const ultimos = listarOrcamentos({ limite: 10 });

  return (
    <>
      <Cabecalho
        titulo="Dashboard"
        descricao={`Custo-hora do estúdio hoje: ${formatarMoeda(
          config.horasProdutivasMes > 0
            ? Math.round(config.custosFixosMensais / config.horasProdutivasMes)
            : 0,
          config.moedaPadrao,
        )} · piso de margem ${formatarPercentual(config.margemMinimaAceitavel, 0)}`}
        acoes={
          <Link
            href="/orcamentos/novo"
            className="inline-flex h-9 items-center rounded-marca bg-acento px-4 text-sm font-medium text-white transition hover:bg-acento/90"
          >
            Novo orçamento
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          rotulo="Em aberto"
          valor={formatarMoeda(metricas.emAberto.valor, config.moedaPadrao)}
          nota={`${metricas.emAberto.quantidade} orçamento(s) em rascunho ou enviados`}
        />
        <Metrica
          rotulo="Aprovados no mês"
          valor={formatarMoeda(metricas.aprovadosNoMes.valor, config.moedaPadrao)}
          nota={`${metricas.aprovadosNoMes.quantidade} projeto(s) fechado(s)`}
          positivo
        />
        <Metrica
          rotulo="Conversão (90 dias)"
          valor={formatarPercentual(metricas.conversao90Dias.taxa, 0)}
          nota={`${metricas.conversao90Dias.aprovados} de ${metricas.conversao90Dias.enviados} enviados`}
        />
        <Metrica
          rotulo="Valor-hora dos aprovados"
          valor={formatarMoeda(metricas.valorHoraMedioAprovados, config.moedaPadrao)}
          nota="Média do que a Atalho realmente cobra por hora"
        />
      </div>

      <div className="cartao">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">Últimos orçamentos</h2>
          <Link href="/orcamentos" className="text-xs text-acento hover:underline">
            ver todos
          </Link>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Código</Th>
              <Th>Cliente</Th>
              <Th>Projeto</Th>
              <Th className="text-right">Valor</Th>
              <Th>Status</Th>
              <Th>Validade</Th>
            </tr>
          </thead>
          <tbody>
            {ultimos.length === 0 ? (
              <Vazio colSpan={6}>
                Nenhum orçamento ainda.{' '}
                <Link href="/orcamentos/novo" className="text-acento hover:underline">
                  Criar o primeiro
                </Link>
                .
              </Vazio>
            ) : (
              ultimos.map((o) => (
                <Tr key={o.id}>
                  <Td className="font-mono text-xs">
                    <Link href={`/orcamentos/${o.id}`} className="hover:text-acento">
                      {o.codigo}
                      {o.versao > 1 ? ` v${o.versao}` : ''}
                    </Link>
                  </Td>
                  <Td>{o.clienteNome}</Td>
                  <Td>{o.titulo || 'Sem título'}</Td>
                  <Td className="text-right">
                    <Valor centavos={o.precoFinal} moeda={o.moeda} />
                  </Td>
                  <Td>
                    <Badge tom={TOM_STATUS[o.status]}>{ROTULO_STATUS[o.status]}</Badge>
                  </Td>
                  <Td>
                    <BadgeValidade validoAte={o.validoAte} status={o.status} />
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </>
  );
}

function Metrica({
  rotulo,
  valor,
  nota,
  positivo,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  positivo?: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <p className="rotulo">{rotulo}</p>
        <p className={`font-mono text-2xl font-semibold tabular-nums ${positivo ? 'text-positivo' : ''}`}>
          {valor}
        </p>
        <p className="text-xs text-sutil">{nota}</p>
      </CardContent>
    </Card>
  );
}

function BadgeValidade({ validoAte, status }: { validoAte: string; status: string }) {
  if (status === 'aprovado' || status === 'recusado') {
    return <span className="text-xs text-sutil">—</span>;
  }
  const dias = diferencaEmDias(hojeISO(), validoAte);
  if (dias < 0) return <Badge tom="alerta">Expirado</Badge>;
  if (dias <= 3) return <Badge tom="critico">{dias === 0 ? 'Expira hoje' : `${dias} dia(s)`}</Badge>;
  return <span className="text-xs text-sutil">{formatarData(validoAte)}</span>;
}
