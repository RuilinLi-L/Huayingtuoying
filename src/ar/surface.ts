export interface Point3 {
  x: number;
  y: number;
  z: number;
}
export interface WorldPoint {
  position: Point3;
  confidence: number;
}

/** Fit a horizontal patch to tracked world points. Never use an arbitrary y=0
 * plane: a table can be well above the origin. Require spatial extent and low
 * vertical residual; textureless/vertical surfaces deliberately return null. */
export function findHorizontalSurface(
  points: WorldPoint[],
  origin: Point3,
  direction: Point3,
): Point3 | null {
  if (direction.y > -0.12) return null;
  const nearby = points.filter(
    (p) =>
      p.confidence >= 0.5 &&
      Math.hypot(p.position.x - origin.x, p.position.y - origin.y, p.position.z - origin.z) < 4,
  );
  let best: Point3 | null = null,
    bestDistance = Infinity;
  for (const seed of nearby.filter(
    (_, i) => i % Math.max(1, Math.floor(nearby.length / 40)) === 0,
  )) {
    const t = (seed.position.y - origin.y) / direction.y;
    if (t < 0.15 || t > 4) continue;
    const point = {
      x: origin.x + direction.x * t,
      y: seed.position.y,
      z: origin.z + direction.z * t,
    };
    const patch = nearby.filter(
      (p) =>
        Math.abs(p.position.y - point.y) < 0.025 &&
        Math.hypot(p.position.x - point.x, p.position.z - point.z) < 0.22,
    );
    if (patch.length < 6) continue;
    const xs = patch.map((p) => p.position.x),
      zs = patch.map((p) => p.position.z);
    if (Math.max(...xs) - Math.min(...xs) < 0.06 || Math.max(...zs) - Math.min(...zs) < 0.06)
      continue;
    // A horizontal row on a diagonal wall also spans X and Z. Require area,
    // not merely two nonzero bounding-box dimensions.
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length,
      meanZ = zs.reduce((a, b) => a + b, 0) / zs.length;
    const varX = xs.reduce((a, x) => a + (x - meanX) ** 2, 0) / xs.length;
    const varZ = zs.reduce((a, z) => a + (z - meanZ) ** 2, 0) / zs.length;
    const covariance =
      patch.reduce((a, p) => a + (p.position.x - meanX) * (p.position.z - meanZ), 0) / patch.length;
    if (varX * varZ - covariance ** 2 < 1e-7) continue;
    // Require points around the ray intersection, not a distant patch edge.
    if (
      point.x < Math.min(...xs) - 0.03 ||
      point.x > Math.max(...xs) + 0.03 ||
      point.z < Math.min(...zs) - 0.03 ||
      point.z > Math.max(...zs) + 0.03
    )
      continue;
    if (t < bestDistance) {
      bestDistance = t;
      best = { ...point, y: patch.reduce((n, p) => n + p.position.y, 0) / patch.length };
    }
  }
  return best;
}
