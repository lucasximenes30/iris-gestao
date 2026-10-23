<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Iris Gestão — Documento de Contexto do Sistema para Agentes de IA

Este documento contém todo o contexto operacional, arquitetural, de negócio e de banco de dados do projeto **Iris Gestão**. Qualquer agente de IA ou desenvolvedor deve consultar estas diretrizes antes de planejar ou alterar código no repositório.

---

## 1. Visão Geral do Produto

**Iris Gestão** é um sistema SaaS de gestão operacional e financeira simplificada para profissionais e empresas do setor de eventos, festas, decoração, buffets e locação.

### Proposta de Valor e Regras de Negócio Centrais
1. **Pedidos e Eventos (`orders`)**:
   - Cada evento é cadastrado como um pedido com dados do cliente (nome obrigatório, telefone/WhatsApp, e-mail), título do evento, data do evento, horário, local, observações, valor total negociado e custo estimado.
   - Status do pedido: `draft` (Rascunho), `scheduled` (Agendado), `completed` (Concluído), `cancelled` (Cancelado).
   - Um pedido em rascunho (`draft`) pode ser criado sem data de evento e sem valor total definido para posterior preenchimento.
2. **Pagamentos Parciais e Totais (`payments`)**:
   - Eventos frequentemente envolvem sinal (entrada) e parcelas posteriores.
   - Cada pagamento registrado é vinculado a um `order_id` e possui: valor, data, forma de pagamento (`pix`, `credit_card`, `debit_card`, `cash`, `bank_transfer`) e descrição (ex: "Sinal 50%").
   - O status de pagamento do pedido (`payment_status`) é **recalculado automaticamente via trigger no Postgres**:
     - `unpaid`: R$ 0,00 recebido
     - `partial`: Recebido > 0 e < total
     - `paid`: Recebido = total
     - `overpaid`: Recebido > total
3. **Despesas Operacionais (`expenses`)**:
   - Gastos do negócio com fornecedores, insumos, transporte, alimentação ou custos fixos.
   - Podem ser avulsas (gerais) ou vinculadas a um pedido específico (`order_id` opcional).
4. **Fluxo de Caixa em Tempo Real (`cash_movements`)**:
   - Consolida todas as entradas e saídas.
   - **Sincronização Automática via Triggers**:
     - Quando um `payment` é inserido, atualizado ou excluído, um trigger no Postgres gera/atualiza/remove automaticamente uma movimentação do tipo `income` (`source = 'payment'`).
     - Quando uma `expense` é inserida, atualizada ou excluída, um trigger gera/atualiza/remove automaticamente uma movimentação do tipo `expense` (`source = 'expense'`).
     - O sistema também suporta lançamentos manuais no caixa (`source = 'manual'`).

---

## 2. Stack Tecnológica & Convenções Críticas

| Tecnologia | Versão | Notas Importantes |
|---|---|---|
| **Next.js** | **16.2.4** (App Router, Turbopack) | **Atenção:** Em Next.js 16, a proteção de rotas usa `proxy.ts` com a função exportada `proxy(request: NextRequest)`. `middleware.ts` é depreciado. |
| **React** | **19.2.4** | Suporte total a React Server Components (RSC) e Server Actions. |
| **Tailwind CSS** | **v4** | Utiliza `@import "tailwindcss";` no `globals.css` via `@tailwindcss/postcss`. |
| **Banco / Auth** | **Supabase (PostgreSQL 15+)** | `@supabase/ssr` e `@supabase/supabase-js`. RLS ativado em 100% das tabelas. |
| **Tipagem** | **TypeScript 5 (strict)** | `npx tsc --noEmit` deve passar sem nenhum erro. |

### Regras Críticas do Next.js 16 nesta aplicação
- **Cookies Assíncronos:** `const cookieStore = await cookies()` de `next/headers`.
- **Parâmetros Assíncronos em Páginas:** `params` e `searchParams` em Server Components são Promises:
  ```tsx
  export default async function Page({
    params,
    searchParams
  }: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ [key: string]: string | undefined }>
  }) {
    const { id } = await params
    const query = await searchParams
  }
  ```
