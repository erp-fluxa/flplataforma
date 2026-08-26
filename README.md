# 🏢 Gescomp — Gestão de Compras, Indústria & ERP

Sistema completo de Gestão Integrada (ERP), Kanban Industrial, CRM, Controle de Estoque Multi-Depósito, Faturamento Multi-Empresa/CNPJ e Aplicativo PWA Mobile.

---

## 🚀 Guia de Implantação e Publicação

Este projeto está 100% preparado para ser publicado no **GitHub**, **Supabase** e **Vercel**.

---

### 1️⃣ Subir no GitHub

1. No terminal do projeto, adicione todos os arquivos e faça o commit inicial:
   ```bash
   git add .
   git commit -m "feat: release inicial Gescomp ERP & Mobile"
   ```

2. Crie um novo repositório no seu GitHub (ex: `gescomp-erp`).

3. Vincule seu repositório remoto e faça o push:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/gescomp-erp.git
   git push -u origin main
   ```

---

### 2️⃣ Configurar o Banco de Dados no Supabase

1. Crie uma conta ou acesse seu painel no [Supabase](https://supabase.com/).
2. Crie um novo projeto (ex: `gescomp-db`).
3. No menu lateral esquerdo, vá em **SQL Editor** -> **New query**.
4. Copie todo o conteúdo do arquivo [`supabase_schema.sql`](supabase_schema.sql) deste repositório, cole no editor e clique em **Run**.
5. Em **Project Settings** -> **API**, copie:
   - **Project URL**
   - **anon / public key**
6. Guarde essas chaves para configurar na Vercel ou no arquivo `.env`.

---

### 3️⃣ Publicar na Vercel (Deploy Automático)

1. Acesse a [Vercel](https://vercel.com/).
2. Clique em **Add New...** → **Project** → **Import Git Repository** → selecione o repositório `gescomp-erp`.
3. Em **Framework Preset**, selecione **Other** (static site).
4. As configurações de build e rotas já estão automáticas no arquivo [`vercel.json`](vercel.json):
   - **Output directory**: `.` (raiz)
   - **Build command**: nenhum (site estático)
5. Em **Settings** → **Environment Variables**, adicione suas credenciais do Supabase:
   - `VITE_SUPABASE_URL` = `https://seu-projeto.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sua-chave-anon`
6. Clique em **Deploy**. Seu ERP e PWA estarão online com HTTPS gratuito e CDN global!

---

## 💻 Como Rodar Localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/SEU_USUARIO/gescomp-erp.git
   cd gescomp-erp
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run dev
   ```
   Ou clique duas vezes no script executável [`iniciar-erp.bat`](iniciar-erp.bat).

4. Acesse no navegador:
   - ERP Completo: `http://localhost:5500/`
   - Gescomp Mobile: `http://localhost:5500/gescomp-mobile.html`

---

## 📁 Estrutura do Projeto

```text
├── Gescomp.html            # Aplicação principal SPA (Single Page Application)
├── gescomp-mobile.html     # Portal PWA Mobile para tarefas e compras
├── index.html              # Entrypoint com redirecionamento automático
├── vercel.json             # Configuração de headers, rewrites e deploy Vercel
├── supabase_schema.sql     # Schema SQL DDL + RLS policies para PostgreSQL Supabase
├── manifest.json           # Manifesto PWA para instalação no celular e desktop
├── sw.js                   # Service Worker para cache e funcionamento offline
├── server/                 # Backend Node.js / Express / TypeScript
├── assets/                 # Logotipos, ícones e assets estáticos
└── .env.example            # Modelo de variáveis de ambiente
```

---

## 🔒 Segurança e Backup
- **Backup Automático**: Rotina agendada a cada 2 dias (48 horas) no servidor e cliente.
- **Row Level Security (RLS)**: Proteção granular no Supabase para dados isolados por usuário e tenant.
- **Whitelabel Dinâmico**: 3 opções independentes de customização de marcas e logotipos em *Configurações → Empresa*.

---
© 2026 Gescomp · Desenvolvido por IdeIA® Gestão e Criação. By Joao Marcos Alves
