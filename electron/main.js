/**
 * Processo principal do Electron.
 *
 * Sobe o servidor Next (processo filho, Node puro) numa porta livre do
 * loopback e abre a janela apontando para ele. Nenhuma porta é exposta para
 * fora da máquina e nenhuma requisição sai para a internet.
 */

const { app, BrowserWindow, dialog, shell, Menu } = require('electron');
const { fork } = require('node:child_process');
const path = require('node:path');
const net = require('node:net');
const fs = require('node:fs');

let servidor = null;
let janela = null;

/** Porta livre no loopback, escolhida pelo sistema. */
function portaLivre() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function esperarServidor(url, tentativas = 120) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const resposta = await fetch(url, { method: 'HEAD' });
      if (resposta.status < 500) return true;
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function iniciar() {
  // Os dados do usuário (banco, logo) ficam em %APPDATA%/Atalho Orçamentos —
  // a pasta de instalação não é gravável.
  const dados = app.getPath('userData');
  fs.mkdirSync(dados, { recursive: true });

  const porta = await portaLivre();
  const url = `http://127.0.0.1:${porta}`;

  servidor = fork(path.join(__dirname, 'servidor.js'), [], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(porta),
      HOSTNAME: '127.0.0.1',
      ATALHO_DATA_DIR: dados,
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });

  const log = fs.createWriteStream(path.join(dados, 'servidor.log'), { flags: 'a' });
  servidor.stdout?.pipe(log);
  servidor.stderr?.pipe(log);

  servidor.on('exit', (codigo) => {
    if (codigo !== 0 && !app.isQuiting) {
      dialog.showErrorBox(
        'O servidor do Atalho parou',
        `O processo terminou com código ${codigo}.\n\nDetalhes em:\n${path.join(dados, 'servidor.log')}`,
      );
      app.quit();
    }
  });

  janela = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#FAFAF8',
    title: 'Atalho · Orçamentos',
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icone.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  // Links externos abrem no navegador do sistema, não dentro da janela.
  janela.webContents.setWindowOpenHandler(({ url: destino }) => {
    if (destino.startsWith(url)) return { action: 'allow' };
    shell.openExternal(destino);
    return { action: 'deny' };
  });

  const subiu = await esperarServidor(url);
  if (!subiu) {
    dialog.showErrorBox(
      'Não foi possível iniciar o Atalho',
      `O servidor não respondeu a tempo.\n\nDetalhes em:\n${path.join(dados, 'servidor.log')}`,
    );
    app.quit();
    return;
  }

  await janela.loadURL(url);
  janela.show();
}

// Menu enxuto, em português, com o essencial de janela e impressão.
function montarMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Arquivo',
        submenu: [
          { label: 'Recarregar', accelerator: 'CmdOrCtrl+R', role: 'reload' },
          { label: 'Imprimir / salvar PDF da tela', accelerator: 'CmdOrCtrl+P', click: () => janela?.webContents.print() },
          { type: 'separator' },
          { label: 'Sair', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
        ],
      },
      {
        label: 'Editar',
        submenu: [
          { label: 'Desfazer', role: 'undo' },
          { label: 'Refazer', role: 'redo' },
          { type: 'separator' },
          { label: 'Recortar', role: 'cut' },
          { label: 'Copiar', role: 'copy' },
          { label: 'Colar', role: 'paste' },
          { label: 'Selecionar tudo', role: 'selectAll' },
        ],
      },
      {
        label: 'Exibir',
        submenu: [
          { label: 'Aumentar zoom', role: 'zoomIn' },
          { label: 'Diminuir zoom', role: 'zoomOut' },
          { label: 'Zoom normal', role: 'resetZoom' },
          { type: 'separator' },
          { label: 'Tela cheia', role: 'togglefullscreen' },
          { label: 'Ferramentas do desenvolvedor', role: 'toggleDevTools' },
        ],
      },
    ]),
  );
}

// Uma instância só: a segunda apenas traz a janela existente para a frente.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (janela) {
      if (janela.isMinimized()) janela.restore();
      janela.focus();
    }
  });

  app.whenReady().then(() => {
    montarMenu();
    iniciar();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) iniciar();
    });
  });

  app.on('window-all-closed', () => app.quit());

  app.on('before-quit', () => {
    app.isQuiting = true;
    servidor?.kill();
  });
}
