import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { PaginatedResponse } from '@/types';
import type { Client, ClientDetail, ClientFilters } from '@/types/client';

export function useClients(
  filters: ClientFilters = {},
): ReturnType<typeof useQuery<PaginatedResponse<Client>>> {
  const { page = 1, limit = 15, wilaya, secteur, q, sortBy, order } = filters;
  return useQuery({
    queryKey: ['clients', page, limit, wilaya, secteur, q, sortBy, order],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (wilaya) params.set('wilaya', wilaya);
      if (secteur) params.set('secteur', secteur);
      if (q) params.set('q', q);
      if (sortBy) params.set('sortBy', sortBy);
      if (order) params.set('order', order);
      const { data } = await api.get<PaginatedResponse<Client>>(`/clients?${params.toString()}`);
      return data;
    },
  });
}

export function useClientDetail(
  id: string,
  period = 'year',
): ReturnType<typeof useQuery<ClientDetail>> {
  return useQuery({
    queryKey: ['client-detail', id, period],
    queryFn: async () => {
      const { data } = await api.get<ClientDetail>(`/clients/${id}/detail?period=${period}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateClient(): ReturnType<typeof useMutation<Client, Error, Partial<Client>>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Client>) => {
      const { data } = await api.post<Client>('/clients', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient(): ReturnType<
  typeof useMutation<Client, Error, { id: string; data: Partial<Client> }>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: payload }: { id: string; data: Partial<Client> }) => {
      const { data } = await api.patch<Client>(`/clients/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeleteClient(): ReturnType<typeof useMutation<void, Error, string>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/clients/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
