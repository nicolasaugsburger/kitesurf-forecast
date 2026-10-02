import { useState } from "react";

import { ANCHO_SPOT, CabeceraHoras, Celda, EtiquetaSpot, Flecha, Leyenda, Rosa } from "./components";
import { Feedback } from "./Feedback";
import type { ColorMode, Ventana } from "./domain";
import { CMP_LONG, HOURS, SPOT_META } from "./spots";
import { etiquetaDia, useGrid, type Grid } from "./useGrid";
import { useForecast } from "./useForecast";
import { useMediaQuery } from "./useMediaQuery";

const fuente = { font: "12px/16px var(--font-family)", color: "var(--text-secondary)" } as const;

type Pick = { spotId: string; dia: string; i: number };

/* ------------------------------------------------------------------ */

function Cabecera({
  modelo,
  edad,
  stale,
  onFeedback,
}: {
  modelo?: string;
  edad?: number;
  stale?: boolean;
  onFeedback: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 16px 12px", gap: 8 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ font: "600 20px/28px var(--font-family)" }}>Viento</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, ...fuente }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: stale ? "#EAB308" : "#22C55E" }} />
          {modelo
            ? `${modelo.toUpperCase().replace(/_/g, " ")} · hace ${Math.round((edad ?? 0) / 60)} min`
            : "Cargando…"}
        </div>
      </div>
      <button
        onClick={onFeedback}
        style={{ padding: "6px 12px", borderRadius: 4, border: "1px solid var(--stroke-control-default)", background: "var(--fill-control-default)", color: "var(--text-primary)", font: "600 13px/18px var(--font-family)", cursor: "pointer", flex: "none" }}
      >
        Sugerencias
      </button>
    </div>
  );
}

