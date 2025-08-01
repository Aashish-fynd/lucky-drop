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
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
              <Card className="text-center border-2 border-transparent hover:border-primary/20 bg-card hover:shadow-2xl transition-all duration-300 group">
                <CardHeader>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                    <Gift className="h-8 w-8" />
                  </div>
                  <CardTitle className="mt-4 font-headline">1. Create a Drop</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Set a title for your surprise, and add a few gift options. Choose whether the recipient picks or gets a random surprise.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center border-2 border-transparent hover:border-primary/20 bg-card hover:shadow-2xl transition-all duration-300 group">
                <CardHeader>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                    <Share2 className="h-8 w-8" />
                  </div>
                  <CardTitle className="mt-4 font-headline">2. Share the Link</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We'll generate a unique link and QR code for you to send. It's your secret key to the surprise.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center border-2 border-transparent hover:border-accent/20 bg-card hover:shadow-2xl transition-all duration-300 group">
                <CardHeader>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent group-hover:scale-110 transition-transform duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-party-popper"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 14.8 8 9"/><path d="M19.2 2.8c.8.8.8 2 0 2.8l-2.8 2.8c-.8.8-2 .8-2.8 0l-4.2-4.2c-.8-.8-.8-2 0-2.8l2.8-2.8c.8-.8 2-.8 2.8 0Z"/><path d="m14.2 7.2 4.2 4.2"/><path d="m12.5 5.5 2 2"/><path d="m15.5 2.5 2 2"/><path d="m18.5 5.5 2 2"/></svg>
                  </div>
                  <CardTitle className="mt-4 font-headline">3. Reveal the Gift</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Your friend opens the link, reveals their gift, and can even send back an AI-generated thank you note!
                  </p>
                </CardContent>
              </Card>
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
