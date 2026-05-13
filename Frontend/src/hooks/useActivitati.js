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
    enabled: !!companyId,
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
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["activitati"] });

      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["santiere"] });
      queryClient.invalidateQueries({ queryKey: ["filiale"] });
    },
  });
};

export const useEditActivitate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData) => {
      console.log("Submitting Edit Activitate with data:", formData);
      return api.put("/CRM/Companies/editActivitate", formData);
    },
    onSuccess: (res) => {
      const updated = res.data.fullActivitate;

      // Update the item in place across all activitati cache entries
      queryClient.setQueriesData({ queryKey: ["activitati"] }, (old) => {
        if (!old) return old;
        return old.map((a) => {
          if (Number(a.id) === Number(updated.id)) {
            return {
              ...a,
              ...updated,
              // FORȚĂM suprascrierea listei vechi ca să nu rămână blocat pe "mentions" din obiectul anterior
              mentiuni: updated.mentiuni || updated.mentions || [],
            };
          }
          return a;
        });
      });

      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["santiere"] });
      queryClient.invalidateQueries({ queryKey: ["filiale"] });
    },
  });
};

/// COMMENTS

// 3. GET Activitati Comments
export const useActivitateComments = (activityId) => {
  return useQuery({
    queryKey: ["activitatiComments", activityId],

    queryFn: async () => {
      const { data } = await api.get(`/CRM/Companies/getActivitatiCommentsByCompany/${activityId}`);
      return data;
    },
    enabled: !!activityId,
  });
};

// 2. POST - Doar trimite datele
export const useAddActivitateComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData) => {
      return api.post("/CRM/Companies/postActivitateComment", formData);
    },
    onSuccess: (response, variables) => {
      const newComm = response.data.fullComment;
      const updatedSeveritate = response.data.updatedSeveritate; // Preluăm severitatea
      const actId = variables.activitate_id;

      // 1. Adăugăm comentariul în lista lui specifică
      queryClient.setQueryData(["activitatiComments", actId], (old) => {
        return old ? [...old, newComm] : [newComm];
      });

      // 2. Incrementăm numărul de comentarii ȘI actualizăm severitatea activității părinte!
      queryClient.setQueriesData({ queryKey: ["activitati"] }, (old) => {
        if (!old) return old;
        return old.map((a) => {
          if (Number(a.id) === Number(actId)) {
            return {
              ...a,
              comments_count: (Number(a.comments_count) || 0) + 1,
              severitate: updatedSeveritate || a.severitate, // Actualizăm starea UI
            };
          }
          return a;
        });
      });

      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["santiere"] });
      queryClient.invalidateQueries({ queryKey: ["filiale"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
};

export const useEditActivitateComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData) => {
      return api.put("/CRM/Companies/editActivitateComment", formData);
    },
    onSuccess: (res, variables) => {
      const updated = res.data.fullComment;
      const updatedSeveritate = res.data.updatedSeveritate; // Preluăm severitatea modificată
      const actId = variables.activitate_id;

      // 1. Actualizăm comentariul editat în lista lui
      queryClient.setQueryData(["activitatiComments", actId], (old) => {
        if (!old) return old;
        return old.map((c) => {
          if (Number(c.id) === Number(updated.id)) {
            return {
              ...c,
              ...updated,
              // FORȚĂM SUPRASCRIEREA și la comentarii ca să preia "mentiuni" curat din backend
              mentiuni: updated.mentiuni || [],
            };
          }
          return c;
        });
      });

      // 2. Actualizăm instant severitatea activității părinte
      queryClient.setQueriesData({ queryKey: ["activitati"] }, (old) => {
        if (!old) return old;
        return old.map((a) => {
          // Dacă e activitatea curentă și backend-ul ne-a trimis o severitate nouă, o suprascriem
          if (a.id === actId && updatedSeveritate) {
            return { ...a, severitate: updatedSeveritate };
          }
          return a;
        });
      });

      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["santiere"] });
      queryClient.invalidateQueries({ queryKey: ["filiale"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
};
