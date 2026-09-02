'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Campo, Checkbox, Input, Select, Textarea } from '@/components/ui/field';
import { InputMoeda, InputNumero, InputPercentual } from '@/components/ui/inputs';
import { Card, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Valor } from '@/components/valor';
import { removerLogoAction, salvarConfigAction, salvarLogoAction } from '@/app/actions';
import { calcularCustoHoraFixo } from '@/lib/pricing';
import { formatarMoeda } from '@/lib/money';
import { MOEDAS, type ConfigEstudio, type ItemCustoFixo } from '@/lib/types';
import { novoId } from '@/lib/utils';

export function FormularioConfig({ inicial }: { inicial: ConfigEstudio }) {
  const [config, setConfig] = React.useState<ConfigEstudio>(inicial);
  const [salvando, setSalvando] = React.useState(false);
  const [mensagem, setMensagem] = React.useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  function set<K extends keyof ConfigEstudio>(campo: K, valor: ConfigEstudio[K]) {
    setConfig((c) => ({ ...c, [campo]: valor }));
    setMensagem(null);
  }

  /** Os itens lançados são a fonte da verdade do total de custos fixos. */
  function setItens(itens: ItemCustoFixo[]) {
    setConfig((c) => ({
      ...c,
      custosFixosDetalhe: itens,
      custosFixosMensais: itens.reduce((acc, i) => acc + i.valor, 0),
    }));
  }

  const custoHoraFixo = calcularCustoHoraFixo(config.custosFixosMensais, config.horasProdutivasMes);
  const somaCargas = config.margemPadrao + config.aliquotaImposto + config.taxaPagamento;
  const divisor = 1 - somaCargas;

  async function salvar() {
    setSalvando(true);
    const r = await salvarConfigAction(config);
    setSalvando(false);
    setMensagem(r.ok ? { tipo: 'ok', texto: 'Configurações salvas.' } : { tipo: 'erro', texto: r.erro ?? 'Erro' });
  }

  async function enviarLogo(arquivo: File) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result));
      leitor.onerror = () => reject(new Error('Falha ao ler o arquivo'));
      leitor.readAsDataURL(arquivo);
    });
    const r = await salvarLogoAction(arquivo.name, base64);
    if (r.ok && r.dados) {
      set('logoPath', r.dados);
      setMensagem({ tipo: 'ok', texto: 'Logo atualizado.' });
    } else {
      setMensagem({ tipo: 'erro', texto: r.erro ?? 'Erro ao salvar o logo' });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Secao titulo="Identificação">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Nome do estúdio">
              <Input value={config.nome} onChange={(e) => set('nome', e.target.value)} />
            </Campo>
            <Campo label="CNPJ ou CPF">
              <Input value={config.cnpjOuCpf} onChange={(e) => set('cnpjOuCpf', e.target.value)} />
            </Campo>
            <Campo label="E-mail">
              <Input value={config.email} onChange={(e) => set('email', e.target.value)} />
            </Campo>
            <Campo label="Telefone">
              <Input value={config.telefone} onChange={(e) => set('telefone', e.target.value)} />
            </Campo>
            <Campo label="Site">
              <Input value={config.site} onChange={(e) => set('site', e.target.value)} />
            </Campo>
            <Campo label="Moeda padrão">
              <Select value={config.moedaPadrao} onChange={(e) => set('moedaPadrao', e.target.value as ConfigEstudio['moedaPadrao'])}>
                {MOEDAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo label="Endereço" className="sm:col-span-2">
              <Input value={config.endereco} onChange={(e) => set('endereco', e.target.value)} />
            </Campo>
            <Campo
              label="Logo"
              dica="PNG, JPG ou WEBP até 2 MB. Guardado no próprio banco e usado na capa do PDF."
              className="sm:col-span-2"
            >
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="campo file:mr-3 file:rounded file:border-0 file:bg-tinta/5 file:px-2 file:py-1 file:text-xs"
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0];
                    if (arquivo) void enviarLogo(arquivo);
                  }}
                />
                {config.logoPath ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={config.logoPath} alt="Logo do estúdio" className="h-10 w-auto" />
                    <Button
                      variant="fantasma"
                      size="sm"
                      onClick={async () => {
                        await removerLogoAction();
                        set('logoPath', null);
                      }}
                    >
                      Remover
                    </Button>
                  </>
                ) : null}
              </div>
            </Campo>
          </div>
        </Secao>

        <Secao
          titulo="Custos fixos mensais"
          descricao="Tudo que o estúdio paga todo mês, exista projeto ou não. O total alimenta o custo-hora."
        >
          <div className="space-y-2">
            {config.custosFixosDetalhe.map((item, i) => (
              <div key={item.id} className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  placeholder="Ex.: coworking"
                  value={item.nome}
                  onChange={(e) => {
                    const itens = [...config.custosFixosDetalhe];
                    itens[i] = { ...item, nome: e.target.value };
                    setItens(itens);
                  }}
                />
                <div className="w-40">
                  <InputMoeda
                    valor={item.valor}
                    onValor={(v) => {
                      const itens = [...config.custosFixosDetalhe];
                      itens[i] = { ...item, valor: v };
                      setItens(itens);
                    }}
                  />
                </div>
                <label className="flex w-32 shrink-0 items-center gap-2 text-xs text-sutil">
                  <Checkbox
                    checked={item.ehSoftware}
                    onChange={(e) => {
                      const itens = [...config.custosFixosDetalhe];
                      itens[i] = { ...item, ehSoftware: e.target.checked };
                      setItens(itens);
                    }}
                  />
                  é software
                </label>
                <Button
                  variant="fantasma"
                  size="icone"
                  aria-label={`Remover ${item.nome}`}
                  onClick={() => setItens(config.custosFixosDetalhe.filter((x) => x.id !== item.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="fantasma"
              size="sm"
              onClick={() =>
                setItens([...config.custosFixosDetalhe, { id: novoId(), nome: '', valor: 0, ehSoftware: false }])
              }
            >
              <Plus className="h-4 w-4" /> Adicionar custo fixo
            </Button>
            <div className="flex items-center justify-between border-t border-linha pt-3 text-sm">
              <span className="text-sutil">Total mensal</span>
              <Valor centavos={config.custosFixosMensais} moeda={config.moedaPadrao} />
            </div>
          </div>
        </Secao>

        <Secao titulo="Parâmetros de precificação">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              label="Horas produtivas por mês"
              dica="Horas realmente faturáveis — não 160. Reunião, proposta e administração não entram."
            >
              <InputNumero valor={config.horasProdutivasMes} onValor={(v) => set('horasProdutivasMes', Math.round(v))} min={1} />
            </Campo>
            <Campo label="Horas por dia útil" dica="Base do alerta de sobrecarga no cronograma.">
              <InputNumero valor={config.horasPorDiaUtil} onValor={(v) => set('horasPorDiaUtil', Math.round(v))} min={1} />
            </Campo>
            <Campo label="Margem padrão">
              <InputPercentual valor={config.margemPadrao} onValor={(v) => set('margemPadrao', v)} max={80} />
            </Campo>
            <Campo label="Margem mínima aceitável" dica="Abaixo disso o app alerta em vermelho.">
              <InputPercentual valor={config.margemMinimaAceitavel} onValor={(v) => set('margemMinimaAceitavel', v)} max={80} />
            </Campo>
            <Campo label="Alíquota efetiva de imposto" dica="MEI, Simples Anexo III/V, PJ — a efetiva, não a nominal.">
              <InputPercentual valor={config.aliquotaImposto} onValor={(v) => set('aliquotaImposto', v)} max={40} />
            </Campo>
            <Campo label="Taxa de pagamento" dica="Adquirente, plataforma ou câmbio.">
              <InputPercentual valor={config.taxaPagamento} onValor={(v) => set('taxaPagamento', v)} max={30} />
            </Campo>
            <Campo label="Contingência padrão">
              <InputPercentual valor={config.contingenciaPadrao} onValor={(v) => set('contingenciaPadrao', v)} max={50} />
            </Campo>
            <Campo label="Validade da proposta (dias)">
              <InputNumero valor={config.validadePropostaDias} onValor={(v) => set('validadePropostaDias', Math.round(v))} min={1} />
            </Campo>
          </div>
          {divisor <= 0.15 ? (
            <Alert nivel="critico" titulo="Divisor inviável" className="mt-4">
              Margem + imposto + taxa somam {(somaCargas * 100).toFixed(1)}% do preço de venda. Com um divisor de{' '}
              {divisor.toFixed(2)} nenhum orçamento consegue ser calculado.
            </Alert>
          ) : null}
        </Secao>

        <Secao titulo="Textos padrão" descricao="Herdados por todo orçamento novo — editáveis caso a caso.">
          <div className="space-y-4">
            <Campo label="Condições gerais">
              <Textarea
                rows={7}
                value={config.textoCondicoesPadrao}
                onChange={(e) => set('textoCondicoesPadrao', e.target.value)}
              />
            </Campo>
            <Campo label="Direitos de uso e cessão">
              <Textarea
                rows={7}
                value={config.textoDireitosUsoPadrao}
                onChange={(e) => set('textoDireitosUsoPadrao', e.target.value)}
              />
            </Campo>
          </div>
        </Secao>

        <div className="flex items-center gap-3">
          <Button variant="primario" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar configurações'}
          </Button>
          {mensagem ? (
            <span className={mensagem.tipo === 'ok' ? 'text-sm text-positivo' : 'text-sm text-critico'}>
              {mensagem.texto}
            </span>
          ) : null}
        </div>
      </div>

      <aside className="lg:sticky lg:top-20 lg:h-fit">
        <Card className="border-acento/30">
          <CardContent className="space-y-4">
            <div>
              <p className="rotulo">Custo-hora do estúdio</p>
              <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-acento">
                {formatarMoeda(custoHoraFixo, config.moedaPadrao)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-sutil">
                Cada hora de projeto precisa cobrir no mínimo este valor só para o estúdio existir.
              </p>
            </div>
            <div className="divisor pt-3 text-xs text-sutil">
              <p className="font-mono">
                {formatarMoeda(config.custosFixosMensais, config.moedaPadrao)} ÷ {config.horasProdutivasMes}h
              </p>
            </div>
            <div className="divisor space-y-1.5 pt-3">
              <p className="rotulo">Custos lançados</p>
              {config.custosFixosDetalhe.length === 0 ? (
                <p className="text-xs text-sutil">Nenhum custo fixo lançado ainda.</p>
              ) : (
                config.custosFixosDetalhe.map((item) => (
                  <div key={item.id} className="flex justify-between gap-2 text-xs">
                    <span className="truncate text-sutil">{item.nome || '—'}</span>
                    <Valor centavos={item.valor} moeda={config.moedaPadrao} className="text-xs" />
                  </div>
                ))
              )}
            </div>
            <div className="divisor pt-3">
              <p className="rotulo">Divisor de gross-up</p>
              <p className="mt-1 font-mono text-sm tabular-nums">{divisor.toFixed(4)}</p>
              <p className="mt-1 text-xs text-sutil">
                1 − (margem + imposto + taxa). Quanto menor, mais o preço sobe.
              </p>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="cartao p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        {descricao ? <p className="mt-1 text-xs text-sutil">{descricao}</p> : null}
      </div>
      {children}
    </section>
  );
}