- **Proxy de Sessão:** O arquivo `proxy.ts` na raiz chama `updateSession(request)` de `@/utils/supabase/middleware` para atualizar o token do Supabase nos cookies e redirecionar usuários não autenticados.

---

## 3. Modelo de Banco de Dados (Supabase / Postgres)

Todas as tabelas residem no schema `public` e possuem RLS obrigatório baseado no usuário autenticado (`auth.uid() = user_id`).

### Tabelas Principais

#### 1. `public.orders`
- `id` (uuid, PK, default gen_random_uuid())
- `user_id` (uuid, FK `auth.users(id)` ON DELETE CASCADE)
- `client_name` (text, not null)
- `client_phone` (text, nullable)
- `client_email` (text, nullable)
- `title` (text, nullable)
- `event_date` (date, nullable - rascunhos podem ter data nula)
- `event_time` (time, nullable)
- `event_location` (text, nullable)
- `total_amount` (numeric(12,2), not null default 0, check >= 0)
- `estimated_cost` (numeric(12,2), nullable, check >= 0)
- `status` (text, default 'scheduled', check in `'draft'`, `'scheduled'`, `'completed'`, `'cancelled'`)
- `payment_status` (text, default 'unpaid', check in `'unpaid'`, `'partial'`, `'paid'`, `'overpaid'`)
- `notes` (text, nullable)
- `created_at`, `updated_at` (timestamptz)

#### 2. `public.payments`
- `id` (uuid, PK, default gen_random_uuid())
- `user_id` (uuid, FK `auth.users(id)` ON DELETE CASCADE)
- `order_id` (uuid, FK `public.orders(id)` ON DELETE CASCADE)
- `amount` (numeric(12,2), not null, check > 0)
- `payment_date` (date, not null default current_date)
- `payment_method` (text, not null default 'pix' - valores: `'pix'`, `'credit_card'`, `'debit_card'`, `'cash'`, `'bank_transfer'`)
- `description` (text, not null default 'Pagamento do pedido')
- `notes` (text, nullable)
- `created_at`, `updated_at` (timestamptz)

#### 3. `public.expenses`
- `id` (uuid, PK, default gen_random_uuid())
- `user_id` (uuid, FK `auth.users(id)` ON DELETE CASCADE)
- `order_id` (uuid, FK `public.orders(id)` ON DELETE SET NULL, nullable)
- `description` (text, not null)
- `amount` (numeric(12,2), not null, check > 0)
- `expense_date` (date, not null default current_date)
- `category` (text, not null default 'outros')
- `payment_method` (text, not null default 'pix')
- `notes` (text, nullable)
- `created_at`, `updated_at` (timestamptz)

#### 4. `public.cash_movements`
- `id` (uuid, PK, default gen_random_uuid())
- `user_id` (uuid, FK `auth.users(id)` ON DELETE CASCADE)
- `order_id` (uuid, FK `public.orders(id)` ON DELETE SET NULL, nullable)
- `type` (text, not null, check in `'income'`, `'expense'`)
- `source` (text, not null, check in `'payment'`, `'expense'`, `'manual'`)
- `source_id` (uuid, nullable)
- `description` (text, not null)
- `amount` (numeric(12,2), not null, check > 0)
- `movement_date` (date, not null default current_date)
- `payment_method` (text, nullable)
- `created_at`, `updated_at` (timestamptz)
- `UNIQUE (source, source_id)`

### Funções e Triggers no Postgres
- `set_updated_at()`: Atualiza `updated_at` automaticamente antes de cada UPDATE.
- `recalculate_order_payment_status(target_order_id)`: Recalcula o status (`unpaid`, `partial`, `paid`, `overpaid`) somando pagamentos em `public.payments`.
- `sync_payment_cash_movement()`: Trigger `AFTER INSERT OR UPDATE OR DELETE ON public.payments` que sincroniza a linha correspondente em `cash_movements` e dispara `recalculate_order_payment_status`.
- `sync_expense_cash_movement()`: Trigger `AFTER INSERT OR UPDATE OR DELETE ON public.expenses` que sincroniza a linha em `cash_movements`.

---

## 4. Estrutura de Diretórios

