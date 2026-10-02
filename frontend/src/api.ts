/** Cliente tipado del backend. Los tipos reflejan app/schemas.py. */

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type HourOut = {
  valid_time_utc: string;
  /** Siempre con offset explícito; nunca una cadena ingenua. */
  valid_time_local: string;
  wind_speed_kn: number | null;
  wind_gusts_kn: number | null;
  wind_direction_deg: number | null;
  wind_direction_compass: string | null;
};

export type SpotForecastOut = {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  grid_lat: number;
  grid_lon: number;
  hours: HourOut[];
};

export type ForecastResponse = {
  generated_at: string;
  source: string;
  model: string;
  timezone: string;
  fetched_at: string;
  age_seconds: number;
  stale: boolean;
  warnings: string[];
  spots: SpotForecastOut[];
};

export async function fetchForecast(signal?: AbortSignal): Promise<ForecastResponse> {
  const res = await fetch(`${BASE}/api/forecast`, { signal });
  if (!res.ok) {
    throw new Error(`El backend respondió ${res.status}`);
  }
  return res.json();
}

export async function forceRefresh(): Promise<void> {
  await fetch(`${BASE}/api/refresh?force=1`, { method: "POST" });
}
