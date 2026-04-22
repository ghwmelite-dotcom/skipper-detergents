import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonCard() {
  return (
    <Card>
      <Skeleton className="aspect-square w-full rounded-b-none" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
      </CardContent>
    </Card>
  );
}
