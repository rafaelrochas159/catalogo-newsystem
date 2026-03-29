"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ShoppingCart, 
  Menu, 
  X, 
  Phone, 
  Package,
  Box,
  Home,
  Grid3X3,
  Contact,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCart } from '@/hooks/useCart';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { COMPANY_INFO } from '@/lib/constants';
import { cn, formatPrice } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { useEffect } from 'react';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/catalogo/unitario', label: 'Catálogo Unitário', icon: Package },
  { href: '/catalogo/caixa-fechada', label: 'Caixa Fechada', icon: Box },
  { href: '/contato', label: 'Contato', icon: Contact },
  // Added link to the customer area/history page.
  { href: '/meus-pedidos', label: 'Meus Pedidos', icon: ClipboardList },
];

export function Header() {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const cartItemCount = useCart((state) => state.getItemCount());
  const cartTotal = useCart((state) => state.getTotal());

  // Estado para gerenciar a sessão do cliente (autenticado ou não)
  const [clientSession, setClientSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      const { data } = res;
      setClientSession(data?.session ?? null);
    });
    const { data: listener }: any = supabase.auth.onAuthStateChange((event, session) => {
      setClientSession(session);
    });
    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  async function handleClientLogout() {
    await supabase.auth.signOut();
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/busca?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top Bar */}
      <div className="bg-neon-blue/10 border-b border-neon-blue/20">
        <div className="container flex h-8 items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-muted-foreground">
              Desde 2016 no mercado
            </span>
            <span className="text-neon-blue font-medium">
              Pedido mínimo: R$200
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href={`https://wa.me/${COMPANY_INFO.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-neon-blue hover:underline"
            >
              <Phone className="h-3 w-3" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-neon-blue to-neon-purple rounded-lg blur opacity-25 group-hover:opacity-50 transition-opacity" />
            <div className="relative bg-background border border-border rounded-lg px-3 py-2">
              <span className="text-lg font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
                NEW SYSTEM
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-all duration-300",
                pathname === item.href
                  ? "bg-neon-blue/10 text-neon-blue"
                  : "text-foreground/70 hover:text-foreground hover:bg-accent"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <AnimatePresence>
            {isSearchOpen ? (
              <motion.form
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSearch}
                className="hidden sm:flex items-center"
              >
                <Input
                  type="search"
                  placeholder="Buscar produtos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 -ml-9"
                  onClick={() => setIsSearchOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.form>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
          </AnimatePresence>

          {/* Cart */}
          <CartDrawer />

        {/* Client account links (desktop) */}
        <div className="hidden sm:flex items-center gap-2">
          {!clientSession ? (
            <>
              <Link href="/login" className="text-sm text-foreground/70 hover:text-foreground">Entrar</Link>
              <span className="text-muted-foreground">/</span>
              <Link href="/cadastro" className="text-sm text-foreground/70 hover:text-foreground">Cadastrar</Link>
            </>
          ) : (
            <>
              <Link href="/minha-conta" className="text-sm text-foreground/70 hover:text-foreground">Minha conta</Link>
              <button onClick={handleClientLogout} className="text-sm text-foreground/70 hover:text-foreground">Sair</button>
            </>
          )}
        </div>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <div className="flex flex-col gap-6 mt-8">
                {/* Mobile Search */}
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input
                    type="search"
                    placeholder="Buscar produtos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button type="submit" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </form>

                {/* Mobile Navigation */}
                <nav className="flex flex-col gap-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                        pathname === item.href
                          ? "bg-neon-blue/10 text-neon-blue"
                          : "hover:bg-accent"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  ))}
                </nav>

              {/* Mobile client links */}
              <div className="flex flex-col gap-2 mt-4 border-t pt-4">
                {!clientSession ? (
                  <>
                    <Link href="/login" className="px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-accent flex items-center gap-3">
                      Entrar
                    </Link>
                    <Link href="/cadastro" className="px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-accent flex items-center gap-3">
                      Cadastrar
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/minha-conta" className="px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-accent flex items-center gap-3">
                      Minha conta
                    </Link>
                    <button onClick={handleClientLogout} className="px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-accent flex items-center gap-3 text-left">
                      Sair
                    </button>
                  </>
                )}
              </div>

                {/* Cart Summary */}
                {cartItemCount > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Carrinho</span>
                      <span className="font-medium">{cartItemCount} itens</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="font-bold text-neon-blue">
                        {formatPrice(cartTotal)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Contact */}
                <div className="border-t pt-4">
                  <a
                    href={`https://wa.me/${COMPANY_INFO.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-neon-blue"
                  >
                    <Phone className="h-5 w-5" />
                    Fale conosco
                  </a>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}