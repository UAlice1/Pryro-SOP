import { Skeleton } from "@/components/ui/skeleton";

export default function SOPsLoading() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    </div>
  );
}
