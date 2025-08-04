import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, PackageCheck, SendHorizontal } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";

export default function Home() {
  const howItWorksSteps = [
    {
      icon: <Gift className="h-8 w-8 text-primary" />,
      title: "1. Create Your Drop",
      description: "Easily assemble a collection of potential gifts, add a personal message, and decide how the gift is chosen."
    },
    {
      icon: <SendHorizontal className="h-8 w-8 text-primary" />,
      title: "2. Share the Link",
      description: "We'll generate a unique, shareable link for your gift drop. Send it to your recipient and wait for the magic to happen."
    },
    {
      icon: <PackageCheck className="h-8 w-8 text-primary" />,
      title: "3. They Reveal the Gift",
      description: "Your recipient opens the link to an animated surprise, revealing the gift chosen for them by you or our smart AI."
    },
  ]


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1">
        <section className="w-full py-24 md:py-32 lg:py-40 xl:py-56 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background -z-10"></div>
           <div className="absolute top-0 left-0 h-32 w-32 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
           <div className="absolute bottom-0 right-0 h-32 w-32 bg-primary/10 rounded-full blur-3xl animate-pulse delay-500"></div>
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-6">
                              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Send Surprises with Lucky Drop
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                The fun way to give gifts. Create a drop, share a link, and let your friends discover their surprise!
              </p>
              <div className="space-x-4">
                <Button asChild size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
                  <Link href="/create">Create Your First Drop</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-primary/5">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <Badge variant="outline" className="bg-background">How It Works</Badge>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">A Simple Path to a Perfect Surprise</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Follow these three easy steps to send a gift that will be remembered.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-12 sm:grid-cols-2 md:grid-cols-3 lg:gap-16 mt-16">
              {howItWorksSteps.map((step, index) => (
                <div key={index} className="grid gap-1">
                  <div className="flex items-center justify-center bg-primary/10 rounded-full h-16 w-16 mb-4 mx-auto">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-bold text-center font-headline">{step.title}</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    {step.description}
                  </p>
                </div>
              ))}
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
