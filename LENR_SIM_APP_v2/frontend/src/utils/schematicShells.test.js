import {
  SCHEMATIC_SHELL_LABEL,
  resolveSchematicShellSpec,
  schematicShellSiteOpacity,
} from './schematicShells';

describe('schematicShells (Tier 2)', () => {
  test('resolves presentation opacity/radius from loading ratio', () => {
    const low = resolveSchematicShellSpec({ loadingRatio: 0.2, hostMaterial: 'palladium' });
    const high = resolveSchematicShellSpec({ loadingRatio: 0.95, hostMaterial: 'palladium' });
    expect(high.opacity).toBeGreaterThan(low.opacity);
    expect(high.radiusScale).toBeGreaterThan(low.radiusScale);
    expect(high.label).toBe(SCHEMATIC_SHELL_LABEL);
    expect(high.fidelity).toBe('schematic');
  });

  test('Pd vs Ni tint differs; occupied sites brighter', () => {
    const pd = resolveSchematicShellSpec({ hostMaterial: 'palladium' });
    const ni = resolveSchematicShellSpec({ hostMaterial: 'nickel' });
    expect(pd.colorHex).not.toBe(ni.colorHex);
    expect(schematicShellSiteOpacity(0.2, true)).toBeGreaterThan(
      schematicShellSiteOpacity(0.2, false),
    );
  });
});
