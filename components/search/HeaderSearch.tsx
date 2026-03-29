'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function HeaderSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      setResults(json.data || []);
      setOpen(true);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative w-full max-w-sm hidden md:block">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou SKU" className="pl-10" />
      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full rounded-xl border bg-background shadow-lg z-50 overflow-hidden">
          {results.map((item) => (
            <Link key={item.id} href={`/busca?q=${encodeURIComponent(item.nome)}`} className="block px-4 py-3 hover:bg-muted text-sm">
              <div className="font-medium">{item.nome}</div>
              <div className="text-muted-foreground">SKU: {item.sku}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
