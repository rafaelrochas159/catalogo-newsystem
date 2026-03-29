import { ShieldCheck, Truck, ThumbsUp, Tag, Headphones } from 'lucide-react';

/**
 * TrustSection
 *
 * This server component renders a “Confiança e Benefícios” section to
 * strengthen customer trust. It highlights key advantages such as secure
 * payment, competitive pricing, fast shipping, responsive support and product
 * quality. It also serves as a placeholder for future real testimonials or
 * ratings. To keep the section honest, no fake reviews are shown; instead,
 * customers are invited to evaluate the store when data becomes available.
 */
export function TrustSection() {
  const trustItems = [
    {
      icon: ShieldCheck,
      title: 'Compra segura',
      description: 'Pagamentos protegidos e segurança de dados.',
    },
    {
      icon: Truck,
      title: 'Envio rápido',
      description: 'Entregamos com agilidade para você receber logo.',
    },
    {
      icon: Tag,
      title: 'Preço competitivo',
      description: 'Preços justos e descontos especiais em compras maiores.',
    },
    {
      icon: ThumbsUp,
      title: 'Qualidade garantida',
      description: 'Produtos testados e aprovados pelos nossos clientes.',
    },
    {
      icon: Headphones,
      title: 'Atendimento via WhatsApp',
      description: 'Suporte rápido e atencioso para tirar suas dúvidas.',
    },
  ];

  return (
    <section className="py-12 border-t border-border bg-background/60">
      <div className="container">
        <h2 className="text-2xl font-bold mb-6">Confiança e benefícios</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-4 p-5 rounded-lg bg-card border border-border shadow-sm">
                <Icon className="h-8 w-8 text-neon-blue flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-snug">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {/* Placeholder for future real testimonials */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Em breve: notas e depoimentos reais de clientes!
        </div>
      </div>
    </section>
  );
}