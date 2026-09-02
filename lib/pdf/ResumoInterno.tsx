/**
 * Resumo interno (spec §6) — o oposto da proposta: aqui aparece TUDO.
 * Custos, margem, valor-hora efetivo, breakdown de terceiros e fluxo de caixa.
 * Nunca deve ser enviado ao cliente; o documento se identifica como interno em
 * todas as páginas.
 */

import * as React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { estilos } from './estilos';
import { Rodape } from './Proposta';
import type { DadosProposta } from './dados';
import { formatarMoeda, formatarPercentual } from '../money';
import { formatarData } from '../dates';

export function ResumoInterno({ dados }: { dados: DadosProposta }) {
  const { orcamento, cliente, config, calculo, cronograma } = dados;
  const moeda = orcamento.moeda;

  return (
    <Document title={`${orcamento.codigo} — resumo interno`} author={config.nome}>
      <Page size="A4" style={estilos.pagina}>
        <Text style={estilos.tarjaInterna}>USO INTERNO — NÃO ENVIAR AO CLIENTE</Text>

        <View style={estilos.secao}>
          <Text style={estilos.h2}>
            {orcamento.codigo}
            {orcamento.versao > 1 ? ` v${orcamento.versao}` : ''} · {orcamento.titulo || 'Sem título'}
          </Text>
          <Text style={estilos.sutil}>
            {cliente ? cliente.empresa || cliente.nome : 'Sem cliente'} · criado em{' '}
            {formatarData(orcamento.criadoEm.slice(0, 10))} · válido até {formatarData(orcamento.validoAte)} ·{' '}
            {orcamento.mesesProjeto} mês(es)
          </Text>
        </View>

        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>Resultado</Text>
          <Grade
            itens={[
              ['Preço final', formatarMoeda(calculo.precoComDesconto, moeda)],
              ['Margem real', formatarPercentual(calculo.margemReal)],
              ['Valor-hora efetivo', formatarMoeda(calculo.valorHoraEfetivo, moeda)],
              ['Total de horas', `${calculo.totalHoras}h`],
              ['Custo-hora do estúdio', formatarMoeda(calculo.custoHoraFixo, moeda)],
              ['Custo-hora médio do projeto', formatarMoeda(calculo.custoHoraMedio, moeda)],
              ['Custos diretos', formatarMoeda(calculo.subtotalCustos, moeda)],
              ['Base com risco', formatarMoeda(calculo.baseComRisco, moeda)],
              ['Lucro líquido', formatarMoeda(calculo.lucroLiquido, moeda)],
            ]}
          />
          <Text style={[estilos.sutil, { marginTop: 6 }]}>{calculo.alertaMargem.mensagem}</Text>
        </View>

        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>Do custo ao preço</Text>
          {calculo.cascata.map((etapa) => (
            <View key={etapa.rotulo} style={estilos.linhaTabela}>
              <Text style={{ flex: 3 }}>{etapa.rotulo}</Text>
              <Text style={[estilos.num, { flex: 1.5 }]}>{formatarMoeda(etapa.valor, moeda)}</Text>
            </View>
          ))}
          <View style={{ marginTop: 8 }}>
            <Text style={estilos.sutil}>
              Contingência {formatarPercentual(orcamento.contingencia, 1)} · margem alvo{' '}
              {formatarPercentual(orcamento.margemDesejada, 1)} · imposto{' '}
              {formatarPercentual(orcamento.aliquotaImposto, 1)} · taxa{' '}
              {formatarPercentual(orcamento.taxaPagamento, 1)} · divisor {calculo.divisor.toFixed(4)}
            </Text>
            {orcamento.percentualDesconto > 0 ? (
              <Text style={estilos.sutil}>
                Desconto {formatarPercentual(orcamento.percentualDesconto, 1)} (
                {formatarMoeda(calculo.descontoValor, moeda)}) — {orcamento.justificativaDesconto || 'sem justificativa'}
              </Text>
            ) : null}
          </View>
        </View>

        <Tabela
          titulo="Horas"
          colunas={['Descrição', 'Papel', 'Horas', 'Custo-hora', 'Subtotal']}
          flex={[3, 2, 1, 1.4, 1.4]}
          linhas={orcamento.horas.map((l) => [
            l.descricao || '—',
            l.papel || '—',
            `${l.horas}h`,
            formatarMoeda(l.custoHora, moeda),
            formatarMoeda(Math.round(l.horas * l.custoHora), moeda),
          ])}
          total={formatarMoeda(calculo.custoHoras, moeda)}
        />

        <Tabela
          titulo="Equipamentos (depreciação)"
          colunas={['Equipamento', 'Compra', 'Vida útil', 'Alocado', 'Custo']}
          flex={[3, 1.4, 1, 1, 1.4]}
          linhas={orcamento.equipamentos.map((l) => [
            l.nome || '—',
            formatarMoeda(l.valorCompra, moeda),
            l.alocacaoTotal ? 'integral' : `${l.vidaUtilMeses}m`,
            l.alocacaoTotal ? '100%' : formatarPercentual(l.percentualAlocado, 0),
            formatarMoeda(calculo.detalheEquipamentos.find((d) => d.id === l.id)?.custo ?? 0, moeda),
          ])}
          total={formatarMoeda(calculo.custoEquipamentos, moeda)}
        />

        <Tabela
          titulo="Software"
          colunas={['Software', 'Tipo', 'Valor', 'Alocado', 'Custo']}
          flex={[3, 1.6, 1.4, 1, 1.4]}
          linhas={orcamento.softwares.map((l) => [
            l.nome || '—',
            l.tipo === 'recorrente-ja-no-fixo' ? 'já no fixo' : l.tipo === 'avulso-mensal' ? 'avulso/mês' : 'avulso único',
            formatarMoeda(l.valor, moeda),
            formatarPercentual(l.percentualAlocado, 0),
            formatarMoeda(calculo.detalheSoftwares.find((d) => d.id === l.id)?.custo ?? 0, moeda),
          ])}
          total={formatarMoeda(calculo.custoSoftware, moeda)}
        />

        <Tabela
          titulo="Terceiros"
          colunas={['Fornecedor', 'Escopo', 'Valor']}
          flex={[2, 4, 1.4]}
          linhas={orcamento.terceiros.map((l) => [l.fornecedor || '—', l.escopo || '—', formatarMoeda(l.valor, moeda)])}
          total={formatarMoeda(calculo.custoTerceiros, moeda)}
        />

        <Tabela
          titulo="Despesas diretas"
          colunas={['Descrição', 'Valor']}
          flex={[6, 1.4]}
          linhas={orcamento.despesas.map((l) => [l.descricao || '—', formatarMoeda(l.valor, moeda)])}
          total={formatarMoeda(calculo.custoDespesas, moeda)}
        />

        {cronograma ? (
          <Tabela
            titulo="Fluxo de caixa previsto"
            colunas={['Parcela', 'Marco', 'Data', '%', 'Valor']}
            flex={[2, 2, 1.4, 1, 1.4]}
            linhas={cronograma.recebimentos.map((r) => [
              r.rotulo || '—',
              r.marcoNome ?? '—',
              r.data ? formatarData(r.data) : '—',
              formatarPercentual(r.percentual, 0),
              formatarMoeda(r.valor, moeda),
            ])}
            total={formatarMoeda(calculo.precoComDesconto, moeda)}
          />
        ) : null}

        {cronograma && cronograma.alertas.length > 0 ? (
          <View style={estilos.secao}>
            <Text style={estilos.secaoTitulo}>Alertas do cronograma</Text>
            {cronograma.alertas.map((a, i) => (
              <View key={i} style={estilos.item}>
                <Text style={estilos.marcador}>!</Text>
                <Text>{a.mensagem}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Rodape orcamento={`${orcamento.codigo} · interno`} config={config} />
      </Page>
    </Document>
  );
}

function Grade({ itens }: { itens: Array<[string, string]> }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {itens.map(([rotulo, valor]) => (
        <View key={rotulo} style={{ width: '33%', marginBottom: 8 }}>
          <Text style={estilos.th}>{rotulo}</Text>
          <Text style={{ fontSize: 11, fontWeight: 600 }}>{valor}</Text>
        </View>
      ))}
    </View>
  );
}

function Tabela({
  titulo,
  colunas,
  linhas,
  flex,
  total,
}: {
  titulo: string;
  colunas: string[];
  linhas: string[][];
  flex: number[];
  total?: string;
}) {
  if (linhas.length === 0) return null;
  return (
    <View style={estilos.secao}>
      <Text style={estilos.secaoTitulo}>{titulo}</Text>
      <View style={estilos.cabecalhoTabela}>
        {colunas.map((c, i) => (
          <Text
            key={c}
            style={[estilos.th, { flex: flex[i] ?? 1, textAlign: i === 0 ? 'left' : 'right' }]}
          >
            {c}
          </Text>
        ))}
      </View>
      {linhas.map((linha, i) => (
        <View key={i} style={estilos.linhaTabela} wrap={false}>
          {linha.map((celula, j) => (
            <Text
              key={j}
              style={[{ flex: flex[j] ?? 1 }, j === 0 ? {} : estilos.num]}
            >
              {celula}
            </Text>
          ))}
        </View>
      ))}
      {total ? (
        <View style={{ flexDirection: 'row', paddingTop: 4 }}>
          <Text style={{ flex: flex.slice(0, -1).reduce((a, b) => a + b, 0), fontWeight: 600 }}>
            Total
          </Text>
          <Text style={[estilos.num, { flex: flex[flex.length - 1] ?? 1, fontWeight: 600 }]}>{total}</Text>
        </View>
      ) : null}
    </View>
  );
}
