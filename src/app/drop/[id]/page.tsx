import { getDrop } from "@/actions/drop";
import { notFound } from "next/navigation";
import { GiftOpener } from "./GiftOpener";

export default async function DropPage({ params }: { params: { id: string } }) {
  const drop = await getDrop(params.id);

  if (!drop) {
    notFound();
  }

  return <GiftOpener drop={drop} />;
}
