'use server';

/**
 * Server actions — a única porta de escrita do app. Tudo passa por zod antes
 * de tocar o banco.
 */

import { revalidatePath } from 'next/cache';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  duplicarOrcamento,
  mudarStatus,
  novaVersaoOrcamento,
  obterConfig,
  orcamentoNovo,
  removerCliente,
  removerOrcamento,
  removerServico,
  salvarCliente,
  salvarConfig,
  salvarOrcamento,
  salvarServico,
} from '@/lib/db/queries';
import { clienteSchema, configSchema, orcamentoSchema, servicoSchema } from '@/lib/validation';
import type { Cliente, ConfigEstudio, Orcamento, Servico, StatusOrcamento } from '@/lib/types';

export interface Resposta<T = undefined> {
  ok: boolean;
  erro?: string;
  dados?: T;
}

function mensagemDeErro(e: unknown): string {
  if (e && typeof e === 'object' && 'issues' in e) {
    const issues = (e as { issues: Array<{ path: (string | number)[]; message: string }> }).issues;
    return issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  }
  return e instanceof Error ? e.message : 'Erro inesperado';
}

export async function salvarConfigAction(valores: ConfigEstudio): Promise<Resposta> {
  try {
    salvarConfig(configSchema.parse(valores) as ConfigEstudio);
    revalidatePath('/config');
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function salvarLogoAction(nomeArquivo: string, base64: string): Promise<Resposta<string>> {
  try {
    const extensao = path.extname(nomeArquivo).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(extensao)) {
      return { ok: false, erro: 'Formato de logo não suportado (use PNG, JPG, SVG ou WEBP).' };
    }
    const destino = path.join(process.cwd(), 'public', 'brand', `logo${extensao}`);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, Buffer.from(base64.split(',').pop() ?? '', 'base64'));
    const publico = `/brand/logo${extensao}`;
    salvarConfig({ ...obterConfig(), logoPath: publico });
    revalidatePath('/config');
    return { ok: true, dados: publico };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function salvarServicoAction(servico: Servico): Promise<Resposta<Servico>> {
  try {
    const dados = servicoSchema.parse(servico) as Servico;
    salvarServico(dados);
    revalidatePath('/servicos');
    return { ok: true, dados };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function removerServicoAction(id: string): Promise<Resposta> {
  removerServico(id);
  revalidatePath('/servicos');
  return { ok: true };
}

export async function salvarClienteAction(cliente: Cliente): Promise<Resposta<Cliente>> {
  try {
    const dados = clienteSchema.parse(cliente) as Cliente;
    salvarCliente(dados);
    revalidatePath('/clientes');
    return { ok: true, dados };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function removerClienteAction(id: string): Promise<Resposta> {
  const r = removerCliente(id);
  revalidatePath('/clientes');
  return r.ok ? { ok: true } : { ok: false, erro: r.motivo };
}

export async function novoOrcamentoAction(): Promise<Resposta<Orcamento>> {
  const orcamento = orcamentoNovo(obterConfig());
  return { ok: true, dados: orcamento };
}

export async function salvarOrcamentoAction(orcamento: Orcamento): Promise<Resposta<Orcamento>> {
  try {
    const dados = orcamentoSchema.parse(orcamento) as Orcamento;
    salvarOrcamento(dados);
    revalidatePath('/orcamentos');
    revalidatePath('/');
    return { ok: true, dados };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function mudarStatusAction(id: string, status: StatusOrcamento): Promise<Resposta> {
  mudarStatus(id, status);
  revalidatePath('/orcamentos');
  revalidatePath(`/orcamentos/${id}`);
  revalidatePath('/');
  return { ok: true };
}

export async function duplicarOrcamentoAction(id: string): Promise<Resposta<string>> {
  const copia = duplicarOrcamento(id);
  if (!copia) return { ok: false, erro: 'Orçamento não encontrado' };
  revalidatePath('/orcamentos');
  return { ok: true, dados: copia.id };
}

export async function novaVersaoAction(id: string): Promise<Resposta<string>> {
  const nova = novaVersaoOrcamento(id);
  if (!nova) return { ok: false, erro: 'Orçamento não encontrado' };
  revalidatePath('/orcamentos');
  return { ok: true, dados: nova.id };
}

export async function removerOrcamentoAction(id: string): Promise<Resposta> {
  removerOrcamento(id);
  revalidatePath('/orcamentos');
  revalidatePath('/');
  return { ok: true };
}
