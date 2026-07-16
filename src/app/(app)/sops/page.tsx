import type { Metadata } from "next";
import { SOPsClient } from "@/components/sops/sops-client";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "SOPs" };

export default function SOPsPage() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
      <PageTransition><SOPsClient /></PageTransition>
    </div>
  );
}
