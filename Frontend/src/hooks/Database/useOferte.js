// src/hooks/Database/useOferte.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/axiosAPI";

// ============================================================================
// 1. GET: FETCH OFERTE + LUCRĂRI
// ============================================================================

export const useOferte = (santierId) => {
  return useQuery({
    queryKey: ["oferte", santierId],
    enabled: !!santierId,
    queryFn: async () => {
      const response = await api.get("/Oferte/getOferte", {
        params: {
          santier_id: santierId,
        },
      });
      return response.data;
    },
    keepPreviousData: true,
  });
};

const OFERTE_CHILD_QUERY_KEYS = new Set(["retete", "coeficienti"]);

const invalidateOferteList = (queryClient, santierId = null) => {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;

      if (!Array.isArray(key) || key[0] !== "oferte" || key.length !== 2) return false;
      if (OFERTE_CHILD_QUERY_KEYS.has(String(key[1]))) return false;

      return santierId ? String(key[1]) === String(santierId) : true;
    },
  });
};

const invalidateOfertaReteteList = (queryClient, lucrareId = null) => {
  if (lucrareId) {
    queryClient.invalidateQueries({ queryKey: ["oferte", "retete", String(lucrareId)] });
    return;
  }

  queryClient.invalidateQueries({ queryKey: ["oferte", "retete"] });
};

// ============================================================================
// 2. MUTATIONS PENTRU OFERTE
// ============================================================================

export const useAddOferta = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/Oferte/addOferta", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      invalidateOferteList(queryClient, variables?.santier_id);
    },
  });
};

export const useEditOferta = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const response = await api.put(`/Oferte/editOferta/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      invalidateOferteList(queryClient, variables?.santier_id);
    },
  });
};

export const useDeleteOferta = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const id = typeof payload === "object" ? payload.id : payload;

      const response = await api.delete(`/Oferte/deleteOferta/${id}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      const santierId = typeof variables === "object" ? variables.santier_id : null;

      invalidateOferteList(queryClient, santierId);
    },
  });
};

// ============================================================================
// 3. MUTATIONS PENTRU LUCRĂRI DIN OFERTĂ
// ============================================================================

export const useAddOfertaLucrare = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/Oferte/addOfertaLucrare", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      invalidateOferteList(queryClient, variables?.santier_id);
    },
  });
};

export const useEditOfertaLucrare = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const response = await api.put(`/Oferte/editOfertaLucrare/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      invalidateOferteList(queryClient, variables?.santier_id);
    },
  });
};

export const useEditOfertaLucrareStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, updated_by_user_id }) => {
      const response = await api.put(`/Oferte/editOfertaLucrareStatus/${id}`, {
        status,
        updated_by_user_id,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      invalidateOferteList(queryClient, variables?.santier_id);
    },
  });
};

export const useDeleteOfertaLucrare = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const id = typeof payload === "object" ? payload.id : payload;
      const response = await api.delete(`/Oferte/deleteOfertaLucrare/${id}`, {
        data: payload, // trimite întregul payload pentru validare pe backend (inclusiv santier_id și code, dacă există)
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      const santierId = typeof variables === "object" ? variables.santier_id : null;

      invalidateOferteList(queryClient, santierId);
    },
  });
};

export const useDuplicateOfertaLucrare = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, nume, created_by_user_id }) => {
      const { data } = await api.post(`/Oferte/duplicateOfertaLucrare/${id}`, {
        nume,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      invalidateOferteList(queryClient, variables?.santier_id);
    },
  });
};

// ============================================================================
// 4. MUTATION PENTRU COLOANE_CONFIG PE LUCRARE
// ============================================================================

export const useEditOfertaLucrareColoane = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, coloane_config, updated_by_user_id }) => {
      const response = await api.put(`/Oferte/Retete/editOfertaLucrareColoane/${id}`, {
        coloane_config,
        updated_by_user_id,
      });

      return response.data;
    },

    onSuccess: (_, variables) => {
      invalidateOferteList(queryClient, variables?.santier_id);
    },
  });
};

export const useEditOfertaLucrareCategoryColors = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, category_colors_config, updated_by_user_id }) => {
      const response = await api.put(`/Oferte/Retete/editOfertaLucrareCategoryColors/${id}`, {
        category_colors_config,
        updated_by_user_id,
      });

      return response.data;
    },

    onSuccess: (_, variables) => {
      invalidateOferteList(queryClient, variables?.santier_id);
    },
  });
};

// ============================================================================
// 5. COEFICIENȚI PE LUCRARE
// ============================================================================

export const useOfertaCoeficienti = (lucrareId) => {
  return useQuery({
    queryKey: ["oferte", "coeficienti", String(lucrareId)],
    enabled: !!lucrareId,
    queryFn: async () => {
      const response = await api.get("/Oferte/Coeficienti/getOfertaCoeficienti", {
        params: {
          lucrare_id: lucrareId,
        },
      });

      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });
};

export const useAddOfertaCoeficient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/Oferte/Coeficienti/addOfertaCoeficient", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      if (variables?.lucrare_id) {
        queryClient.invalidateQueries({ queryKey: ["oferte", "coeficienti", String(variables.lucrare_id)] });
      }

      queryClient.invalidateQueries({ queryKey: ["oferte", "coeficienti"] });
    },
  });
};

export const useEditOfertaCoeficient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const response = await api.put(`/Oferte/Coeficienti/editOfertaCoeficient/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      if (variables?.lucrare_id) {
        queryClient.invalidateQueries({ queryKey: ["oferte", "coeficienti", String(variables.lucrare_id)] });
      }

      queryClient.invalidateQueries({ queryKey: ["oferte", "coeficienti"] });
    },
  });
};

