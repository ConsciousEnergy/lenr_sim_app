/**
 * Seed Three.js group/child visibility for UBLV layer toggles.
 *
 * Scene remounts (e.g. host-material switch) recreate groups at Three's
 * default visible=true. Toggle useEffect deps do not change, so layers that
 * should stay off (Rydberg purple orbitals, Halo, Casimir) must be reseeded
 * after create — see GitHub #408.
 *
 * @param {import('three').Object3D | null | undefined} group
 * @param {boolean} visible
 */
export function applyGroupVisibility(group, visible) {
  if (!group) return;
  group.visible = visible;
  group.traverse((child) => {
    if (child.isMesh || child.isLine || child.isPoints || child.isGroup) {
      child.visible = visible;
    }
  });
}
