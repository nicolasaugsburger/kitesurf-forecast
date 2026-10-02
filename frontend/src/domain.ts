/**
 * Reglas de dominio del comparador.
 *
 * Nota de criterio: el color de las celdas NO juzga si una hora es navegable.
 * Eso depende del tamaño de cometa, de la tabla y del rider, así que el color
 * dice únicamente cuánto viento hay y cada uno decide. Lo único que sí se
 * marca es el offshore, porque es seguridad y no depende del equipo.
 */
import { CMP_SHORT, SPOT_META } from "./spots";

export type DirClass = "frontal" | "lateral" | "side-off" | "offshore";

export type Classified = {
  kn: number;
  gust: number;
  delta: number;
  dir: number;
  dirClass: DirClass;
  /** Índice en BANDAS (0 = menos de 10 kn). */
  band: number;
  offshore: boolean;
  compass: string;
};

/* ------------------------------------------------------------------ *
 * Bandas de velocidad
 *
 * Escala verde -> naranja -> rojo -> violeta, la convención que usan Windguru
 * y Windy: no es una rampa de un solo tono, pero es el lenguaje que ya conoce
 * cualquiera que mire pronósticos de viento, y eso pesa más que la regla
 * genérica de "magnitud = un tono".
 *
 * Colores medidos, no elegidos a ojo, contra el fondo #202020:
 *   - separación entre bandas contiguas: ΔE 14.5 en protanopia (el objetivo
 *     es 8) y 16.7 en visión normal
 *   - todas por encima de 3:1 contra el fondo
 *   - el número de cada celda por encima de 4.8:1 sobre su banda
 * ------------------------------------------------------------------ */

export type Banda = {
  /** Desde (incluido) */
  min: number;
  /** Hasta (excluido); Infinity en la última. */
  max: number;
  label: string;
  bg: string;
  fg: string;
};

const TINTA = "#0A1A0F";
const BLANCO = "#FFFFFF";

export const BANDAS: Banda[] = [
  { min: 0, max: 10, label: "0–10", bg: "#B4EACB", fg: TINTA },
  { min: 10, max: 15, label: "10–15", bg: "#4FB477", fg: TINTA },
  { min: 15, max: 20, label: "15–20", bg: "#15803D", fg: BLANCO },
  { min: 20, max: 25, label: "20–25", bg: "#FB923C", fg: TINTA },
  { min: 25, max: 35, label: "25–35", bg: "#DC2626", fg: BLANCO },
  { min: 35, max: Infinity, label: ">35", bg: "#A78BFA", fg: TINTA },
];

export function bandaDe(kn: number): number {
  const i = BANDAS.findIndex((b) => kn < b.max);
  return i === -1 ? BANDAS.length - 1 : i;
}

/*
 * El offshore ya NO se pinta distinto.
 *
 * La rosa del spot y la flecha de cada celda ya dicen de dónde sopla, así que
 * marcarlo aparte repetía información. Se sigue calculando porque las
 * "mejores ventanas" lo excluyen: recomendar como mejor opción una hora que
 * te empuja mar adentro sería peligroso, y esa es la única valoración de
 * seguridad que queda en la aplicación.
 */

export function styleOf(c: Classified) {
  const b = BANDAS[c.band];
  return { bg: b.bg, fg: b.fg, ring: "none" };
}

/** Color de la barrita de racheo: lo que molesta es la distancia con la media. */
export function gustBarColor(delta: number): string {
  if (delta > 10) return "#EF4444";
  if (delta > 6) return "#EAB308";
  return "transparent";
}

/* ------------------------------------------------------------------ *
 * Dirección
 * ------------------------------------------------------------------ */

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

  return {
    kn,
    gust,
    delta: gust - kn,
    dir,
    dirClass,
    band: bandaDe(kn),
    // Offshore con viento de verdad: te empuja mar adentro. No es "peor", es NO.
    offshore: dirClass === "offshore" && kn >= 10,
    compass: CMP_SHORT[Math.round(dir / 22.5) % 16],
  };
}

/* ------------------------------------------------------------------ *
 * Rosa de los vientos del spot
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

/* ------------------------------------------------------------------ *
 * Ventanas
 *
 * "Mejores ventanas" necesita por fuerza un umbral, y es el único juicio que
 * queda en la aplicación. Se deja explícito y en un solo sitio: 15 nudos, que
 * es donde empieza la tercera banda de color. Así el umbral es visible en la
 * pantalla, no una constante escondida.
 * ------------------------------------------------------------------ */

export const UMBRAL_VENTANA_KN = 15;

export type Ventana = {
  spotId: string;
  dia: string;
  desde: number;
  hasta: number;
  horas: number;
  /** Viento medio de la ventana, en nudos. */
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
    // El offshore queda fuera por seguridad, no por preferencia.
    const ok = c != null && c.kn >= UMBRAL_VENTANA_KN && !c.offshore;
    if (ok && ini < 0) ini = i;
    if (!ok && ini >= 0) {
      if (i - ini >= 2) {
        const hs = celdas.slice(ini, i).filter((x): x is Classified => x != null);
        const media = hs.reduce((a, c) => a + c.kn, 0) / hs.length;
        const horas = i - ini;
        out.push({
          spotId,
          dia,
          desde: ini,
          hasta: i,
          horas,
          media,
          celdas: hs,
          // El viento se normaliza con el umbral para que la puntuación no
          // dependa de la escala absoluta de nudos.
          score: horas * (media / UMBRAL_VENTANA_KN) - (driveMin / 60) * 1.5,
          compensa: !far || (horas >= 4 && media >= 18),
        });
      }
      ini = -1;
    }
  }
  return out;
}
