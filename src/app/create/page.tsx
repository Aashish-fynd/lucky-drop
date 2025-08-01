import { Header } from "@/components/Header";
import { CreateDropForm } from "./CreateDropForm";

export default function CreateDropPage() {
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
