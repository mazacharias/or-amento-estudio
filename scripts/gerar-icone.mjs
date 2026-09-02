/**
 * Gera o ícone do app (PNG 256 e .ico) a partir dos tokens de marca, sem
 * depender de ImageMagick — o container de build não tem ferramenta gráfica.
 *
 * Desenha o mesmo símbolo do favicon: quadrado arredondado no acento da marca
 * com um "A" vazado.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const TAM = 256;
const ACENTO = [0x18, 0x28, 0x89];
const PAPEL = [0xfa, 0xfa, 0xf8];

const px = (x, y) => (y * TAM + x) * 4;
const buffer = new Uint8ClampedArray(TAM * TAM * 4);

/** Distância de um ponto ao segmento (a → b). */
function distanciaSegmento(p, a, b) {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const apx = p[0] - a[0];
  const apy = p[1] - a[1];
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / (abx * abx + aby * aby)));
  const dx = apx - abx * t;
  const dy = apy - aby * t;
  return Math.hypot(dx, dy);
}

/** Distância ao retângulo arredondado centrado na tela. */
function distanciaRetanguloArredondado(p, meia, raio) {
  const qx = Math.abs(p[0] - TAM / 2) - (meia - raio);
  const qy = Math.abs(p[1] - TAM / 2) - (meia - raio);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - raio;
}

function misturar(i, cor, alfa) {
  if (alfa <= 0) return;
  const a0 = buffer[i + 3] / 255;
  const a = alfa + a0 * (1 - alfa);
  for (let c = 0; c < 3; c++) {
    buffer[i + c] = (cor[c] * alfa + buffer[i + c] * a0 * (1 - alfa)) / (a || 1);
  }
  buffer[i + 3] = a * 255;
}

const traçosDoA = [
  [[64, 190], [128, 62]],   // perna esquerda
  [[128, 62], [192, 190]],  // perna direita
  [[96, 152], [160, 152]],  // travessão
];

for (let y = 0; y < TAM; y++) {
  for (let x = 0; x < TAM; x++) {
    const p = [x + 0.5, y + 0.5];
    const i = px(x, y);

    // Fundo: quadrado arredondado no acento.
    const d = distanciaRetanguloArredondado(p, TAM / 2, 56);
    misturar(i, ACENTO, Math.min(1, Math.max(0, 0.5 - d)));

    // "A" vazado em papel.
    const dt = Math.min(...traçosDoA.map((s) => distanciaSegmento(p, s[0], s[1])));
    misturar(i, PAPEL, Math.min(1, Math.max(0, 12 - dt)));
  }
}

/** Serializa RGBA cru em PNG (sem filtro, uma passada de deflate). */
function paraPNG(dados, largura, altura) {
  const bruto = Buffer.alloc(altura * (largura * 4 + 1));
  for (let y = 0; y < altura; y++) {
    bruto[y * (largura * 4 + 1)] = 0; // filtro "none"
    Buffer.from(dados.buffer, y * largura * 4, largura * 4).copy(
      bruto,
      y * (largura * 4 + 1) + 1,
    );
  }
  const bloco = (tipo, conteudo) => {
    const cabecalho = Buffer.concat([Buffer.from(tipo), conteudo]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(cabecalho) >>> 0);
    const tamanho = Buffer.alloc(4);
    tamanho.writeUInt32BE(conteudo.length);
    return Buffer.concat([tamanho, cabecalho, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', zlib.deflateSync(bruto, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

let tabelaCrc = null;
function crc32(buf) {
  if (!tabelaCrc) {
    tabelaCrc = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      tabelaCrc[n] = c;
    }
  }
  let c = -1;
  for (const b of buf) c = tabelaCrc[(c ^ b) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

const png = paraPNG(buffer, TAM, TAM);

/** ICO com uma entrada PNG 256×256 — formato aceito do Windows Vista para cá. */
function paraICO(pngBuffer) {
  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(0, 0);
  cabecalho.writeUInt16LE(1, 2); // tipo: ícone
  cabecalho.writeUInt16LE(1, 4); // uma imagem
  const entrada = Buffer.alloc(16);
  entrada[0] = 0; // 0 = 256px
  entrada[1] = 0;
  entrada[2] = 0; // paleta
  entrada[4] = 1; // planos
  entrada.writeUInt16LE(32, 6); // bits por pixel
  entrada.writeUInt32LE(pngBuffer.length, 8);
  entrada.writeUInt32LE(6 + 16, 12);
  return Buffer.concat([cabecalho, entrada, pngBuffer]);
}

const destino = path.join(process.cwd(), 'build');
fs.mkdirSync(destino, { recursive: true });
fs.writeFileSync(path.join(destino, 'icone.png'), png);
fs.writeFileSync(path.join(destino, 'icone.ico'), paraICO(png));
console.log('ícone gerado:', path.join(destino, 'icone.ico'));
