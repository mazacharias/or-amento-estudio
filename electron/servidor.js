/**
 * Servidor da aplicação, executado num processo Node separado.
 *
 * O Electron o inicia com ELECTRON_RUN_AS_NODE=1, ou seja: é o binário do
 * Electron rodando como Node puro. Por isso o better-sqlite3 embarcado precisa
 * ser o build para a ABI do Electron (ver scripts/preparar-windows.mjs).
 */

const path = require('node:path');
const fs = require('node:fs');

/*
 * Empacotado, o servidor fica em `resources/servidor` (extraResources); na
 * pasta montada pelo empacotador, é a pasta irmã de `electron/`.
 */
const candidatos = [
  path.join(__dirname, '..', 'servidor'),
  process.resourcesPath ? path.join(process.resourcesPath, 'servidor') : null,
].filter(Boolean);

const standalone = candidatos.find((c) => fs.existsSync(path.join(c, 'server.js')));
if (!standalone) {
  throw new Error(`server.js não encontrado. Procurei em:\n${candidatos.join('\n')}`);
}

process.env.NODE_ENV = 'production';
process.env.HOSTNAME = process.env.HOSTNAME || '127.0.0.1';
process.env.PORT = process.env.PORT || '0';

// O servidor standalone do Next resolve arquivos a partir do cwd.
process.chdir(standalone);

require(path.join(standalone, 'server.js'));
