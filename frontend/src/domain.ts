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

/* ------------------------------------------------------------------ *
 * Rosa de los vientos del spot: un anillo de 16 sectores coloreados
 * según cómo quede el viento de ESA dirección respecto a la playa.
 * ------------------------------------------------------------------ */
export function roseOf(facing: number): string {
  const col: Record<DirClass, string> = {
    lateral: "#22C55E",
    frontal: "#EAB308",
    "side-off": "#EAB308",
    offshore: "#EF4444",
  };
  const partes: string[] = [];
  for (let i = 0; i < 16; i++) {
    const dc = classifyDirection(i * 22.5, facing);
    // Deja 2deg de hueco entre sectores para que se lean separados.
    partes.push(
      `${col[dc]} ${i * 22.5}deg ${(i + 1) * 22.5 - 2}deg, transparent ${(i + 1) * 22.5 - 2}deg ${(i + 1) * 22.5}deg`,
    );
  }
  return `conic-gradient(from -11.25deg, ${partes.join(", ")})`;
}

/** Coloreado alternativo: por velocidad bruta en vez de por navegabilidad. */
export type ColorMode = "navegabilidad" | "velocidad";

export function styleOf(c: Classified, mode: ColorMode) {
  if (c.offshore) return OFFSHORE_STYLE;
  if (mode === "velocidad") {
    const k = c.kn;
    if (k < 10) return LEVEL_STYLE[0];
    if (k < 15) return LEVEL_STYLE[1];
    if (k <= 25) return LEVEL_STYLE[3];
    if (k <= 32) return { bg: "#FACC15", fg: "#713F12", ring: "none" };
    return { bg: "#EF4444", fg: "#FFFFFF", ring: "none" };
  }
  return LEVEL_STYLE[c.level];
}

/** Color de la barrita de racheo: lo que molesta es la distancia con la media. */
export function gustBarColor(delta: number): string {
  if (delta > 10) return "#EF4444";
  if (delta > 6) return "#EAB308";
  return "transparent";
}

/* ------------------------------------------------------------------ *
 * Ventanas navegables: tramos seguidos de al menos 2 h con nivel >= 2.
 * ------------------------------------------------------------------ */
export type Ventana = {
  spotId: string;
  dia: string;
  desde: number;
  hasta: number;
  horas: number;
  media: number;
  celdas: Classified[];
  /** Penaliza la distancia: una ventana lejos vale menos que una cerca. */
  score: number;
  /** Un spot lejano solo compensa si la ventana es larga y buena. */
  compensa: boolean;
};

export function windowsOf(
  celdas: (Classified | null)[],
  spotId: string,
  dia: string,
  driveMin: number,
  far: boolean,
): Ventana[] {
  const out: Ventana[] = [];
  let ini = -1;
  for (let i = 0; i <= celdas.length; i++) {
    const c = i < celdas.length ? celdas[i] : null;
    const ok = c != null && c.level >= 2;
    if (ok && ini < 0) ini = i;
    if (!ok && ini >= 0) {
      if (i - ini >= 2) {
        const hs = celdas.slice(ini, i).filter((x): x is Classified => x != null);
        const media = hs.reduce((a, c) => a + c.level, 0) / hs.length;
        const horas = i - ini;
        out.push({
          spotId,
          dia,
          desde: ini,
          hasta: i,
          horas,
          media,
          celdas: hs,
          score: horas * media - (driveMin / 60) * 1.5,
          compensa: !far || (horas >= 4 && media >= 2.5),
        });
      }
      ini = -1;
    }
  }
  return out;
}

/** Franjas del día, para la vista resumida. */
export const BANDS: Array<[number, number, string, string]> = [
  [0, 4, "Mañana", "8–11"],
  [4, 8, "Mediodía", "12–15"],
  [8, 12, "Tarde", "16–19"],
];
