/**
 * Advanced Controls Documentation
 * 
 * Provides structured documentation content for tooltips and help panels
 * for the advanced simulation control features.
 */

// Interface for tooltip content
export interface TooltipContent {
  title: string;
  description: string;
  tips?: string[];
}

// Interface for help panel content
export interface HelpContent extends TooltipContent {
  sections: Array<{
    title: string;
    content: string;
    examples?: string[];
  }>;
}

// Documentation for Physics Model Selection
export const physicsModelSelectionDocs: HelpContent = {
  title: "Physics Model Selection",
  description: "Choose from various physics models implementing different LENR theories",
  tips: [
    "Check model compatibility with your current parameters",
    "Some models may adjust other parameters automatically",
    "Hover over warning icons to see compatibility issues"
  ],
  sections: [
    {
      title: "Selecting a Model",
      content: "Models are grouped by category (quantum, classical, etc). Click on a model to view details and select it for simulation.",
      examples: [
        "Choose 'Basic Quantum Tunneling' for simple deuterium simulations",
        "Use 'Hybrid' models for more comprehensive analysis"
      ]
    },
    {
      title: "Compatibility",
      content: "Green checkmarks indicate compatible models. Red X icons show incompatible models. Hover over icons to see specific issues.",
    },
    {
      title: "Model Details",
      content: "After selecting a model, you'll see detailed information including description, references, and specific parameter requirements.",
    }
  ]
};

// Documentation for Simulation Speed Controls
export const simulationSpeedDocs: HelpContent = {
  title: "Simulation Speed Controls",
  description: "Adjust how quickly the simulation runs",
  tips: [
    "Use slower speeds for detailed observation",
    "Higher speeds may reduce visualization smoothness",
    "Max Speed Mode disables visualization updates completely"
  ],
  sections: [
    {
      title: "Speed Slider",
      content: "Drag the slider to adjust simulation speed from 1x (real-time) to 10x. Available when a simulation is running.",
    },
    {
      title: "Quick Controls",
      content: "Use the +/- buttons to quickly increase or decrease speed by 1x increments.",
    },
    {
      title: "Max Speed Mode",
      content: "Enable this toggle to run the simulation at maximum computational speed by disabling visualization updates. Use this for parameter sweeps or when visual feedback isn't needed.",
    }
  ]
};

// Documentation for Ensemble Run Configuration
export const ensembleRunDocs: HelpContent = {
  title: "Ensemble Run Configuration",
  description: "Run multiple simulations with varying parameters to analyze trends",
  tips: [
    "Start with a small number of steps to evaluate runtime",
    "Large ensembles may take significant time to complete",
    "Focus on 1-3 key parameters for most efficient analysis"
  ],
  sections: [
    {
      title: "Parameter Selection",
      content: "Click on parameter chips to add them to the ensemble. Each selected parameter will be varied across a range of values.",
    },
    {
      title: "Range Configuration",
      content: "For each parameter, set the minimum value, maximum value, and number of steps. The simulation will run for each combination of parameter values.",
      examples: [
        "Temperature: 300K to 600K with 5 steps = 6 values (300, 360, 420, 480, 540, 600)"
      ]
    },
    {
      title: "Run Count",
      content: "The total number of simulations is calculated by multiplying the number of steps for each parameter. For example, varying 2 parameters with 5 steps each results in 36 total simulations (6×6).",
    }
  ]
};

// Documentation for Simulation Snapshot System
export const snapshotSystemDocs: HelpContent = {
  title: "Simulation Snapshot System",
  description: "Save and restore simulation configurations",
  tips: [
    "Use descriptive names for better organization",
    "Add notes to remember key aspects of configurations",
    "Export important snapshots for backup or sharing"
  ],
  sections: [
    {
      title: "Creating Snapshots",
      content: "Click 'Create Snapshot' to save the current configuration. Provide a name and optional notes to identify the snapshot later.",
    },
    {
      title: "Managing Snapshots",
      content: "View all saved snapshots in the list. Use the restore button to load a configuration, or the menu button for additional options.",
    },
    {
      title: "Importing/Exporting",
      content: "Use Export to download a snapshot as a JSON file that can be shared with others. Use Import to load a snapshot from a file.",
    }
  ]
};

// Tooltips for specific UI elements
export const controlTooltips: Record<string, string> = {
  // Physics Model Selection
  modelCategoryDropdown: "Filter models by theoretical approach",
  modelCompatibilityIcon: "Indicates whether this model is compatible with current parameters",
  modelInfoPanel: "Detailed information about the selected model",
  
  // Simulation Speed
  speedSlider: "Adjust how quickly the simulation processes each time step",
  maxSpeedToggle: "Run at maximum computational speed by disabling visualization updates",
  decreaseSpeedButton: "Decrease simulation speed",
  increaseSpeedButton: "Increase simulation speed",
  
  // Ensemble Configuration
  ensembleModeToggle: "Enable multi-parameter simulation runs",
  parameterChip: "Click to include/exclude this parameter in the ensemble",
  minValueField: "Minimum value for this parameter in the ensemble",
  maxValueField: "Maximum value for this parameter in the ensemble",
  stepsField: "Number of intervals between min and max (total points = steps + 1)",
  
  // Snapshot System
  createSnapshotButton: "Save current configuration as a snapshot",
  importSnapshotButton: "Load a snapshot from a file",
  restoreSnapshotButton: "Apply this snapshot's configuration",
  exportSnapshotButton: "Download this snapshot as a JSON file",
  deleteSnapshotButton: "Permanently remove this snapshot",
};

/**
 * Get help content for a specific advanced control
 */
export function getHelpContent(controlType: 'physicsModel' | 'speed' | 'ensemble' | 'snapshot'): HelpContent {
  switch (controlType) {
    case 'physicsModel':
      return physicsModelSelectionDocs;
    case 'speed':
      return simulationSpeedDocs;
    case 'ensemble':
      return ensembleRunDocs;
    case 'snapshot':
      return snapshotSystemDocs;
    default:
      throw new Error(`Unknown control type: ${controlType}`);
  }
}

/**
 * Get tooltip content for a specific UI element
 */
export function getTooltip(elementId: string): string {
  return controlTooltips[elementId] || "No tooltip available";
}

export default {
  getHelpContent,
  getTooltip,
  physicsModelSelectionDocs,
  simulationSpeedDocs,
  ensembleRunDocs,
  snapshotSystemDocs
}; 