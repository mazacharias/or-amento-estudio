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
import {
  CUSTOS_FIXOS_SEMENTE,
  TEXTO_CONDICOES_PADRAO,
  TEXTO_DIREITOS_USO_PADRAO,
  servicosIniciais,
} from './seed-data';

const CAMINHO_BANCO = process.env.ATALHO_DB ?? path.join(process.cwd(), 'data', 'atalho.db');

function novoId(): string {
  return globalThis.crypto.randomUUID();
}

function abrir() {
  fs.mkdirSync(path.dirname(CAMINHO_BANCO), { recursive: true });
  const sqlite = new Database(CAMINHO_BANCO);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const migration = fs.readFileSync(
    path.join(process.cwd(), 'drizzle', '0000_init.sql'),
    'utf8',
  );
  sqlite.exec(migration);

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
const global_ = globalThis as unknown as { __atalhoDb?: ReturnType<typeof abrir> };
const conexao = global_.__atalhoDb ?? abrir();
if (process.env.NODE_ENV !== 'production') global_.__atalhoDb = conexao;

export const db = conexao.db;
export const sqlite = conexao.sqlite;
export { schema };
