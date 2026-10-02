import { describe, expect, it } from "vitest";

import { classify, classifyDirection, roseOf, windowsOf, type Classified } from "./domain";

/** Castelldefels mira a 165 grados. */
const FACING = 165;

describe("clasificación de dirección", () => {
  it("el viento que viene de donde mira la playa es frontal", () => {
    expect(classifyDirection(165, FACING)).toBe("frontal");
    expect(classifyDirection(190, FACING)).toBe("frontal"); // 25 de diferencia
  });

  it("el viento que cruza la playa es lateral: lo que se busca", () => {
    expect(classifyDirection(225, FACING)).toBe("lateral"); // 60
    expect(classifyDirection(265, FACING)).toBe("lateral"); // 100
  });

  it("el viento opuesto a la playa es offshore: empuja mar adentro", () => {
    expect(classifyDirection(345, FACING)).toBe("offshore"); // 180, justo enfrente
    expect(classifyDirection(320, FACING)).toBe("offshore"); // 155
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

describe("navegabilidad", () => {
  const lateral = 225; // lateral en Castelldefels

  it("por debajo de 10 nudos no se navega", () => {
    expect(classify("castelldefels", 9, 11, lateral)!.level).toBe(0);
  });

  it("15-25 nudos laterales y estables es lo ideal", () => {
    expect(classify("castelldefels", 18, 21, lateral)!.level).toBe(3);
  });

  it("por encima de 32 nudos deja de ser navegable", () => {
    expect(classify("castelldefels", 35, 38, lateral)!.level).toBe(0);
  });

  it("el racheo penaliza aunque la media sea perfecta", () => {
    const estable = classify("castelldefels", 18, 21, lateral)!; // +3
    const rachado = classify("castelldefels", 18, 25, lateral)!; // +7
    const muyRachado = classify("castelldefels", 18, 30, lateral)!; // +12
    expect(estable.level).toBe(3);
    expect(rachado.level).toBe(2);
    expect(muyRachado.level).toBe(1);
  });

  it("el offshore con viento de verdad anula el spot, no lo empeora", () => {
    // 20 nudos perfectos, pero soplando de tierra a mar.
    const c = classify("castelldefels", 20, 23, 345)!;
    expect(c.dirClass).toBe("offshore");
    expect(c.offshore).toBe(true);
    expect(c.level).toBe(0);
  });

  it("el offshore flojo no se marca como peligroso", () => {
    const c = classify("castelldefels", 6, 8, 345)!;
    expect(c.offshore).toBe(false);
  });

  it("sin datos devuelve null en vez de reventar", () => {
    expect(classify("castelldefels", null, 10, 200)).toBeNull();
    expect(classify("spot_inexistente", 18, 21, 200)).toBeNull();
  });
});

describe("ventanas navegables", () => {
  const dia = (kns: number[]): (Classified | null)[] =>
    kns.map((kn) => classify("castelldefels", kn, kn + 3, 225));

  it("detecta un tramo seguido de horas buenas", () => {
    const v = windowsOf(dia([6, 7, 8, 10, 12, 14, 18, 20, 21, 19, 17, 9]), "castelldefels", "2026-10-03", 30, false);
    expect(v).toHaveLength(1);
    expect(v[0].desde).toBe(6);
    expect(v[0].horas).toBe(5);
  });

  it("una hora suelta no es una ventana: se buscan tramos, no picos", () => {
    const v = windowsOf(dia([6, 6, 6, 20, 6, 6, 6, 6, 6, 6, 6, 6]), "castelldefels", "2026-10-03", 30, false);
    expect(v).toHaveLength(0);
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

  it("el sector opuesto a la playa sale rojo", () => {
    expect(roseOf(0)).toContain("#EF4444"); // offshore existe siempre
    expect(roseOf(0)).toContain("#22C55E"); // y lateral también
  });
});
