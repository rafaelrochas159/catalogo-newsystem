/*
 * This layout file lives inside the `admin/login` route and intentionally does
 * **not** import the parent `AdminLayout`. In Next.js, layouts are applied
 * hierarquicamente com base na estrutura das pastas. Sem este arquivo, o
 * `app/admin/layout.tsx` seria aplicado à página de login, resultando em um
 * redirecionamento infinito e uma tela em branco para usuários não autenticados
 * (o layout do admin redireciona imediatamente para `/admin/login`, mas como a
 * página de login ainda usa esse layout, ela nunca é renderizada). Ao colocar
 * um layout vazio aqui, garantimos que a página de login seja renderizada por
 * conta própria, sem verificações de autenticação ou sidebar, evitando o
 * problema da tela preta.
 */

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Renderiza apenas os filhos. O Next.js utilizará este layout em vez do
  // layout pai `admin` ao renderizar páginas neste diretório.
  return <>{children}</>;
}