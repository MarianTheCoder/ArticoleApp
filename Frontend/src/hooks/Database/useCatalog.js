import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/axiosAPI";

// ============================================================================
// 1. GET: FETCH DEFINIȚII (PĂRINȚI) + SUBCATEGORII (COPII)
// ============================================================================
export const useCatalog = (tipResursa, filters = {}) => {
  return useQuery({
    // Cheia cache-ului include tipul și filtrele.
    // Orice modificare a filtrelor (pagină, search) face trigger automat la un nou fetch.
    queryKey: ["catalog", tipResursa, filters],
    queryFn: async () => {
      const response = await api.get("/Catalog/getResurse", {
        params: {
          tip_resursa: tipResursa,
          ...filters,
        },
      });
      return response.data;
      // Ne așteptăm ca backend-ul să returneze: { items: [...], total: 150, totalPages: 4 }
    },
    keepPreviousData: true,
  });
};

export const useCatalogMeta = (type) => {
  return useQuery({
    queryKey: ["catalog", "meta", type],
    queryFn: async () => {
      const response = await api.get(`/Catalog/meta/${type}`);
      return response.data;
    },
    enabled: Boolean(type),
  });
};

export const useBulkSaveCatalogMeta = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, items, deletedIds }) => {
      const response = await api.post(`/Catalog/meta/${type}/bulkSave`, { items, deletedIds });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["catalog", "meta", variables.type] });
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      queryClient.invalidateQueries({ queryKey: ["retete"] });
      queryClient.invalidateQueries({ queryKey: ["inventar", "resurse"] });
    },
  });
};

// ============================================================================
// 2. MUTATIONS PENTRU DEFINIȚII (PĂRINȚI)
// ============================================================================

export const useAddCatalogDef = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) =>
      await api.post("/Catalog/addDefinitie", data, {
        headers: {
          "Content-Type": "multipart/form-data", // 1. Forțăm Multipart pentru ca Multer să vadă fișierul
        },
      }),
    onSuccess: (_, variables) => {
      // 2. Extragem corect valoarea dintr-un obiect FormData
      const tipResursa = variables.get("tip_resursa");
      queryClient.invalidateQueries(["catalog", tipResursa]);
      queryClient.invalidateQueries({ queryKey: ["inventar", "resurse"] });
      queryClient.invalidateQueries(["retete"]); // Dacă adăugăm o definiție nouă, e bine să refacem și lista de rețete pentru a prinde eventualele legături noi
    },
  });
};

export const useEditCatalogDef = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) =>
      await api.put(`/Catalog/editDefinitie/${id}`, data, {
        headers: {
          "Content-Type": "multipart/form-data", // Aceeași regulă pentru Edit!
        },
      }),
    onSuccess: (_, variables) => {
      // variables are formele { id, data: FormData }
      const tipResursa = variables.data.get("tip_resursa");
      queryClient.invalidateQueries(["catalog", tipResursa]);
      queryClient.invalidateQueries({ queryKey: ["inventar", "resurse"] });
      queryClient.invalidateQueries(["retete"]); // Dacă edităm o definiție, e bine să refacem și lista de rețete pentru a prinde eventualele modificări în legături
    },
  });
};

// ȘTERGE DEFINIȚIE
export const useDeleteCatalogDef = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // Avem nevoie de tip_resursa trimis pentru a ști ce cache să invalidăm
    mutationFn: async ({ id }) => await api.delete(`/Catalog/deleteDefinitie/${id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(["catalog", variables.tip_resursa]);
      queryClient.invalidateQueries({ queryKey: ["inventar", "resurse"] });
      queryClient.invalidateQueries(["retete"]); // Dacă ștergem o definiție, e bine să refacem și lista de rețete pentru a prinde eventualele modificări în legături
    },
  });
};

// ============================================================================
// 3. MUTATIONS PENTRU SUBCATEGORII (COPII)
// ============================================================================

// ADAUGĂ SUBCATEGORIE
export const useAddCatalogSubDef = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) =>
      await api.post("/Catalog/addSubcategorie", data, {
        headers: {
          "Content-Type": "multipart/form-data", // Aceeași regulă pentru Edit!
        },
      }),
    onSuccess: (_, variables) => {
      // Refresh la catalog
      const tipResursa = variables.get("tip_resursa");
      queryClient.invalidateQueries(["catalog", tipResursa]);
      queryClient.invalidateQueries({ queryKey: ["inventar", "resurse"] });
      queryClient.invalidateQueries(["retete"]); // Dacă adăugăm o subcategorie nouă, e bine să refacem și lista de rețete pentru a prinde eventualele legături noi
    },
  });
};

// EDITEAZĂ SUBCATEGORIE
export const useEditCatalogSubDef = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) =>
      await api.put(`/Catalog/editSubcategorie/${id}`, data, {
        headers: {
          "Content-Type": "multipart/form-data", // Aceeași regulă pentru Edit!
        },
      }),
    onSuccess: (_, variables) => {
      const tipResursa = variables.data.get("tip_resursa");
      queryClient.invalidateQueries(["catalog", tipResursa]);
      queryClient.invalidateQueries({ queryKey: ["inventar", "resurse"] });
      queryClient.invalidateQueries(["retete"]); // Dacă edităm o subcategorie, e bine să refacem și lista de rețete pentru a prinde eventualele modificări în legături
    },
  });
};

// ȘTERGE SUBCATEGORIE
export const useDeleteCatalogSubDef = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => await api.delete(`/Catalog/deleteSubcategorie/${id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(["catalog", variables.tip_resursa]);
      queryClient.invalidateQueries({ queryKey: ["inventar", "resurse"] });
      queryClient.invalidateQueries(["retete"]); // Dacă ștergem o subcategorie, e bine să refacem și lista de rețete pentru a prinde eventualele modificări în legături
    },
  });
};
