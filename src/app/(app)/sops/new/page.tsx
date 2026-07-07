import type { Metadata } from "next";
import { NewSOPClient } from "@/components/sops/new-sop-client";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "New SOP" };

export default function NewSOPPage() {
  return <PageTransition><NewSOPClient /></PageTransition>;
}
