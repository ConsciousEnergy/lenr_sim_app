/**
 * LENR-specific Visualization Helper Utilities
 * 
 * Provides specialized functions for visualizing LENR physics phenomena
 * using Three.js
 */

import * as THREE from 'three';
import vizHelper from './vizHelper';
import logger from './logger';
import * as d3 from 'd3';

// Create a specialized logger
const lenrVizLog = logger.create('lenrViz');

/**
 * Element colors for visualization
 * Standard colors for common elements used in LENR
 */
const ELEMENT_COLORS = {
  hydrogen: 0x33A1C9,     // light blue
  deuterium: 0x2969B0,    // blue
  tritium: 0x1E56A0,      // darker blue
  helium: 0x9370DB,       // medium purple
  lithium: 0xFF6347,      // tomato red
  nickel: 0xA6A6A6,       // silver-gray
  palladium: 0xB9B9B9,    // lighter silver
  platinum: 0xE5E4E2,     // platinum
  titanium: 0x8C8C8C,     // darker silver
  electron: 0x00BFFF,     // deep sky blue
  neutron: 0x964B00,      // brown
  proton: 0xFF0000        // red
};

/**
 * Creates a palladium lattice structure for visualization
 * 
 * @param {THREE.Scene} scene - Three.js scene to add the lattice to
 * @param {Object} options - Lattice configuration options
 * @returns {Object} Lattice object with methods for manipulation
 */
