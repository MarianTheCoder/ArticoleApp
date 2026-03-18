import { format } from "date-fns";
import api from "@/api/axiosAPI";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

const RO_TZ = "Europe/Bucharest";

function getTzOffsetMinutesFor(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  // minutes to add to LOCAL (RO) to get UTC — exact definiția lui getTimezoneOffset
  return (asUTC - date.getTime()) / 60000;
}

// --- FETCH ---
export const usePontaje = (selectedDates) => {
  return useQuery({
    queryKey: ["pontaje", selectedDates],
    queryFn: async () => {
      const res = await api.post("/users/getWorkSessionsForDates", {
        dates: selectedDates.map((d) => format(d, "yyyy-MM-dd")),
        tzOffsetMin: getTzOffsetMinutesFor(selectedDates[0] ?? new Date(), RO_TZ),
      });
      return res.data;
    },
    placeholderData: (previousData) => previousData, // Prevents flashing when searching
    staleTime: 1000 * 60 * 2, // 2 minute
  });
};

// --- FETCH ---
export const useAtribuiri = (selectedDates) => {
  return useQuery({
    queryKey: ["pontaje", selectedDates, "atribuiri"],
    queryFn: async () => {
      const res = await api.get("/users/getAtribuiri");
      console.log("atribuiri response:", res.data);
      return res.data;
    },
    placeholderData: (previousData) => previousData, // Prevents flashing when searching
    staleTime: 1000 * 60 * 2, // 2 minute
  });
};

export const addPontaj = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft) => {
      return await api.post("/users/saveWorkSessions", draft);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pontaje"] });
    },
  });
};
