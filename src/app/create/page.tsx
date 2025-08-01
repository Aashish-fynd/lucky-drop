'use client';

import { Header } from "@/components/Header";
import { CreateDropForm } from "./CreateDropForm";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreateDropPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?redirect=/create');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
       <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 py-8 md:py-12">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                 <div className="h-20 w-1/2 bg-muted rounded-lg animate-pulse mb-8 mx-auto"></div>
                 <div className="h-96 w-full bg-muted rounded-lg animate-pulse"></div>
              </div>
            </div>
          </main>
      </div>
    );
  }

  if (!user) {
     return (
       <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 flex items-center justify-center py-8 md:py-12">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                 <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Authentication Required</AlertTitle>
                    <AlertDescription>
                        You must be logged in to create a gift drop.
                    </AlertDescription>
                 </Alert>
                 <Button onClick={() => router.push('/login?redirect=/create')} className="mt-4">Login</Button>
              </div>
            </div>
          </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2 font-headline">Create a New Gift Drop</h1>
              <p className="text-muted-foreground">Follow the steps to set up your surprise gift.</p>
            </div>
            <CreateDropForm />
          </div>
        </div>
      </main>
    </div>
  );
}
