/**
 * Conexão SQLite local. Roda a migration e a semente na primeira abertura —
 * o app é local e precisa funcionar com `npm run dev` num clone limpo.
 */

import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { DDL } from './ddl';
import {
  CUSTOS_FIXOS_SEMENTE,
  TEXTO_CONDICOES_PADRAO,
  TEXTO_DIREITOS_USO_PADRAO,
  servicosIniciais,
} from './seed-data';

/**
 * Onde os dados moram. No app empacotado o Electron aponta
 * `ATALHO_DATA_DIR` para a pasta do usuário — o diretório de instalação não é
 * gravável. Rodando do código-fonte, é `./data`.
 */
export function diretorioDeDados(): string {
  return process.env.ATALHO_DATA_DIR ?? path.join(process.cwd(), 'data');
}

const CAMINHO_BANCO = process.env.ATALHO_DB ?? path.join(diretorioDeDados(), 'atalho.db');

function novoId(): string {
  return globalThis.crypto.randomUUID();
}

function abrir() {
  fs.mkdirSync(path.dirname(CAMINHO_BANCO), { recursive: true });
  const sqlite = new Database(CAMINHO_BANCO);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  // O build do Next coleta as páginas em processos paralelos, que abrem o
  // banco ao mesmo tempo; sem isso a migration concorrente dá SQLITE_BUSY.
  sqlite.pragma('busy_timeout = 10000');

  // A DDL é uma constante do módulo, não um arquivo lido em disco: assim o
  // app empacotado não depende do layout de pastas do build.
  sqlite.exec(DDL);

  const db = drizzle(sqlite, { schema });
  semear(sqlite);
  return { sqlite, db };
}

function semear(sqlite: Database.Database) {
  const temConfig = sqlite.prepare('SELECT COUNT(*) AS n FROM config').get() as { n: number };
  if (temConfig.n === 0) {
    const custosFixos = CUSTOS_FIXOS_SEMENTE.map((c) => ({ id: novoId(), ...c }));
    const total = custosFixos.reduce((acc, c) => acc + c.valor, 0);
    sqlite
      .prepare(
        `INSERT INTO config (id, nome, custos_fixos_mensais, horas_produtivas_mes,
           texto_condicoes_padrao, texto_direitos_uso_padrao, custos_fixos_detalhe)
         VALUES ('estudio', 'Atalho', ?, 120, ?, ?, ?)`,
      )
      .run(total, TEXTO_CONDICOES_PADRAO, TEXTO_DIREITOS_USO_PADRAO, JSON.stringify(custosFixos));
  }

  const temServicos = sqlite.prepare('SELECT COUNT(*) AS n FROM servicos').get() as { n: number };
  if (temServicos.n === 0) {
    const inserir = sqlite.prepare(
      `INSERT INTO servicos (id, nome, categoria, descricao, horas_estimadas_padrao,
         custo_hora_sugerido, entregaveis_padrao, rodadas_revisao_padrao, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    );
    const emLote = sqlite.transaction((servicos: ReturnType<typeof servicosIniciais>) => {
      for (const s of servicos) {
        inserir.run(
          s.id,
          s.nome,
          s.categoria,
          s.descricao,
          s.horasEstimadasPadrao,
          s.custoHoraSugerido,
          JSON.stringify(s.entregaveisPadrao),
          s.rodadasRevisaoPadrao,
        );
      }
    });
    emLote(servicosIniciais(novoId));
  }
}

// Em dev o Next recarrega os módulos a cada edição; guardar a conexão no
// globalThis evita abrir um handle novo do SQLite a cada hot reload.
const global_ = globalThis as unknown as { __atalhoDb?: Conexao };

type Conexao = ReturnType<typeof abrir>;

/**
 * Conexão preguiçosa: importar este módulo não abre o banco. Isso mantém o
 * `next build` — que carrega as rotas só para inspecioná-las — longe do
 * arquivo do SQLite.
 */
function conectar(): Conexao {
  if (!global_.__atalhoDb) global_.__atalhoDb = abrir();
  return global_.__atalhoDb;
}

type DB = Conexao['db'];

export const db = new Proxy({} as DB, {
  get(_alvo, propriedade) {
    const real = conectar().db as unknown as Record<string | symbol, unknown>;
    const valor = real[propriedade];
    return typeof valor === 'function' ? valor.bind(real) : valor;
  },
});

export function conexaoSqlite() {
  return conectar().sqlite;
}

export { schema };
