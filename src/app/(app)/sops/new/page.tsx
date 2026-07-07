import type { Metadata } from "next";
import { NewSOPClient } from "@/components/sops/new-sop-client";

export const metadata: Metadata = { title: "New SOP" };

export default function NewSOPPage() {
  return <NewSOPClient />;
}
