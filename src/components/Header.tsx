import { Logo } from './Logo';
import { Button } from './ui/button';
import Link from 'next/link';

export function Header() {
  return (
    <header className="py-4 px-4 sm:px-6 md:px-8 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto flex items-center justify-between">
        <Logo />
        <Button asChild>
          <Link href="/create">Create a Drop</Link>
        </Button>
      </div>
    </header>
  );
}
