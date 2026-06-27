import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api/axiosAPI";

export const useInventare = () =>
  useQuery({
    queryKey: ["inventar"],
    queryFn: async () => {
      const response = await api.get("/Inventar/getInventare");
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });

export const useInventar = (id) =>
  useQuery({
    queryKey: ["inventar", String(id || "")],
    queryFn: async () => {
      const response = await api.get(`/Inventar/getInventar/${id}`);
      return response.data;
    },
    enabled: !!id,
    placeholderData: (previousData) => previousData,
  });

export const useInventarResurse = (inventarId, tipResursa, filters = {}) =>
  useQuery({
    queryKey: ["inventar", "resurse", String(inventarId || ""), tipResursa, filters],
    queryFn: async () => {
      const response = await api.get(`/Inventar/getInventarResurse/${inventarId}`, {
        params: {
          tip_resursa: tipResursa,
          ...filters,
        },
      });
      return response.data;
    },
    enabled: !!inventarId && !!tipResursa,
    placeholderData: (previousData) => previousData,
  });

export const useSantierResurse = (santierId, tipResursa, limba, filters = {}) =>
  useQuery({
    queryKey: ["inventar", "santier-resurse", String(santierId || ""), tipResursa, limba, filters],
    queryFn: async () => {
      const response = await api.get(`/Inventar/getSantierResurse/${santierId}`, {
        params: {
          tip_resursa: tipResursa,
          limba,
          ...filters,
        },
      });
      return response.data;
    },
    enabled: !!santierId && !!tipResursa && !!limba,
    placeholderData: (previousData) => previousData,
  });

export const useInventarStocLocatii = (inventarId, subcategorieIds = []) =>
  useQuery({
    queryKey: ["inventar", "stoc-locatii", String(inventarId || ""), subcategorieIds],
    queryFn: async () => {
      const response = await api.get(`/Inventar/getInventarStocLocatii/${inventarId}`, {
        params: {
          catalog_subcategorie_ids: subcategorieIds.join(","),
        },
      });
      return response.data;
    },
    enabled: !!inventarId && Array.isArray(subcategorieIds) && subcategorieIds.length > 0,
    placeholderData: (previousData) => previousData,
  });

// Istoricul (ledger) mișcărilor pentru o variantă: listă plată de linii, cu filtre opționale (locație, dată).
export const useInventarTranzactii = (subcategorieId, filters = {}) =>
  useQuery({
    queryKey: ["inventar", "tranzactii", String(subcategorieId || ""), filters],
    queryFn: async () => {
      const response = await api.get("/Inventar/getInventarTranzactii", {
        params: {
          catalog_subcategorie_id: subcategorieId,
          ...filters,
        },
      });
      return response.data;
    },
    enabled: !!subcategorieId,
    placeholderData: (previousData) => previousData,
  });

// Detaliul unei tranzacții întregi (antet + toate liniile) — pentru a vedea tranzacția per ansamblu.
export const useInventarTranzactie = (tranzactieId) =>
  useQuery({
    queryKey: ["inventar", "tranzactie", String(tranzactieId || "")],
    queryFn: async () => {
      const response = await api.get(`/Inventar/getInventarTranzactie/${tranzactieId}`);
      return response.data;
    },
    enabled: !!tranzactieId,
    placeholderData: (previousData) => previousData,
  });

export const useAddInventar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/Inventar/addInventar", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventar"] });
    },
  });
};

// Adaugă resurse urmărite pe o locație (magazie/șantier/user) și invalidează lista locației respective.
export const useAddResurse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/Inventar/addResurse", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      if (variables?.santier_id) {
        queryClient.invalidateQueries({ queryKey: ["inventar", "santier-resurse", String(variables.santier_id)] });
      } else if (variables?.inventar_id) {
        queryClient.invalidateQueries({ queryKey: ["inventar", "resurse", String(variables.inventar_id)] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["inventar"] });
      }
    },
  });
};

export const useSaveInventarTranzactie = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/Inventar/saveInventarTranzactie", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      if (variables?.inventar_id) {
        queryClient.invalidateQueries({ queryKey: ["inventar", "resurse", String(variables.inventar_id)] });
        queryClient.invalidateQueries({ queryKey: ["inventar", "stoc-locatii", String(variables.inventar_id)] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["inventar", "resurse"] });
        queryClient.invalidateQueries({ queryKey: ["inventar", "stoc-locatii"] });
      }

      const santierIds = [variables?.source?.santier_id, variables?.destination?.santier_id].filter(Boolean);
      santierIds.forEach((santierId) => {
        queryClient.invalidateQueries({ queryKey: ["inventar", "santier-resurse", String(santierId)] });
      });
      queryClient.invalidateQueries({ queryKey: ["inventar", "tranzactii"] });
      queryClient.invalidateQueries({ queryKey: ["inventar", "tranzactie"] });
    },
  });
};