function Pestanas({ grid, sel, onSel }: { grid: Grid; sel: number; onSel: (i: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: "0 12px 12px", overflowX: "auto" }}>
      {grid.dias.map((d, i) => {
        const n = grid.ventanasPorDia.get(d)?.length ?? 0;
        return (
          <button
            key={d}
            onClick={() => onSel(i)}
            style={{
              flex: 1,
              padding: "6px 2px",
              borderRadius: 4,
              cursor: "pointer",
              border: "1px solid var(--stroke-control-default)",
              background: i === sel ? "var(--system-accent)" : "var(--fill-control-default)",
              color: i === sel ? "var(--text-on-accent)" : "var(--text-primary)",
              font: "600 13px/18px var(--font-family)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            {etiquetaDia(d).corto}
            <span style={{ font: "400 11px/14px var(--font-family)", opacity: 0.85 }}>
              {n ? `${n} vent.` : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FichaVentana({ v, n, grid }: { v: Ventana; n: number; grid: Grid }) {
  const fila = grid.filas.find((f) => f.id === v.spotId);
  if (!fila) return null;
  const kns = v.celdas.map((c) => c.kn);
  const medio = v.celdas[Math.floor(v.celdas.length / 2)];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "20px minmax(0,1fr) auto", gap: "4px 8px", alignItems: "baseline" }}>
      <span style={{ font: "600 14px/20px var(--font-family-mono)", color: "var(--accent-text-primary)" }}>{n}</span>
      <span style={{ font: "600 14px/20px var(--font-family)" }}>
        {fila.name}{" "}
        <span style={{ fontWeight: 400, fontSize: 12, color: "var(--text-tertiary)" }}>
          {fila.drive} de coche
        </span>
      </span>
      <span style={{ font: "600 14px/20px var(--font-family-mono)" }}>
        {HOURS[v.desde]}–{HOURS[v.hasta - 1] + 1} h
      </span>
      <span />
      <span style={{ gridColumn: "2 / 4", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 10px", ...fuente }}>
        <span style={{ fontFamily: "var(--font-family-mono)", color: "var(--text-primary)" }}>
          {Math.round(Math.min(...kns))}–{Math.round(Math.max(...kns))} kn
        </span>
        <span>rachas +{Math.round(Math.max(...v.celdas.map((c) => c.delta)))}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Flecha dir={medio.dir} size={7} />
          {CMP_LONG[Math.round(medio.dir / 22.5) % 16]} · {v.horas} h seguidas
        </span>
      </span>
    </div>
  );
}

function MejoresVentanas({ grid, dia }: { grid: Grid; dia: string }) {
  const vs = (grid.ventanasPorDia.get(dia) ?? []).slice(0, 2);
  const desc = grid.descartadosPorDia.get(dia) ?? [];
  const calma = grid.calmaPorDia.get(dia) ?? [];
  return (
    <div style={{ margin: "12px 12px 0", padding: 12, borderRadius: 8, background: "var(--fill-card-default)", border: "1px solid var(--stroke-control-default)", display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={fuente}>Mejores ventanas · {etiquetaDia(dia).largo}</span>
      {vs.length === 0 ? (
        <span style={{ font: "14px/20px var(--font-family)", color: "var(--text-tertiary)" }}>
          Ninguna ventana navegable este día.
        </span>
      ) : (
        vs.map((v, i) => <FichaVentana key={`${v.spotId}-${v.desde}`} v={v} n={i + 1} grid={grid} />)
      )}

      {/* Por qué se descarta cada spot: saberlo vale tanto como saber dónde sí hay. */}
      {desc.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 2 }}>
          {desc.map((d) => (
            <span key={d.name} style={{ font: "12px/16px var(--font-family)", color: "var(--text-tertiary)" }}>
              {d.name}: {d.why}
            </span>
          ))}
        </div>
      )}
      {calma.length > 0 && (
        <span style={{ font: "12px/16px var(--font-family)", color: "var(--text-tertiary)" }}>
          Sin viento: {calma.join(", ")}
        </span>
      )}
    </div>
  );
}

function Rejilla({
  grid,
  dias,
  mode,
  pick,
  onPick,
}: {
  grid: Grid;
  dias: string[];
  mode: ColorMode;
  pick: Pick | null;
  onPick: (p: Pick) => void;
}) {
  return (
    <div style={{ overflow: "auto", margin: "0 6px" }}>
      {/* Cabecera de horas: pegada arriba al hacer scroll vertical. */}
      <div style={{ display: "flex", gap: 2, position: "sticky", top: 0, zIndex: 2, background: "var(--solid-background-base)", width: "max-content", paddingBottom: 4 }}>
        <div style={{ position: "sticky", left: 0, width: ANCHO_SPOT, flex: "none", background: "var(--solid-background-base)" }} />
        {dias.map((d, di) => (
          <div key={d} style={{ display: "flex", gap: 2 }}>
            <CabeceraHoras ml={di > 0 ? 12 : 0} />
          </div>
        ))}
      </div>

      {grid.filas.map((fila) => (
        <div key={fila.id} style={{ display: "flex", gap: 2, marginBottom: 2, width: "max-content" }}>
          <EtiquetaSpot short={fila.short} drive={fila.drive} country={fila.country} facing={fila.facing} />
          {dias.map((d, di) => (
            <div key={d} style={{ display: "flex", gap: 2 }}>
              {(fila.porDia.get(d) ?? []).map((c, i) => (
                <Celda
                  key={i}
                  c={c}
                  mode={mode}
                  ml={di > 0 && i === 0 ? 12 : 0}
                  seleccionada={!!pick && pick.spotId === fila.id && pick.dia === d && pick.i === i}
                  onClick={() => onPick({ spotId: fila.id, dia: d, i })}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Esqueleto() {
  return (
    <div style={{ padding: "0 6px" }}>
      {[60, 48, 56, 72, 52, 64, 44, 58].map((w, r) => (
        <div key={r} style={{ display: "flex", gap: 2, marginBottom: 2, alignItems: "center" }}>
          <div style={{ width: ANCHO_SPOT, flex: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 26, height: 26, borderRadius: 999, background: "var(--fill-subtle-secondary)" }} />
            <div style={{ width: w, height: 10, borderRadius: 3, background: "var(--fill-subtle-secondary)" }} />
          </div>
          {HOURS.map((h) => (
            <div key={h} style={{ width: 20, height: 36, borderRadius: 3, background: "var(--fill-subtle-tertiary)" }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function App() {
  const { data, cargando, error, refrescar } = useForecast();
  const grid = useGrid(data);
  const escritorio = useMediaQuery("(min-width: 900px)");

  const [sel, setSel] = useState(0);
  const [mode, setMode] = useState<ColorMode>("navegabilidad");
  const [pick, setPick] = useState<Pick | null>(null);
  const [fb, setFb] = useState<"Mejora" | "Nuevo spot" | null>(null);

  const dia = grid?.dias.length ? grid.dias[Math.min(sel, grid.dias.length - 1)] : undefined;
  const diasVisibles = escritorio ? (grid?.dias ?? []) : dia ? [dia] : [];

  let detalle = "Toca una celda para ver el detalle de esa hora.";
  if (pick && grid) {
    const fila = grid.filas.find((f) => f.id === pick.spotId);
    const c = fila?.porDia.get(pick.dia)?.[pick.i];
    if (fila && c) {
      detalle = `${fila.name} · ${HOURS[pick.i]}:00 · ${Math.round(c.kn)} kn, rachas ${Math.round(c.gust)} · ${CMP_LONG[Math.round(c.dir / 22.5) % 16]} (${c.dirClass})`;
    }
  }

  const enlace = {
    padding: 0,
    border: 0,
    background: "none",
    color: "var(--accent-text-primary)",
    font: "600 13px/18px var(--font-family)",
    cursor: "pointer",
  } as const;

  return (
    <div
      data-theme="dark"
      style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        background: "var(--solid-background-base)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-family)",
        maxWidth: escritorio ? undefined : 480,
        margin: "0 auto",
      }}
    >
      <Cabecera
        modelo={data?.model}
        edad={data?.age_seconds}
        stale={data?.stale}
        onFeedback={() => setFb("Mejora")}
      />

      {error && (
        <div style={{ margin: "0 12px 12px", padding: "8px 12px", borderRadius: 4, background: "rgba(239,68,68,.12)", font: "12px/16px var(--font-family)", color: "var(--system-critical)" }}>
          No se pudo contactar con el backend ({error}).
          {data ? " Se muestran los últimos datos recibidos." : ""}
        </div>
      )}

      {cargando && !data && <Esqueleto />}

      {grid && dia && (
        <>
          {/* En escritorio caben los 3 días a la vez, así que las pestañas
              solo tienen sentido en móvil. */}
          {!escritorio && (
            <Pestanas
              grid={grid}
              sel={sel}
              onSel={(i) => {
                setSel(i);
                setPick(null);
              }}
            />
          )}

          {escritorio && (
            <div style={{ display: "flex", gap: 2, padding: "0 6px 6px", width: "max-content" }}>
              <div style={{ width: ANCHO_SPOT, flex: "none" }} />
              {grid.dias.map((d, di) => (
                <div
                  key={d}
                  style={{ width: 20 * 12 + 2 * 11, marginLeft: di ? 12 : 0, font: "600 12px/16px var(--font-family)" }}
                >
                  {etiquetaDia(d).largo}
                  <span style={{ marginLeft: 6, fontWeight: 400, color: "var(--text-tertiary)" }}>
                    {grid.ventanasPorDia.get(d)?.length ?? 0} ventanas
                  </span>
                </div>
              ))}
            </div>
          )}

          <Rejilla grid={grid} dias={diasVisibles} mode={mode} pick={pick} onPick={setPick} />

          <div style={{ margin: "8px 12px 0", padding: "8px 12px", borderRadius: 4, background: "var(--fill-subtle-secondary)", font: "13px/18px var(--font-family)", color: "var(--text-secondary)" }}>
            {detalle}
          </div>

          <MejoresVentanas grid={grid} dia={dia} />

          <Leyenda mode={mode} />

          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px 12px", ...fuente }}>
            <Rosa facing={SPOT_META.castelldefels.facing} size={20} />
            Rosa del spot: verde lateral, ámbar frontal o side-off, rojo offshore
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "4px 16px 24px", flexWrap: "wrap" }}>
            <button onClick={() => setFb("Nuevo spot")} style={enlace}>
              ¿Falta un spot? Propón uno
            </button>
            <button
              onClick={() => setMode(mode === "navegabilidad" ? "velocidad" : "navegabilidad")}
              style={enlace}
            >
              Colorear por: {mode}
            </button>
            <button onClick={refrescar} style={enlace}>
              Actualizar
            </button>
          </div>
        </>
      )}

      {fb && <Feedback tipoInicial={fb} onClose={() => setFb(null)} />}
    </div>
  );
}