const createPalladiumLattice = (scene, options = {}) => {
  if (!scene) {
    lenrVizLog.error('Scene is required for createPalladiumLattice');
    return null;
  }
  
  const {
    size = 3,
    spacing = 2.5,
    atomRadius = 0.5,
    metalness = 0.8,
    roughness = 0.2,
    color = ELEMENT_COLORS.palladium,
    showOctahedralSites = false,
    loadingRatio = 0,
    loadedElement = 'deuterium'
  } = options;
  
  // Create geometry pool for reuse
  const geometryPool = {};
  
  // Create the palladium geometry
  const pdGeometry = vizHelper.createPooledGeometry(geometryPool, 'sphere', {
    radius: atomRadius,
    widthSegments: 32,
    heightSegments: 32
  });
  
  // Create the palladium material
  const pdMaterial = vizHelper.createMaterial({
    color,
    metalness,
    roughness
  });
  
  // Create group to hold all lattice elements
  const latticeGroup = new THREE.Group();
  scene.add(latticeGroup);
  
  // Store all mesh objects for later manipulation
  const atoms = {
    palladium: [],
    loaded: []
  };
  
  // Generate the FCC lattice structure
  for (let x = -size; x <= size; x++) {
    for (let y = -size; y <= size; y++) {
      for (let z = -size; z <= size; z++) {
        // FCC positions: corners and face centers
        const positions = [
          // Corner
          [x, y, z],
          
          // Face centers
          [x + 0.5, y + 0.5, z],
          [x + 0.5, y, z + 0.5],
          [x, y + 0.5, z + 0.5]
        ];
        
        // Add each position
        positions.forEach(pos => {
          const pdAtom = new THREE.Mesh(pdGeometry, pdMaterial);
          pdAtom.position.set(
            pos[0] * spacing,
            pos[1] * spacing,
            pos[2] * spacing
          );
          
          latticeGroup.add(pdAtom);
          atoms.palladium.push(pdAtom);
        });
      }
    }
  }
  
  // If we should show octahedral sites
  if (showOctahedralSites) {
    // Create materials for octahedral sites
    const siteGeometry = vizHelper.createPooledGeometry(geometryPool, 'sphere', {
      radius: atomRadius * 0.3,
      widthSegments: 16,
      heightSegments: 16
    });
    
    const siteMaterial = vizHelper.createMaterial({
      color: 0x00ff00,
      opacity: 0.5,
      transparent: true
    });
    
    // Add octahedral sites
    for (let x = -size; x <= size; x++) {
      for (let y = -size; y <= size; y++) {
        for (let z = -size; z <= size; z++) {
          // Face centers for octahedral sites
          const positions = [
            [x + 0.5, y, z],
            [x, y + 0.5, z],
            [x, y, z + 0.5]
          ];
          
          positions.forEach(pos => {
            const siteAtom = new THREE.Mesh(siteGeometry, siteMaterial);
            siteAtom.position.set(
              pos[0] * spacing,
              pos[1] * spacing,
              pos[2] * spacing
            );
            
            latticeGroup.add(siteAtom);
          });
        }
      }
    }
  }
  
  // Add loaded atoms based on loading ratio
  if (loadingRatio > 0) {
    // Create geometry for loaded atoms
    const loadedGeometry = vizHelper.createPooledGeometry(geometryPool, 'sphere', {
      radius: atomRadius * 0.4,
      widthSegments: 24,
      heightSegments: 24
    });
    
    // Create material based on loaded element
    const loadedColor = ELEMENT_COLORS[loadedElement] || ELEMENT_COLORS.deuterium;
    
    const loadedMaterial = vizHelper.createMaterial({
      color: loadedColor,
      metalness: 0.2,
      roughness: 0.8
    });
    
    // Calculate how many sites to load based on loading ratio
    const totalSites = (size * 2 + 1) * (size * 2 + 1) * (size * 2 + 1) * 3; // 3 octahedral sites per unit cell
    const sitesToLoad = Math.round(totalSites * loadingRatio);
    
    // Generate the octahedral sites for loading
    const loadSites = [];
    
    for (let x = -size; x <= size; x++) {
      for (let y = -size; y <= size; y++) {
        for (let z = -size; z <= size; z++) {
          // Octahedral sites
          const positions = [
            [x + 0.5, y, z],
            [x, y + 0.5, z],
            [x, y, z + 0.5]
          ];
          
          positions.forEach(pos => {
            loadSites.push(pos);
          });
        }
      }
    }
    
    // Shuffle array to randomly select sites
    for (let i = loadSites.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [loadSites[i], loadSites[j]] = [loadSites[j], loadSites[i]];
    }
    
    // Add the loaded atoms
    for (let i = 0; i < Math.min(sitesToLoad, loadSites.length); i++) {
      const pos = loadSites[i];
      const loadedAtom = new THREE.Mesh(loadedGeometry, loadedMaterial);
      
      loadedAtom.position.set(
        pos[0] * spacing,
        pos[1] * spacing,
        pos[2] * spacing
      );
      
      latticeGroup.add(loadedAtom);
      atoms.loaded.push(loadedAtom);
    }
  }
  
  // Return the lattice with methods to manipulate it
  return {
    group: latticeGroup,
    atoms,
    
    // Method to update loading ratio
    updateLoadingRatio: (newRatio, newElement = loadedElement) => {
      // Remove existing loaded atoms
      atoms.loaded.forEach(atom => {
        latticeGroup.remove(atom);
      });
      atoms.loaded = [];
      
      // Call the function again with new ratio
      const newLattice = createPalladiumLattice(scene, {
        ...options,
        loadingRatio: newRatio,
        loadedElement: newElement
      });
      
      // Get new atoms and update the reference
      atoms.loaded = newLattice.atoms.loaded;
      
      // Clean up the new group (we only want the atoms)
      scene.remove(newLattice.group);
      
      // Add the new loaded atoms to our group
      newLattice.atoms.loaded.forEach(atom => {
        latticeGroup.add(atom);
      });
    },
    
    // Method to show/hide octahedral sites
    toggleOctahedralSites: (show) => {
      const newLattice = createPalladiumLattice(scene, {
        ...options,
        showOctahedralSites: show
      });
      
      // Remove old lattice and use new one
      scene.remove(latticeGroup);
      scene.add(newLattice.group);
      
      // Update our reference
      latticeGroup = newLattice.group;
      atoms.palladium = newLattice.atoms.palladium;
      atoms.loaded = newLattice.atoms.loaded;
    },
    
    // Method to change the lattice size
    resize: (newSize) => {
      const newLattice = createPalladiumLattice(scene, {
        ...options,
        size: newSize
      });
      
      // Remove old lattice and use new one
      scene.remove(latticeGroup);
      scene.add(newLattice.group);
      
      // Update our reference
      latticeGroup = newLattice.group;
      atoms.palladium = newLattice.atoms.palladium;
      atoms.loaded = newLattice.atoms.loaded;
    },
    
    // Dispose method to clean up resources
    dispose: () => {
      scene.remove(latticeGroup);
    }
  };
};

/**
 * Creates a visualization of fusion enhancement mechanisms
 * 
 * @param {THREE.Scene} scene - Three.js scene
 * @param {Object} enhancementFactors - Enhancement factor values
 * @param {Object} options - Visualization options
 * @returns {Object} Enhancement visualization with update method
 */
