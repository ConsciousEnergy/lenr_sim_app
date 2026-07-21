const SQRT_2 = Math.sqrt(2);
const SQRT_3 = Math.sqrt(3);

export type CrystalStructure = 'fcc' | 'bcc' | 'hcp';

export interface MaterialScaleDefinition {
  key: string;
  label: string;
  structure: CrystalStructure;
  latticeConstantM: number;
  atomicRadiusM: number;
}

export interface MaterialScale extends MaterialScaleDefinition {
  nearestNeighborM: number;
}

// Physical references:
// - Lattice constants aligned to backend defaults (SI meters)
// - Metallic radii from standard condensed-matter references (SI meters)
const MATERIAL_SCALE_TABLE: Record<string, MaterialScaleDefinition> = {
  palladium: {
    key: 'palladium',
    label: 'Palladium',
    structure: 'fcc',
    latticeConstantM: 3.89e-10,
    atomicRadiusM: 1.37e-10,
  },
  nickel: {
    key: 'nickel',
    label: 'Nickel',
    structure: 'fcc',
    latticeConstantM: 3.52e-10,
    atomicRadiusM: 1.24e-10,
  },
  titanium: {
    key: 'titanium',
    label: 'Titanium',
    structure: 'hcp',
    latticeConstantM: 2.95e-10,
    atomicRadiusM: 1.47e-10,
  },
  copper: {
    key: 'copper',
    label: 'Copper',
    structure: 'fcc',
    latticeConstantM: 3.61e-10,
    atomicRadiusM: 1.28e-10,
  },
};

const DEFAULT_MATERIAL_KEY = 'palladium';

const normalizeMaterialKey = (material?: string): string =>
  String(material || DEFAULT_MATERIAL_KEY).trim().toLowerCase();

export const getNearestNeighborDistanceM = (
  latticeConstantM: number,
  structure: CrystalStructure,
): number => {
  if (structure === 'fcc') return latticeConstantM / SQRT_2;
  if (structure === 'bcc') return (SQRT_3 / 2) * latticeConstantM;
  return latticeConstantM;
};

export const getMaterialScale = (material?: string): MaterialScale => {
  const key = normalizeMaterialKey(material);
  const base = MATERIAL_SCALE_TABLE[key] || MATERIAL_SCALE_TABLE[DEFAULT_MATERIAL_KEY];
  return {
    ...base,
    nearestNeighborM: getNearestNeighborDistanceM(base.latticeConstantM, base.structure),
  };
};

export const getKnownMaterialScales = (): MaterialScale[] =>
  Object.keys(MATERIAL_SCALE_TABLE).map((key) => getMaterialScale(key));

export const metersToVisUnits = (meters: number, metersPerVisUnit: number): number => {
  if (!Number.isFinite(metersPerVisUnit) || metersPerVisUnit <= 0) return 0;
  return meters / metersPerVisUnit;
};

export const visUnitsToMeters = (visUnits: number, metersPerVisUnit: number): number => {
  if (!Number.isFinite(metersPerVisUnit) || metersPerVisUnit <= 0) return 0;
  return visUnits * metersPerVisUnit;
};

export const getLatticeMetersPerVisUnit = ({
  material,
  latticeSpacingVisUnits,
}: {
  material?: string;
  latticeSpacingVisUnits: number;
}): number => {
  if (!Number.isFinite(latticeSpacingVisUnits) || latticeSpacingVisUnits <= 0) {
    return getMaterialScale(material).latticeConstantM;
  }
  return getMaterialScale(material).latticeConstantM / latticeSpacingVisUnits;
};

export const getAtomRadiusVisUnits = ({
  material,
  metersPerVisUnit,
  minimumVisRadius = 0.08,
}: {
  material?: string;
  metersPerVisUnit: number;
  minimumVisRadius?: number;
}): number => {
  const radiusVis = metersToVisUnits(getMaterialScale(material).atomicRadiusM, metersPerVisUnit);
  if (!Number.isFinite(radiusVis)) return minimumVisRadius;
  return Math.max(minimumVisRadius, radiusVis);
};

export interface LatticeScaleDescriptor {
  label: string;
  metersPerUnit: number;
  note: string;
}

export const buildLatticeScaleDescriptor = ({
  material,
  latticeSpacingVisUnits,
}: {
  material?: string;
  latticeSpacingVisUnits: number;
}): LatticeScaleDescriptor => {
  const scale = getMaterialScale(material);
  const metersPerUnit = getLatticeMetersPerVisUnit({ material, latticeSpacingVisUnits });
  const latticeAngstrom = (scale.latticeConstantM * 1e10).toFixed(2);
  const nearestAngstrom = (scale.nearestNeighborM * 1e10).toFixed(2);
  const radiusAngstrom = (scale.atomicRadiusM * 1e10).toFixed(2);

  return {
    label: `${scale.label} lattice regime`,
    metersPerUnit,
    note: `${scale.structure.toUpperCase()} a=${latticeAngstrom} Å, nn=${nearestAngstrom} Å, r=${radiusAngstrom} Å`,
  };
};
