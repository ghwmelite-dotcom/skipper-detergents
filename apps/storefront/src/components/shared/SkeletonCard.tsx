import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <div className="space-y-2 px-0.5">
        <Skeleton className="h-3 w-16 rounded-sm" />
        <Skeleton className="h-4 w-3/4 rounded-sm" />
        <Skeleton className="h-4 w-1/3 rounded-sm mt-2" />
      </div>
    </div>
  );
}
