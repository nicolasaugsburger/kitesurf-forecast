/**
 * DATOS DE PRUEBA — TEMPORAL.
 *
 * Fabrica un pronóstico que recorre las seis bandas de color, para poder
 * revisar la escala sin depender del tiempo que haga. El viento real de estos
 * días no pasa de 24 nudos, así que con datos de verdad no se ven ni el rojo
 * ni el violeta.
 *
 * Para volver a la API: poner USAR_DEMO en false (o borrar este fichero y su
 * uso en useForecast.ts).
 */
import type { ForecastResponse, SpotForecastOut } from "./api";
import { CMP_LONG, HOURS, SPOT_META } from "./spots";

export const USAR_DEMO = true;

const SPOTS: Array<{ id: string; name: string; country: string; lat: number; lon: number }> = [
  { id: "barcelona", name: "Barcelona", country: "ES", lat: 41.38, lon: 2.19 },
  { id: "castelldefels", name: "Castelldefels", country: "ES", lat: 41.2652, lon: 1.9523 },
  { id: "vilanova", name: "Vilanova", country: "ES", lat: 41.21, lon: 1.72 },
  { id: "sant_pere_pescador", name: "Sant Pere Pescador", country: "ES", lat: 42.2, lon: 3.11 },
  { id: "riumar", name: "Riumar", country: "ES", lat: 40.73, lon: 0.84 },
  { id: "trabucador", name: "Playa del Trabucador", country: "ES", lat: 40.62, lon: 0.68 },
  { id: "saint_cyprien", name: "Saint-Cyprien", country: "FR", lat: 42.64, lon: 3.03 },
  { id: "leucate", name: "Leucate", country: "FR", lat: 42.84, lon: 3.02 },
];

/** Pico de viento por spot y día: recorre de la calma al temporal. */
const PICOS = [
  [8, 13, 18], // calma / flojo / medio
  [12, 17, 22],
  [16, 21, 27],
  [20, 26, 33],
  [24, 31, 38], // aquí entran el rojo y el violeta
  [9, 28, 36],
  [14, 19, 40],
  [30, 11, 23],
];

/** Determinista: la misma pantalla en cada recarga. */
function ruido(a: number, b: number): number {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function demoForecast(): ForecastResponse {
  const hoy = new Date();
  const dias = [0, 1, 2].map((d) => {
    const f = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + d);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
  });

  const spots: SpotForecastOut[] = SPOTS.map((spot, si) => {
    const meta = SPOT_META[spot.id];
    const hours = dias.flatMap((dia, di) => {
      const pico = PICOS[si][di];
      return HOURS.map((h) => {
        // Térmica: sube hasta media tarde y vuelve a caer.
        const forma = 0.45 + 0.55 * Math.max(0, 1 - Math.abs(h - 15) / 6);
        const kn = Math.max(1, pico * forma + (ruido(si * 7 + di, h) - 0.5) * 3);
        const gust = kn + 2 + ruido(h, si + di * 3) * 9;
        // Direcciones variadas, incluidas offshore, girando alrededor de la
        // orientación de cada playa.
        const dir = Math.round((meta.facing + 40 + di * 95 + h * 7 + ruido(si, h) * 30) % 360);
        const t = `${dia}T${String(h).padStart(2, "0")}:00:00+02:00`;
        return {
          valid_time_utc: t.slice(0, 16).replace(" ", "T") + ":00Z",
          valid_time_local: t,
          wind_speed_kn: Math.round(kn * 10) / 10,
          wind_gusts_kn: Math.round(gust * 10) / 10,
          wind_direction_deg: dir,
          wind_direction_compass: CMP_LONG[Math.round(dir / 22.5) % 16],
        };
      });
    });

    return {
      id: spot.id,
      name: spot.name,
      country: spot.country,
      lat: spot.lat,
      lon: spot.lon,
      grid_lat: spot.lat,
      grid_lon: spot.lon,
      hours,
    };
  });

  const ahora = new Date().toISOString().slice(0, 19) + "Z";
  return {
    generated_at: ahora,
    source: "demo",
    model: "arome_france_hd",
    timezone: "Europe/Madrid",
    fetched_at: ahora,
    age_seconds: 0,
    stale: false,
    warnings: ["Datos de prueba: la escala de color se ve entera."],
    spots,
  };
}
