import { Badge, Box, Button, Flex, Heading, Spinner, Text } from "@chakra-ui/react";

import type { ForecastResponse, HourOut } from "./api";
import { LEVEL_STYLE, OFFSHORE_STYLE, classify } from "./domain";
import { HOURS, SPOT_META } from "./spots";
import { useForecast } from "./useForecast";

/**
 * `valid_time_local` ya trae el reloj de pared correcto con su offset. Se parsea
 * como TEXTO: pasarlo por `new Date()` lo reinterpretaría en la zona horaria del
 * navegador, que es justo el error que el backend se esfuerza en no cometer.
 */
const diaDe = (h: HourOut) => h.valid_time_local.slice(0, 10);
const horaDe = (h: HourOut) => Number(h.valid_time_local.slice(11, 13));

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function etiquetaDia(iso: string): { corto: string; largo: string } {
  const [a, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return { corto: `${DIAS[dow]} ${d}`, largo: `${DIAS[dow]} ${d} ${MESES[m - 1]}` };
}

function diasDisponibles(data: ForecastResponse): string[] {
  const set = new Set<string>();
  for (const spot of data.spots) {
    for (const h of spot.hours) {
      if (HOURS.includes(horaDe(h))) set.add(diaDe(h));
    }
  }
  // Data-driven: se pintan los días que el modelo da, ni uno más.
  return [...set].sort();
}

function Celda({ spotId, hora }: { spotId: string; hora: HourOut | undefined }) {
  if (!hora) {
    return <Box bg="rgba(255,255,255,.02)" borderRadius="3px" h="30px" />;
  }
  const c = classify(spotId, hora.wind_speed_kn, hora.wind_gusts_kn, hora.wind_direction_deg);
  if (!c) {
    return <Box bg="rgba(255,255,255,.02)" borderRadius="3px" h="30px" />;
  }
  const estilo = c.offshore ? OFFSHORE_STYLE : LEVEL_STYLE[c.level];
  return (
    <Box
      h="30px"
      borderRadius="3px"
      bg={estilo.bg}
      color={estilo.fg}
      boxShadow={estilo.ring}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      lineHeight="1"
      title={`${Math.round(c.kn)} kn, rachas ${Math.round(c.gust)} · ${c.compass} · ${c.dirClass}${c.offshore ? " (OFFSHORE)" : ""}`}
    >
      <Text fontSize="11px" fontWeight="600">{Math.round(c.kn)}</Text>
      <Text fontSize="8px" opacity={0.75}>{c.compass}</Text>
    </Box>
  );
}

function Rejilla({ data }: { data: ForecastResponse }) {
  const dias = diasDisponibles(data);
  // Orden por cercanía: la distancia pesa en la decisión tanto como el viento.
  const spots = [...data.spots].sort(
    (a, b) => (SPOT_META[a.id]?.min ?? 999) - (SPOT_META[b.id]?.min ?? 999),
  );

  return (
    <Box overflowX="auto" pb={3}>
      <Box minW="fit-content">
        {/* Cabecera de días */}
        <Flex gap="2px" mb="2px" pl="140px">
          {dias.map((d) => (
            <Box key={d} flex="0 0 auto">
              <Text fontSize="11px" fontWeight="700" color="whiteAlpha.800" mb="2px" pl="1px">
                {etiquetaDia(d).largo}
              </Text>
              <Flex gap="2px">
                {HOURS.map((h) => (
                  <Text key={h} w="30px" fontSize="9px" color="whiteAlpha.500" textAlign="center">
                    {h}
                  </Text>
                ))}
              </Flex>
            </Box>
          ))}
        </Flex>

        {spots.map((spot) => {
          const meta = SPOT_META[spot.id];
          const porDia = new Map<string, Map<number, HourOut>>();
          for (const h of spot.hours) {
            const d = diaDe(h);
            if (!porDia.has(d)) porDia.set(d, new Map());
            porDia.get(d)!.set(horaDe(h), h);
          }

          return (
            <Flex key={spot.id} gap="2px" mb="2px" align="center">
              <Box w="140px" flex="0 0 140px" pr={2}>
                <Text fontSize="12px" fontWeight="600" color="whiteAlpha.900" lineHeight="1.2">
                  {meta?.short ?? spot.name}
                </Text>
                <Text fontSize="9px" color={meta?.far ? "orange.300" : "whiteAlpha.500"}>
                  {meta?.drive ?? "—"} {spot.country === "FR" ? "· FR" : ""}
                </Text>
              </Box>
              {dias.map((d) => (
                <Flex key={d} gap="2px" flex="0 0 auto">
                  {HOURS.map((h) => (
                    <Box key={h} w="30px">
                      <Celda spotId={spot.id} hora={porDia.get(d)?.get(h)} />
                    </Box>
                  ))}
                </Flex>
              ))}
            </Flex>
          );
        })}
      </Box>
    </Box>
  );
}

function Leyenda() {
  const items = [
    { s: LEVEL_STYLE[3], t: "15-25 kn, lateral" },
    { s: LEVEL_STYLE[2], t: "navegable" },
    { s: LEVEL_STYLE[1], t: "justo" },
    { s: LEVEL_STYLE[0], t: "no" },
    { s: OFFSHORE_STYLE, t: "offshore — no entrar" },
  ];
  return (
    <Flex gap={4} mt={4} wrap="wrap">
      {items.map((i) => (
        <Flex key={i.t} align="center" gap={2}>
          <Box w="16px" h="16px" borderRadius="3px" bg={i.s.bg} boxShadow={i.s.ring} />
          <Text fontSize="11px" color="whiteAlpha.600">{i.t}</Text>
        </Flex>
      ))}
    </Flex>
  );
}

export default function App() {
  const { data, cargando, error, refrescando, refrescar } = useForecast();

  return (
    <Box minH="100vh" bg="#0B0E11" color="whiteAlpha.900" px={{ base: 4, md: 6 }} py={5}>
      <Flex justify="space-between" align="flex-start" mb={5} gap={4} wrap="wrap">
        <Box>
          <Heading size="md" letterSpacing="-0.02em">Comparador de viento</Heading>
          {data && (
            <Text fontSize="11px" color="whiteAlpha.500" mt={1}>
              {data.model} · actualizado hace {Math.round(data.age_seconds / 60)} min
            </Text>
          )}
        </Box>
        <Flex align="center" gap={3}>
          {data?.stale && <Badge colorPalette="orange">datos antiguos</Badge>}
          <Button size="xs" variant="outline" onClick={refrescar} loading={refrescando}>
            Actualizar
          </Button>
        </Flex>
      </Flex>

      {/* Un fallo al refrescar no vacía la pantalla: se avisa y se siguen
          mostrando los últimos datos buenos. */}
      {error && (
        <Box bg="rgba(239,68,68,.12)" borderRadius="6px" px={3} py={2} mb={4}>
          <Text fontSize="12px" color="#F87171">
            No se pudo contactar con el backend ({error}).
            {data ? " Se muestran los últimos datos recibidos." : ""}
          </Text>
        </Box>
      )}

      {cargando && (
        <Flex align="center" gap={3} py={10}>
          <Spinner size="sm" />
          <Text fontSize="13px" color="whiteAlpha.600">Cargando pronóstico…</Text>
        </Flex>
      )}

      {data && (
        <>
          <Rejilla data={data} />
          <Leyenda />
        </>
      )}
    </Box>
  );
}
