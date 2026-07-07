import { Skeleton } from "@/components/ui/skeleton";

export default function SOPLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-7 w-80" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
