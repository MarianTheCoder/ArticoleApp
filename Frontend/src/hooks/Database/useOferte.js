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
      queryClient.invalidateQueries(["oferte", variables.santier_id]);
      queryClient.invalidateQueries(["oferte"]);
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
      if (variables.santier_id) {
        queryClient.invalidateQueries(["oferte", variables.santier_id]);
      }

      queryClient.invalidateQueries(["oferte"]);
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

      if (santierId) {
        queryClient.invalidateQueries(["oferte", santierId]);
      }

      queryClient.invalidateQueries(["oferte"]);
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
      if (variables.santier_id) {
        queryClient.invalidateQueries(["oferte", variables.santier_id]);
      }

      queryClient.invalidateQueries(["oferte"]);
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
      if (variables.santier_id) {
        queryClient.invalidateQueries(["oferte", variables.santier_id]);
      }

      queryClient.invalidateQueries(["oferte"]);
    },
  });
};

export const useDeleteOfertaLucrare = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const id = typeof payload === "object" ? payload.id : payload;

      const response = await api.delete(`/Oferte/deleteOfertaLucrare/${id}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      const santierId = typeof variables === "object" ? variables.santier_id : null;

      if (santierId) {
        queryClient.invalidateQueries(["oferte", santierId]);
      }

      queryClient.invalidateQueries(["oferte"]);
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
      const response = await api.put(`/Oferte/editOfertaLucrareColoane/${id}`, {
        coloane_config,
        updated_by_user_id,
      });

      return response.data;
    },

    onSuccess: (_, variables) => {
      if (variables.santier_id) {
        queryClient.invalidateQueries({ queryKey: ["oferte", variables.santier_id] });
      }

      queryClient.invalidateQueries({ queryKey: ["oferte"] });
    },
  });
};

// ============================================================================
// 5. RETETE DIN LUCRAREA OFERTEI
// ============================================================================

export const useOferteRetete = (lucrareId) => {
  return useQuery({
    queryKey: ["oferte", "retete", String(lucrareId)],
    enabled: !!lucrareId,
    queryFn: async () => {
      const response = await api.get("/Oferte/getOfertaRetete", {
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
      const response = await api.post("/Oferte/addOfertaReteta", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["oferte"] });

      if (variables?.santier_id) {
        queryClient.invalidateQueries({ queryKey: ["oferte", variables.santier_id] });
      }

      if (variables?.lucrare_id) {
        queryClient.invalidateQueries({ queryKey: ["oferte", "retete", String(variables.lucrare_id)] });
      }
    },
  });
};

export const useEditOfertaRetetaElementVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const response = await api.put(`/Oferte/editOfertaRetetaElementVariant/${id}`, data);
      return response.data;
    },

    onSuccess: (_, variables) => {
      if (variables?.lucrare_id) {
        queryClient.invalidateQueries({
          queryKey: ["oferte", "retete", String(variables.lucrare_id)],
        });
      }

      queryClient.invalidateQueries({ queryKey: ["oferte", "retete"] });
    },
  });
};
