'use client';

import * as React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Campo, Checkbox, Input, Select, Textarea } from '@/components/ui/field';
import { InputMoeda, InputNumero } from '@/components/ui/inputs';
import { Badge } from '@/components/ui/badge';
import { Table, Td, Th, Tr, Vazio } from '@/components/ui/table';
import { removerServicoAction, salvarServicoAction } from '@/app/actions';
import { CATEGORIAS_SERVICO, ROTULO_CATEGORIA, type CategoriaServico, type Servico } from '@/lib/types';
import { novoId } from '@/lib/utils';
import { ListaEditavel } from '@/components/lista-editavel';
import { Valor } from '@/components/valor';

function servicoVazio(): Servico {
  return {
    id: novoId(),
    nome: '',
    categoria: 'branding',
    descricao: '',
    horasEstimadasPadrao: 0,
    custoHoraSugerido: null,
    entregaveisPadrao: [],
    rodadasRevisaoPadrao: 2,
    ativo: true,
  };
}

export function CatalogoServicos({ inicial }: { inicial: Servico[] }) {
  const [servicos, setServicos] = React.useState(inicial);
  const [busca, setBusca] = React.useState('');
  const [categoria, setCategoria] = React.useState<CategoriaServico | 'todas'>('todas');
  const [editando, setEditando] = React.useState<Servico | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);

  const filtrados = servicos.filter((s) => {
    const casaBusca = `${s.nome} ${s.descricao}`.toLowerCase().includes(busca.toLowerCase());
    const casaCategoria = categoria === 'todas' || s.categoria === categoria;
    return casaBusca && casaCategoria;
  });

  async function salvar(servico: Servico) {
    const r = await salvarServicoAction(servico);
    if (!r.ok) {
      setErro(r.erro ?? 'Erro ao salvar');
      return;
    }
    setServicos((lista) => {
      const existe = lista.some((s) => s.id === servico.id);
      const nova = existe ? lista.map((s) => (s.id === servico.id ? servico : s)) : [...lista, servico];
      return nova.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    });
    setEditando(null);
    setErro(null);
  }

  async function remover(id: string) {
    await removerServicoAction(id);
    setServicos((lista) => lista.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar serviço…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaServico | 'todas')}
          className="max-w-[180px]"
        >
          <option value="todas">Todas as categorias</option>
          {CATEGORIAS_SERVICO.map((c) => (
            <option key={c} value={c}>
              {ROTULO_CATEGORIA[c]}
            </option>
          ))}
        </Select>
        <span className="text-xs text-sutil">
          {filtrados.length} de {servicos.length}
        </span>
        <Button variant="primario" className="ml-auto" onClick={() => setEditando(servicoVazio())}>
          <Plus className="h-4 w-4" /> Novo serviço
        </Button>
      </div>

      {erro ? <p className="text-sm text-critico">{erro}</p> : null}

      {editando ? (
        <EditorServico
          servico={editando}
          onCancelar={() => setEditando(null)}
          onSalvar={salvar}
        />
      ) : null}

      <div className="cartao">
        <Table>
          <thead>
            <tr>
              <Th>Serviço</Th>
              <Th>Categoria</Th>
              <Th className="text-right">Horas padrão</Th>
              <Th className="text-right">Custo-hora sugerido</Th>
              <Th className="text-right">Revisões</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <Vazio colSpan={7}>Nenhum serviço encontrado.</Vazio>
            ) : (
              filtrados.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <div className="font-medium">{s.nome}</div>
                    {s.descricao ? <div className="text-xs text-sutil">{s.descricao}</div> : null}
                  </Td>
                  <Td>
                    <Badge>{ROTULO_CATEGORIA[s.categoria]}</Badge>
                  </Td>
                  <Td className="num">{s.horasEstimadasPadrao}h</Td>
                  <Td className="text-right">
                    {s.custoHoraSugerido ? <Valor centavos={s.custoHoraSugerido} /> : <span className="text-sutil">—</span>}
                  </Td>
                  <Td className="num">{s.rodadasRevisaoPadrao}</Td>
                  <Td>
                    {s.ativo ? <Badge tom="positivo">Ativo</Badge> : <Badge>Inativo</Badge>}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="fantasma" size="icone" aria-label="Editar" onClick={() => setEditando(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="fantasma"
                        size="icone"
                        aria-label="Remover"
                        onClick={() => void remover(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

function EditorServico({
  servico,
  onCancelar,
  onSalvar,
}: {
  servico: Servico;
  onCancelar: () => void;
  onSalvar: (s: Servico) => void | Promise<void>;
}) {
  const [rascunho, setRascunho] = React.useState(servico);

  function set<K extends keyof Servico>(campo: K, valor: Servico[K]) {
    setRascunho((s) => ({ ...s, [campo]: valor }));
  }

  return (
    <div className="cartao space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Nome">
          <Input value={rascunho.nome} onChange={(e) => set('nome', e.target.value)} autoFocus />
        </Campo>
        <Campo label="Categoria">
          <Select
            value={rascunho.categoria}
            onChange={(e) => set('categoria', e.target.value as CategoriaServico)}
          >
            {CATEGORIAS_SERVICO.map((c) => (
              <option key={c} value={c}>
                {ROTULO_CATEGORIA[c]}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Descrição" className="sm:col-span-2">
          <Textarea rows={2} value={rascunho.descricao} onChange={(e) => set('descricao', e.target.value)} />
        </Campo>
        <Campo label="Horas estimadas padrão">
          <InputNumero valor={rascunho.horasEstimadasPadrao} onValor={(v) => set('horasEstimadasPadrao', v)} />
        </Campo>
        <Campo label="Rodadas de revisão padrão">
          <InputNumero
            valor={rascunho.rodadasRevisaoPadrao}
            onValor={(v) => set('rodadasRevisaoPadrao', Math.round(v))}
          />
        </Campo>
        <Campo label="Custo-hora sugerido" dica="Deixe zerado para usar o custo-hora do estúdio.">
          <InputMoeda
            valor={rascunho.custoHoraSugerido ?? 0}
            onValor={(v) => set('custoHoraSugerido', v > 0 ? v : null)}
          />
        </Campo>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={rascunho.ativo} onChange={(e) => set('ativo', e.target.checked)} />
            Ativo no catálogo
          </label>
        </div>
        <div className="sm:col-span-2">
          <ListaEditavel
            label="Entregáveis padrão"
            itens={rascunho.entregaveisPadrao}
            onItens={(itens) => set('entregaveisPadrao', itens)}
            placeholder="Ex.: Manual em PDF"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="primario" onClick={() => void onSalvar(rascunho)}>
          Salvar serviço
        </Button>
        <Button variant="fantasma" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
