import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Share2 } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1">
        <section className="w-full py-24 md:py-32 lg:py-40 xl:py-56 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background -z-10"></div>
           <div className="absolute top-0 left-0 h-32 w-32 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
           <div className="absolute bottom-0 right-0 h-32 w-32 bg-accent/20 rounded-full blur-3xl animate-pulse delay-500"></div>
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-6">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/70 to-accent">
                Send Surprises with Lucky Drop
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                The fun way to give gifts. Create a drop, share a link, and let your friends discover their surprise!
              </p>
              <div className="space-x-4">
                <Button asChild size="lg" className="shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow">
                  <Link href="/create">Create Your First Drop</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">How It Works</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Three simple steps to spread joy.
                </p>
              </div>
            </div>
            <div className="mx-auto max-w-2xl mt-12 grid gap-8">
              <div className="flex items-start gap-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-bold font-headline">Create a Drop</h3>
                  <p className="mt-2 text-muted-foreground">
                    Set a title for your surprise, and add a few gift options. Choose whether the recipient picks or gets a random surprise.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-bold font-headline">Share the Link</h3>
                  <p className="mt-2 text-muted-foreground">
                    We'll generate a unique link and QR code for you to send. It's your secret key to the surprise.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-bold font-headline">Reveal the Gift</h3>
                  <p className="mt-2 text-muted-foreground">
                    Your friend opens the link, reveals their gift, and can even send back an AI-generated thank you note!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex items-center justify-center p-6 border-t bg-card/50">
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Lucky Drop. All rights reserved.</p>
      </footer>
    </div>
  );
}
