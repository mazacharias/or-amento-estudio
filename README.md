# Atalho — Gerador de Orçamentos e Cronogramas

App local (uso interno, 1–3 pessoas) para precificar projetos de design a
partir de **custos reais**, gerar a proposta em PDF e montar o cronograma de
entrega.

O princípio que orienta o app: **impedir que a Atalho feche projeto no
prejuízo**. Toda tela de preço mostra a margem real resultante e alerta quando
ela cai abaixo do piso configurado.

## Rodar

```bash
npm install
npm run dev        # http://localhost:3000
```

Ou em produção local:

```bash
npm run build && npm start
```

O banco SQLite é criado em `./data/atalho.db` na primeira execução, já com a
migration aplicada e semeado com o catálogo de 14 serviços, os custos fixos de
exemplo e os textos padrão de condições e direitos de uso. Não há autenticação,
multi-tenant, deploy nem qualquer chamada de rede externa — o app funciona
offline.

```bash
npm test           # 71 testes (cálculo, datas, cronograma, PDF)
npm run typecheck
npm run db:push    # opcional: aplicar o schema Drizzle via drizzle-kit
```

## Como o preço é formado

```
custoHoraFixo  = custosFixosMensais / horasProdutivasMes
subtotalCustos = horas + equipamentos + software + terceiros + despesas
baseComRisco   = subtotalCustos × (1 + contingência)
divisor        = 1 − (margem + imposto + taxa)
precoFinal     = baseComRisco / divisor
```

Três decisões que o app trata como não negociáveis:

- **Gross-up, não markup.** Margem, imposto e taxa incidem sobre o preço de
  venda, num divisor só. `custo × 1,25` daria 20% de margem, não 25%.
- **Equipamento entra depreciado.** `valorCompra × (meses / vidaÚtil) ×
  %alocado`, com escape explícito para compra dedicada ao projeto.
- **Software recorrente já pago no custo fixo não soma de novo.** Ele aparece
  no passo 3 marcado como informativo, justamente para evitar a dupla cobrança.

Se `divisor ≤ 0,15`, o cálculo é bloqueado com a explicação — a soma de margem,
imposto e taxa inviabiliza qualquer preço.

## Dinheiro nunca é float

Todo valor monetário é **inteiro em centavos** na borda (banco, tipos,
formulários). Dentro do motor de cálculo, `lib/money.ts` converte para
micro-centavos em `bigint` (1 centavo = 1.000.000 µ¢) e as taxas viram inteiros
em micro (1.000.000 = 100%), então divisões como `2/36` meses de depreciação ou
o gross-up pelo divisor são exatas e o arredondamento acontece uma vez só, na
saída. Percentuais continuam decimais (`0.25` = 25%) na fronteira, como no spec.

## Mapa do código

| Caminho | O que é |
|---|---|
| `lib/pricing.ts` | Motor de cálculo puro: custo-hora, custos, contingência, gross-up, desconto, margem real, modo reverso. Sem React, sem banco. |
| `lib/money.ts` | Centavos, micro-centavos em bigint, formatação e parsing. |
| `lib/dates.ts` | Dias úteis, feriados nacionais (Páscoa por Meeus/Butcher → Carnaval, Sexta-feira Santa, Corpus Christi) e feriados customizados. |
| `lib/schedule.ts` | Ordenação finish-to-start com detecção de ciclo, datas das fases, colunas do Gantt, fluxo de caixa e validações cruzadas. |
| `lib/brand.ts` | Tokens da marca — cores, fontes, raio. Consumidos pela UI (via `tailwind.config.ts`) e pelo PDF. |
| `lib/pdf/` | `Proposta.tsx` (cliente) e `ResumoInterno.tsx` (uso interno), mais a montagem de dados. |
| `lib/db/` | Schema Drizzle, conexão preguiçosa, semente e camada de consultas. |
| `lib/store/wizard.ts` | Estado do wizard (Zustand + persist no localStorage). |
| `app/` | Rotas: dashboard, `/config`, `/servicos`, `/clientes`, `/orcamentos`, wizard, cronograma e a rota de PDF. |

## Os dois PDFs

- **Proposta do cliente** (`?tipo=cliente`): capa, apresentação, escopo, fora do
  escopo, investimento, pagamento, prazo, revisões, direitos de uso, condições e
  aceite. **Nunca** contém custo interno, custo-hora, margem, contingência ou
  alíquota — há teste automatizado lendo o PDF gerado para garantir isso.
- **Resumo interno** (`?tipo=interno`): o oposto — custos linha a linha,
  margem, valor-hora efetivo, breakdown de terceiros e fluxo de caixa, tarjado
  como uso interno em todas as páginas.

Ambos saem por `/api/orcamentos/[id]/pdf`, com o nome
`ATL-2026-014_Cliente_v1.pdf`.

## Decisões que fogem da letra do spec

1. **`margemReal` com 20% de desconto no cenário §3.8 dá ~8,5%, não negativa.**
   Aplicando a fórmula do próprio spec, o desconto de 20% derruba a margem de
   25% para 8,5% — abaixo do piso de 12%, então dispara o alerta laranja, mas o
   lucro ainda é positivo. A margem só vira negativa a partir de ~27,5% de
   desconto. Os testes cobrem os dois casos: 20% → alerta de piso; 30% → alerta
   crítico de "pagando para trabalhar". A fórmula não foi alterada.
2. **Feriados móveis são calculados, não tabelados.** O spec pede uma tabela
   hard-coded do ano corrente e do seguinte; calcular a Páscoa (Meeus/Butcher) e
   derivar Carnaval, Sexta-feira Santa e Corpus Christi dela dá o mesmo
   resultado e não expira. Os fixos nacionais seguem tabelados.
3. **Componentes no estilo shadcn/ui, escritos à mão.** Mesma base (Tailwind +
   `cva` + `tailwind-merge`), sem a dependência de Radix, para manter o app
   inteiramente offline e o bundle pequeno. Ficam em `components/ui/`.
4. **Tipografia do PDF em Helvetica.** Registrar Inter exigiria baixar o arquivo
   da fonte em build ou runtime; a UI usa Inter quando disponível no sistema, com
   fallback, e o PDF usa uma família embutida no renderer.
5. **Listas do orçamento em colunas JSON.** O orçamento é sempre lido e escrito
   inteiro; os campos que a lista e o dashboard filtram ou somam (`preco_final`,
   `total_horas`, `margem_real`, `valor_hora_efetivo`) ficam denormalizados em
   colunas próprias no salvamento.

## Fora de escopo desta versão

Assinatura eletrônica, envio de e-mail, nota fiscal, timesheet de horas reais vs.
orçadas, conversão automática de câmbio, multiusuário e deploy em servidor **não
foram implementados**. O código deixa o caminho aberto sem gambiarra:

- `Moeda` já é um tipo de primeira classe no orçamento e na formatação — falta
  só a taxa de conversão.
- `status` do orçamento tem `enviado`/`enviadoEm` separados de `aprovado`, então
  envio por e-mail e assinatura entram como transições novas, não como remendo.
- O motor de cálculo é puro e sem I/O: um timesheet compararia horas reais com
  `LinhaHoras.horas` sem tocar no cálculo.
- Não há estado global de sessão; o dia em que houver multiusuário, a chave
  entra nas tabelas sem reescrever as consultas.
