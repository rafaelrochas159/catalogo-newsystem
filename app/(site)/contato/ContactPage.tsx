"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Phone, 
  Mail, 
  Instagram, 
  MapPin, 
  Clock,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { COMPANY_INFO, BUSINESS_RULES } from '@/lib/constants';
import { formatCNPJ } from '@/lib/utils';

const contactMethods = [
  {
    icon: Phone,
    title: 'WhatsApp',
    description: 'Atendimento rápido pelo WhatsApp',
    value: `(11) ${COMPANY_INFO.whatsapp.slice(4, 8)}-${COMPANY_INFO.whatsapp.slice(8)}`,
    href: `https://wa.me/${COMPANY_INFO.whatsapp}`,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    external: true,
  },
  {
    icon: Instagram,
    title: 'Instagram',
    description: 'Siga-nos no Instagram',
    value: '@_neewsystem',
    href: COMPANY_INFO.instagram,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    external: true,
  },
  {
    icon: Mail,
    title: 'Email',
    description: 'Envie-nos um email',
    value: COMPANY_INFO.email,
    href: `mailto:${COMPANY_INFO.email}`,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    external: false,
  },
];

const businessInfo = [
  { icon: MapPin, label: 'Localização', value: COMPANY_INFO.address },
  { icon: Clock, label: 'Horário', value: 'Segunda a Sexta, 9h às 18h' },
  { icon: MessageCircle, label: 'Atendimento', value: 'WhatsApp prioritário' },
];

export function ContactPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="py-12 border-b border-border/40">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h1 className="text-4xl font-bold mb-4">Entre em Contato</h1>
            <p className="text-muted-foreground">
              Estamos aqui para ajudar. Entre em contato conosco pelos canais abaixo.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {contactMethods.map((method, index) => (
              <motion.div
                key={method.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:border-neon-blue/50 transition-colors">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-lg ${method.bgColor} flex items-center justify-center mb-4`}>
                      <method.icon className={`h-6 w-6 ${method.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{method.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {method.description}
                    </p>
                    <p className="font-medium mb-4">{method.value}</p>
                    <Link
                      href={method.href}
                      target={method.external ? '_blank' : undefined}
                      rel={method.external ? 'noopener noreferrer' : undefined}
                    >
                      <Button className="w-full" variant="outline">
                        {method.external ? (
                          <>
                            Acessar
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </>
                        ) : (
                          'Enviar'
                        )}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Business Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-6">Informações da Empresa</h2>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Razão Social</p>
                      <p className="font-medium">{COMPANY_INFO.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CNPJ</p>
                      <p className="font-medium">{formatCNPJ(COMPANY_INFO.cnpj)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">No mercado desde</p>
                      <p className="font-medium">{COMPANY_INFO.since}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {businessInfo.map((info) => (
                      <div key={info.label} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <info.icon className="h-4 w-4 text-neon-blue" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{info.label}</p>
                          <p className="font-medium">{info.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t">
                  <h3 className="font-semibold mb-4">Condições Comerciais</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Pedido Mínimo</p>
                      <p className="text-lg font-medium text-neon-blue">
                        R${BUSINESS_RULES.minOrderValue}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Para produtos unitários
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Desconto Especial</p>
                      <p className="text-lg font-medium text-neon-blue">
                        {BUSINESS_RULES.discountPercentage}% OFF
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Em compras acima de R${BUSINESS_RULES.discountThreshold}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}