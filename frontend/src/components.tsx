/** Piezas visuales del diseño. Los colores salen de tokens.css (011h × WPF-UI). */
import type { CSSProperties } from "react";

import { CMP_LONG, HOURS } from "./spots";
import {
  gustBarColor,
  roseOf,
  styleOf,
  type Classified,
  type ColorMode,
} from "./domain";

export const ANCHO_SPOT = 106;
export const ANCHO_CELDA = 20;

/** Rosa del spot: anillo de 16 sectores con el hueco central recortado. */
export function Rosa({ facing, size = 26 }: { facing: number; size?: number }) {
  const hueco = Math.round(size * 0.27);
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
          inset: hueco,
          borderRadius: 999,
          background: "var(--solid-background-base)",
        }}
      />
    </div>
  );
}

/** Flecha de dirección: hacia dónde apunta el viento de esa hora. */
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
  seleccionada,
  onClick,
  ml,
}: {
  c: Classified | null;
  mode: ColorMode;
  seleccionada?: boolean;
  onClick?: () => void;
  ml?: number;
}) {
  const base: CSSProperties = {
    width: ANCHO_CELDA,
    height: 36,
    flex: "none",
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
        gap: 3,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <span style={{ font: "500 11px/12px var(--font-family-mono)" }}>
        {Math.round(c.kn)}
      </span>
      <Flecha dir={c.dir} />
      {/* Barra de racheo: lo que molesta no es la racha, sino su distancia
          con la media. Transparente cuando el viento es estable. */}
      <div
        style={{
          position: "absolute",
          left: 3,
          right: 3,
          bottom: 2,
          height: 2,
          borderRadius: 1,
          background: gustBarColor(c.delta),
        }}
      />
    </div>
  );
}

export function CabeceraHoras({ ml = 0 }: { ml?: number }) {
  return (
    <>
      {HOURS.map((h, i) => (
        <div
          key={h}
          style={{
            width: ANCHO_CELDA,
            flex: "none",
            textAlign: "center",
            font: "11px/16px var(--font-family-mono)",
            color: "var(--text-tertiary)",
            marginLeft: i === 0 && ml ? `${ml}px` : undefined,
          }}
        >
          {h}
        </div>
      ))}
    </>
  );
}

export function EtiquetaSpot({
  short,
  drive,
  country,
  facing,
}: {
  short: string;
  drive: string;
  country: string;
  facing: number;
}) {
  return (
    <div
      style={{
        position: "sticky",
        left: 0,
        zIndex: 1,
        width: ANCHO_SPOT,
        flex: "none",
        background: "var(--solid-background-base)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        paddingRight: 4,
        boxSizing: "border-box",
      }}
    >
      <Rosa facing={facing} />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span
          style={{
            font: "600 12px/16px var(--font-family)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {short}
        </span>
        <span
          style={{
            font: "11px/14px var(--font-family)",
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

export function Leyenda({ mode }: { mode: ColorMode }) {
  const items =
    mode === "velocidad"
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

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px", padding: "12px 16px 8px" }}>
      {items.map((lg) => (
        <div
          key={lg.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            font: "12px/16px var(--font-family)",
            color: "var(--text-secondary)",
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: 3, background: lg.bg, boxShadow: lg.ring }} />
          {lg.label}
        </div>
      ))}
      {[
        { bg: "#EAB308", label: "Rachas +6–10" },
        { bg: "#EF4444", label: "Rachas >+10" },
      ].map((lg) => (
        <div
          key={lg.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            font: "12px/16px var(--font-family)",
            color: "var(--text-secondary)",
          }}
        >
          <span style={{ width: 12, height: 3, borderRadius: 1, background: lg.bg }} />
          {lg.label}
        </div>
      ))}
    </div>
  );
}
