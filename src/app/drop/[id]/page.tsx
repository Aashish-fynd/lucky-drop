import { getDrop } from "@/actions/drop";
import { notFound } from "next/navigation";
import { GiftOpener } from "./GiftOpener";

export default async function DropPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const drop = await getDrop(id);

  if (!drop) {
    notFound();
  }

  return <GiftOpener drop={drop} />;
}
