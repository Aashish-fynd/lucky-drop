import { Gift } from 'lucide-react';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
      <Gift className="h-7 w-7" />
      <span className="text-2xl font-bold text-foreground font-headline">Lucky Drop</span>
    </Link>
  );
}
