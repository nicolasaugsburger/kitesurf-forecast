import { useState } from "react";

import {
  anchoMinimo,
  Celda,
  Hueco,
  ESCRITORIO,
  EtiquetaSpot,
  Leyenda,
  MOVIL,
  type Medidas,
} from "./components";
import { Feedback, type TipoFeedback } from "./Feedback";
import type { ColorMode, Ventana } from "./domain";
import { CMP_LONG, HOURS } from "./spots";
import { etiquetaDia, useGrid, type Grid } from "./useGrid";
import { useForecast } from "./useForecast";
import { useMediaQuery } from "./useMediaQuery";

const secundario = { font: "12px/16px var(--font-family)", color: "var(--text-secondary)" } as const;
const terciario = { font: "12px/16px var(--font-family)", color: "var(--text-tertiary)" } as const;

type Pick = { spotId: string; dia: string; i: number };

const enlace = {
  padding: 0,
  border: 0,
  background: "none",
  color: "var(--accent-text-primary)",
  font: "600 13px/18px var(--font-family)",
  cursor: "pointer",
} as const;

const boton = {
  padding: "6px 12px",
  borderRadius: 4,
  border: "1px solid var(--stroke-control-default)",
  background: "var(--fill-control-default)",
  color: "var(--text-primary)",
  font: "600 13px/18px var(--font-family)",
  cursor: "pointer",
  flex: "none",
} as const;

/* ------------------------------------------------------------------ *
 * Piezas compartidas
 * ------------------------------------------------------------------ */

