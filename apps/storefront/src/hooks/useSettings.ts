import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type PublicSettings = Partial<{
  store_name: string;
  store_tagline: string;
  store_email: string;
  store_phone: string;
  currency: string;
  delivery_fee_accra: string;
  delivery_fee_other: string;
  free_delivery_threshold: string;
  manual_payment_details: string;
  pickup_address: string;
  paystack_public_key: string;
}>;

export function usePublicSettings() {
  return useQuery({
    queryKey: ['settings', 'public'],
    staleTime: 10 * 60_000,
    queryFn: () => api.get<PublicSettings>('/api/settings/public'),
  });
}