const createEnhancementVisualization = (scene, enhancementFactors = {}, options = {}) => {
  if (!scene) {
    lenrVizLog.error('Scene is required for createEnhancementVisualization');
    return null;
  }
  
  const {
    baseSize = 5,
    intensity = 1.0,
    showLabels = false
  } = options;
  
  // Default enhancement factors if not provided
  const factors = {
    electronScreening: enhancementFactors.electronScreening || 0,
    rydbergMatter: enhancementFactors.rydbergMatter || 0,
    casimirForces: enhancementFactors.casimirForces || 0, 
    quantumTunneling: enhancementFactors.quantumTunneling || 0,
    doubleLayers: enhancementFactors.doubleLayers || 0,
    oppenheimerPhillips: enhancementFactors.oppenheimerPhillips || 0,
    quantumCoherence: enhancementFactors.quantumCoherence || 0,
    shockEnergy: enhancementFactors.shockEnergy || 0
  };
  
  // Create group to hold all enhancement elements
  const enhancementGroup = new THREE.Group();
  scene.add(enhancementGroup);
  
  // Store visualization elements
  const visualElements = {};
  
  // Map enhancement factors to visualization elements
  const createEnhancementElement = (name, value, color, position, scale = 1.0) => {
    // Skip if value is too low
    if (value < 1) return null;
    
    // Scale the visualization based on the factor value
    const normalizedValue = Math.log10(value + 1) / 2;
    const size = baseSize * normalizedValue * scale;
    
    // Create visualization based on the type of enhancement
    let visualElement;
    
    // Create material with pulsing opacity for visual interest
    const material = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      metalness: 0.3,
      roughness: 0.7
    });
    
    // Different geometry based on enhancement type
    switch(name) {
      case 'electronScreening':
        // Sphere for electron screening
        const screeningGeometry = new THREE.SphereGeometry(size, 32, 32);
        visualElement = new THREE.Mesh(screeningGeometry, material);
        break;
        
      case 'quantumTunneling':
        // Torus for quantum tunneling
        const tunnelGeometry = new THREE.TorusGeometry(size, size * 0.3, 16, 100);
        visualElement = new THREE.Mesh(tunnelGeometry, material);
        // Rotate to look like a tunnel
        visualElement.rotation.x = Math.PI / 2;
        break;
        
      case 'rydbergMatter':
        // Icosahedron for Rydberg matter
        const rydbergGeometry = new THREE.IcosahedronGeometry(size, 1);
        visualElement = new THREE.Mesh(rydbergGeometry, material);
        break;
        
      case 'casimirForces':
        // Two planes for Casimir effect
        const casimirGroup = new THREE.Group();
        const planeGeometry = new THREE.PlaneGeometry(size * 2, size * 2);
        
        const plane1 = new THREE.Mesh(planeGeometry, material.clone());
        plane1.position.z = size * 0.5;
        
        const plane2 = new THREE.Mesh(planeGeometry, material.clone());
        plane2.position.z = -size * 0.5;
        
        casimirGroup.add(plane1);
        casimirGroup.add(plane2);
        visualElement = casimirGroup;
        break;
        
      case 'quantumCoherence':
        // Create a wave-like structure for quantum coherence
        const coherenceGroup = new THREE.Group();
        const waveCount = 8;
        const waveRadius = size;
        
        for (let i = 0; i < waveCount; i++) {
          const waveGeometry = new THREE.TorusGeometry(
            waveRadius * (1 - i * 0.1),
            waveRadius * 0.05,
            8,
            64
          );
          
          const waveMaterial = material.clone();
          waveMaterial.opacity = 0.8 - i * 0.1;
          
          const waveMesh = new THREE.Mesh(waveGeometry, waveMaterial);
          waveMesh.rotation.x = Math.PI / 2;
          
          coherenceGroup.add(waveMesh);
        }
        
        visualElement = coherenceGroup;
        break;
        
      // Default for other types of enhancement
      default:
        const geometry = new THREE.SphereGeometry(size, 16, 16);
        visualElement = new THREE.Mesh(geometry, material);
    }
    
    // Position the element
    visualElement.position.copy(position);
    
    // Add to group
    enhancementGroup.add(visualElement);
    
    // Add label if enabled
    if (showLabels) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const context = canvas.getContext('2d');
      
      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.font = 'Bold 24px Arial';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.fillText(name, canvas.width / 2, 40);
      
      context.font = '20px Arial';
      context.fillText(`Factor: ${value.toFixed(1)}x`, canvas.width / 2, 80);
      
      const texture = new THREE.CanvasTexture(canvas);
      const labelMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
      });
      
      const label = new THREE.Sprite(labelMaterial);
      label.position.copy(position);
      label.position.y += size * 1.5;
      label.scale.set(5, 2.5, 1);
      
      enhancementGroup.add(label);
    }
    
    return visualElement;
  };
  
  // Create all enhancement visualizations
  const enhancementRadius = baseSize * 5;
  const angleStep = (Math.PI * 2) / Object.keys(factors).length;
  
  let i = 0;
  for (const [name, value] of Object.entries(factors)) {
    // Skip if value is too low
    if (value < 1) {
      i++;
      continue;
    }
    
    // Calculate position in a circle
    const angle = angleStep * i;
    const position = new THREE.Vector3(
      Math.cos(angle) * enhancementRadius,
      0,
      Math.sin(angle) * enhancementRadius
    );
    
    // Get color based on enhancement type
    let color;
    switch(name) {
      case 'electronScreening':
        color = 0x3CB371; // medium sea green
        break;
      case 'quantumTunneling':
        color = 0x9932CC; // dark orchid
        break;
      case 'rydbergMatter':
        color = 0xFF6347; // tomato red
        break;
      case 'casimirForces':
        color = 0x9370DB; // medium purple
        break;
      case 'doubleLayers':
        color = 0x00BFFF; // deep sky blue
        break;
      case 'oppenheimerPhillips':
        color = 0xFFD700; // gold
        break;
      case 'quantumCoherence':
        color = 0x32CD32; // lime green
        break;
      case 'shockEnergy':
        color = 0xFF4500; // orange red
        break;
      default:
        color = 0xFFFFFF; // white
    }
    
    // Create and store the visualization element
    visualElements[name] = createEnhancementElement(name, value, color, position);
    i++;
  }
  
  // Set up animations for enhanced visual appeal
  const animatePulse = (delta) => {
    // Animate each enhancement element
    for (const name in visualElements) {
      const element = visualElements[name];
      if (!element) continue;
      
      // Skip groups - animate their children instead
      if (element.isGroup) {
        element.children.forEach((child, i) => {
          if (child.material) {
            child.material.opacity = 0.3 + Math.sin(Date.now() * 0.001 + i * 0.5) * 0.2;
          }
        });
      } else if (element.material) {
        // Pulse opacity for visual interest
        element.material.opacity = 0.3 + Math.sin(Date.now() * 0.001) * 0.2;
        
        // Small scale pulsing for more interesting visuals
        const scalePulse = 1 + Math.sin(Date.now() * 0.002) * 0.05;
        element.scale.set(scalePulse, scalePulse, scalePulse);
      }
    }
  };
  
  // Return the enhancement visualization with methods
  return {
    group: enhancementGroup,
    elements: visualElements,
    
    // Update method to be called in animation loop
    update: (delta) => {
      animatePulse(delta);
    },
    
    // Method to update enhancement factors
    updateFactors: (newFactors) => {
      // Update our stored factors
      for (const [name, value] of Object.entries(newFactors)) {
        factors[name] = value;
      }
      
      // Remove all existing elements
      while (enhancementGroup.children.length > 0) {
        enhancementGroup.remove(enhancementGroup.children[0]);
      }
      
      // Create new visualization with updated factors
      const newViz = createEnhancementVisualization(scene, factors, options);
      
      // Update our references
      enhancementGroup.copy(newViz.group);
      visualElements = newViz.elements;
    },
    
    // Toggle visibility of specific enhancement
    toggleEnhancement: (name, visible) => {
      if (visualElements[name]) {
        visualElements[name].visible = visible;
      }
    },
    
    // Dispose method to clean up resources
    dispose: () => {
      scene.remove(enhancementGroup);
      
      // Clean up materials and geometries
      for (const name in visualElements) {
        const element = visualElements[name];
        if (!element) continue;
        
        if (element.isGroup) {
          element.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
          });
        } else {
          if (element.geometry) element.geometry.dispose();
          if (element.material) element.material.dispose();
        }
      }
    }
  };
};

