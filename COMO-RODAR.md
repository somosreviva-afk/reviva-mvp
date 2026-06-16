# 🚀 Como rodar o Sistema Reviva

## Passo 1 — Supabase (no navegador)

1. Acesse supabase.com → crie uma conta → "New Project"
2. Nome: `reviva-mvp` | Senha: crie uma senha forte | Região: South America (São Paulo)
3. Aguarde o projeto criar (~2 min)
4. Vá em **SQL Editor** → cole o conteúdo do arquivo `reviva-database.sql` → clique **Run**
5. Vá em **Settings → API** e copie:
   - `Project URL`
   - `anon public` (a chave longa que começa com `eyJ...`)

---

## Passo 2 — Configurar o projeto

1. Abra a pasta `reviva-mvp` no seu computador
2. Abra o arquivo `.env.local` e cole suas chaves:

```
NEXT_PUBLIC_SUPABASE_URL=https://COLECOLA.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...suachave...
```

---

## Passo 3 — Instalar e rodar

Abra o **Terminal** (ou Prompt de Comando) dentro da pasta `reviva-mvp`:

```bash
npm install
npm run dev
```

Acesse no navegador: **http://localhost:3000**

---

## Passo 4 — Criar seu usuário

No Supabase, vá em **Authentication → Users → Invite user**
- Email: loubrleticia@gmail.com
- Você vai receber um email para definir sua senha

Depois, no **SQL Editor**, rode:

```sql
-- Primeiro, crie a empresa
INSERT INTO empresas (nome, email, telefone)
VALUES ('Reviva', 'loubrleticia@gmail.com', '')
RETURNING id;

-- Copie o ID retornado e use aqui:
-- (substitua os UUIDs pelos valores reais)
INSERT INTO usuarios (id, empresa_id, nome, email)
VALUES (
  'UUID_DO_SEU_USUARIO',   -- pegue em Authentication → Users
  'UUID_DA_EMPRESA',       -- pegue do INSERT acima
  'Leticia',
  'loubrleticia@gmail.com'
);
```

---

## Passo 5 — Deploy na Vercel (opcional, para acessar pelo celular)

1. Suba o projeto para o GitHub
2. Acesse vercel.com → "Add New Project" → importe o repositório
3. Adicione as variáveis de ambiente (as mesmas do .env.local)
4. Clique em Deploy → em 2 minutos o sistema estará online com um link

---

## Estrutura do projeto

```
reviva-mvp/
├── src/
│   ├── app/
│   │   ├── (auth)/login/   → Tela de login
│   │   └── (app)/
│   │       ├── dashboard/  → Página inicial
│   │       ├── produtos/   → Cadastro de produtos
│   │       ├── clientes/   → Cadastro de clientes
│   │       ├── pedidos/    → Gestão de pedidos
│   │       └── financeiro/ → Controle financeiro
│   ├── components/         → Componentes reutilizáveis
│   └── lib/                → Supabase, tipos, utilitários
└── COMO-RODAR.md           → Este arquivo
```
