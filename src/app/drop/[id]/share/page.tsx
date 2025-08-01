import { getDrop } from "@/actions/drop";
import { Header } from "@/components/Header";
import { notFound } from "next/navigation";
import { ShareCard } from "./ShareCard";

export default async function SharePage({ params }: { params: { id: string } }) {
  const drop = await getDrop(params.id);

  if (!drop) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 bg-grid-slate-100/[0.05]">
        <div className="container mx-auto px-4">
          <ShareCard dropId={drop.id} />
        </div>
      </main>
    </div>
  );
}
