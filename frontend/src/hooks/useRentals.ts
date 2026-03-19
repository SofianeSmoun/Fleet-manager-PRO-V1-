import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { Rental, RentalsResponse, RentalsFilters } from '@/types/rental';

export function useRentals(filters: RentalsFilters = {}): ReturnType<typeof useQuery<RentalsResponse>> {
  return useQuery({
    queryKey: ['rentals', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== '') {
          params.set(key, String(value));
        }
      }
      const { data } = await api.get<RentalsResponse>(`/rentals?${params.toString()}`);
      return data;
    },
  });
}

export function useRental(id: string): ReturnType<typeof useQuery<Rental>> {
  return useQuery({
    queryKey: ['rental', id],
    queryFn: async () => {
      const { data } = await api.get<Rental>(`/rentals/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateRental(): UseMutationResult<Rental, unknown, Record<string, unknown>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rentalData: Record<string, unknown>) => {
      const { data } = await api.post<Rental>('/rentals', rentalData);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rentals'] });
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useUpdateRental(): UseMutationResult<Rental, unknown, Record<string, unknown> & { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rentalData }: Record<string, unknown> & { id: string }) => {
      const { data } = await api.patch<Rental>(`/rentals/${id}`, rentalData);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rentals'] });
    },
  });
}

export function useCloseRental(): UseMutationResult<
  Rental,
  unknown,
  { id: string; dateFinReelle: string; kmRetour?: number; notes?: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...closeData }: { id: string; dateFinReelle: string; kmRetour?: number; notes?: string }) => {
      const { data } = await api.patch<Rental>(`/rentals/${id}/close`, closeData);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rentals'] });
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}
