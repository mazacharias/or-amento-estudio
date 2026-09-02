'use server';

/**
 * Server actions — a única porta de escrita do app. Tudo passa por zod antes
 * de tocar o banco.
 */

import { revalidatePath } from 'next/cache';
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

/**
 * O logo é guardado como data URI no próprio banco, não como arquivo.
 * No app empacotado a pasta de instalação não é gravável, e assim o logo
 * viaja junto do backup do banco — um arquivo a menos para perder.
 */
export async function salvarLogoAction(nomeArquivo: string, dataUri: string): Promise<Resposta<string>> {
  try {
    const tipo = /^data:(image\/(png|jpeg|webp));base64,/.exec(dataUri)?.[1];
    if (!tipo) {
      return { ok: false, erro: 'Use um PNG, JPG ou WEBP. SVG não é suportado no PDF da proposta.' };
    }
    const bytes = Math.ceil(((dataUri.length - dataUri.indexOf(',') - 1) * 3) / 4);
    if (bytes > 2_000_000) {
      return { ok: false, erro: `Logo muito pesado (${Math.round(bytes / 1024)} KB). O limite é 2 MB.` };
    }
    salvarConfig({ ...obterConfig(), logoPath: dataUri });
    revalidatePath('/config');
    return { ok: true, dados: dataUri };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

export async function removerLogoAction(): Promise<Resposta> {
  salvarConfig({ ...obterConfig(), logoPath: null });
  revalidatePath('/config');
  return { ok: true };
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
