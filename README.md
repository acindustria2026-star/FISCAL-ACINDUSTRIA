# Sistema Controle Fiscal — Reciclagem

Sistema profissional de gestão fiscal para empresa brasileira de reciclagem.

**Stack:** React 18 + Vite + TypeScript + Tailwind + Supabase + Vercel

🔗 **Acesso (produção):** preencha aqui após Fase 17 — ex: `https://controlefiscal.com.br`

## 👥 Para usuários da empresa

Veja o guia simples em [docs/COMO-ACESSAR.md](docs/COMO-ACESSAR.md): como entrar pela primeira vez, instalar como app no celular, trocar senha.

---

## 🛠 Para desenvolvedores

### Pré-requisitos
- Node.js 18+ (recomendado 20+)
- Conta Supabase com projeto criado
- `.env` configurado (copia de `.env.example`)
- Supabase CLI (apenas se for mexer em Edge Functions)

### Setup local

```bash
npm install
cp .env.example .env   # preenche com URL e anon key do Supabase
npm run dev
```

Abre http://localhost:5173.

### Aplicar SQL no Supabase

Em ordem, no **SQL Editor** do Supabase Dashboard, executa as migrações:

1. `supabase/migrations/001_schema_inicial.sql` — tabelas + RLS + policies
2. `supabase/migrations/002_helpers.sql` — `precisa_setup` + `setup_inicial_bootstrap`
3. `supabase/migrations/003_auditoria_triggers.sql` — auditoria automática
4. `supabase/migrations/004_dashboard_rpc.sql` — agregados do dashboard
5. `supabase/migrations/005_validar_saldo_pedido.sql` — trigger de validação de saldo
6. `supabase/migrations/006_relatorios_rpc.sql` — relatório de impureza por material

Confere em **Table Editor** que as 8 tabelas existem (empresas, perfis, clientes, materiais, pedidos, notas_fiscais, recebimentos, auditoria).

### Configurações no Supabase Dashboard

- **Authentication → Providers → Email:** ativado, **Confirm email = OFF**
- **Authentication → URL Configuration:** Site URL e Redirect URLs apontando pro ambiente (localhost em dev, Vercel em prod)
- **Database → Replication:** habilitar `notas_fiscais`, `recebimentos`, `pedidos` (necessário pro Realtime)

### Edge Function (convite de usuários)

```bash
supabase login
supabase link --project-ref <SEU_PROJECT_REF>
supabase functions deploy convidar_usuario --no-verify-jwt
```

> Após o deploy, configura a secret `SITE_URL` no Dashboard apontando pro domínio de produção (Vercel).

### Scripts

- `npm run dev` — dev server
- `npm run build` — build de produção
- `npm run preview` — preview do build (pra testar PWA)
- `npm run lint` — type-check
- `npm run pwa:icons` — regenera ícones PWA a partir de `public/logo.svg`

### Estrutura

```
.
├── src/
│   ├── components/      # UI compartilhada + features (cadastros, nfs, etc)
│   ├── contexts/        # AuthContext, PeriodoContext
│   ├── hooks/           # Queries, mutations e estado compartilhado
│   ├── lib/             # supabase client, formatters, userMapper
│   ├── pages/           # Telas (uma por rota)
│   ├── schemas/         # Zod schemas
│   ├── types/           # database.ts (Database type)
│   └── utils/           # calculos.ts, impressao.ts, exportarCSV.ts
├── supabase/
│   ├── migrations/      # 6 SQLs sequenciais
│   └── functions/       # Edge Function convidar_usuario
├── public/              # logo.svg + ícones PWA gerados
├── docs/                # COMO-ACESSAR.md
├── pwa-assets.config.ts # Config do gerador de ícones
├── vercel.json          # SPA rewrites + cache headers
└── vite.config.ts       # Vite + VitePWA
```

---

## 🚀 Deploy (Vercel)

O Vercel detecta o projeto Vite automaticamente. Após push na `main`, build e deploy acontecem em ~30s.

### Setup inicial (uma vez)

1. **vercel.com** → Add New Project → importa o repo
2. **Environment Variables:** adiciona `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em Production/Preview/Development
3. **Deploy** — primeira build leva ~1-2 min
4. **Atualiza Supabase** com URL do Vercel:
   - Authentication → URL Configuration → Site URL e Redirect URLs (`https://<seu-app>.vercel.app/**`)
   - Edge Functions → `convidar_usuario` → Secrets → `SITE_URL`

### Deploy contínuo

Todo `git push` na `main` dispara build automático no Vercel. Branches viram preview deployments.

---

## 📋 Roteiro de fases (todas concluídas)

| Fase | O que faz |
|---|---|
| 1 | Setup Vite + Tailwind + Supabase + schema |
| 2 | Auth + login + setup wizard |
| 3 | Layout + permissões + filtro de período |
| 4 | Cadastros (Empresa, Clientes, Materiais) |
| 5 | NFs (CRUD + cálculo fiscal + complementares) |
| 6 | Recebimentos |
| 7 | Auditoria (triggers SQL automáticos) |
| 8 | Equipe (convite com senha temp via Edge Function) |
| 9 | Dashboard com métricas e alertas |
| 10 | Comparativo + impressão timbrada |
| 11 | Financeiro (3 abas) |
| 12 | Notas em aberto |
| 13 | Pedidos (ordens de grande volume) |
| 14 | Relatórios (4 abas) |
| 15 | Realtime + presence |
| 16 | Mobile responsivo + PWA instalável |
| 17 | Deploy em produção |

---

## 🎨 Design system

- **Paleta:** dark base + dourado (`#D4A017`) como acento primário
- **Tipografia:** Plus Jakarta Sans (UI) + Fraunces (display/números grandes)
- **Tons funcionais:** âmbar (alerta), coral (erro), accent (sucesso/dourado)
- **Numerais tabulares** em todas as colunas de valor

## 🔐 Segurança

- RLS (Row Level Security) habilitado em todas as tabelas — usuários só veem dados da própria empresa
- Senhas nunca trafegam em texto pleno (Supabase Auth com bcrypt)
- Auditoria automática via triggers SQL — captura toda mudança com diff antes/depois
- Edge Function `convidar_usuario` valida que apenas ADMINs convidam + impõe limite de 10 usuários ativos
