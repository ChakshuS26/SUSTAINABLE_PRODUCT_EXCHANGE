import './globals.css';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import LogoutButton from '@/components/LogoutButton';

export const metadata = {
  title: 'Sustainable Product Exchange',
  description: 'Sell, exchange or donate unused products instead of throwing them away.',
};

export default async function RootLayout({ children }) {
  const s = await getSession();
  return (
    <html lang="en">
      <body>
        <nav className="top">
          <div className="in">
            <Link href="/" className="brand">♻️ Sustainable Exchange</Link>
            <Link href="/">Browse</Link>
            {s && <Link href="/products/new">List an item</Link>}
            {s && <Link href="/my">My activity</Link>}
            {s?.role === 'admin' && <Link href="/admin">Admin</Link>}
            {s ? (
              <>
                <span className="who">{s.name} ({s.role})</span>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link href="/login">Log in</Link>
                <Link href="/register" className="btn small">Sign up</Link>
              </>
            )}
          </div>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
