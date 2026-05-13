import api from "@/api/axiosAPI";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// --- FETCH LUCRARI ---
export const useLucrari = (santierId, userId) => {
  return useQuery({
    queryKey: ["Rezerve", "lucrari", String(santierId), String(userId)],
    queryFn: async () => {
      const res = await api.get("/Rezerve/lucrari", {
        params: { santier_id: santierId, user_id: userId },
      });
      return res.data;
    },
    staleTime: 1 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
    enabled: !!santierId,
  });
};

// --- ADD LUCRARE 2D ---
export const useAddLucrare = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ santierId, name, description }) => {
      const res = await api.post("/Rezerve/lucrari", {
        santier_id: santierId,
        name: name.trim(),
        description: description?.trim() || null,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["Rezerve", "lucrari"] });
    },
  });
};

// --- ADD LUCRARE 3D ---
export const useAddLucrare3D = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const res = await api.post("/Rezerve/lucrari3d", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["Rezerve", "lucrari"] });
    },
  });
};

// --- EDIT LUCRARE ---
export const useEditLucrare = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, description }) => {
      const res = await api.put(`/Rezerve/lucrari/${id}`, {
        name: name.trim(),
        description: description?.trim() || null,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["Rezerve", "lucrari"] });
    },
  });
};

// --- DELETE LUCRARE ---
export const useDeleteLucrare = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/Rezerve/lucrari/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["Rezerve", "lucrari"] });
    },
  });
};

// --- UPLOAD PLAN ---
export const useUploadPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lucrareId, formData }) => {
      const res = await api.post(`/Rezerve/plans/${lucrareId}/upload`, formData, {
        timeout: 300000, // 5 minutes timeout for large file uploads
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["Rezerve", "lucrari"] });
    },
  });
};

// --- EDIT PLAN ---
export const useEditPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }) => {
      const res = await api.put(`/Rezerve/plans/${id}`, { name: name.trim() });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["Rezerve", "lucrari"] });
    },
  });
};

// --- DELETE PLAN ---
export const useDeletePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (planId) => {
      const res = await api.delete(`/Rezerve/plans/${planId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["Rezerve", "lucrari"] });
    },
  });
};

//Plan VIEWer mutations
//
//

// --- FETCH PINS ---
export const usePins = (planId, userId) => {
  return useQuery({
    queryKey: ["Plan", "pins", String(planId), String(userId)],
    queryFn: async () => {
      const res = await api.get("/Rezerve/pins", {
        params: { plan_id: planId, user_id: userId },
      });
      return res.data?.pins ?? [];
    },
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    enabled: !!planId && !!userId,
  });
};

// --- FETCH ZONES ---
export const useZones = (planId, planWidth, planHeight) => {
  return useQuery({
    queryKey: ["Plan", "zones", planId],
    queryFn: async () => {
      const res = await api.get(`/Rezerve/managementZones/specific/${planId}`);
      const rawZones = Array.isArray(res.data?.zones) ? res.data.zones : [];

      return rawZones.map((z) => {
        let pts = [];
        if (Array.isArray(z.points)) {
          pts = z.points;
        } else if (z.points_json) {
          try {
            const parsed = JSON.parse(z.points_json);
            if (Array.isArray(parsed)) pts = parsed;
          } catch {}
        }

        const ptsPx = pts.map((v, i) => (i % 2 === 0 ? v * planWidth : v * planHeight));

        return {
          id: z.id,
          title: z.title || "",
          points: ptsPx,
          colorHex: z.color_hex || "#ff7f50",
          opacity: z.opacity ?? 0.3,
          strokeWidth: z.stroke_width ?? 3,
          labelX: (z.label_x_pct ?? 0.5) * planWidth,
          labelY: (z.label_y_pct ?? 0.5) * planHeight,
          labelW: (z.label_w_pct ?? 0.15) * planWidth,
        };
      });
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    enabled: !!planId && !!planWidth && !!planHeight,
  });
};

// --- FETCH ZONE PATTERNS ---
export const useZonePatterns = (planId, enabled = false) => {
  return useQuery({
    queryKey: ["Plan", "zonePatterns", planId],
    queryFn: async () => {
      const res = await api.get(`/Rezerve/managementZones/${planId}`);
      return {
        patterns: res.data.patterns || [],
        currentPatternId: res.data.current_pattern_id ?? null,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!planId && enabled,
  });
};

// --- CREATE PIN ---
export const useCreatePin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ formData, planId, userId }) => {
      const res = await api.post("/Rezerve/pins", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data?.pin || res.data;
    },
    onSuccess: async (data, variables) => {
      // console.log("Updated pin data:", data, variables.userId, variables.planId);
      await queryClient.cancelQueries({ queryKey: ["Plan", "pins", String(variables.planId), String(variables.userId)] });

      queryClient.setQueryData(["Plan", "pins", String(variables.planId), String(variables.userId)], (old) => [...(old || []), data]);
    },
  });
};

// --- UPDATE PIN ---
export const useUpdatePin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ formData, pinId, userId, planId }) => {
      const res = await api.put(`/Rezerve/pinsEdit/${pinId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data?.pin || res.data;
    },
    onSuccess: async (data, variables) => {
      // console.log("Updated pin data:", data, pinId, variables.userId, variables.planId);
      await queryClient.cancelQueries({ queryKey: ["Plan", "pins", String(variables.planId), String(variables.userId)] });
      queryClient.setQueryData(["Plan", "pins", String(variables.planId), String(variables.userId)], (old) => {
        if (!old) return old;
        return old.map(
          (pin) =>
            pin.id === variables.pinId
              ? { ...pin, ...data } // ✅ Merge old pin data with new data
              : pin, // ✅ Return original pin unchanged
        );
      });
    },
  });
};

