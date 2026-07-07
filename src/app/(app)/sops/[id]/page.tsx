import type { Metadata } from "next";
import { SOPDetailClient } from "@/components/sops/sop-detail-client";

export const metadata: Metadata = { title: "SOP Detail" };

export default async function SOPDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SOPDetailClient id={id} />;
}
