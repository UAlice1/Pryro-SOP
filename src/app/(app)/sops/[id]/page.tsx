import type { Metadata } from "next";
import { SOPDetailV2 } from "@/components/sops/sop-detail-v2";

export const metadata: Metadata = { title: "SOP Detail" };

export default async function SOPDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SOPDetailV2 id={id} />;
}
