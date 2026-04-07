import api from "@/api/axiosAPI";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

// 1. GET Activitati
export const useActivitati = ({ companyId, filialaId = null, santierId = null, contactId = null }) => {
  return useQuery({
    queryKey: ["activitati", companyId, filialaId, santierId, contactId],

    queryFn: async () => {
      const { data } = await api.get(`/CRM/Companies/getActivitati`, {
        params: { filiala_id: filialaId, santier_id: santierId, contact_id: contactId, companie_id: companyId }, // Adaugă filiala_id și santier_id ca parametri de query
      });
      return data;
    },
    // Nu face request dacă nu avem ID de companie
    placeholderData: (previousData) => previousData,
  });
};

// 2. POST - Doar trimite datele
export const useAddActivitate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData) => {
      console.log("Submitting Activitate with data:", formData);
      return api.post("/CRM/Companies/postActivitate", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activitati"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["santiere"] });
      queryClient.invalidateQueries({ queryKey: ["filiale"] });
    },
  });
};

// 3. GET Activitati Comments
export const useActivitateComments = (activityId) => {
  return useQuery({
    queryKey: ["activitatiComments", activityId],

    queryFn: async () => {
      const { data } = await api.get(`/CRM/Companies/getActivitatiCommentsByCompany/${activityId}`);
      return data;
    },
    // Nu face request dacă nu avem ID de activitate
    placeholderData: (previousData) => previousData,
  });
};

// 2. POST - Doar trimite datele
export const useAddActivitateComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData) => {
      return api.post("/CRM/Companies/postActivitateComment", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activitatiComments"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["santiere"] });
      queryClient.invalidateQueries({ queryKey: ["filiale"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
};
