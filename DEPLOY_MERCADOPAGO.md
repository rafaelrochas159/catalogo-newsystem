# Deploy Mercado Pago Pix + Webhook

## 1) Banco de dados
No Supabase SQL Editor, execute o arquivo:

`database/sql/2026-03-26-mercadopago-pix.sql`

## 2) Variáveis de ambiente na Vercel
Cadastre estas variáveis:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`
- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SITE_URL`
- `MERCADOPAGO_WEBHOOK_SECRET` (recomendado)

## 3) URL de produção do webhook
Depois do deploy, use:

`https://SEU-DOMINIO/api/webhooks/mercadopago`

Exemplo se o projeto publicar em `catalogo-newsystem.vercel.app`:

`https://catalogo-newsystem.vercel.app/api/webhooks/mercadopago`

## 4) Evento no painel do Mercado Pago
Configure Webhooks em produção para o evento:

- `payments`

## 5) Rotas entregues
- `POST /api/payments/pix`
- `GET /api/payments/status/[token-ou-numero]`
- `POST /api/webhooks/mercadopago`
- `GET /acesso`

## 6) Observações
- o frontend não confirma pagamento
- o webhook consulta o Mercado Pago e atualiza o pedido
- o acesso do comprador é liberado na tabela `compradores_acesso`
- a rota pública de status usa `checkout_token` aleatório, com fallback para `numero_pedido`


## 7) Valores já validados para o seu cenário
- URL do webhook em produção: `https://catalogo-newsystem.vercel.app/api/webhooks/mercadopago`
- Evento marcado no painel: `payments`
- Assinatura secreta para teste adicionada ao arquivo `.env.production`

## 8) O que ainda precisa existir na Vercel para o fluxo rodar
- `MERCADOPAGO_ACCESS_TOKEN` de produção
- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` de produção
- variáveis do Supabase de produção