```
iris-gestao/
├── app/
│   ├── actions/
│   │   └── auth.ts               # Server Actions de autenticação (signIn, signUp, signOut)
│   ├── auth/
│   │   └── callback/route.ts     # Route handler para confirmação de email / OAuth
│   ├── dashboard/
│   │   ├── caixa/
│   │   │   └── page.tsx          # Visão de Fluxo de Caixa (entradas, saídas, saldo, extrato)
│   │   ├── despesas/
│   │   │   └── page.tsx          # Gestão de Despesas (atualmente placeholder - Etapa 2)
│   │   ├── layout.tsx            # Layout com proteção de rota e Sidebar/MobileHeader
│   │   ├── page.tsx              # Dashboard principal com métricas do mês e atalhos
│   │   ├── pedidos/
│   │   │   ├── [id]/
│   │   │   │   ├── delete-button.tsx
│   │   │   │   ├── editar/
│   │   │   │   │   ├── edit-form.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── page.tsx      # Detalhes do pedido com financeiro e PaymentsManager
│   │   │   │   └── payments-manager.tsx # Modal de criação, edição e exclusão de pagamentos
│   │   │   ├── actions.ts        # Server Actions de Pedidos e Pagamentos
│   │   │   ├── novo/
│   │   │   │   └── page.tsx      # Cadastro de novo pedido
│   │   │   └── page.tsx          # Listagem com filtros por status e busca
│   │   └── relatorios/
│   │       └── page.tsx          # Relatórios e gráficos (atualmente placeholder - Etapa 3)
│   ├── login/
│   │   └── page.tsx              # Tela de Login
│   ├── register/
│   │   └── page.tsx              # Tela de Cadastro
│   ├── globals.css               # Estilos globais e Tailwind v4
│   ├── layout.tsx                # Root layout HTML/Body
│   └── page.tsx                  # Redirecionamento raiz (/ -> /dashboard ou /login)
├── components/
│   └── sidebar.tsx               # Sidebar de navegação Desktop e Mobile Drawer
├── lib/
│   ├── constants.ts              # Constantes de status, métodos de pagamento e opções
│   ├── formatters.ts             # formatCurrency, formatDate, formatDateTime, parseCurrencyInput
│   └── db/                       # Camada de queries Supabase (Server Components / Actions)
│       ├── cash-movements.ts     # getCashMovements, createManualCashMovement, etc.
│       ├── expenses.ts           # getExpenses, createExpense, updateExpense, deleteExpense
│       ├── orders.ts             # getOrders, getOrderById, createOrder, updateOrder, deleteOrder
│       └── payments.ts           # getPaymentsByOrder, createPayment, updatePayment, deletePayment
├── proxy.ts                      # Proxy do Next.js 16 para checagem e refresh de sessão
├── supabase/
│   └── migrations/               # Migrações versionadas SQL do Supabase
└── utils/
    └── supabase/
        ├── client.ts             # Cliente Browser (@supabase/ssr createBrowserClient)
        ├── middleware.ts         # Helper de atualização de sessão para o proxy
        └── server.ts             # Cliente Server (@supabase/ssr createServerClient assíncrono)
```

---

## 5. Status Atual de Implementação: O Que Existe vs. O Que Falta

### ✅ Concluído e em Produção
1. **Autenticação**:
   - Login, Cadastro e Logout com Supabase Auth.
   - Proteção de rotas via `proxy.ts`.
2. **Pedidos (`/dashboard/pedidos`)**:
   - Listagem com filtros (texto, status do pedido, status de pagamento).
   - Criação de novo pedido (inclusive rascunho sem data).
   - Visualização completa de detalhes, cliente, evento e resumo financeiro.
   - Edição e exclusão de pedidos.
   - **Gestão de pagamentos integrada**: Adicionar, editar e remover pagamentos diretamente no detalhe do pedido.
3. **Fluxo de Caixa (`/dashboard/caixa`)**:
   - Cálculo e exibição de Entradas Totais, Saídas Totais e Saldo.
   - Listagem em ordem cronológica de todas as movimentações vindas de pagamentos e despesas sincronizadas automaticamente.
4. **Dashboard Home (`/dashboard`)**:
   - Indicadores de faturamento do mês atual, saídas, pedidos do mês e saldo.
   - Lista das últimas 5 movimentações de caixa e links de atalhos rápidos.