// --- DELETE PIN ---
export const useDeletePin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ pinId, planId, userId }) => {
      const res = await api.delete(`/Rezerve/pins/${pinId}`);
      return res.data;
    },
    onSuccess: async (data, variables) => {
      // console.log("Updated pin data:", data, pinId, variables.userId, variables.planId);
      await queryClient.cancelQueries({ queryKey: ["Plan", "pins", String(variables.planId), String(variables.userId)] });
      queryClient.setQueryData(["Plan", "pins", String(variables.planId), String(variables.userId)], (old) => {
        if (!old) return old;
        return old.filter((pin) => pin.id != variables.pinId);
      });
    },
  });
};

// --- MARK PIN AS SEEN ---
export const useMarkPinSeen = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, pinId, userId, santierId, isUnseen }) => {
      const res = await api.post(`/Rezerve/pins/markSeenPlan/${planId}/${pinId}`, {
        user_id: userId,
      });
      return res.data;
    },
    onMutate: async ({ planId, pinId, userId, santierId, isUnseen }) => {
      await queryClient.cancelQueries({ queryKey: ["Plan", "pins", String(planId), String(userId)] });
      const previousPins = queryClient.getQueryData(["Plan", "pins", String(planId), String(userId)]);

      queryClient.setQueryData(["Plan", "pins", String(planId), String(userId)], (old) => old?.map((pin) => (pin.id === pinId ? { ...pin, is_unseen: 0 } : pin)));
      // 4. Optimistically update the LUCRARI cache (decrement unseen count)
      if (santierId && isUnseen) {
        queryClient.setQueryData(["Rezerve", "lucrari", String(santierId), String(userId)], (oldLucrari) => {
          if (!Array.isArray(oldLucrari?.lucrari)) return oldLucrari;

          return {
            lucrari: oldLucrari.lucrari.map((lucrare) => {
              if (Array.isArray(lucrare.plans)) {
                return {
                  ...lucrare,
                  plans: lucrare.plans.map((plan) => {
                    // If we find the plan, decrement its unseen_count (make sure it doesn't go below 0)
                    if (plan.id == planId && plan.unseen > 0) {
                      return { ...plan, unseen: plan.unseen - 1 };
                    }
                    return plan;
                  }),
                };
              }
              return lucrare;
            }),
          };
        });
      }

      return { previousPins };
    },
    onError: (err, variables, context) => {
      if (context?.previousPins) {
        queryClient.setQueryData(["Plan", "pins", String(variables.planId), String(variables.userId)], context.previousPins);
      }
    },
  });
};

// --- PREVIEW PLAN REPLACEMENT ---
export const usePreviewPlanReplacement = () => {
  return useMutation({
    mutationFn: async ({ planId, formData }) => {
      const res = await api.post("/Rezerve/plans/plansPreview", formData, {
        timeout: 60000, // 60 seconds timeout for large file uploads
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data?.preview || res.data;
    },
  });
};

// --- COMMIT PLAN REPLACEMENT ---
export const useCommitPlanReplacement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ payload, idSantier, idUser }) => {
      const res = await api.post("/Rezerve/plans/commitNewPlan", payload, {
        timeout: 60000, // 60 seconds timeout for large file uploads
      });
      return res.data?.plan || res.data;
    },
    onSuccess: (data, variables) => {
      // console.log(variables.idSantier, variables.idUser);
      queryClient.invalidateQueries({ queryKey: ["Rezerve", "lucrari", String(variables.idSantier), String(variables.idUser)] });
      queryClient.invalidateQueries({ queryKey: ["Plan", "pins"] });
    },
  });
};

//
//
//

export const useComments = (pinId) => {
  return useQuery({
    queryKey: ["Plan", "comments", String(pinId)],
    queryFn: async () => {
      const { data } = await api.get(`Rezerve/comentarii`, {
        params: { pin_id: pinId }, // replace with actual planId when available
      });
      const list = Array.isArray(data?.comments) ? data.comments : [];
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return list;
    },
    enabled: !!pinId,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
};

// --- ADD COMMENT ---
export const useAddComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ formData, planId, pinId, userId }) => {
      const res = await api.post("/Rezerve/comentarii", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data; // Make sure to return the response so we can use it!
    },
    onSuccess: async (data, variables) => {
      // console.log(variables.planId, variables.pinId, variables.userId);
      await queryClient.cancelQueries({ queryKey: ["Plan", "pins", String(variables.planId), String(variables.userId)] });

      queryClient.setQueryData(["Plan", "pins", String(variables.planId), String(variables.userId)], (old) =>
        old?.map((pin) => (pin.id == variables.pinId ? { ...pin, updated_at: data?.pin?.updated_at, status: data?.pin?.status } : pin)),
      );

      queryClient.invalidateQueries({ queryKey: ["Plan", "comments", String(variables.pinId)] });

      return data;
    },
  });
};

// --- EDIT COMMENT ---
export const useEditComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ formData, pinId, userId, planId }) => {
      const res = await api.put("/Rezerve/comentarii", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },

    onSuccess: async (data, variables) => {
      // console.log(variables.planId, variables.pinId, variables.userId);
      await queryClient.cancelQueries({ queryKey: ["Plan", "pins", String(variables.planId), String(variables.userId)] });

      queryClient.setQueryData(["Plan", "pins", String(variables.planId), String(variables.userId)], (old) =>
        old?.map((pin) => (pin.id == variables.pinId ? { ...pin, updated_at: data?.pin?.updated_at } : pin)),
      );

      queryClient.invalidateQueries({ queryKey: ["Plan", "comments", String(variables.pinId)] });

      return data;
    },
  });
};
