import type { Metadata } from "next";
import { SOPsClient } from "@/components/sops/sops-client";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "SOPs" };

export default function SOPsPage() {
  return <PageTransition><SOPsClient /></PageTransition>;
}
