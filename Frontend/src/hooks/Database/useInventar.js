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
