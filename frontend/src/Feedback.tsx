import { useState } from "react";

type Tipo = "Mejora" | "Error" | "Nuevo spot";

/**
 * Panel de sugerencias. De momento no envía a ningún sitio: el backend no
 * tiene endpoint para esto. El formulario de "Nuevo spot" pide justo lo que
 * haría falta para dar de alta uno, incluidas las direcciones buenas y
 * offshore, que son las que dibujan la rosa.
 */
export function Feedback({ tipoInicial, onClose }: { tipoInicial: Tipo; onClose: () => void }) {
  const [tipo, setTipo] = useState<Tipo>(tipoInicial);
  const [enviado, setEnviado] = useState(false);
  const esSpot = tipo === "Nuevo spot";

  const input: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 4,
    border: "1px solid var(--stroke-control-default)",
    borderBottomColor: "var(--stroke-control-secondary)",
    background: "var(--fill-control-default)",
    color: "var(--text-primary)",
    font: "14px/20px var(--font-family)",
  };
  const label: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    font: "12px/16px var(--font-family)",
    color: "var(--text-secondary)",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)" }} />
      <div
        style={{
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
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 999, background: "var(--stroke-control-secondary)", margin: "0 auto" }} />
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
          {(["Mejora", "Error", "Nuevo spot"] as Tipo[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTipo(t); setEnviado(false); }}
              style={{
                flex: 1, padding: "6px 4px", border: 0, borderRadius: 3, cursor: "pointer",
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
          <div style={{ padding: "16px 0", font: "14px/20px var(--font-family)" }}>
            <b style={{ fontWeight: 600 }}>Recibido.</b> Te llegará al correo y queda en la lista de pendientes.
          </div>
        ) : (
          <>
            {esSpot ? (
              <>
                <label style={label}>Nombre del spot<input placeholder="p. ej. L'Ampolla" style={input} /></label>
                <label style={label}>Ubicación<input placeholder="Enlace de Google Maps o Windguru" style={input} /></label>
                <label style={label}>
                  Direcciones buenas y offshore
                  <input placeholder="p. ej. lateral con SO–O, offshore con NO" style={input} />
                  <span style={{ color: "var(--text-tertiary)" }}>Sirve para dibujar la rosa del spot.</span>
                </label>
              </>
            ) : (
              <label style={label}>
                {tipo === "Error" ? "¿Qué ha fallado?" : "¿Qué mejorarías?"}
                <textarea rows={5} placeholder="Escribe aquí…" style={{ ...input, resize: "vertical" }} />
              </label>
            )}
            <button
              onClick={() => setEnviado(true)}
              style={{ padding: 10, border: 0, borderRadius: 4, background: "var(--system-accent)", color: "var(--text-on-accent)", font: "600 14px/20px var(--font-family)", cursor: "pointer" }}
            >
              Enviar
            </button>
          </>
        )}
      </div>
    </>
  );
}
