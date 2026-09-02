/* eslint-disable jsx-a11y/alt-text */
/**
 * Proposta do cliente (spec §6).
 *
 * REGRA DURA: nada de custo interno, custo-hora, margem, contingência ou
 * alíquota entra aqui. O que o cliente vê é escopo, investimento, prazo e
 * condições. O detalhamento interno mora em `ResumoInterno.tsx`.
 */

import * as React from 'react';
import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import fs from 'node:fs';
import path from 'node:path';
import { estilos, cores } from './estilos';
import type { DadosProposta } from './dados';
import { formatarMoeda, formatarPercentual } from '../money';
import { formatarData, formatarDataLonga } from '../dates';

export function Proposta({ dados }: { dados: DadosProposta }) {
  const { orcamento, cliente, config, calculo, cronograma } = dados;
  const moeda = orcamento.moeda;
  const logo = caminhoLogo(config.logoPath);

  const servicosDoOrcamento = orcamento.horas.map((linha) => ({
    linha,
    servico: linha.servicoId ? dados.servicosPorId[linha.servicoId] : undefined,
  }));

  return (
    <Document
      title={`${orcamento.codigo} — ${orcamento.titulo}`}
      author={config.nome}
      subject={`Proposta ${orcamento.codigo}`}
    >
      {/* 1. Capa */}
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.capaTopo}>
          {logo ? <Image src={logo} style={estilos.logo} /> : <Text style={estilos.marcaTexto}>{config.nome}</Text>}
          <Text style={estilos.secaoTitulo}>Proposta de trabalho</Text>
          <Text style={estilos.capaTitulo}>{orcamento.titulo || 'Projeto sem título'}</Text>
          <Text style={estilos.capaCliente}>
            {cliente ? cliente.empresa || cliente.nome : 'Cliente a definir'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 32 }}>
          <CampoCapa rotulo="Código" valor={`${orcamento.codigo}${orcamento.versao > 1 ? ` · v${orcamento.versao}` : ''}`} />
          <CampoCapa rotulo="Data" valor={formatarData(orcamento.criadoEm.slice(0, 10))} />
          <CampoCapa rotulo="Válida até" valor={formatarData(orcamento.validoAte)} />
        </View>

        <View style={{ marginTop: 24, borderTopWidth: 0.5, borderTopColor: '#E1E1DC', paddingTop: 10 }}>
          <Text style={estilos.sutil}>
            {[config.nome, config.cnpjOuCpf, config.email, config.telefone, config.site]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <Rodape orcamento={orcamento.codigo} config={config} />
      </Page>

      {/* 2–11 */}
      <Page size="A4" style={estilos.pagina}>
        {orcamento.resumoProjeto ? (
          <View style={estilos.secao}>
            <Text style={estilos.secaoTitulo}>Apresentação</Text>
            {orcamento.resumoProjeto.split('\n\n').map((paragrafo, i) => (
              <Text key={i} style={estilos.paragrafo}>
                {paragrafo}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>Escopo</Text>
          {servicosDoOrcamento.map(({ linha, servico }) => (
            <View key={linha.id} style={{ marginBottom: 10 }} wrap={false}>
              <Text style={estilos.h3}>{linha.descricao || servico?.nome || 'Serviço'}</Text>
              {servico?.descricao ? <Text style={estilos.sutil}>{servico.descricao}</Text> : null}
              {servico?.entregaveisPadrao.map((e, i) => (
                <View key={i} style={estilos.item}>
                  <Text style={estilos.marcador}>—</Text>
                  <Text>{e}</Text>
                </View>
              ))}
            </View>
          ))}

          {orcamento.entregaveis.length > 0 ? (
            <View style={{ marginTop: 6 }}>
              <Text style={estilos.h3}>Entregáveis</Text>
              {orcamento.entregaveis.map((e, i) => (
                <View key={i} style={estilos.item}>
                  <Text style={estilos.marcador}>·</Text>
                  <Text>{e}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {orcamento.foraDoEscopo.length > 0 ? (
          <View style={estilos.secao}>
            <Text style={estilos.secaoTitulo}>Fora do escopo</Text>
            {orcamento.foraDoEscopo.map((e, i) => (
              <View key={i} style={estilos.item}>
                <Text style={estilos.marcador}>·</Text>
                <Text>{e}</Text>
              </View>
            ))}
            <Text style={[estilos.sutil, { marginTop: 6 }]}>
              Itens fora do escopo não estão incluídos neste investimento e são orçados separadamente.
            </Text>
          </View>
        ) : null}

        <View style={estilos.secao} wrap={false}>
          <Text style={estilos.secaoTitulo}>Investimento</Text>
          <View style={estilos.destaqueCaixa}>
            <Text style={estilos.destaqueValor}>{formatarMoeda(calculo.precoComDesconto, moeda)}</Text>
            <Text style={[estilos.sutil, { marginTop: 4 }]}>
              Valor total do projeto{orcamento.mesesProjeto ? ` · previsão de ${orcamento.mesesProjeto} mês(es)` : ''}
            </Text>
          </View>

          {dados.detalhado ? (
            <View>
              <View style={estilos.cabecalhoTabela}>
                <Text style={[estilos.th, { flex: 3 }]}>Serviço</Text>
                <Text style={[estilos.th, { flex: 1, textAlign: 'right' }]}>Participação</Text>
                <Text style={[estilos.th, { flex: 1.2, textAlign: 'right' }]}>Valor</Text>
              </View>
              {distribuirPorServico(dados).map((item) => (
                <View key={item.id} style={estilos.linhaTabela} wrap={false}>
                  <Text style={{ flex: 3 }}>{item.nome}</Text>
                  <Text style={[estilos.num, { flex: 1 }]}>{formatarPercentual(item.participacao, 0)}</Text>
                  <Text style={[estilos.num, { flex: 1.2 }]}>{formatarMoeda(item.valor, moeda)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>Condições de pagamento</Text>
          <View style={estilos.cabecalhoTabela}>
            <Text style={[estilos.th, { flex: 2 }]}>Parcela</Text>
            <Text style={[estilos.th, { flex: 2 }]}>Marco</Text>
            <Text style={[estilos.th, { flex: 1, textAlign: 'right' }]}>%</Text>
            <Text style={[estilos.th, { flex: 1.4, textAlign: 'right' }]}>Valor</Text>
          </View>
          {orcamento.parcelas.map((parcela) => {
            const recebimento = cronograma?.recebimentos.find((r) => r.parcelaId === parcela.id);
            return (
              <View key={parcela.id} style={estilos.linhaTabela} wrap={false}>
                <Text style={{ flex: 2 }}>{parcela.rotulo || 'Parcela'}</Text>
                <Text style={[{ flex: 2 }, estilos.sutil]}>
                  {recebimento?.marcoNome
                    ? `${recebimento.marcoNome}${recebimento.data ? ` · ${formatarData(recebimento.data)}` : ''}`
                    : '—'}
                </Text>
                <Text style={[estilos.num, { flex: 1 }]}>{formatarPercentual(parcela.percentual, 0)}</Text>
                <Text style={[estilos.num, { flex: 1.4 }]}>
                  {formatarMoeda(Math.round(calculo.precoComDesconto * parcela.percentual), moeda)}
                </Text>
              </View>
            );
          })}
        </View>

        {cronograma ? (
          <View style={estilos.secao}>
            <Text style={estilos.secaoTitulo}>Prazo</Text>
            <Text style={estilos.paragrafo}>
              Início previsto em {formatarDataLonga(cronograma.inicio)}, entrega final em{' '}
              {formatarDataLonga(cronograma.fim)} — {cronograma.duracaoDiasUteis} dias úteis.
            </Text>
            <View style={estilos.cabecalhoTabela}>
              <Text style={[estilos.th, { flex: 3 }]}>Fase</Text>
              <Text style={[estilos.th, { flex: 1.2, textAlign: 'right' }]}>Início</Text>
              <Text style={[estilos.th, { flex: 1.2, textAlign: 'right' }]}>Fim</Text>
            </View>
            {cronograma.fases.map((fase) => (
              <View key={fase.id} style={estilos.linhaTabela} wrap={false}>
                <Text style={{ flex: 3 }}>
                  {fase.ehMarcoPagamento ? '◆ ' : ''}
                  {fase.nome}
                </Text>
                <Text style={[estilos.num, { flex: 1.2 }]}>{formatarData(fase.inicio)}</Text>
                <Text style={[estilos.num, { flex: 1.2 }]}>{formatarData(fase.fim)}</Text>
              </View>
            ))}
            <Text style={[estilos.sutil, { marginTop: 6 }]}>
              ◆ marco de pagamento. O prazo depende da aprovação nas datas previstas e do recebimento dos materiais do
              cliente; atrasos no retorno deslocam as entregas na mesma proporção.
            </Text>
          </View>
        ) : null}

        <View style={estilos.secao} wrap={false}>
          <Text style={estilos.secaoTitulo}>Revisões</Text>
          <Text style={estilos.paragrafo}>
            Estão incluídas {orcamento.rodadasRevisao} rodada(s) de revisão por entrega.
            {orcamento.custoRevisaoExtra > 0
              ? ` Rodadas adicionais são cobradas a ${formatarMoeda(orcamento.custoRevisaoExtra, moeda)} cada.`
              : ' Rodadas adicionais são orçadas à parte.'}
          </Text>
        </View>

        {orcamento.textoDireitosUso ? (
          <View style={estilos.secao}>
            <Text style={estilos.secaoTitulo}>Direitos de uso</Text>
            {orcamento.textoDireitosUso.split('\n\n').map((p, i) => (
              <Text key={i} style={estilos.paragrafo}>
                {p}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>Condições gerais</Text>
          <Text style={estilos.paragrafo}>
            Esta proposta é válida até {formatarDataLonga(orcamento.validoAte)}.
            {orcamento.taxaCancelamento > 0
              ? ` Em caso de cancelamento após o início dos trabalhos, aplica-se taxa de ${formatarMoeda(
                  orcamento.taxaCancelamento,
                  moeda,
                )}, além das etapas já executadas.`
              : ''}
          </Text>
          {orcamento.textoCondicoes.split('\n\n').map((p, i) => (
            <Text key={i} style={estilos.paragrafo}>
              {p}
            </Text>
          ))}
        </View>

        <View style={estilos.secao} wrap={false}>
          <Text style={estilos.secaoTitulo}>Aceite</Text>
          <Text style={estilos.paragrafo}>
            De acordo com o escopo, o investimento e as condições descritos nesta proposta.
          </Text>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            <View style={{ flex: 1 }}>
              <View style={estilos.aceiteLinha} />
              <Text style={[estilos.sutil, { marginTop: 4 }]}>Nome e cargo</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={estilos.aceiteLinha} />
              <Text style={[estilos.sutil, { marginTop: 4 }]}>Data</Text>
            </View>
          </View>
          <View style={{ marginTop: 18 }}>
            <View style={estilos.aceiteLinha} />
            <Text style={[estilos.sutil, { marginTop: 4 }]}>Assinatura</Text>
          </View>
        </View>

        <Rodape orcamento={orcamento.codigo} config={config} />
      </Page>
    </Document>
  );
}

function CampoCapa({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View>
      <Text style={estilos.th}>{rotulo}</Text>
      <Text style={{ marginTop: 2 }}>{valor}</Text>
    </View>
  );
}

export function Rodape({ orcamento, config }: { orcamento: string; config: DadosProposta['config'] }) {
  return (
    <View style={estilos.rodape} fixed>
      <Text>
        {config.nome}
        {config.email ? ` · ${config.email}` : ''}
        {config.site ? ` · ${config.site}` : ''}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `página ${pageNumber} de ${totalPages} · ${orcamento}`} />
    </View>
  );
}

/**
 * Distribui o preço final entre os serviços proporcionalmente ao custo de
 * horas de cada linha — o cliente vê participação, nunca custo.
 */
function distribuirPorServico(dados: DadosProposta) {
  const linhas = dados.orcamento.horas;
  const total = linhas.reduce((acc, l) => acc + l.horas * l.custoHora, 0);
  if (total <= 0) return [];
  let distribuido = 0;
  return linhas.map((linha, i) => {
    const participacao = (linha.horas * linha.custoHora) / total;
    const ultima = i === linhas.length - 1;
    // A última linha absorve o resíduo de arredondamento: a soma fecha no total.
    const valor = ultima
      ? dados.calculo.precoComDesconto - distribuido
      : Math.round(dados.calculo.precoComDesconto * participacao);
    distribuido += valor;
    return {
      id: linha.id,
      nome: linha.descricao || dados.servicosPorId[linha.servicoId ?? '']?.nome || 'Serviço',
      participacao,
      valor,
    };
  });
}

function caminhoLogo(logoPath: string | null): string | null {
  if (!logoPath) return null;
  // SVG não é suportado pelo renderer de imagem do @react-pdf.
  if (logoPath.endsWith('.svg')) return null;
  const absoluto = path.join(process.cwd(), 'public', logoPath.replace(/^\//, ''));
  return fs.existsSync(absoluto) ? absoluto : null;
}

export { cores };
