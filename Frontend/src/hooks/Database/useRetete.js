import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/axiosAPI";

const invalidateReteteClaseData = (queryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ["retete-clase-coduri"] }),
    queryClient.invalidateQueries({ queryKey: ["retete"] }),
    queryClient.invalidateQueries({ queryKey: ["oferte", "retete"] }),
    queryClient.invalidateQueries({ queryKey: ["oferte"] }),
  ]);

// ============================================================================
// 1. GET: FETCH REȚETE (PĂRINȚI) + ELEMENTELE LOR (Dacă le returnezi direct din GET)
// ============================================================================
export const useRetete = (filters = {}) => {
  return useQuery({
    // Cheia cache-ului include doar filtrele, pentru că rețetele sunt globale
    queryKey: ["retete", filters],
    queryFn: async () => {
      const response = await api.get("/Catalog/getRetete", {
        params: {
          ...filters,
        },
      });
      return response.data;
      // Așteptăm: { items: [...], total: X, totalPages: Y }
    },
    keepPreviousData: true,
  });
};

// ============================================================================
// 2. MUTATIONS PENTRU REȚETE
// ============================================================================

export const useAddReteta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // Aici trimitem un payload JSON standard, fără header de multipart
    mutationFn: async (data) => await api.post("/Catalog/addReteta", data),
    onSuccess: () => {
      // Invalidăm cache-ul general de rețete pentru a forța un refetch
      queryClient.invalidateQueries(["retete"]);
    },
  });
};

export const useEditReteta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => await api.put(`/Catalog/editReteta/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["retete"]);
    },
  });
};

// ȘTERGE REȚETĂ
export const useDeleteReteta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => await api.delete(`/Catalog/deleteReteta/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["retete"]);
    },
  });
};

// ============================================================================
// 3. CATALOG CLASE / CODURI REȚETE
// ============================================================================

export const useReteteClaseCoduri = (includeInactive = true, scope = "reteta") => {
  return useQuery({
    queryKey: ["retete-clase-coduri", scope, includeInactive],
    queryFn: async () => {
      const response = await api.get("/Catalog/getReteteClaseCoduri", {
        params: { scope, includeInactive: includeInactive ? 1 : 0 },
      });
      return response.data;
    },
  });
};

export const useBulkSaveRetetaClaseCoduri = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/Catalog/bulkSaveRetetaClaseCoduri", payload);
      return response.data;
    },

    onSuccess: async (_data, variables) => {
      await invalidateReteteClaseData(queryClient);
    },
  });
};

// export const useAddRetetaClasaCod = () => {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: async (data) => await api.post("/Catalog/addRetetaClasaCod", data),
//     onSuccess: () => invalidateReteteClaseData(queryClient),
//   });
// };

// export const useEditRetetaClasaCod = () => {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: async ({ id, data }) => await api.put(`/Catalog/editRetetaClasaCod/${id}`, data),
//     onSuccess: () => invalidateReteteClaseData(queryClient),
//   });
// };

// export const useDeleteRetetaClasaCod = () => {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: async ({ id, scope = "reteta" }) => await api.delete(`/Catalog/deleteRetetaClasaCod/${id}`, { params: { scope } }),
//     onSuccess: () => invalidateReteteClaseData(queryClient),
//   });
// };

// ============================================================================
// 4. MUTATIONS PENTRU REȚETE ELEMENTE (Dacă vrei să le faci separat, altfel le poți include în editarea rețetei)
// ============================================================================

export const useAddRetetaElement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reteta_id, definitie_id, cantitate }) => await api.post(`/Catalog/addRetetaElement/${reteta_id}`, { definitie_id, cantitate }),
    onSuccess: () => {
      queryClient.invalidateQueries(["retete"]);
    },
  });
};

export const useEditRetetaElement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cantitate }) => await api.put(`/Catalog/editRetetaElement/${id}`, { cantitate }),
    onSuccess: () => {
      queryClient.invalidateQueries(["retete"]);
    },
  });
};

export const useDeleteRetetaElement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => await api.delete(`/Catalog/deleteRetetaElement/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["retete"]);
    },
  });
};
