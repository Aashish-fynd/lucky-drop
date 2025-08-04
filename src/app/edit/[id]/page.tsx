import { getDrop } from "@/actions/drop";
import { EditDropForm } from "./EditDropForm";
import { Header } from "@/components/Header";
import { notFound } from "next/navigation";

interface EditDropPageProps {
  params: {
    id: string;
  };
}

export default async function EditDropPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsedParams = await params;
  const drop = await getDrop(parsedParams.id);

  if (!drop) {
    return notFound();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <EditDropForm drop={drop} />
    </div>
  );
}
