import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { PaginatedResponse } from '@/types';
import type { Vehicle, VehicleDetail, StatusHistoryEntry, VehicleFilters } from '@/types/vehicle';

export function useVehicles(filters: VehicleFilters = {}): ReturnType<typeof useQuery<PaginatedResponse<Vehicle>>> {
  return useQuery({
    queryKey: ['vehicles', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== '') {
          params.set(key, String(value));
        }
      }
      const { data } = await api.get<PaginatedResponse<Vehicle>>(`/vehicles?${params.toString()}`);
      return data;
    },
  });
}

export function useVehicle(id: string): ReturnType<typeof useQuery<VehicleDetail>> {
  return useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      const { data } = await api.get<VehicleDetail>(`/vehicles/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useVehicleHistory(id: string): ReturnType<typeof useQuery<StatusHistoryEntry[]>> {
  return useQuery({
    queryKey: ['vehicle-history', id],
    queryFn: async () => {
      const { data } = await api.get<StatusHistoryEntry[]>(`/vehicles/${id}/history`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateVehicle(): UseMutationResult<Vehicle, unknown, Record<string, unknown>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vehicleData: Record<string, unknown>) => {
      const { data } = await api.post<Vehicle>('/vehicles', vehicleData);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useUpdateVehicle(): UseMutationResult<Vehicle, unknown, Record<string, unknown> & { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...vehicleData }: Record<string, unknown> & { id: string }) => {
      const { data } = await api.patch<Vehicle>(`/vehicles/${id}`, vehicleData);
      return data;
    },
    onSuccess: (_data: Vehicle, variables: Record<string, unknown> & { id: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      void queryClient.invalidateQueries({ queryKey: ['vehicle', variables.id] });
    },
  });
}

export function useSoftDeleteVehicle(): UseMutationResult<{ message: string }, unknown, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ message: string }>(`/vehicles/${id}`);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}
