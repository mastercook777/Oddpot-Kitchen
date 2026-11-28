// v0.11-A: deterministic field safety/readability rules shared by simulation and Canvas.
export const FIELD_HAZARD_RADIUS = 0.55;

// Drawing and damage MUST use the same thresholds and phase offset.
export function hazardPhase(hazard, elapsed, biome = {}) {
  const style = typeof biome === 'string' ? biome : biome?.style;
  const spore = style === 'roots';
  const period = 4.2;
  const phase = ((Number(elapsed || 0) + (hazard.x % 2) * 1.7) % period + period) % period;
  const start = spore ? 3.15 : 3.45;
  const active = phase > start;
  const warning = phase > 2.8 && !active;
  return {
    phase, active, warning, source: spore ? 'spore' : 'vent',
    radius: FIELD_HAZARD_RADIUS,
    warningProgress: warning ? Math.min(1, (phase - 2.8) / (start - 2.8)) : active ? 1 : 0
  };
}

const tile = p => [Math.floor(p.x), Math.floor(p.y)];
const tileKey = (x, y) => x + ',' + y;

// A stable four-direction path through the SAME integer obstacle cells that
// stepActionField blocks. Hazards may optionally be avoided for safe trails.
export function fieldTilePath(map, from, to, { avoidHazards = false } = {}) {
  if (!map || !from || !to) return [];
  const w = map.worldW || 9, h = map.worldH || 11;
  const [sx, sy] = tile(from), [tx, ty] = tile(to);
  const invalid = ([x, y]) => x < 0 || x >= w || y < 0 || y >= h;
  if (invalid([sx, sy]) || invalid([tx, ty])) return [];
  const closed = new Set((map.obstacles || []).map(o => tileKey(o.x, o.y)));
  if (avoidHazards) for (const hz of map.hazards || []) closed.add(tileKey(hz.x, hz.y));
  const origin = tileKey(sx, sy), goal = tileKey(tx, ty);
  if (closed.has(origin) || closed.has(goal)) return [];
  const parents = new Map([[origin, null]]), queue = [[sx, sy]];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i], current = tileKey(x, y);
    if (current === goal) {
      const result = [];
      for (let key = goal; key !== null; key = parents.get(key)) {
        const [px, py] = key.split(',').map(Number);
        result.push({ x: px + .5, y: py + .5 });
      }
      return result.reverse();
    }
    for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) {
      const nx = x + dx, ny = y + dy, next = tileKey(nx, ny);
      if (invalid([nx, ny]) || closed.has(next) || parents.has(next)) continue;
      parents.set(next, current);
      queue.push([nx, ny]);
    }
  }
  return [];
}
