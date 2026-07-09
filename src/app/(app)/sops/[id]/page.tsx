import type { Metadata } from "next";
import { SOPDetailClient } from "@/components/sops/sop-detail-client";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "SOP Detail" };

export default async function SOPDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageTransition>
      <SOPDetailClient id={id} />
    </PageTransition>
  );
}
