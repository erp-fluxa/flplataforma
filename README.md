# 🏢 Fluxa — Gestão de Compras, Indústria & ERP

Sistema completo de Gestão Integrada (ERP), Kanban Industrial, CRM, Controle de Estoque Multi-Depósito, Faturamento Multi-Empresa/CNPJ e Aplicativo PWA Mobile.

---

## 🚀 Guia de Implantação e Publicação

Este projeto está 100% preparado para ser publicado no **GitHub**, **Supabase** e **Netlify**.

---

### 1️⃣ Subir no GitHub

1. No terminal do projeto, adicione todos os arquivos e faça o commit inicial:
   ```bash
   git add .
   git commit -m "feat: release inicial Fluxa ERP & Mobile"
   ```

2. Crie um novo repositório no seu GitHub (ex: `fluxa-erp`).

3. Vincule seu repositório remoto e faça o push:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/fluxa-erp.git
   git push -u origin main
   ```

---

### 2️⃣ Configurar o Banco de Dados no Supabase

1. Crie uma conta ou acesse seu painel no [Supabase](https://supabase.com/).
2. Crie um novo projeto (ex: `fluxa-db`).
3. No menu lateral esquerdo, vá em **SQL Editor** -> **New query**.
4. Copie todo o conteúdo do arquivo [`supabase_schema.sql`](supabase_schema.sql) deste repositório, cole no editor e clique em **Run**.
5. Em **Project Settings** -> **API**, copie:
   - **Project URL**
   - **anon / public key**
6. Guarde essas chaves para configurar no Netlify ou no arquivo `.env`.

---

### 3️⃣ Publicar no Netlify (Deploy Automático)

1. Acesse o [Netlify](https://app.netlify.com/).
2. Clique em **Add new site** -> **Import an existing project** -> **GitHub**.
3. Selecione o repositório `fluxa-erp`.
4. As configurações de build já estão automáticas no arquivo [`netlify.toml`](netlify.toml):
   - **Publish directory**: `.` (raiz)
   - **Build command**: `echo Fluxa pronto para produção!`
5. Em **Site settings** -> **Environment variables**, adicione suas credenciais do Supabase:
   - `VITE_SUPABASE_URL` = `https://seu-projeto.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sua-chave-anon`
6. Clique em **Deploy site**. Seu ERP e PWA estarão online com HTTPS gratuito e CDN global!

---

## 💻 Como Rodar Localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/SEU_USUARIO/fluxa-erp.git
   cd fluxa-erp
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
   - Fluxa Mobile: `http://localhost:5500/fluxa-mobile.html`

---

## 📁 Estrutura do Projeto

```text
├── Fluxa.html            # Aplicação principal SPA (Single Page Application)
├── fluxa-mobile.html     # Portal PWA Mobile para tarefas e compras
├── index.html              # Entrypoint com redirecionamento automático
├── netlify.toml            # Configuração de build, headers e redirecionamentos Netlify
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
© 2026 Fluxa · Desenvolvido por IdeIA® Gestão e Criação. By Joao Marcos Alves
