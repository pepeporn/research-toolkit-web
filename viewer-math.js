(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StructureViewerMath = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }
  function vector(a, b) { return [a.x - b.x, a.y - b.y, a.z - b.z]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { return Math.hypot(...a); }
  function angle(a, b, c) {
    const u = vector(a, b); const v = vector(c, b);
    return Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (norm(u) * norm(v))))) * 180 / Math.PI;
  }
  function dihedral(a, b, c, d) {
    const b0 = vector(a, b); const b1 = vector(c, b); const b2 = vector(d, c);
    const axis = b1.map((value) => value / norm(b1));
    const v = b0.map((value, index) => value - dot(b0, axis) * axis[index]);
    const w = b2.map((value, index) => value - dot(b2, axis) * axis[index]);
    return Math.atan2(dot(cross(axis, v), w), dot(v, w)) * 180 / Math.PI;
  }
  return { distance, angle, dihedral };
});
