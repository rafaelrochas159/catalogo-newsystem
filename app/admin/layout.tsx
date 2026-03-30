"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  Grid3X3,
  ShoppingCart,
  TicketPercent,
  Upload,
  LogOut,
  Menu,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';

const navItems = [
  { href: '/admin/conversao', label: 'Conversao', icon: LayoutDashboard },
  { href: '/admin/produtos', label: 'Produtos', icon: Package },
  { href: '/admin/categorias', label: 'Categorias', icon: Grid3X3 },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { href: '/admin/cupons', label: 'Cupons', icon: TicketPercent },
  { href: '/admin/importar', label: 'Importar Excel', icon: Upload },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [pathname, router]);

  const checkAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // redireciona apenas se não estivermos na página de login
        if (pathname !== '/admin/login') {
          router.push('/admin/login');
        }
        return;
      }
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth error:', error);
      // em caso de erro de autenticação, redireciona somente se não estivermos na página de login
      if (pathname !== '/admin/login') {
        router.push('/admin/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkAdminAccess = async () => {
    try {
      if (pathname === '/admin/login') {
        setIsAuthenticated(false);
        return;
      }

      const response = await fetch('/api/admin/session', { cache: 'no-store' });
      if (!response.ok) {
        router.push('/admin/login');
        return;
      }

      setIsAuthenticated(true);
    } catch (error) {
      console.error('Admin auth error:', error);
      if (pathname !== '/admin/login') {
        router.push('/admin/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/session', { method: 'DELETE' });
      await supabase.auth.signOut();
      toast.success('Logout realizado com sucesso!');
      router.push('/admin/login');
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Show a minimal loading state when redirecting unauthorized users. Returning null causes
    // a blank screen, so instead render a spinner and a hint to the user. The router push
    // will still navigate away to the login page.
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue" />
          <p className="text-sm text-muted-foreground">Redirecionando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border/40 bg-card">
        <div className="p-6">
          <Link href="/admin/conversao" className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
              NEW SYSTEM
            </span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Painel Administrativo</p>
        </div>

        <nav className="flex-1 px-4 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-muted"
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-border/40">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between p-4">
          <Link href="/admin/conversao" className="font-bold">
            NEW SYSTEM
          </Link>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <nav className="flex flex-col gap-2 mt-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-muted mt-4"
                >
                  <LogOut className="h-5 w-5" />
                  Sair
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:pt-0 pt-16">
        {children}
      </main>

      <Toaster position="top-right" />
    </div>
  );
}
