import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { PaginatedResponse } from '@/types';
import type { Client, ClientDetail } from '@/types/client';

export function useClients(
  page = 1,
  limit = 100,
): ReturnType<typeof useQuery<PaginatedResponse<Client>>> {
  return useQuery({
    queryKey: ['clients', page, limit],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Client>>(
        `/clients?page=${String(page)}&limit=${String(limit)}`,
      );
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
