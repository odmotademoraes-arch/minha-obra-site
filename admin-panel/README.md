# Minha Obra — Painel Administrativo

Painel web para gestão da plataforma Minha Obra.

## Stack
- React 18 + Vite + Tailwind CSS
- Supabase JS v2 (anon key + RLS)
- Recharts · Lucide React · React Router v6

## Setup local

```bash
cd admin-panel
cp .env.example .env      # preencher as credenciais
npm install
npm run dev
```

## Deploy — GitHub Pages

O arquivo `.github/workflows/deploy-admin.yml` faz o build e deploy automático para o GitHub Pages sempre que houver push na branch `main` com alterações em `admin-panel/`.

### Configurar Secrets no GitHub

Em **Settings → Secrets and variables → Actions**, adicionar:

| Secret | Valor |
|--------|-------|
| `VITE_SUPABASE_URL` | `https://nylhawkjfbbeoqbmczmm.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | chave anon do Supabase |
| `VITE_ADMIN_EMAIL` | `admminhaobra@gmail.com` |

### Ativar GitHub Pages

Em **Settings → Pages**:
- Source: **GitHub Actions**

## Acesso

Apenas o e-mail `admminhaobra@gmail.com` (cadastrado no Supabase Auth) tem acesso.

## Supabase — SQL obrigatório

Execute em **SQL Editor do Supabase** o arquivo `supabase/schema.sql` para criar as tabelas e RLS.

Atualizar e-mail admin:
```sql
UPDATE config_sistema
SET valor = 'admminhaobra@gmail.com'
WHERE chave = 'email_dono';
```
