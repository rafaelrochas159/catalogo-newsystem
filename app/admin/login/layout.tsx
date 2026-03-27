/**
 * Custom layout for the admin login page.
 *
 * This file ensures that the login page is not wrapped by the AdminLayout
 * which performs authentication checks and can cause redirect loops.
 */
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}