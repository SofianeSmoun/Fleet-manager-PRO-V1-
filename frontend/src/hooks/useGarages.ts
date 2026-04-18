import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { PaginatedResponse } from '@/types';
import type { Garage, GarageFilters } from '@/types/garage';

export function useGarages(
  filters: GarageFilters = {},
): ReturnType<typeof useQuery<PaginatedResponse<Garage>>> {
  return useQuery({
    queryKey: ['garages', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== '') {
          params.set(key, String(value));
        }
      }
      const { data } = await api.get<PaginatedResponse<Garage>>(`/garages?${params.toString()}`);
      return data;
    },
  });
}

export function useCreateGarage(): UseMutationResult<Garage, unknown, Record<string, unknown>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (garageData: Record<string, unknown>) => {
      const { data } = await api.post<Garage>('/garages', garageData);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['garages'] });
    },
  });
}

export function useUpdateGarage(): UseMutationResult<
  Garage,
  unknown,
  Record<string, unknown> & { id: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...garageData }: Record<string, unknown> & { id: string }) => {
      const { data } = await api.patch<Garage>(`/garages/${id}`, garageData);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['garages'] });
    },
  });
}

export function useSoftDeleteGarage(): UseMutationResult<void, unknown, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/garages/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['garages'] });
    },
  });
}
