export * from './PhysicsParameterInput';
export * from './PhysicsParameterGroup';
export * from './PhysicsParameterSets';
export * from './ParameterHelpButton';
export * from './PhysicsModelRegistry';
export { default as physicsModelRegistry } from './PhysicsModelRegistry';
export { default as PhysicsSimulationDemo } from './PhysicsSimulationDemo';
export { default as PhysicsConstraints } from './PhysicsConstraints';
export { default as PhysicsConstraintsTest } from './PhysicsConstraintsTest';
export { default as PhysicsParameterValidator } from './PhysicsParameterValidator';
export { default as PhysicsUnitConverter } from './PhysicsUnitConverter';
export { default as UnitConverterField } from './UnitConverterField';
export { default as UnitConverterDemo } from './UnitConverterDemo';
export { default as ParameterGrouping } from './ParameterGrouping';
export { default as ParameterGroupingDemo } from './ParameterGroupingDemo';
export { default as ParameterDocumentation } from './ParameterDocumentation';
export { default as ParameterDocumentationDemo } from './ParameterDocumentationDemo';

// New Theoretical Enhancement Components (Section 2.3.1, 2.8.1, 3.3, 5.1.1)
export { default as QEDVisualization } from './QEDVisualization';
export { default as PhononNuclearPanel } from './PhononNuclearPanel';
export { default as ThermodynamicsPanel } from './ThermodynamicsPanel';
export { default as StatisticalAnalysisPanel } from './StatisticalAnalysisPanel';
export { default as OpenQuestionsCockpit } from './OpenQuestionsCockpit';

// Theory Testbed (v0.3.0)
export { default as TheoryTogglePanel } from './TheoryTogglePanel';
export { default as TheoryTestbedCard } from './TheoryTestbedCard';
export { default as TheoryDocumentationPanel } from './TheoryDocumentationPanel';

// Types
export type { PhysicsParameter } from './PhysicsParameterInput';
export type { PhysicsParameterGroupProps } from './PhysicsParameterGroup';
export type { PhysicsParameterSetProps } from './PhysicsParameterSets';
export type { ValidationResult } from './PhysicsConstraints';
export type { PhysicsParameterValidatorProps } from './PhysicsParameterValidator';
export type { UnitConverterFieldProps } from './UnitConverterField';
export type { ParameterHelpButtonProps } from './ParameterHelpButton';
export type { ParameterDocumentationData, ParameterDocumentationProps } from './ParameterDocumentation';
export type {
  TemperatureUnit,
  PressureUnit,
  LengthUnit,
  EnergyUnit,
  TimeUnit,
  PowerUnit,
  MassUnit,
  UnitType,
  UnitMap,
  UnitFamily,
  Unit
} from './PhysicsUnitConverter';
export type { 
  ParameterGroup, 
  ParameterGroupLayout, 
  ParameterGroupingProps 
} from './ParameterGrouping'; 