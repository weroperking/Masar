import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, useOrganization } from '@clerk/clerk-react';
import { fetchWithAuth } from './api';

export function useApiQuery<T>(
  resource: string, 
  staleTime: number = 60 * 1000, 
  additionalParams: Record<string, any> = {}
) {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const queryString = new URLSearchParams(additionalParams).toString();
  const url = `/api/${resource}${queryString ? `?${queryString}` : ''}`;

  return useQuery<T[]>({
    queryKey: [resource, orgId, additionalParams],
    queryFn: async () => {
      const token = await getToken();
      const data = await fetchWithAuth(url, token);
      // The API returns { students: [...] } etc.
      // We extract the first value assuming it's the array.
      const key = Object.keys(data)[0];
      return data[key];
    },
    enabled: !!orgId,
    staleTime,
  });
}

export function useApiMutation<T>(resource: string) {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const createMutation = useMutation({
    mutationFn: async (newData: Partial<T>) => {
      const token = await getToken();
      const data = await fetchWithAuth(`/api/${resource}`, token, {
        method: 'POST',
        body: JSON.stringify(newData),
      });
      const key = Object.keys(data)[0];
      return data[key];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [resource, orgId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (params: { id: string; data: Partial<T> }) => {
      const token = await getToken();
      const data = await fetchWithAuth(`/api/${resource}/${params.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify(params.data),
      });
      const key = Object.keys(data)[0];
      return data[key];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [resource, orgId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await fetchWithAuth(`/api/${resource}/${id}`, token, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [resource, orgId] });
    },
  });

  return { create: createMutation, update: updateMutation, remove: deleteMutation };
}
