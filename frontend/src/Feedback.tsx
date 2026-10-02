import { useState, type CSSProperties } from "react";

export type TipoFeedback = "Mejora" | "Error" | "Nuevo spot";

const input: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 4,
  border: "1px solid var(--stroke-control-default)",
  borderBottomColor: "var(--stroke-control-secondary)",
  background: "var(--fill-control-default)",
  color: "var(--text-primary)",
  font: "14px/20px var(--font-family)",
};

const label: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  font: "12px/16px var(--font-family)",
  color: "var(--text-secondary)",
};

/**
 * Panel de sugerencias. Dos presentaciones del mismo contenido, como en el
 * diseño: hoja inferior en móvil, cajón lateral en escritorio.
 *
 * Todavía no envía a ningún sitio: el backend no tiene endpoint para esto. El
 * formulario de "Nuevo spot" pide justo lo que haría falta para dar uno de
 * alta, incluidas las direcciones buenas y offshore, que son las que dibujan
 * su rosa.
 */
export function Feedback({
  tipoInicial,
  variante,
  onClose,
}: {
  tipoInicial: TipoFeedback;
  variante: "hoja" | "cajon";
  onClose: () => void;
}) {
  const [tipo, setTipo] = useState<TipoFeedback>(tipoInicial);
  const [enviado, setEnviado] = useState(false);
  const esSpot = tipo === "Nuevo spot";
  const cajon = variante === "cajon";

  const panel: CSSProperties = cajon
    ? {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: 400,
        padding: 24,
        boxSizing: "border-box",
        background: "var(--solid-background-tertiary)",
        borderLeft: "1px solid var(--stroke-control-default)",
        boxShadow: "var(--shadow-dialog)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        overflow: "auto",
      }
    : {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        padding: "12px 20px 24px",
        borderRadius: "8px 8px 0 0",
        background: "var(--solid-background-tertiary)",
        boxShadow: "var(--shadow-dialog)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxHeight: "90%",
        overflowY: "auto",
      };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: cajon ? "rgba(0,0,0,.35)" : "rgba(0,0,0,.45)" }}
      />
      <div style={panel}>
        {!cajon && (
          <div style={{ width: 36, height: 4, borderRadius: 999, background: "var(--stroke-control-secondary)", margin: "0 auto" }} />
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ font: "600 20px/28px var(--font-family)" }}>Sugerencias</span>
          <button
            onClick={onClose}
            style={{ padding: "6px 10px", border: 0, borderRadius: 4, background: "transparent", color: "var(--text-secondary)", font: "600 13px/18px var(--font-family)", cursor: "pointer" }}
          >
            Cerrar
          </button>
        </div>

        <div style={{ display: "flex", padding: 2, gap: 2, borderRadius: 4, background: "var(--fill-subtle-secondary)" }}>
          {(["Mejora", "Error", "Nuevo spot"] as TipoFeedback[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTipo(t);
                setEnviado(false);
              }}
              style={{
                flex: 1,
                padding: "6px 4px",
                border: 0,
                borderRadius: 3,
                cursor: "pointer",
                background: t === tipo ? "var(--system-accent)" : "transparent",
                color: t === tipo ? "var(--text-on-accent)" : "var(--text-primary)",
                font: "600 13px/18px var(--font-family)",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {enviado ? (
          <div style={{ padding: cajon ? "8px 0" : "16px 0", font: "14px/20px var(--font-family)" }}>
            <b style={{ fontWeight: 600 }}>Recibido.</b> Te llegará al correo y queda en la lista de
            pendientes.
          </div>
        ) : (
          <>
            {esSpot ? (
              <>
                <label style={label}>
                  Nombre del spot
                  <input placeholder="p. ej. L'Ampolla" style={input} />
                </label>
                <label style={label}>
                  Ubicación
                  <input placeholder="Enlace de Google Maps o Windguru" style={input} />
                </label>
                <label style={label}>
                  Direcciones buenas y offshore
                  <input placeholder="p. ej. lateral con SO–O, offshore con NO" style={input} />
                  <span style={{ color: "var(--text-tertiary)" }}>Sirve para dibujar la rosa del spot.</span>
                </label>
                {cajon && (
                  <label style={label}>
                    Comentario (opcional)
                    <input placeholder="Accesos, aparcamiento, temporada…" style={input} />
                  </label>
                )}
              </>
            ) : (
              <label style={label}>
                {tipo === "Error" ? "¿Qué ha fallado?" : "¿Qué mejorarías?"}
                <textarea
                  rows={cajon ? 8 : 5}
                  placeholder="Escribe aquí…"
                  style={{ ...input, resize: "vertical" }}
                />
              </label>
            )}

            {cajon ? (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: "auto" }}>
                <button
                  onClick={onClose}
                  style={{ padding: "8px 16px", borderRadius: 4, border: "1px solid var(--stroke-control-default)", background: "var(--fill-control-default)", color: "var(--text-primary)", font: "600 14px/20px var(--font-family)", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setEnviado(true)}
                  style={{ padding: "8px 16px", border: 0, borderRadius: 4, background: "var(--system-accent)", color: "var(--text-on-accent)", font: "600 14px/20px var(--font-family)", cursor: "pointer" }}
                >
                  Enviar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEnviado(true)}
                style={{ padding: 10, border: 0, borderRadius: 4, background: "var(--system-accent)", color: "var(--text-on-accent)", font: "600 14px/20px var(--font-family)", cursor: "pointer" }}
              >
                Enviar
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
