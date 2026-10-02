import { useCallback, useEffect, useState } from "react";

import { fetchForecast, forceRefresh, type ForecastResponse } from "./api";

type Estado = {
  data: ForecastResponse | null;
  cargando: boolean;
  error: string | null;
  refrescando: boolean;
};

export function useForecast() {
  const [estado, setEstado] = useState<Estado>({
    data: null,
    cargando: true,
    error: null,
    refrescando: false,
  });

  const cargar = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await fetchForecast(signal);
      setEstado((e) => ({ ...e, data, cargando: false, error: null, refrescando: false }));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setEstado((e) => ({
        ...e,
        cargando: false,
        refrescando: false,
        // Si ya había datos, se conservan: un fallo al refrescar no debe
        // dejar la pantalla en blanco.
        error: (err as Error).message,
      }));
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    cargar(ac.signal);
    return () => ac.abort();
  }, [cargar]);

  const refrescar = useCallback(async () => {
    setEstado((e) => ({ ...e, refrescando: true }));
    await forceRefresh();
    await cargar();
  }, [cargar]);

  return { ...estado, refrescar };
}
