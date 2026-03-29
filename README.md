# NEW SYSTEM DISTRIBUIDORA

Catálogo digital profissional para distribuidora de acessórios para celular.

## 🚀 Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização utilitária
- **Supabase** - Banco de dados PostgreSQL + Auth
- **Zustand** - Gerenciamento de estado
- **Framer Motion** - Animações
- **shadcn/ui** - Componentes UI

## 📋 Pré-requisitos

- Node.js 18+
- Conta no Supabase
- Git

## 🛠️ Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/new-system-distribuidora.git
cd new-system-distribuidora
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local` com suas credenciais do Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
```

4. **Configure o banco de dados**

No painel do Supabase, execute o SQL em `database/schema.sql` para criar as tabelas.

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

Acesse `http://localhost:3000`

## 📁 Estrutura do Projeto

```
new-system-distribuidora/
├── app/                    # App Router Next.js
│   ├── (site)/            # Site público
│   ├── admin/             # Painel administrativo
│   ├── api/               # API Routes
│   └── layout.tsx         # Layout raiz
├── components/            # Componentes React
│   ├── ui/               # Componentes base (shadcn)
│   ├── layout/           # Componentes de layout
│   ├── product/          # Componentes de produto
│   └── cart/             # Componentes do carrinho
├── hooks/                # Custom React hooks
├── lib/                  # Utilitários e configurações
│   ├── supabase/        # Cliente Supabase
│   ├── utils/           # Funções utilitárias
│   └── constants/       # Constantes
├── types/                # Tipos TypeScript
├── database/            # Scripts do banco
└── public/              # Arquivos estáticos
```

## 🎯 Funcionalidades

### Site Público
- ✅ Catálogo Unitário e Caixa Fechada separados
- ✅ Busca inteligente de produtos
- ✅ Filtros por categoria e preço
- ✅ Carrinho de compras
- ✅ Pedido mínimo R$200 (unitário)
- ✅ Desconto automático 10% acima de R$1000
- ✅ Finalização via WhatsApp
- ✅ Design responsivo
- ✅ Animações suaves

### Painel Administrativo
- ✅ Login protegido
- ✅ Dashboard com estatísticas
- ✅ CRUD de produtos
- ✅ Gerenciamento de categorias
- ✅ Visualização de pedidos
- ✅ Importação via Excel

## 🌐 Deploy na Vercel

1. **Crie uma conta na Vercel**
   - Acesse [vercel.com](https://vercel.com)
   - Faça login com GitHub

2. **Importe o projeto**
   - Clique em "Add New Project"
   - Selecione o repositório

3. **Configure as variáveis de ambiente**
   - Adicione as mesmas variáveis do `.env.local`

4. **Deploy**
   - Clique em "Deploy"
   - Aguarde a build

## 🔧 Configuração do Supabase

### 1. Criar projeto
- Acesse [supabase.com](https://supabase.com)
- Crie um novo projeto
- Anote a URL e as chaves

### 2. Executar migrations
No SQL Editor, execute o conteúdo de `database/schema.sql`

### 3. Configurar Storage (opcional)
- Crie um bucket "products" para imagens
- Configure as políticas de acesso

### 4. Configurar Auth
- Ative o provedor Email
- Configure o site URL para seu domínio

## 📝 Edição de Produtos

### Via Painel Admin
1. Acesse `/admin`
2. Faça login
3. Navegue até "Produtos"
4. Clique em "Novo Produto" ou edite existente

### Via Importação Excel
1. Acesse `/admin/importar`
2. Baixe o template
3. Preencha com seus produtos
4. Faça upload do arquivo

## 🔒 Segurança

- Autenticação JWT via Supabase Auth
- Row Level Security (RLS) no banco
- Validação de formulários
- Proteção contra CSRF
- Headers de segurança

## 📱 SEO

- Meta tags dinâmicas
- Open Graph
- Sitemap.xml
- robots.txt
- URLs amigáveis

## 🎨 Personalização

### Cores
Edite `tailwind.config.ts`:
```typescript
colors: {
  neon: {
    blue: "#00f3ff",
    purple: "#bc13fe",
    // ...
  },
}
```

### Informações da Empresa
Edite `lib/constants/index.ts`:
```typescript
export const COMPANY_INFO = {
  name: 'SUA EMPRESA',
  cnpj: '00.000.000/0000-00',
  // ...
};
```

## 🐛 Troubleshooting

### Erro de conexão com Supabase
- Verifique as variáveis de ambiente
- Confirme se o projeto está ativo
- Verifique as políticas RLS

### Build falha na Vercel
- Verifique se todas as dependências estão instaladas
- Confirme as variáveis de ambiente
- Verifique os logs de build

### Imagens não carregam
- Verifique o caminho das imagens
- Confirme as configurações do next.config.js
- Verifique o CORS no Supabase Storage

## 📄 Licença

Este projeto é privado e de uso exclusivo da NEW SYSTEM DISTRIBUIDORA.

## 👥 Suporte

Em caso de dúvidas ou problemas:
- WhatsApp: (11) 98269-1629
- Email: newsystem709@gmail.com

---

Desenvolvido com ❤️ para NEW SYSTEM DISTRIBUIDORA