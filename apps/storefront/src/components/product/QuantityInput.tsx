import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function QuantityInput({ value, onChange, min = 1, max, className }: QuantityInputProps) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1);

  return (
    <div className={cn('flex items-center gap-0', className)} role="group" aria-label="Quantity">
      <Button
        variant="outline"
        size="icon"
        onClick={decrement}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="rounded-r-none h-11 w-11"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </Button>
      <div
        className="h-11 w-14 flex items-center justify-center border-y border-border text-sm font-medium tabular-nums"
        aria-live="polite"
        aria-atomic="true"
      >
        {value}
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={increment}
        disabled={max !== undefined && value >= max}
        aria-label="Increase quantity"
        className="rounded-l-none h-11 w-11"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
