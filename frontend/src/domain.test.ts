import { describe, expect, it } from "vitest";

import {
  BANDAS,
  bandaDe,
  classify,
  classifyDirection,
  gustBarColor,
  roseOf,
  styleOf,
  UMBRAL_VENTANA_KN,
  windowsOf,
  type Classified,
} from "./domain";

/** Castelldefels mira a 165 grados. */
const FACING = 165;
const LATERAL = 225; // lateral en Castelldefels
const OFFSHORE = 345; // justo enfrente de la playa

describe("clasificación de dirección", () => {
  it("el viento que viene de donde mira la playa es frontal", () => {
    expect(classifyDirection(165, FACING)).toBe("frontal");
    expect(classifyDirection(190, FACING)).toBe("frontal");
  });

  it("el viento que cruza la playa es lateral: lo que se busca", () => {
    expect(classifyDirection(225, FACING)).toBe("lateral");
    expect(classifyDirection(265, FACING)).toBe("lateral");
  });

  it("el viento opuesto a la playa es offshore: empuja mar adentro", () => {
    expect(classifyDirection(345, FACING)).toBe("offshore");
    expect(classifyDirection(320, FACING)).toBe("offshore");
  });

  it("las fronteras caen donde dice el diseño", () => {
    expect(classifyDirection(165 + 30, FACING)).toBe("frontal");
    expect(classifyDirection(165 + 31, FACING)).toBe("lateral");
    expect(classifyDirection(165 + 110, FACING)).toBe("lateral");
    expect(classifyDirection(165 + 111, FACING)).toBe("side-off");
    expect(classifyDirection(165 + 135, FACING)).toBe("side-off");
    expect(classifyDirection(165 + 136, FACING)).toBe("offshore");
  });
});

describe("bandas de velocidad", () => {
  // Las fronteras son el punto donde la escala puede fallar sin que se note:
  // 15.0 kn debe caer en la banda de 15–20, no en la de 10–15.
  it.each([
    [0, 0],
    [9.9, 0],
    [10, 1],
    [14.9, 1],
    [15, 2],
    [19.9, 2],
    [20, 3],
    [24.9, 3],
    [25, 4],
    [34.9, 4],
    [35, 5],
    [60, 5],
  ])("%i kn cae en la banda %i", (kn, banda) => {
    expect(bandaDe(kn)).toBe(banda);
  });

  it("las bandas cubren el rango sin huecos ni solapes", () => {
    for (let i = 1; i < BANDAS.length; i++) {
      expect(BANDAS[i].min).toBe(BANDAS[i - 1].max);
    }
    expect(BANDAS[0].min).toBe(0);
    expect(BANDAS.at(-1)!.max).toBe(Infinity);
  });

  it("la rampa es monótona: más viento, color más claro", () => {
    // Si dos bandas compartieran color, la escala dejaria de informar.
    const fondos = BANDAS.map((b) => b.bg);
    expect(new Set(fondos).size).toBe(BANDAS.length);
  });
});

describe("el color dice cuánto viento hay, no si se puede navegar", () => {
  it("el racheo NO cambia el color de la celda", () => {
    // Depende del equipo de cada uno, asi que se informa aparte con la barra
    // inferior y no tiñendo la celda.
    const estable = classify("castelldefels", 18, 20, LATERAL)!;
    const rachado = classify("castelldefels", 18, 32, LATERAL)!;
    expect(estable.band).toBe(rachado.band);
    expect(styleOf(estable).bg).toBe(styleOf(rachado).bg);
  });

  it("pero el racheo sí se señala en la barra", () => {
    expect(gustBarColor(3)).toBe("transparent");
    expect(gustBarColor(8)).toBe("#EAB308");
    expect(gustBarColor(12)).toBe("#EF4444");
  });

  it("la dirección tampoco cambia el color, salvo offshore", () => {
    const lateral = classify("castelldefels", 18, 20, LATERAL)!;
    const frontal = classify("castelldefels", 18, 20, 170)!;
    expect(styleOf(lateral).bg).toBe(styleOf(frontal).bg);
  });

  it("el offshore con viento de verdad rompe la escala: es seguridad", () => {
    const c = classify("castelldefels", 20, 23, OFFSHORE)!;
    expect(c.offshore).toBe(true);
    expect(styleOf(c).bg).not.toBe(BANDAS[c.band].bg);
  });

  it("el offshore flojo no se marca como peligroso", () => {
    expect(classify("castelldefels", 6, 8, OFFSHORE)!.offshore).toBe(false);
  });

  it("sin datos devuelve null en vez de reventar", () => {
    expect(classify("castelldefels", null, 10, 200)).toBeNull();
    expect(classify("spot_inexistente", 18, 21, 200)).toBeNull();
  });
});

describe("ventanas navegables", () => {
  const dia = (kns: number[], dir = LATERAL): (Classified | null)[] =>
    kns.map((kn) => classify("castelldefels", kn, kn + 3, dir));

  it("una ventana son 2 h seguidas o más por encima del umbral", () => {
    expect(UMBRAL_VENTANA_KN).toBe(15);
    const v = windowsOf(dia([6, 7, 8, 10, 12, 14, 18, 20, 21, 19, 17, 9]), "castelldefels", "d", 30, false);
    expect(v).toHaveLength(1);
    expect(v[0].desde).toBe(6);
    expect(v[0].horas).toBe(5);
  });

  it("justo en el umbral cuenta", () => {
    const v = windowsOf(dia([6, 6, 6, 15, 15, 6, 6, 6, 6, 6, 6, 6]), "castelldefels", "d", 30, false);
    expect(v).toHaveLength(1);
  });

  it("una hora suelta no es ventana: se buscan tramos, no picos", () => {
    expect(windowsOf(dia([6, 6, 6, 20, 6, 6, 6, 6, 6, 6, 6, 6]), "castelldefels", "d", 30, false)).toHaveLength(0);
  });

  it("el offshore no cuenta como ventana aunque sobre viento", () => {
    // 20 nudos perfectos, pero soplando de tierra a mar.
    expect(windowsOf(dia([6, 6, 20, 20, 20, 20, 6, 6, 6, 6, 6, 6], OFFSHORE), "castelldefels", "d", 30, false)).toHaveLength(0);
  });

  it("un spot lejano solo compensa si la ventana es larga y buena", () => {
    const corta = dia([6, 6, 6, 6, 6, 6, 18, 18, 6, 6, 6, 6]); // 2 h
    expect(windowsOf(corta, "castelldefels", "d", 30, false)[0].compensa).toBe(true);
    expect(windowsOf(corta, "leucate", "d", 160, true)[0].compensa).toBe(false);
  });

  it("la distancia penaliza la puntuación", () => {
    const cs = dia([6, 6, 6, 6, 6, 6, 18, 18, 18, 18, 6, 6]);
    const cerca = windowsOf(cs, "barcelona", "d", 15, false)[0];
    const lejos = windowsOf(cs, "leucate", "d", 160, true)[0];
    expect(cerca.score).toBeGreaterThan(lejos.score);
  });
});

describe("rosa de los vientos", () => {
  it("dibuja los 16 sectores", () => {
    const r = roseOf(FACING);
    expect(r.startsWith("conic-gradient(from -11.25deg")).toBe(true);
    expect(r.match(/transparent/g)).toHaveLength(16);
  });

  it("toda playa tiene sectores laterales y offshore", () => {
    expect(roseOf(0)).toContain("#EF4444");
    expect(roseOf(0)).toContain("#22C55E");
  });
});
