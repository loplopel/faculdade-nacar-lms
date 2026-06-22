import Link from 'next/link';

const items = [
  ['Dashboard', '/dashboard'],
  ['Cursos', '/cursos'],
  ['Provas', '/provas'],
  ['Biblioteca', '/biblioteca'],
  ['Admin', '/admin'],
];

export function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="font-black tracking-tight text-nacar-black">
          Faculdade <span className="text-nacar-red">Nacar</span>
        </Link>
        <nav className="hidden gap-4 md:flex">
          {items.map(([label, href]) => (
            <Link key={href} href={href} className="text-sm font-medium text-zinc-700 hover:text-nacar-red">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