// Helper function to update electron density visualization
export const updateElectronDensity = (scene, electronData) => {
  // Remove existing electron density visualization
  scene.children = scene.children.filter(child => !child.isElectronDensity);

  // Create electron density visualization using THREE.js
  const densityGeometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const colorScale = d3.scaleSequential(d3.interpolateViridis)
    .domain([0, d3.max(electronData, d => d.density)]);

  electronData.forEach(point => {
    positions.push(point.x, point.y, point.z);
    const color = new THREE.Color(colorScale(point.density));
    colors.push(color.r, color.g, color.b);
  });

  densityGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  densityGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const densityMaterial = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.7
  });

  const densityPoints = new THREE.Points(densityGeometry, densityMaterial);
  densityPoints.isElectronDensity = true;
  scene.add(densityPoints);
};

// Helper function to highlight excited states
export const highlightExcitedStates = (scene, excitedAtoms) => {
  scene.children.forEach(child => {
    if (child.isAtom) {
      const isExcited = excitedAtoms.some(atom => 
        Math.abs(atom.x - child.position.x) < 0.1 &&
        Math.abs(atom.y - child.position.y) < 0.1 &&
        Math.abs(atom.z - child.position.z) < 0.1
      );

      if (isExcited) {
        child.material.emissive.setHex(0xff0000);
        child.material.emissiveIntensity = 0.5;
      } else {
        child.material.emissive.setHex(0x000000);
        child.material.emissiveIntensity = 0;
      }
    }
  });
};