### ❌ O Que Falta (Gaps & Próximas Etapas no Roadmap)

1. **Módulo de Despesas (`/dashboard/despesas` - "Etapa 2")**:
   - **Status Atual**: A tela é apenas um card indicando "Em breve — Etapa 2".
   - **O que precisa ser feito**:
     - Criar `app/dashboard/despesas/actions.ts` com Server Actions (`createExpenseAction`, `updateExpenseAction`, `deleteExpenseAction`).
     - Criar interface para listagem de despesas com badges de categoria e filtros por período/mês.
     - Criar Modal ou Página para cadastro e edição de despesas (campos: descrição, valor, data, categoria: Fornecedores, Materiais, Transporte, Alimentação, Locação, Outros; forma de pagamento; vínculo opcional com pedido existente).
     - Integração com `lib/db/expenses.ts`.
2. **Módulo de Relatórios (`/dashboard/relatorios` - "Etapa 3")**:
   - **Status Atual**: A tela é um card indicando "Em breve — Etapa 3".
   - **O que precisa ser feito**:
     - Visão analítica de faturamento x despesas x lucro líquido mês a mês.
     - Gráficos ou barras de distribuição de custos por categoria.
     - Indicadores de conversão (pedidos agendados vs. concluídos vs. cancelados).
     - Ticket médio por evento.
     - Filtros de período (mês atual, últimos 3 meses, ano corrente).
3. **Módulo de Caixa - Lançamentos Manuais (`/dashboard/caixa`)**:
   - **Status Atual**: Lista movimentações automáticas, mas não possui interface para novos lançamentos manuais.
   - **O que precisa ser feito**:
     - Botão e Modal "Nova Movimentação Manual" (para registrar entradas manuais, aportes ou retiradas/pró-labore avulsos).
     - Server Actions usando `createManualCashMovement` e `deleteManualCashMovement` em `lib/db/cash-movements.ts`.
     - Filtros por mês/ano no extrato do caixa.
4. **Recibos e Documentos de Pedido**:
   - Emissão de recibo / comprovante de pagamento para envio ao cliente.
   - Visualização para impressão / PDF com dados do pedido e histórico de pagamentos.
5. **Calendário de Eventos**:
   - Visualização dos pedidos em formato de calendário/agenda para evitar choque de datas de eventos.

---

## 6. Diretrizes para Agentes de IA ao Escrever Código

1. **Preserve a Integridade do Banco**:
   - Nunca remova ou desative os triggers `sync_payment_cash_movement` e `sync_expense_cash_movement` — a integridade entre pagamentos, despesas e fluxo de caixa depende exclusivamente deles.
   - Não crie movimentações de caixa do tipo `source = 'payment'` ou `source = 'expense'` manualmente no frontend; elas são geradas automaticamente pelo banco quando o registro pai é criado.
2. **Segurança e RLS**:
   - Nunca use a chave `service_role` no código cliente ou server components comuns. Todas as consultas usam a sessão do usuário via cookies.
   - Sempre atribua `user_id: user.id` nas operações de insert e verifique o pertencimento ao usuário.
3. **Padrão de Server Actions**:
   - Use `'use server'` no topo dos arquivos de actions.
   - Use `revalidatePath('/dashboard/...')` após mutações para manter os dados atualizados sem recarregar toda a aplicação.
   - Trate erros retornando `{ error: string }` e capture em formulários com feedback amigável ao usuário.
4. **Formatação de Moeda e Datas**:
   - Use sempre as funções centralizadas em `@/lib/formatters`:
     - `formatCurrency(val)` (R$ 0,00)
     - `formatDate(str)` (DD/MM/AAAA)
     - `parseCurrencyInput(str)` (converte "1.500,00" ou inputs para número float)
5. **Design e UX**:
   - A paleta de cores principal é baseada em Indigo (`indigo-600`), Slate (`slate-50` a `slate-900`), com toques semânticos em Emerald (entradas/pago), Amber (parcial/pendências) e Red (despesas/cancelado).
   - Mantenha responsividade total (desktop com sidebar lateral fixa, mobile com header compacto e drawer retrátil).