function Rejilla({
  grid,
  dias,
  mode,
  m,
  flexible,
  pick,
  onPick,
}: {
  grid: Grid;
  dias: string[];
  mode: ColorMode;
  m: Medidas;
  /** Escritorio: las columnas crecen para llenar el ancho disponible. */
  flexible: boolean;
  pick?: Pick | null;
  onPick?: (p: Pick) => void;
}) {
  // Las tres filas (días, horas, spots) comparten esta estructura para que
  // queden alineadas pase lo que pase con el ancho.
  const fila = {
    display: "flex",
    gap: 2,
    width: flexible ? "100%" : "max-content",
    minWidth: flexible ? anchoMinimo(m, dias.length) : undefined,
  } as const;

  const bloqueDia = (di: number) =>
    ({
      display: "flex",
      gap: 2,
      ...(flexible
        ? { flex: "1 1 0", minWidth: m.celda * 12 + 2 * 11 }
        : {}),
      marginLeft: di > 0 ? 12 : undefined,
    }) as const;

  const columnaSpot = {
    position: "sticky",
    left: 0,
    zIndex: 2,
    width: m.spot,
    flex: "none",
    background: "var(--solid-background-base)",
  } as const;

  return (
    <>
      <div style={{ ...fila, marginBottom: 4 }}>
        <div style={columnaSpot} />
        {dias.map((d, di) => (
          <div key={d} style={bloqueDia(di)}>
            {HOURS.map((h) => (
              <Hueco key={h} m={m} flexible={flexible}>
                <div
                  style={{
                    textAlign: "center",
                    font: "11px/16px var(--font-family-mono)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {h}
                </div>
              </Hueco>
            ))}
          </div>
        ))}
      </div>

      {grid.filas.map((f) => (
        <div key={f.id} style={{ ...fila, marginBottom: 2 }}>
          <EtiquetaSpot
            nombre={m.compass ? f.name : f.short}
            drive={f.drive}
            country={f.country}
            facing={f.facing}
            m={m}
          />
          {dias.map((d, di) => (
            <div key={d} style={bloqueDia(di)}>
              {(f.porDia.get(d) ?? []).map((c, i) => (
                <Hueco key={i} m={m} flexible={flexible}>
                  <Celda
                    c={c}
                    mode={mode}
                    m={m}
                    seleccionada={!!pick && pick.spotId === f.id && pick.dia === d && pick.i === i}
                    onClick={onPick ? () => onPick({ spotId: f.id, dia: d, i }) : undefined}
                  />
                </Hueco>
              ))}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

/** Tarjeta compacta de ventana, la del panel inferior de escritorio. */
function TarjetaVentana({ v, n, grid }: { v: Ventana; n: number; grid: Grid }) {
  const fila = grid.filas.find((f) => f.id === v.spotId);
  if (!fila) return null;
  const kns = v.celdas.map((c) => c.kn);
  const medio = v.celdas[Math.floor(v.celdas.length / 2)];
  return (
    <div style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--stroke-control-default)", background: "var(--fill-card-default)", display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ font: "600 13px/18px var(--font-family)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        <span style={{ fontFamily: "var(--font-family-mono)", color: "var(--accent-text-primary)", marginRight: 6 }}>
          {n}
        </span>
        {fila.short}
      </span>
      <span style={{ font: "12px/16px var(--font-family-mono)" }}>
        {HOURS[v.desde]}–{HOURS[v.hasta - 1] + 1} h · {Math.round(Math.min(...kns))}–
        {Math.round(Math.max(...kns))} kn
      </span>
      <span style={secundario}>
        {medio.compass} rachas +{Math.round(Math.max(...v.celdas.map((c) => c.delta)))}
      </span>
      {/* Una ventana en un spot lejano que no da para el viaje sigue siendo
          informacion util: se muestra, pero dicho claramente. */}
      {!v.compensa && (
        <span style={{ font: "12px/16px var(--font-family)", color: "var(--text-tertiary)" }}>
          No compensa · {fila.drive}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Escritorio
 * ------------------------------------------------------------------ */

function VistaEscritorio({
  grid,
  data,
  mode,
  onFeedback,
}: {
  grid: Grid;
  data: { model: string; fetched_at: string; age_seconds: number; stale: boolean };
  mode: ColorMode;
  onFeedback: (t: TipoFeedback) => void;
}) {
  const anchoDia = ESCRITORIO.celda * 12 + 2 * 11;
  const recibido = data.fetched_at.slice(11, 16);

  return (
    <>
      {/* Cabecera: identidad a la izquierda, leyenda en el centro, acciones
          a la derecha. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", gap: 16, borderBottom: "1px solid var(--stroke-divider)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: "none", whiteSpace: "nowrap" }}>
          <div style={{ font: "600 20px/28px var(--font-family)" }}>
            Viento · {grid.dias.length} días
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, ...secundario }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: data.stale ? "#EAB308" : "#22C55E" }} />
            {data.model.toUpperCase().replace(/_/g, " ")}
          </div>
          <div style={{ paddingLeft: 14, ...terciario }}>
            recibido {recibido} · hace {Math.round(data.age_seconds / 60)} min
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "center", flex: 1 }}>
          <Leyenda mode={mode} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flex: "none" }}>
          <button onClick={() => onFeedback("Mejora")} style={boton}>
            Sugerencias
          </button>
          <button onClick={() => onFeedback("Nuevo spot")} style={enlace}>
            ¿Falta un spot? Propón uno
          </button>
        </div>
      </div>

      <div style={{ padding: "16px 24px 8px", overflow: "auto" }}>
        {/* Cabecera de días: nombre, ventanas y qué modelo alimenta ese día. */}
        <div
          style={{
            display: "flex",
            gap: 2,
            width: "100%",
            minWidth: anchoMinimo(ESCRITORIO, grid.dias.length),
            marginBottom: 4,
          }}
        >
          <div style={{ position: "sticky", left: 0, zIndex: 2, width: ESCRITORIO.spot, flex: "none", background: "var(--solid-background-base)" }} />
          {grid.dias.map((d, di) => {
            const n = grid.ventanasPorDia.get(d)?.length ?? 0;
            return (
              <div
                key={d}
                style={{
                  flex: "1 1 0",
                  minWidth: anchoDia,
                  marginLeft: di ? 12 : 0,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  font: "600 14px/20px var(--font-family)",
                  paddingBottom: 4,
                  borderBottom: "1px solid var(--stroke-divider)",
                }}
              >
                <span>
                  {etiquetaDia(d).largo}
                  <span style={{ fontWeight: 400, color: "var(--text-tertiary)", marginLeft: 8, fontSize: 12 }}>
                    {n === 1 ? "1 ventana" : `${n} ventanas`}
                  </span>
                </span>
                <span style={{ font: "400 11px/14px var(--font-family-mono)", color: "var(--text-tertiary)" }}>
                  AROME
                </span>
              </div>
            );
          })}
        </div>

        <Rejilla grid={grid} dias={grid.dias} mode={mode} m={ESCRITORIO} flexible />
      </div>

      {/* Mejores ventanas: una columna por día. */}
      <div style={{ padding: "16px 24px 24px", borderTop: "1px solid var(--stroke-divider)" }}>
        <div style={{ font: "600 14px/20px var(--font-family)", marginBottom: 12 }}>
          Mejores ventanas por día
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${grid.dias.length}, minmax(0,1fr))`, gap: 12 }}>
          {grid.dias.map((d) => {
            const todas = grid.ventanasPorDia.get(d) ?? [];
            const compensan = todas.filter((v) => v.compensa);
            // Si ninguna compensa, se enseñan las que hay avisando de ello:
            // mejor eso que un "Sin ventanas" que oculta que habia viento.
            const mostrar = (compensan.length ? compensan : todas).slice(0, 2);
            return (
              <div key={d} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ font: "600 13px/18px var(--font-family)", color: "var(--text-secondary)" }}>
                  {etiquetaDia(d).corto}
                </span>
                {mostrar.length === 0 ? (
                  <span style={terciario}>Sin ventanas</span>
                ) : (
                  mostrar.map((v, i) => (
                    <TarjetaVentana key={`${v.spotId}-${v.desde}`} v={v} n={i + 1} grid={grid} />
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Móvil
 * ------------------------------------------------------------------ */

function VistaMovil({
  grid,
  data,
  mode,
  onFeedback,
}: {
  grid: Grid;
  data: { model: string; age_seconds: number; stale: boolean };
  mode: ColorMode;
  onFeedback: (t: TipoFeedback) => void;
}) {
  const [sel, setSel] = useState(0);
  const [pick, setPick] = useState<Pick | null>(null);
  const dia = grid.dias[Math.min(sel, grid.dias.length - 1)];

  let detalle = "Toca una celda para ver el detalle de esa hora.";
  if (pick) {
    const fila = grid.filas.find((f) => f.id === pick.spotId);
    const c = fila?.porDia.get(pick.dia)?.[pick.i];
    if (fila && c) {
      detalle = `${fila.name} · ${HOURS[pick.i]}:00 · ${Math.round(c.kn)} kn, rachas ${Math.round(c.gust)} · ${CMP_LONG[Math.round(c.dir / 22.5) % 16]} (${c.dirClass})`;
    }
  }

  const vs = (grid.ventanasPorDia.get(dia) ?? []).slice(0, 2);
  const desc = grid.descartadosPorDia.get(dia) ?? [];
  const calma = grid.calmaPorDia.get(dia) ?? [];

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 16px 12px", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ font: "600 20px/28px var(--font-family)" }}>Viento</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, ...secundario }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: data.stale ? "#EAB308" : "#22C55E" }} />
            {data.model.toUpperCase().replace(/_/g, " ")} · hace {Math.round(data.age_seconds / 60)} min
          </div>
        </div>
        <button onClick={() => onFeedback("Mejora")} style={boton}>
          Sugerencias
        </button>
      </div>

      <div style={{ display: "flex", gap: 4, padding: "0 12px 12px", overflowX: "auto" }}>
        {grid.dias.map((d, i) => {
          const n = grid.ventanasPorDia.get(d)?.length ?? 0;
          return (
            <button
              key={d}
              onClick={() => {
                setSel(i);
                setPick(null);
              }}
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

      <div style={{ overflow: "auto", margin: "0 6px" }}>
        <Rejilla grid={grid} dias={[dia]} mode={mode} m={MOVIL} flexible={false} pick={pick} onPick={setPick} />
      </div>

      <div style={{ margin: "8px 12px 0", padding: "8px 12px", borderRadius: 4, background: "var(--fill-subtle-secondary)", font: "13px/18px var(--font-family)", color: "var(--text-secondary)" }}>
        {detalle}
      </div>

      <div style={{ margin: "12px 12px 0", padding: 12, borderRadius: 8, background: "var(--fill-card-default)", border: "1px solid var(--stroke-control-default)", display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={secundario}>Mejores ventanas · {etiquetaDia(dia).largo}</span>
        {vs.length === 0 ? (
          <span style={{ font: "14px/20px var(--font-family)", color: "var(--text-tertiary)" }}>
            Ninguna ventana navegable este día.
          </span>
        ) : (
          vs.map((v, i) => <TarjetaVentana key={`${v.spotId}-${v.desde}`} v={v} n={i + 1} grid={grid} />)
        )}
        {desc.map((x) => (
          <span key={x.name} style={terciario}>
            {x.name}: {x.why}
          </span>
        ))}
        {calma.length > 0 && <span style={terciario}>Sin viento: {calma.join(", ")}</span>}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px", padding: "12px 16px 8px" }}>
        <Leyenda mode={mode} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "4px 16px 24px", flexWrap: "wrap" }}>
        <button onClick={() => onFeedback("Nuevo spot")} style={enlace}>
          ¿Falta un spot? Propón uno
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Esqueleto({ m }: { m: Medidas }) {
  return (
    <div style={{ padding: "16px 24px" }}>
      {[60, 48, 56, 72, 52, 64, 44, 58].map((w, r) => (
        <div key={r} style={{ display: "flex", gap: 2, marginBottom: 2, alignItems: "center" }}>
          <div style={{ width: m.spot, flex: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: m.rosa, height: m.rosa, borderRadius: 999, background: "var(--fill-subtle-secondary)" }} />
            <div style={{ width: w, height: 10, borderRadius: 3, background: "var(--fill-subtle-secondary)" }} />
          </div>
          {HOURS.map((h) => (
            <div key={h} style={{ width: m.celda, height: m.alto, borderRadius: 3, background: "var(--fill-subtle-tertiary)" }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const { data, cargando, error } = useForecast();
  const grid = useGrid(data);
  const escritorio = useMediaQuery("(min-width: 1000px)");

  // Sin control para cambiarlo: el diseño colorea siempre por navegabilidad.
  const mode: ColorMode = "navegabilidad";
  const [fb, setFb] = useState<TipoFeedback | null>(null);

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
      {error && (
        <div style={{ margin: 12, padding: "8px 12px", borderRadius: 4, background: "rgba(239,68,68,.12)", font: "12px/16px var(--font-family)", color: "var(--system-critical)" }}>
          No se pudo contactar con el backend ({error}).
          {data ? " Se muestran los últimos datos recibidos." : ""}
        </div>
      )}

      {cargando && !data && <Esqueleto m={escritorio ? ESCRITORIO : MOVIL} />}

      {grid && data && grid.dias.length > 0 &&
        (escritorio ? (
          <VistaEscritorio
            grid={grid}
            data={data}
            mode={mode}
            onFeedback={setFb}
          />
        ) : (
          <VistaMovil
            grid={grid}
            data={data}
            mode={mode}
            onFeedback={setFb}
          />
        ))}

      {fb && (
        <Feedback
          tipoInicial={fb}
          variante={escritorio ? "cajon" : "hoja"}
          onClose={() => setFb(null)}
        />
      )}
    </div>
  );
}