// Helper function to update temperature visualization
export const updateTemperatureVisualization = (scene, temperatureData) => {
  const colorScale = d3.scaleSequential(d3.interpolateReds)
    .domain([d3.min(temperatureData), d3.max(temperatureData)]);

  scene.children.forEach(child => {
    if (child.isAtom) {
      const temp = findNearestTemperature(child.position, temperatureData);
      child.material.color.set(colorScale(temp));
    }
  });
};

// Helper function to update pressure deformation
export const updatePressureDeformation = (scene, pressureData) => {
  scene.children.forEach(child => {
    if (child.isAtom) {
      const deformation = calculatePressureDeformation(child.position, pressureData);
      child.scale.set(
        1 + deformation.x,
        1 + deformation.y,
        1 + deformation.z
      );
    }
  });
};

// Helper function to find nearest temperature value
const findNearestTemperature = (position, temperatureData) => {
  let nearest = temperatureData[0];
  let minDist = Infinity;

  temperatureData.forEach(point => {
    const dist = Math.sqrt(
      Math.pow(position.x - point.x, 2) +
      Math.pow(position.y - point.y, 2) +
      Math.pow(position.z - point.z, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = point;
    }
  });

  return nearest.temperature;
};

// Helper function to calculate pressure-induced deformation
const calculatePressureDeformation = (position, pressureData) => {
  const nearestPressure = pressureData.find(p => 
    Math.abs(p.x - position.x) < 0.5 &&
    Math.abs(p.y - position.y) < 0.5 &&
    Math.abs(p.z - position.z) < 0.5
  ) || { pressure: 0 };

  // Calculate deformation based on pressure
  const deformationFactor = 0.1;
  return {
    x: nearestPressure.pressure * deformationFactor,
    y: nearestPressure.pressure * deformationFactor,
    z: nearestPressure.pressure * deformationFactor
  };
};

// Helper function to apply heat distortion effect
export const applyHeatDistortion = (scene, temperature) => {
  const maxDistortion = 0.1;
  const distortionFactor = temperature / 1000; // Normalize temperature

  scene.children.forEach(child => {
    if (child.isAtom) {
      const originalPosition = child.userData.originalPosition || child.position.clone();
      child.userData.originalPosition = originalPosition;

      // Apply random displacement based on temperature
      child.position.set(
        originalPosition.x + (Math.random() - 0.5) * maxDistortion * distortionFactor,
        originalPosition.y + (Math.random() - 0.5) * maxDistortion * distortionFactor,
        originalPosition.z + (Math.random() - 0.5) * maxDistortion * distortionFactor
      );
    }
  });
};

// Helper function to reset visualization effects
export const resetVisualization = (scene) => {
  scene.children.forEach(child => {
    if (child.isAtom) {
      // Reset position
      if (child.userData.originalPosition) {
        child.position.copy(child.userData.originalPosition);
      }
      
      // Reset material properties
      child.material.emissive.setHex(0x000000);
      child.material.emissiveIntensity = 0;
      child.scale.set(1, 1, 1);
    }
  });

  // Remove electron density visualization
  scene.children = scene.children.filter(child => !child.isElectronDensity);
};

// Export the LENR visualization helpers
const lenrVizHelper = {
  ELEMENT_COLORS,
  createPalladiumLattice,
  createEnhancementVisualization
};

export default lenrVizHelper; 