/**
 * Empacota o app como executável para Windows.
 *
 * A montagem é explícita — não deixamos o electron-builder adivinhar o que
 * entra. O resultado é uma pasta autocontida (`build/app-windows`) com:
 *
 *   app/        servidor Next em modo standalone (server.js + node_modules)
 *   electron/   processo principal e o bootstrap do servidor
 *
 * O ponto delicado é o better-sqlite3: é um módulo nativo, e o binário que vai
 * no pacote precisa ser o de Windows compilado para a ABI do Electron — não o
 * do Linux desta máquina de build. Baixamos o prebuild oficial do projeto e
 * trocamos o arquivo.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const raiz = process.cwd();
const saida = path.join(raiz, 'build', 'app-windows');
const pacote = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));
const versaoElectron = pacote.devDependencies.electron.replace(/[^\d.]/g, '');
const versaoSqlite = JSON.parse(
  fs.readFileSync(path.join(raiz, 'node_modules', 'better-sqlite3', 'package.json'), 'utf8'),
).version;

/** ABI do Node embutido em cada linha do Electron. */
const ABI_ELECTRON = { 30: 121, 31: 125, 32: 128, 33: 130, 34: 132, 35: 133 };

function passo(texto) {
  console.log(`\n▸ ${texto}`);
}

function copiar(de, para) {
  fs.cpSync(de, para, { recursive: true });
}

passo('Limpando a saída anterior');
fs.rmSync(saida, { recursive: true, force: true });
fs.mkdirSync(saida, { recursive: true });

passo('Conferindo o build do Next (output: standalone)');
const standalone = path.join(raiz, '.next', 'standalone');
if (!fs.existsSync(path.join(standalone, 'server.js'))) {
  throw new Error('Rode `npm run build` antes de empacotar.');
}

passo('Montando a pasta do app');
// A pasta NÃO pode se chamar "app": o electron-builder trata um diretório
// com esse nome como a raiz da aplicação e passaria a ler o package.json do
// standalone do Next em vez do nosso manifesto.
const destinoApp = path.join(saida, 'servidor');
copiar(standalone, destinoApp);
copiar(path.join(raiz, '.next', 'static'), path.join(destinoApp, '.next', 'static'));
copiar(path.join(raiz, 'public'), path.join(destinoApp, 'public'));

// O banco de desenvolvimento não vai junto: o app cria o dele na pasta do
// usuário, na primeira execução.
fs.rmSync(path.join(destinoApp, 'data'), { recursive: true, force: true });

// sharp é binário de Linux e só serviria ao otimizador de imagens do Next,
// que este app não usa.
for (const modulo of ['sharp', '@img']) {
  fs.rmSync(path.join(destinoApp, 'node_modules', modulo), { recursive: true, force: true });
}

/*
 * O pdfkit e o fontkit montam caminhos de arquivo em runtime (fontes-padrão,
 * tabelas Unicode). O tracer do Next não enxerga isso e o standalone sai sem
 * esses arquivos — a rota de PDF quebraria com MODULE_NOT_FOUND só no app
 * empacotado. Copiamos os pacotes inteiros por cima.
 */
passo('Completando os pacotes que carregam dados em runtime');
for (const modulo of ['pdfkit', 'fontkit', 'linebreak', 'unicode-properties', 'unicode-trie']) {
  const origem = path.join(raiz, 'node_modules', modulo);
  if (!fs.existsSync(origem)) continue;
  const destino = path.join(destinoApp, 'node_modules', modulo);
  fs.rmSync(destino, { recursive: true, force: true });
  copiar(origem, destino);
  console.log(`  ${modulo}`);
}

copiar(path.join(raiz, 'electron'), path.join(saida, 'electron'));
fs.copyFileSync(path.join(raiz, 'build', 'icone.png'), path.join(saida, 'electron', 'icone.png'));

passo(`Trocando o better-sqlite3 pelo binário de Windows (Electron ABI ${ABI_ELECTRON[Number(versaoElectron.split('.')[0])]})`);
const abi = ABI_ELECTRON[Number(versaoElectron.split('.')[0])];
if (!abi) throw new Error(`ABI desconhecida para o Electron ${versaoElectron}. Atualize a tabela.`);

const url =
  `https://github.com/WiseLibs/better-sqlite3/releases/download/v${versaoSqlite}/` +
  `better-sqlite3-v${versaoSqlite}-electron-v${abi}-win32-x64.tar.gz`;
const cache = path.join(raiz, 'build', `better-sqlite3-electron-v${abi}-win32-x64.tar.gz`);

if (!fs.existsSync(cache)) {
  console.log(`  baixando ${url}`);
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`Falha ao baixar o prebuild (${resposta.status}): ${url}`);
  fs.writeFileSync(cache, Buffer.from(await resposta.arrayBuffer()));
}
const conteudo = fs.readFileSync(cache);
if (conteudo.length < 100_000 || conteudo[0] !== 0x1f || conteudo[1] !== 0x8b) {
  fs.rmSync(cache, { force: true });
  throw new Error(`Prebuild inválido em ${url} — o arquivo baixado não é um tar.gz.`);
}

