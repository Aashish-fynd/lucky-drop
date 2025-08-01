import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Manrope, Poppins } from 'next/font/google';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/hooks/use-auth';

export const metadata: Metadata = {
  title: 'Lucky Drop',
  description: 'Create and share surprise gifts with friends.',
};

const fontPoppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-poppins',
});

const fontManrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-manrope',
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("font-body antialiased", fontPoppins.variable, fontManrope.variable)}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
