import type { Metadata } from "next";
import { ExecutionClient } from "@/components/sops/execution-client";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "SOP Execution" };

export default async function ExecutionPage({
  params,
}: {
  params: Promise<{ id: string; instanceId: string }>;
}) {
  const { id, instanceId } = await params;
  return (
    <PageTransition>
      <ExecutionClient sopId={id} instanceId={instanceId} />
    </PageTransition>
  );
}