const binario = extrairDoTar(zlib.gunzipSync(conteudo), 'better_sqlite3.node');
const destinoBinario = path.join(
  destinoApp,
  'node_modules',
  'better-sqlite3',
  'build',
  'Release',
  'better_sqlite3.node',
);
fs.mkdirSync(path.dirname(destinoBinario), { recursive: true });
fs.writeFileSync(destinoBinario, binario);
console.log(`  ${(binario.length / 1024 / 1024).toFixed(1)} MB gravados em node_modules/better-sqlite3`);

passo('Escrevendo o manifesto do app empacotado');
fs.writeFileSync(
  path.join(saida, 'package.json'),
  `${JSON.stringify(
    {
      name: 'atalho-orcamentos',
      productName: 'Atalho Orçamentos',
      version: pacote.version,
      description: 'Gerador de orçamentos e cronogramas do estúdio Atalho.',
      main: 'electron/main.js',
      author: 'Atalho',
      license: 'UNLICENSED',
    },
    null,
    2,
  )}\n`,
);

passo('Empacotando o Electron (fase 1: pasta desempacotada)');
fs.copyFileSync(path.join(raiz, 'electron-builder.yml'), path.join(saida, 'electron-builder.yml'));

// Chamamos o CLI pelo arquivo, e não pelo atalho em .bin: no Windows o atalho
// é um .cmd e o execFileSync precisaria de shell.
const builder = path.join(raiz, 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js');
const ambiente = {
  ...process.env,
  ELECTRON_BUILDER_CACHE: path.join(raiz, 'build', '.cache'),
};

execFileSync(process.execPath, [builder, '--win', '--x64', '--dir'], {
  stdio: 'inherit',
  cwd: saida,
  env: ambiente,
});

passo('Copiando o servidor para dentro do pacote (fase 2)');
const desempacotado = path.join(raiz, 'build', 'dist', 'win-unpacked');
const destinoServidor = path.join(desempacotado, 'resources', 'servidor');
fs.rmSync(destinoServidor, { recursive: true, force: true });
copiar(destinoApp, destinoServidor);
const binarioNoPacote = path.join(
  destinoServidor,
  'node_modules',
  'better-sqlite3',
  'build',
  'Release',
  'better_sqlite3.node',
);
if (!fs.existsSync(binarioNoPacote)) {
  throw new Error('O better-sqlite3 não chegou ao pacote — a cópia do servidor falhou.');
}
console.log(`  ${contarArquivos(destinoServidor)} arquivos copiados`);

/*
 * Instalador e portátil são executáveis NSIS de 32 bits: montá-los fora do
 * Windows exigiria wine de 32 bits no host de build. Em Linux geramos o ZIP
 * portátil, que não depende de wine; o instalador sai do runner Windows
 * (.github/workflows/windows.yml).
 */
const alvos = process.platform === 'win32' ? ['nsis', 'portable'] : ['zip'];
passo(`Montando os alvos a partir da pasta pronta (fase 3: ${alvos.join(', ')})`);
if (process.platform !== 'win32') {
  console.log('  host não-Windows: só o ZIP portátil (NSIS precisa de wine32)');
}
execFileSync(process.execPath, [builder, '--win', ...alvos, '--x64', '--prepackaged', desempacotado], {
  stdio: 'inherit',
  cwd: saida,
  env: ambiente,
});

passo('Pronto');
for (const arquivo of fs.readdirSync(path.join(raiz, 'build', 'dist'))) {
  const info = fs.statSync(path.join(raiz, 'build', 'dist', arquivo));
  if (info.isFile()) {
    console.log(`  ${arquivo} — ${(info.size / 1024 / 1024).toFixed(0)} MB`);
  }
}

function contarArquivos(dir) {
  let total = 0;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    total += entrada.isDirectory() ? contarArquivos(path.join(dir, entrada.name)) : 1;
  }
  return total;
}

/** Extrai um arquivo de dentro de um tar (formato ustar, sem dependências). */
function extrairDoTar(tar, nomeProcurado) {
  let posicao = 0;
  while (posicao + 512 <= tar.length) {
    const cabecalho = tar.subarray(posicao, posicao + 512);
    const nome = cabecalho.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    if (!nome) break;
    const tamanho = parseInt(cabecalho.subarray(124, 136).toString('utf8').replace(/\0.*$/, '').trim(), 8) || 0;
    const inicio = posicao + 512;
    if (path.basename(nome) === nomeProcurado) {
      return tar.subarray(inicio, inicio + tamanho);
    }
    posicao = inicio + Math.ceil(tamanho / 512) * 512;
  }
  throw new Error(`${nomeProcurado} não encontrado no prebuild baixado.`);
}
