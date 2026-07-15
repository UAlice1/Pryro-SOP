import type { Metadata } from "next";
import { NewSOPPage } from "@/components/sops/new-sop-page";

export const metadata: Metadata = { title: "New SOP" };

export default function NewSOPRoute() {
  return <NewSOPPage />;
}
