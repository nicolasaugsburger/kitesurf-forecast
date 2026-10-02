import { useMemo } from "react";

import type { ForecastResponse, HourOut } from "./api";
import { classify, windowsOf, type Classified, type Ventana } from "./domain";
import { HOURS, SPOT_META } from "./spots";

/**
 * `valid_time_local` ya trae el reloj de pared correcto con su offset. Se parsea
 * como TEXTO: pasarlo por `new Date()` lo reinterpretaría en la zona horaria del
 * navegador, que es justo el error que el backend se esfuerza en no cometer.
 */
export const diaDe = (h: HourOut) => h.valid_time_local.slice(0, 10);
export const horaDe = (h: HourOut) => Number(h.valid_time_local.slice(11, 13));

const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DOW_L = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function etiquetaDia(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return { corto: `${DOW[dow]} ${d}`, largo: `${DOW_L[dow]} ${d} ${MESES[m - 1]}` };
}

export type FilaSpot = {
  id: string;
  name: string;
  short: string;
  drive: string;
  country: string;
  lat: number;
  facing: number;
  far: boolean;
  /** día -> 12 celdas (horas 8..19), null si el modelo no da esa hora */
  porDia: Map<string, (Classified | null)[]>;
};

export type Grid = {
  dias: string[];
  filas: FilaSpot[];
  /** TODAS las ventanas del día, ordenadas por score. El filtrado por
   *  "compensa" se decide al pintar: una ventana que no compensa sigue siendo
   *  información útil, solo que etiquetada como tal. */
  ventanasPorDia: Map<string, Ventana[]>;
  /** spots sin ninguna ventana, con el motivo */
  descartadosPorDia: Map<string, { name: string; why: string }[]>;
  calmaPorDia: Map<string, string[]>;
};

export function useGrid(data: ForecastResponse | null): Grid | null {
  return useMemo(() => {
    if (!data) return null;

    const dias = [
      ...new Set(
        data.spots.flatMap((s) =>
          s.hours.filter((h) => HOURS.includes(horaDe(h))).map(diaDe),
        ),
      ),
    ].sort();

    const filas: FilaSpot[] = data.spots
      .map((spot) => {
        const meta = SPOT_META[spot.id];
        const porDia = new Map<string, (Classified | null)[]>();
        for (const dia of dias) {
          const porHora = new Map<number, HourOut>();
          for (const h of spot.hours) {
            if (diaDe(h) === dia) porHora.set(horaDe(h), h);
          }
          porDia.set(
            dia,
            HOURS.map((hh) => {
              const h = porHora.get(hh);
              return h
                ? classify(spot.id, h.wind_speed_kn, h.wind_gusts_kn, h.wind_direction_deg)
                : null;
            }),
          );
        }
        return {
          id: spot.id,
          name: spot.name,
          short: meta?.short ?? spot.name,
          drive: meta?.drive ?? "—",
          country: spot.country,
          lat: spot.lat,
          facing: meta?.facing ?? 0,
          far: meta?.far ?? false,
          porDia,
        };
      })
      // Orden geográfico, de norte a sur: así la lista se lee como la costa y
      // cada spot cae donde uno lo tiene en la cabeza.
      .sort((a, b) => b.lat - a.lat);

    const ventanasPorDia = new Map<string, Ventana[]>();
    const descartadosPorDia = new Map<string, { name: string; why: string }[]>();
    const calmaPorDia = new Map<string, string[]>();

    for (const dia of dias) {
      const todas: Ventana[] = [];
      for (const fila of filas) {
        const meta = SPOT_META[fila.id];
        todas.push(
          ...windowsOf(fila.porDia.get(dia) ?? [], fila.id, dia, meta?.min ?? 0, fila.far),
        );
      }
      todas.sort((a, b) => b.score - a.score);
      ventanasPorDia.set(dia, todas);

      // Spots sin ventana: ¿por qué? Es tan útil como saber dónde sí hay.
      const conVentana = new Set(todas.map((v) => v.spotId));
      const desc: { name: string; why: string }[] = [];
      const calma: string[] = [];
      for (const fila of filas) {
        if (conVentana.has(fila.id)) continue;
        const fuertes = (fila.porDia.get(dia) ?? []).filter(
          (c): c is Classified => c != null && c.kn >= 15,
        );
        if (!fuertes.length) {
          calma.push(fila.short);
          continue;
        }
        const offN = fuertes.filter((c) => c.offshore).length;
        const mx = Math.round(Math.max(...fuertes.map((c) => c.kn)));
        const md = Math.round(Math.max(...fuertes.map((c) => c.delta)));
        const cmp = fuertes[Math.floor(fuertes.length / 2)].compass;
        desc.push({
          name: fila.name,
          why:
            offN > fuertes.length / 2
              ? `Offshore ${cmp} · ${mx} kn`
              : md > 10
                ? `Muy rachado · ${mx} kn, rachas +${md}`
                : `Frontal ${cmp} · ${mx} kn`,
        });
      }
      descartadosPorDia.set(dia, desc);
      calmaPorDia.set(dia, calma);
    }

    return { dias, filas, ventanasPorDia, descartadosPorDia, calmaPorDia };
  }, [data]);
}
