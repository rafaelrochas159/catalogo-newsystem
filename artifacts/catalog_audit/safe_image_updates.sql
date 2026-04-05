-- Dry run seguro. Execute manualmente apenas se validado.
begin;

-- J-60-AIR39 | Fone de Ouvido J-60 AIR39
update public.produtos
set imagem_principal = '/imported-product-images-clean/J-60(AIR_39款).png'
where upper(sku) = 'J-60-AIR39'
  and coalesce(imagem_principal, '') <> '/imported-product-images-clean/J-60(AIR_39款).png';

commit;