"use client";

import Link from 'next/link';
import { 
  Phone, 
  Mail, 
  Instagram, 
  MapPin, 
  Package,
  Box,
  Home,
  Grid3X3
} from 'lucide-react';
import { COMPANY_INFO } from '@/lib/constants';

const quickLinks = [
  { href: '/', label: 'Home' },
  { href: '/catalogo/unitario', label: 'Catálogo Unitário' },
  { href: '/catalogo/caixa-fechada', label: 'Caixa Fechada' },
  { href: '/contato', label: 'Contato' },
];

const categories = [
  { href: '/categoria/caixa-de-som', label: 'Caixa de Som' },
  { href: '/categoria/fone-de-ouvido', label: 'Fone de Ouvido' },
  { href: '/categoria/carregador', label: 'Carregador' },
  { href: '/categoria/cabo-de-celular', label: 'Cabo de Celular' },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-muted/30">
      {/* Main Footer */}
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
                NEW SYSTEM
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Desde 2016 no mercado de acessórios para celular. 
              Qualidade, preço competitivo e atendimento rápido.
            </p>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                <span className="font-medium text-foreground">CNPJ:</span>
                {COMPANY_INFO.cnpj}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {COMPANY_INFO.address}
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">Links Rápidos</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-neon-blue transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h3 className="font-semibold">Categorias</h3>
            <ul className="space-y-2">
              {categories.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-neon-blue transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold">Contato</h3>
            <div className="space-y-3">
              <a
                href={`https://wa.me/${COMPANY_INFO.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-neon-blue transition-colors"
              >
                <Phone className="h-4 w-4" />
                WhatsApp
              </a>
              <a
                href={`mailto:${COMPANY_INFO.email}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-neon-blue transition-colors"
              >
                <Mail className="h-4 w-4" />
                {COMPANY_INFO.email}
              </a>
              <a
                href={COMPANY_INFO.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-neon-blue transition-colors"
              >
                <Instagram className="h-4 w-4" />
                @_neewsystem
              </a>
            </div>

            {/* Business Info */}
            <div className="pt-4 border-t border-border/40">
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Pedido mínimo: R$200</p>
                <p>10% off acima de R$1000</p>
                <p>Entrega em SP no mesmo dia</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/40">
        <div className="container py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>
              © {currentYear} {COMPANY_INFO.name}. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/admin" className="hover:text-foreground transition-colors">
                Área Administrativa
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}