export const useSaveOfertaCoeficientTinte = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const response = await api.put(`/Oferte/Coeficienti/saveOfertaCoeficientTinte/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      if (variables?.lucrare_id) {
        queryClient.invalidateQueries({ queryKey: ["oferte", "coeficienti", String(variables.lucrare_id)] });
      }

      queryClient.invalidateQueries({ queryKey: ["oferte", "coeficienti"] });
    },
  });
};

export const useDeleteOfertaCoeficient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }) => {
      const response = await api.delete(`/Oferte/Coeficienti/deleteOfertaCoeficient/${id}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      if (variables?.lucrare_id) {
        queryClient.invalidateQueries({ queryKey: ["oferte", "coeficienti", String(variables.lucrare_id)] });
      }

      queryClient.invalidateQueries({ queryKey: ["oferte", "coeficienti"] });
    },
  });
};

// ============================================================================
// 6. RETETE DIN LUCRAREA OFERTEI
// ============================================================================

export const useOferteRetete = (lucrareId) => {
  return useQuery({
    queryKey: ["oferte", "retete", String(lucrareId)],
    enabled: !!lucrareId,
    queryFn: async () => {
      const response = await api.get("/Oferte/Retete/getOfertaRetete", {
        params: {
          lucrare_id: lucrareId,
        },
      });

      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });
};

export const useAddOfertaReteta = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/Oferte/Retete/addOfertaReteta", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      invalidateOfertaReteteList(queryClient, variables?.lucrare_id);
    },
  });
};

export const useEditOfertaReteta = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const response = await api.put(`/Oferte/Retete/editOfertaReteta/${id}`, data);
      return response.data;
    },

    onSuccess: (_, variables) => {
      invalidateOfertaReteteList(queryClient, variables?.lucrare_id);
    },
  });
};

export const useEditOfertaRetetaElementVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      console.log("Editing oferta reteta element variant with data:", { id, ...data });
      const response = await api.put(`/Oferte/Retete/editOfertaRetetaElementVariant/${id}`, data);
      return response.data;
    },

    onSuccess: (_, variables) => {
      invalidateOfertaReteteList(queryClient, variables?.lucrare_id);
    },
  });
};

export const useReorderOfertaRetete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.put("/Oferte/Retete/reorderOfertaRetete", data);
      return response.data;
    },

    onSuccess: (_, variables) => {
      invalidateOfertaReteteList(queryClient, variables?.lucrare_id);
    },
  });
};

export const useDeleteOfertaReteta = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, ...data }) => {
      const response = await api.delete("/Oferte/Retete/deleteOfertaRetete", {
        data: {
          ...data,
          ids: Array.isArray(ids) ? ids : [ids],
        },
      });

      return response.data;
    },

    onSuccess: (_, variables) => {
      invalidateOfertaReteteList(queryClient, variables?.lucrare_id);
    },
  });
};

export const useDuplicateOfertaRetete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/Oferte/Retete/duplicateOfertaRetete", payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      invalidateOfertaReteteList(queryClient, variables?.target_lucrare_id || variables?.lucrare_id);
    },
  });
};

export const useReplaceOfertaRetete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.put("/Oferte/Retete/replaceOfertaRetete", payload);
      return res.data;
    },

    onSuccess: (_, variables) => {
      invalidateOfertaReteteList(queryClient, variables?.lucrare_id);
    },
  });
};

export const useActualizeazaOfertaRetete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.put("/Oferte/Retete/actualizeazaOfertaRetete", payload);
      return res.data;
    },

    onSuccess: (_, variables) => {
      invalidateOfertaReteteList(queryClient, variables?.lucrare_id);
    },
  });
};

export const useGetOfertaReteteFurnizori = () => {
  return useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/Oferte/Retete/getOfertaReteteFurnizori", payload);
      return response.data;
    },
  });
};

export const useApplyOfertaReteteFurnizori = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/Oferte/Retete/applyOfertaReteteFurnizori", payload);
      return response.data;
    },

    onSuccess: (_, variables) => {
      invalidateOfertaReteteList(queryClient, variables?.lucrare_id);
    },
  });
};
