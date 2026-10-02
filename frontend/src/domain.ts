/**
 * Reglas de navegabilidad. Portado tal cual del diseño.
 *
 * OJO: esto es lógica de dominio viviendo en el front. Está aislada aquí a
 * propósito para que mudarla al backend sea mover un fichero, no reescribir
 * la aplicación. Ver la nota al final sobre dónde debería vivir.
 */
import { CMP_SHORT, SPOT_META } from "./spots";

export type DirClass = "frontal" | "lateral" | "side-off" | "offshore";

export type Classified = {
  kn: number;
  gust: number;
  delta: number;
  dir: number;
  dirClass: DirClass;
  /** 0 = no navegable, 3 = ideal */
  level: 0 | 1 | 2 | 3;
  offshore: boolean;
  compass: string;
};

/** Diferencia angular (0-180) entre dos rumbos. */
export function angularDiff(a: number, b: number): number {
  return Math.abs(((((a - b) % 360) + 540) % 360) - 180);
}

export function classifyDirection(dir: number, facing: number): DirClass {
  const diff = angularDiff(dir, facing);
  if (diff <= 30) return "frontal";
  if (diff <= 110) return "lateral";
  if (diff <= 135) return "side-off";
  return "offshore";
}

export function classify(
  spotId: string,
  kn: number | null,
  gust: number | null,
  dir: number | null,
): Classified | null {
  if (kn == null || gust == null || dir == null) return null;
  const meta = SPOT_META[spotId];
  if (!meta) return null;

  const dirClass = classifyDirection(dir, meta.facing);
  const delta = gust - kn;

  // Bandas de velocidad: 15-25 kn es lo ideal; por encima de 32 deja de serlo.
  let level: number;
  if (kn < 10) level = 0;
  else if (kn < 15) level = 1;
  else if (kn <= 25) level = 3;
  else if (kn <= 32) level = 2;
  else level = 0;

  if (level > 0) {
    // Viento rachado: lo que molesta no es la racha, sino su distancia con la
    // media. Mucha diferencia = sesión incómoda aunque la media sea perfecta.
    if (delta > 10) level -= 2;
    else if (delta > 6) level -= 1;
    if (dirClass === "frontal" || dirClass === "side-off") level -= 1;
  }

  // Offshore con viento de verdad: te empuja mar adentro. No es "peor", es NO.
  const offshore = dirClass === "offshore" && kn >= 10;

  return {
    kn,
    gust,
    delta,
    dir,
    dirClass,
    level: (offshore ? 0 : Math.max(0, level)) as 0 | 1 | 2 | 3,
    offshore,
    compass: CMP_SHORT[Math.round(dir / 22.5) % 16],
  };
}

/** Colores por nivel de navegabilidad. */
export const LEVEL_STYLE: Record<number, { bg: string; fg: string; ring: string }> = {
  0: { bg: "rgba(255,255,255,.04)", fg: "rgba(255,255,255,.35)", ring: "none" },
  1: { bg: "rgba(34,197,94,.20)", fg: "rgba(255,255,255,.75)", ring: "none" },
  2: { bg: "rgba(34,197,94,.50)", fg: "rgba(255,255,255,.95)", ring: "none" },
  3: { bg: "#22C55E", fg: "#052E16", ring: "none" },
};

export const OFFSHORE_STYLE = {
  bg: "rgba(239,68,68,.16)",
  fg: "#F87171",
  ring: "inset 0 0 0 1px rgba(239,68,68,.7)",
};
