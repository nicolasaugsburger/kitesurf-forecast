/** Piezas visuales del diseño. Los colores salen de tokens.css (011h × WPF-UI). */
import type { CSSProperties } from "react";

import {
  gustBarColor,
  roseOf,
  styleOf,
  type Classified,
  type ColorMode,
} from "./domain";
import { CMP_LONG } from "./spots";

/* Las dos maquetas usan medidas distintas, así que van como constantes y no
   esparcidas por el código. */
export const MOVIL = { spot: 106, celda: 20, alto: 36, rosa: 26, compass: false } as const;
export const ESCRITORIO = { spot: 190, celda: 30, alto: 54, rosa: 32, compass: true } as const;

export type Medidas = typeof MOVIL | typeof ESCRITORIO;

/** Rosa del spot: anillo de 16 sectores con el hueco central recortado. */
export function Rosa({ facing, size = 26 }: { facing: number; size?: number }) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flex: "none",
        borderRadius: 999,
        background: roseOf(facing),
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: Math.round(size * 0.27),
          borderRadius: 999,
          background: "var(--solid-background-base)",
        }}
      />
    </div>
  );
}

/** Flecha: hacia dónde apunta el viento de esa hora. */
export function Flecha({ dir, size = 6 }: { dir: number; size?: number }) {
  const lado = Math.round(size / 2);
  return (
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: `${lado}px solid transparent`,
        borderRight: `${lado}px solid transparent`,
        borderTop: `${size}px solid currentColor`,
        transform: `rotate(${dir}deg)`,
        opacity: 0.75,
      }}
    />
  );
}

export function Celda({
  c,
  mode,
  m,
  seleccionada,
  onClick,
  ml,
}: {
  c: Classified | null;
  mode: ColorMode;
  m: Medidas;
  seleccionada?: boolean;
  onClick?: () => void;
  ml?: number;
}) {
  // El ancho lo decide el contenedor: fijo en móvil, flexible en escritorio.
  const base: CSSProperties = {
    width: "100%",
    height: m.alto,
    borderRadius: 3,
    marginLeft: ml ? `${ml}px` : undefined,
  };
  if (!c) {
    return <div style={{ ...base, background: "var(--fill-subtle-tertiary)" }} />;
  }
  const s = styleOf(c, mode);
  return (
    <div
      onClick={onClick}
      title={`${Math.round(c.kn)} kn, rachas ${Math.round(c.gust)} · ${CMP_LONG[Math.round(c.dir / 22.5) % 16]}`}
      style={{
        ...base,
        position: "relative",
        background: s.bg,
        color: s.fg,
        boxShadow: seleccionada ? "inset 0 0 0 2px var(--text-primary)" : s.ring,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: m.compass ? 4 : 3,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <span style={{ font: "500 11px/12px var(--font-family-mono)" }}>{Math.round(c.kn)}</span>
      <Flecha dir={c.dir} size={m.compass ? 7 : 6} />
      {m.compass && (
        <span style={{ font: "500 9px/10px var(--font-family-mono)", opacity: 0.85 }}>
          {c.compass}
        </span>
      )}
      {/* Barra de racheo: lo que molesta no es la racha, sino su distancia con
          la media. Transparente cuando el viento es estable. */}
      <div
        style={{
          position: "absolute",
          left: m.compass ? 4 : 3,
          right: m.compass ? 4 : 3,
          bottom: 2,
          height: 2,
          borderRadius: 1,
          background: gustBarColor(c.delta),
        }}
      />
    </div>
  );
}

export function EtiquetaSpot({
  nombre,
  drive,
  country,
  facing,
  m,
}: {
  nombre: string;
  drive: string;
  country: string;
  facing: number;
  m: Medidas;
}) {
  const grande = m.compass; // escritorio
  return (
    <div
      style={{
        position: "sticky",
        left: 0,
        zIndex: 1,
        width: m.spot,
        flex: "none",
        background: "var(--solid-background-base)",
        display: "flex",
        alignItems: "center",
        gap: grande ? 10 : 6,
        paddingRight: 4,
        boxSizing: "border-box",
      }}
    >
      <Rosa facing={facing} size={m.rosa} />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span
          style={{
            font: grande
              ? "600 14px/20px var(--font-family)"
              : "600 12px/16px var(--font-family)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {nombre}
        </span>
        <span
          style={{
            font: grande
              ? "12px/16px var(--font-family)"
              : "11px/14px var(--font-family)",
            color: "var(--text-tertiary)",
            whiteSpace: "nowrap",
          }}
        >
          {country} · {drive}
        </span>
      </div>
    </div>
  );
}

export function itemsLeyenda(mode: ColorMode) {
  return mode === "velocidad"
    ? [
        { bg: "var(--fill-subtle-secondary)", ring: "none", label: "<10 kn" },
        { bg: "rgba(34,197,94,.20)", ring: "none", label: "10–14" },
        { bg: "#22C55E", ring: "none", label: "15–25" },
        { bg: "#FACC15", ring: "none", label: "25–32" },
        { bg: "#EF4444", ring: "none", label: ">32" },
        { bg: "rgba(239,68,68,.16)", ring: "inset 0 0 0 1px rgba(239,68,68,.7)", label: "Offshore" },
      ]
    : [
        { bg: "#22C55E", ring: "none", label: "Ideal" },
        { bg: "rgba(34,197,94,.50)", ring: "none", label: "Navegable" },
        { bg: "rgba(34,197,94,.20)", ring: "none", label: "Marginal" },
        { bg: "var(--fill-subtle-secondary)", ring: "none", label: "No" },
        { bg: "rgba(239,68,68,.16)", ring: "inset 0 0 0 1px rgba(239,68,68,.7)", label: "Offshore" },
      ];
}

const LEYENDA_RACHAS = [
  { bg: "#EAB308", label: "Rachas +6–10" },
  { bg: "#EF4444", label: "Rachas >+10" },
];

/** Leyenda en línea. En escritorio va centrada en la cabecera. */
export function Leyenda({ mode }: { mode: ColorMode }) {
  const estilo = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    font: "12px/16px var(--font-family)",
    color: "var(--text-secondary)",
  } as const;
  return (
    <>
      {itemsLeyenda(mode).map((lg) => (
        <div key={lg.label} style={estilo}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: lg.bg, boxShadow: lg.ring }} />
          {lg.label}
        </div>
      ))}
      {LEYENDA_RACHAS.map((lg) => (
        <div key={lg.label} style={estilo}>
          <span style={{ width: 12, height: 3, borderRadius: 1, background: lg.bg }} />
          {lg.label}
        </div>
      ))}
    </>
  );
}

/**
 * Envoltorio de una celda o de una cabecera de hora.
 *
 * En móvil el ancho es fijo. En escritorio crece para repartir el espacio
 * sobrante, pero nunca baja de la medida del diseño: por debajo de eso la
 * rejilla hace scroll horizontal en vez de aplastar las celdas.
 */
export function Hueco({
  m,
  flexible,
  ml,
  children,
}: {
  m: Medidas;
  flexible: boolean;
  ml?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={
        flexible
          ? { flex: "1 1 0", minWidth: m.celda, marginLeft: ml ? `${ml}px` : undefined }
          : { width: m.celda, flex: "none", marginLeft: ml ? `${ml}px` : undefined }
      }
    >
      {children}
    </div>
  );
}

/** Anchura mínima de la rejilla: por debajo de esto, scroll horizontal. */
export function anchoMinimo(m: Medidas, dias: number): number {
  const dia = m.celda * 12 + 2 * 11;
  return m.spot + dias * dia + (dias - 1) * 12 + dias * 2;
}
