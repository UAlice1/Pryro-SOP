import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
        <FileQuestion className="w-7 h-7 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-semibold">Page not found</h2>
        <p className="text-sm text-muted-foreground mt-1">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
