// Agrupa BLOCKs reales (piezas) e INSERTs por numero de parte.
// Los blocks-datum (marcadores de origen / lineas guia) se ignoran por completo.

// Nombres de blocks que NO representan piezas reales sino marcadores de origen.
// Heuristica: cualquier block cuyo nombre termine en "DATUM" se considera marcador.
const DATUM_BLOCK_NAMES = new Set(["MDATUM", "ODATUM", "TDATUM"]);
function isDatumName(name) {
  return DATUM_BLOCK_NAMES.has(name) || /DATUM$/i.test(name);
}

// Tipos de entidad geometrica que sabemos renderizar en v1.
const SUPPORTED_ENTITY_TYPES = new Set(["LINE", "CIRCLE", "ARC"]);

// Filtra entidades de un block conservando solo las soportadas y normalizando campos.
function normalizeBlockEntities(entities = []) {
  const out = [];
  for (const e of entities) {
    if (!SUPPORTED_ENTITY_TYPES.has(e.type)) continue;
    if (e.type === "LINE") {
      // dxf-parser entrega vertices como array de objetos {x,y,z}.
      const [a, b] = e.vertices || [];
      if (!a || !b) continue;
      out.push({ type: "LINE", x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    } else if (e.type === "CIRCLE") {
      out.push({ type: "CIRCLE", cx: e.center.x, cy: e.center.y, r: e.radius });
    } else if (e.type === "ARC") {
      // Angulos en grados segun convencion DXF (sentido antihorario desde eje X+).
      out.push({
        type: "ARC",
        cx: e.center.x,
        cy: e.center.y,
        r: e.radius,
        startAngle: e.startAngle,
        endAngle: e.endAngle,
      });
    }
  }
  return out;
}

// Extrae piezas e instancias del DXF parseado, ignorando todo lo que sea datum.
export function extractParts(parsed) {
  const blocks = parsed.blocks || {};
  const partDefinitions = new Map();

  for (const name of Object.keys(blocks)) {
    if (isDatumName(name)) continue; // ignorar blocks-datum por completo
    const block = blocks[name];
    const entities = normalizeBlockEntities(block.entities);
    if (entities.length > 0) partDefinitions.set(name, { entities });
  }

  // Instancias: INSERTs en la seccion ENTITIES (no los anidados dentro de blocks).
  const allEntities = parsed.entities || [];
  const instances = [];
  const countByPart = new Map();

  for (const e of allEntities) {
    if (e.type !== "INSERT") continue;
    const partNumber = e.name; // dxf-parser expone el nombre del block referenciado en .name
    if (isDatumName(partNumber)) continue; // ignorar INSERTs de datums
    if (!partDefinitions.has(partNumber)) continue;
    instances.push({
      partNumber,
      x: e.position?.x ?? 0,
      y: e.position?.y ?? 0,
      sx: e.xScale ?? 1,
      sy: e.yScale ?? 1,
      rot: e.rotation ?? 0,
    });
    countByPart.set(partNumber, (countByPart.get(partNumber) || 0) + 1);
  }

  return { partDefinitions, instances, countByPart };
}
