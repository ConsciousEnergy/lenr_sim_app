import RydbergMatterModel from '../RydbergMatterModel';

// Extract functions from the imported object
const {
  calculateRydbergEnergy,
  calculateRydbergRadius,
  calculateOverlapProbability,
  calculateDoubleLayerField,
  calculateNeutronFormationCrossSection,
  calculateCasimirForce,
  calculateTunnelingEnhancement,
  calculateBECCriticalTemperature,
  generateRydbergSimulationParams
} = RydbergMatterModel;

describe('RydbergMatterModel', () => {
  describe('calculateRydbergEnergy', () => {
    it('should calculate the correct energy for n=1', () => {
      expect(calculateRydbergEnergy(1)).toBeCloseTo(-13.6, 1);
    });

    it('should calculate the correct energy for n=10', () => {
      expect(calculateRydbergEnergy(10)).toBeCloseTo(-0.136, 3);
    });
  });

  describe('calculateRydbergRadius', () => {
    it('should calculate the correct radius for n=1', () => {
      expect(calculateRydbergRadius(1)).toBeCloseTo(0.0529, 4);
    });

    it('should calculate the correct radius for n=10', () => {
      expect(calculateRydbergRadius(10)).toBeCloseTo(5.29, 2);
    });
  });

  describe('calculateOverlapProbability', () => {
    it('should calculate the correct overlap probability', () => {
      const a = 10; // orbital extension in Bohr radii
      const r0 = 0.1; // nuclear radius in nm
      const result = calculateOverlapProbability(a, r0);
      
      // Expected order of magnitude ~10^-3
      expect(result).toBeGreaterThan(1e-4);
      expect(result).toBeLessThan(1e-2);
    });
  });

  describe('calculateDoubleLayerField', () => {
    it('should calculate the correct electric field', () => {
      const deltaV = 0.1; // V
      const distance = 1; // nm
      const expected = 1e8; // V/m
      
      expect(calculateDoubleLayerField(deltaV, distance)).toBeCloseTo(expected, -7);
    });
  });

  describe('calculateNeutronFormationCrossSection', () => {
    it('should calculate the correct cross-section', () => {
      const overlapProb = 1e-3;
      const expected = 1e-24; // m^2
      
      expect(calculateNeutronFormationCrossSection(overlapProb)).toBeCloseTo(expected, 27);
    });
  });

  describe('calculateCasimirForce', () => {
    it('should calculate the correct Casimir force', () => {
      const area = 1; // μm^2
      const distance = 1; // nm
      
      // Order of magnitude ~10^-7 N
      const result = calculateCasimirForce(area, distance);
      expect(Math.abs(result)).toBeGreaterThan(1e-8);
      expect(Math.abs(result)).toBeLessThan(1e-6);
      expect(result).toBeLessThan(0); // Force should be negative (attractive)
    });
  });

  describe('calculateTunnelingEnhancement', () => {
    it('should calculate tunneling enhancement correctly', () => {
      const originalBarrier = 1000; // eV
      const reducedBarrier = 500; // eV
      const particleMass = 2; // u (deuteron)
      const barrierWidth = 1; // fm
      
      const result = calculateTunnelingEnhancement(
        originalBarrier, reducedBarrier, particleMass, barrierWidth
      );
      
      // Enhancement should be significant
      expect(result).toBeGreaterThan(1);
    });
  });

  describe('calculateBECCriticalTemperature', () => {
    it('should calculate BEC critical temperature correctly', () => {
      const density = 1e28; // m^-3
      const mass = 2; // u (deuteron)
      
      const result = calculateBECCriticalTemperature(density, mass);
      
      // Critical temperature should be in expected range (a few K)
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100);
    });
  });

  describe('generateRydbergSimulationParams', () => {
    it('should generate simulation parameters with default config', () => {
      const params = generateRydbergSimulationParams();
      
      expect(params).toHaveProperty('rydbergEnergy');
      expect(params).toHaveProperty('rydbergRadius');
      expect(params).toHaveProperty('overlapProbability');
      expect(params).toHaveProperty('electricField');
      expect(params).toHaveProperty('neutronFormationCrossSection');
      expect(params).toHaveProperty('casimirForce');
      expect(params).toHaveProperty('tunnelingEnhancement');
      expect(params).toHaveProperty('becCriticalTemperature');
      expect(params).toHaveProperty('config');
    });

    it('should override default config with provided values', () => {
      const customConfig = {
        principalQuantumNumber: 15,
        orbitalExtension: 15
      };
      
      const params = generateRydbergSimulationParams(customConfig);
      
      expect(params.config.principalQuantumNumber).toBe(15);
      expect(params.config.orbitalExtension).toBe(15);
    });
  });
}); 