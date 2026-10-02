/**
 * Metadatos de cada spot que NO vienen del backend.
 *
 * `facing` son los grados hacia los que mira la playa, y es lo que permite
 * clasificar el viento como lateral / frontal / offshore. Los valores salen del
 * diseño; el backend ya tiene la columna `shore_bearing` preparada para
 * acogerlos, pero vacía.
 *
 * `drive` es el tiempo en coche: entra en la decisión tanto como el viento,
 * porque cruzar media Cataluña exige mucho mejor pronóstico que ir a Barcelona.
 */
export type SpotMeta = {
  facing: number;
  drive: string;
  min: number;
  far: boolean;
  short?: string;
};

export const SPOT_META: Record<string, SpotMeta> = {
  trabucador: { facing: 260, drive: "2 h", min: 120, far: false },
  riumar: { facing: 100, drive: "1 h 50", min: 110, far: false },
  vilanova: { facing: 170, drive: "50 min", min: 50, far: false },
  castelldefels: { facing: 165, drive: "30 min", min: 30, far: false, short: "Castelldef." },
  barcelona: { facing: 135, drive: "15 min", min: 15, far: false },
  sant_pere_pescador: { facing: 90, drive: "1 h 40", min: 100, far: false, short: "Sant Pere" },
  leucate: { facing: 40, drive: "2 h 40", min: 160, far: true },
  saint_cyprien: { facing: 95, drive: "2 h 20", min: 140, far: true, short: "St-Cyprien" },
};

/** Horas con luz. De las ~67 que da AROME, la mitad son de noche y sobran. */
export const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

export const CMP_SHORT = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO",
];

/** Rosa de 16 puntos en español, igual que la del backend. */
export const CMP_LONG = [
  "Norte", "Nornoreste", "Noreste", "Estenoreste",
  "Este", "Estesureste", "Sureste", "Sursureste",
  "Sur", "Sursuroeste", "Suroeste", "Oestesuroeste",
  "Oeste", "Oestenoroeste", "Noroeste", "Nornoroeste",
];
