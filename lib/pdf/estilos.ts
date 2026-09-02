import { StyleSheet } from '@react-pdf/renderer';
import { brand } from '../brand';

/**
 * Estilos compartilhados pelos dois PDFs. As cores vêm de `lib/brand.ts` —
 * mudar a marca é mudar um arquivo só.
 *
 * Tipografia: Helvetica, uma das famílias embutidas no @react-pdf/renderer.
 * Registrar Inter exigiria baixar o arquivo da fonte, e o app precisa
 * funcionar sem rede.
 */
export const cores = brand.cores;

export const estilos = StyleSheet.create({
  pagina: {
    paddingTop: 56, // 20mm
    paddingBottom: 64,
    paddingHorizontal: 56,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: cores.tinta,
    backgroundColor: '#FFFFFF',
    lineHeight: 1.5,
  },
  capaTopo: { marginBottom: 'auto' },
  logo: { height: 28, marginBottom: 24, objectFit: 'contain', alignSelf: 'flex-start' },
  marcaTexto: { fontSize: 16, fontFamily: 'Helvetica-Bold', letterSpacing: -0.4 },
  capaTitulo: { fontSize: 26, fontFamily: 'Helvetica-Bold', letterSpacing: -0.8, marginBottom: 8 },
  capaCliente: { fontSize: 12, color: cores.sutil, marginBottom: 32 },
  secaoTitulo: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: cores.sutil,
    marginBottom: 8,
  },
  secao: { marginBottom: 22 },
  h2: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 6, letterSpacing: -0.2 },
  h3: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  paragrafo: { marginBottom: 6, textAlign: 'justify' },
  sutil: { color: cores.sutil },
  item: { flexDirection: 'row', marginBottom: 2.5 },
  marcador: { width: 12, color: cores.sutil },
  linhaTabela: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E1E1DC',
    paddingVertical: 4,
  },
  cabecalhoTabela: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: cores.tinta,
    paddingBottom: 3,
    marginBottom: 2,
  },
  th: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', letterSpacing: 0.6, textTransform: 'uppercase', color: cores.sutil },
  num: { fontFamily: 'Helvetica', textAlign: 'right' },
  destaqueCaixa: {
    borderWidth: 1,
    borderColor: cores.acento,
    borderRadius: brand.radius / 2,
    padding: 14,
    marginBottom: 12,
  },
  destaqueValor: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: cores.acento, letterSpacing: -0.6 },
  rodape: {
    position: 'absolute',
    bottom: 28,
    left: 56,
    right: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#E1E1DC',
    paddingTop: 6,
    fontSize: 7.5,
    color: cores.sutil,
  },
  aceiteLinha: { borderBottomWidth: 0.5, borderBottomColor: cores.tinta, height: 26, marginTop: 18 },
  tarjaInterna: {
    backgroundColor: cores.critico,
    color: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    marginBottom: 18,
  },
});
