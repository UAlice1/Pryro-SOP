"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-destructive" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
