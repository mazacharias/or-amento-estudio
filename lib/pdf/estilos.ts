import fs from 'node:fs';
import path from 'node:path';
import { Font, StyleSheet } from '@react-pdf/renderer';
import { brand } from '../brand';

/**
 * Estilos compartilhados pelos dois PDFs. As cores vêm de `lib/brand.ts` —
 * mudar a marca é mudar um arquivo só.
 *
 * Tipografia: Inter, os mesmos arquivos que a interface usa, lidos de
 * `public/fonts`. Se por algum motivo não estiverem lá (build recortado, por
 * exemplo), o PDF cai para Helvetica em vez de falhar.
 */
export const cores = brand.cores;

/** Registra a Inter para o PDF; devolve a família que os estilos devem usar. */
function registrarFonte(): string {
  const dir = path.join(process.cwd(), 'public', 'fonts');
  const pesos: Array<[number, string]> = [
    [400, 'Inter-Regular.ttf'],
    [600, 'Inter-SemiBold.ttf'],
    [700, 'Inter-Bold.ttf'],
  ];
  const fontes = pesos
    .map(([fontWeight, arquivo]) => ({ fontWeight, src: path.join(dir, arquivo) }))
    .filter((f) => fs.existsSync(f.src));
  if (fontes.length !== pesos.length) return 'Helvetica';
  try {
    Font.register({ family: 'Inter', fonts: fontes });
    // A Inter tem hifenização própria do idioma; desligamos a heurística do
    // renderer para não quebrar palavras em português no meio.
    Font.registerHyphenationCallback((palavra) => [palavra]);
    return 'Inter';
  } catch {
    return 'Helvetica';
  }
}

export const FAMILIA = registrarFonte();

export const estilos = StyleSheet.create({
  pagina: {
    paddingTop: 56, // 20mm
    paddingBottom: 64,
    paddingHorizontal: 56,
    fontSize: 9.5,
    fontFamily: FAMILIA,
    color: cores.tinta,
    backgroundColor: '#FFFFFF',
    lineHeight: 1.5,
  },
  capaTopo: { marginBottom: 'auto' },
  logo: { height: 28, marginBottom: 24, objectFit: 'contain', alignSelf: 'flex-start' },
  marcaTexto: { fontSize: 16, fontWeight: 600, letterSpacing: -0.4 },
  capaTitulo: { fontSize: 26, fontWeight: 600, letterSpacing: -0.8, marginBottom: 8 },
  capaCliente: { fontSize: 12, color: cores.sutil, marginBottom: 32 },
  secaoTitulo: {
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: cores.sutil,
    marginBottom: 8,
  },
  secao: { marginBottom: 22 },
  h2: { fontSize: 13, fontWeight: 600, marginBottom: 6, letterSpacing: -0.2 },
  h3: { fontSize: 10.5, fontWeight: 600, marginBottom: 3 },
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
  th: { fontSize: 7.5, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: cores.sutil },
  num: { fontFamily: FAMILIA, textAlign: 'right' },
  destaqueCaixa: {
    borderWidth: 1,
    borderColor: cores.acento,
    borderRadius: brand.radius / 2,
    padding: 14,
    marginBottom: 12,
  },
  destaqueValor: { fontSize: 24, fontWeight: 600, color: cores.acento, letterSpacing: -0.6 },
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
    fontWeight: 600,
    letterSpacing: 1,
    marginBottom: 18,
  },
});
