import type { Metadata } from "next";
import { SOPsClient } from "@/components/sops/sops-client";

export const metadata: Metadata = { title: "SOPs" };

export default function SOPsPage() {
  return <SOPsClient />;
}
