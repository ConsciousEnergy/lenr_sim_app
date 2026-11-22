import { applyGroupVisibility } from '../applyGroupVisibility';

function makeFakeGroup(children = []) {
  const group = {
    visible: true,
    isGroup: true,
    children,
    traverse(cb) {
      cb(this);
      for (const child of this.children) {
        if (typeof child.traverse === 'function') child.traverse(cb);
        else cb(child);
      }
    },
  };
  return group;
}

describe('applyGroupVisibility', () => {
  it('no-ops on null/undefined', () => {
    expect(() => applyGroupVisibility(null, false)).not.toThrow();
    expect(() => applyGroupVisibility(undefined, true)).not.toThrow();
  });

  it('hides group and mesh/line/points/group children (#408 remount seed)', () => {
    const mesh = { visible: true, isMesh: true };
    const line = { visible: true, isLine: true };
    const points = { visible: true, isPoints: true };
    const nested = makeFakeGroup([{ visible: true, isMesh: true }]);
    const group = makeFakeGroup([mesh, line, points, nested]);

    applyGroupVisibility(group, false);

    expect(group.visible).toBe(false);
    expect(mesh.visible).toBe(false);
    expect(line.visible).toBe(false);
    expect(points.visible).toBe(false);
    expect(nested.visible).toBe(false);
  });

  it('shows group when visible=true', () => {
    const mesh = { visible: false, isMesh: true };
    const group = makeFakeGroup([mesh]);
    group.visible = false;

    applyGroupVisibility(group, true);

    expect(group.visible).toBe(true);
    expect(mesh.visible).toBe(true);
  });
});
