PACOTE INICIAL - NEWSYSTEM PATCH

1) Rode a migration em supabase/migrations/20260329_customer_layer.sql
2) Copie as pastas app, components, lib, supabase para a raiz do projeto
3) INTEGRE manualmente no seu Header atual:
   - importar { HeaderSearch } de '@/components/search/HeaderSearch'
   - renderizar <HeaderSearch /> ao lado do carrinho
4) INTEGRE manualmente na home app/(site)/page.tsx:
   - importar { TopShowcase } de '@/components/home/TopShowcase'
   - renderizar <TopShowcase /> logo abaixo de <HeroSection />
5) Adicione link /admin/clientes no menu admin existente
6) Garanta providers/componentes ui Tabs/Input/Button já existentes no seu projeto

Observação importante:
Este pacote foi feito para ser ADITIVO. Ele não substitui o checkout Pix, webhook nem admin de pedidos/produtos já existentes.
