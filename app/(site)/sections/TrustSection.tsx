import { ShieldCheck, Truck, ThumbsUp, Tag, Headphones, WalletCards, Clock3 } from 'lucide-react';

export function TrustSection() {
  const trustItems = [
    {
      icon: ShieldCheck,
      title: 'Compra segura',
      description: 'Checkout protegido, dados tratados com seguranca e autenticacao server-side ativa.',
    },
    {
      icon: Truck,
      title: 'Entrega rapida',
      description: 'Operacao preparada para envio agil, com foco em reposicao e atacado.',
    },
    {
      icon: Tag,
      title: 'Preco competitivo',
      description: 'Oferta clara, desconto real por volume e comparacao visual entre unitario e caixa.',
    },
    {
      icon: WalletCards,
      title: 'Pix integrado',
      description: 'Pagamento validado no fluxo atual sem inventar urgencia nem esconder etapas.',
    },
    {
      icon: Headphones,
      title: 'Atendimento via WhatsApp',
      description: 'Contato rapido para duvidas, pedido e pos-compra com mensagem estruturada.',
    },
    {
      icon: ThumbsUp,
      title: 'Pos-compra organizado',
      description: 'Area do cliente, meus pedidos e historico para facilitar recompra e confianca.',
    },
  ];

  const highlights = [
    { label: 'Desde 2016', value: 'Operacao ativa no mercado' },
    { label: 'Unitario + Caixa', value: 'Compra mais flexivel para o cliente' },
    { label: 'Sem prova social fake', value: 'Dados reais e linguagem honesta' },
    { label: 'Checkout pronto', value: 'Fluxo rapido com Pix e acompanhamento' },
  ];

  return (
    <section className="border-t border-border/40 bg-gradient-to-b from-background to-muted/20 py-16">
      <div className="container space-y-10">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neon-blue">Confianca percebida</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Mais clareza, mais seguranca e menos atrito para comprar.</h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Esta secao deixa explicito o que antes estava diluido: seguranca, entrega, atendimento, Pix e estrutura para recompra. Tudo visivel, sem parecer promessa vaga.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {highlights.map((item) => (
              <div key={item.label} className="rounded-2xl border border-neon-blue/15 bg-card p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">{item.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-[24px] border border-white/8 bg-card/90 p-5 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:border-neon-blue/35">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-neon-blue/10 p-3 text-neon-blue">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-3 rounded-[24px] border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm">
          <Clock3 className="mt-0.5 h-5 w-5 text-emerald-500" />
          <p className="text-muted-foreground">
            Prova social futura continua preparada, mas so entra quando houver dado real suficiente. Sem inventar nomes, contagens ou urgencia falsa.
          </p>
        </div>
      </div>
    </section>
  );
}

