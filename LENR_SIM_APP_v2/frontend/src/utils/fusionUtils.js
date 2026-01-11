/**
 * Fusion Process Utilities
 * 
 * Utility functions for processing and transforming fusion process data
 * for visualization and simulation purposes.
 */

/**
 * Generate fusion processes data
 * @param {Object} latticeData - The lattice data with points and connections
 * @param {Object} options - Options for fusion process generation
 * @returns {Array} Array of fusion processes
 */
export const generateFusionProcesses = (latticeData, options = {}) => {
  if (!latticeData || !latticeData.points || !latticeData.connections) {
    return [];
  }
  
  const {
    fusionProbability = 0.1,       // Probability of fusion per active interstitial
    energyReleaseMin = 10,         // Minimum energy release
    energyReleaseMax = 50,         // Maximum energy release
    processDurationMin = 500,      // Minimum process duration in ms
    processDurationMax = 3000,     // Maximum process duration in ms
    maxConcurrentProcesses = 5     // Maximum number of concurrent processes
  } = options;
  
  const { points, connections } = latticeData;
  
  // Find all interstitials that are active
  const activeInterstitials = points
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => 
      point.type === 'interstitial' && 
      point.properties && 
      point.properties.isActive
    );
    
  if (activeInterstitials.length === 0) {
    return [];
  }
  
  // Determine number of fusion processes based on probability
  const processCount = Math.min(
    Math.round(activeInterstitials.length * fusionProbability),
    maxConcurrentProcesses,
    activeInterstitials.length
  );
  
  if (processCount === 0) {
    return [];
  }
  
  // Randomly select interstitials for fusion
  const selectedIndices = new Set();
  const fusionProcesses = [];
  
  while (selectedIndices.size < processCount) {
    const randomIndex = Math.floor(Math.random() * activeInterstitials.length);
    if (!selectedIndices.has(randomIndex)) {
      selectedIndices.add(randomIndex);
      
      const interstitial = activeInterstitials[randomIndex];
      const interstitialIndex = interstitial.index;
      
      // Find nearby host atoms (potential fusion partners)
      const nearbyConnections = connections.filter(conn => 
        (conn.from === interstitialIndex || conn.to === interstitialIndex) &&
        conn.type === 'host-interstitial'
      );
      
      if (nearbyConnections.length > 0) {
        // Pick a random nearby host
        const randomConnection = nearbyConnections[Math.floor(Math.random() * nearbyConnections.length)];
        const hostIndex = randomConnection.from === interstitialIndex ? randomConnection.to : randomConnection.from;
        const host = points[hostIndex];
        
        // Generate random parameters for the fusion process
        const energyRelease = energyReleaseMin + Math.random() * (energyReleaseMax - energyReleaseMin);
        const duration = processDurationMin + Math.random() * (processDurationMax - processDurationMin);
        
        // Create fusion process
        fusionProcesses.push({
          id: `fusion-${Date.now()}-${interstitialIndex}-${hostIndex}`,
          interstitialIndex,
          hostIndex,
          interstitialPosition: [...interstitial.point.position],
          hostPosition: [...host.position],
          energyRelease,
          duration,
          startTime: Date.now(),
          endTime: Date.now() + duration,
          byproducts: generateByproducts(energyRelease),
          status: 'active'
        });
      }
    }
  }
  
  return fusionProcesses;
};

/**
 * Generate fusion byproducts based on energy release
 * @param {number} energyRelease - Amount of energy released
 * @returns {Array} Array of byproducts
 */
const generateByproducts = (energyRelease) => {
  // Simple model: either helium or tritium + proton based on energy
  if (energyRelease > 30) {
    // High energy: produces helium-4
    return [
      { type: 'helium-4', energy: energyRelease * 0.8, count: 1 }
    ];
  } else {
    // Lower energy: produces tritium + proton
    return [
      { type: 'tritium', energy: energyRelease * 0.5, count: 1 },
      { type: 'proton', energy: energyRelease * 0.3, count: 1 }
    ];
  }
};

/**
 * Update fusion processes based on elapsed time
 * @param {Array} processes - Array of fusion processes
 * @param {number} currentTime - Current timestamp
 * @returns {Array} Updated fusion processes
 */
export const updateFusionProcesses = (processes, currentTime = Date.now()) => {
  if (!processes || !Array.isArray(processes)) {
    return [];
  }
  
  return processes.map(process => {
    if (process.endTime <= currentTime) {
      // Process has completed
      return {
        ...process,
        status: 'completed',
        progress: 1
      };
    } else {
      // Process is still active
      const totalDuration = process.endTime - process.startTime;
      const elapsed = currentTime - process.startTime;
      const progress = Math.min(1, Math.max(0, elapsed / totalDuration));
      
      return {
        ...process,
        progress
      };
    }
  });
};

/**
 * Create interpolated positions for visualizing fusion process
 * @param {Object} process - Fusion process
 * @param {number} progress - Progress of fusion (0-1)
 * @returns {Object} Interpolated positions and other visualization data
 */
export const interpolateFusionProcess = (process, progress = null) => {
  if (!process) return null;
  
  // Use provided progress or calculate from timestamps
  const currentProgress = progress !== null ? progress : process.progress || 0;
  
  // Define phases of fusion process animation
  const approachPhaseEnd = 0.4;   // First 40% is approach
  const fusionPhaseEnd = 0.6;     // Next 20% is fusion
  const byproductPhaseEnd = 1.0;  // Final 40% is byproduct emission
  
  let animationData = {
    interstitialVisible: true,
    hostVisible: true,
    byproductsVisible: false,
    energyWaveVisible: false,
    interstitialPosition: [...process.interstitialPosition],
    hostPosition: [...process.hostPosition],
    byproductPositions: [],
    energyRadius: 0,
    energyIntensity: 0
  };
  
  if (currentProgress < approachPhaseEnd) {
    // Approach phase - interstitial moves toward host
    const phaseProgress = currentProgress / approachPhaseEnd;
    const dx = process.hostPosition[0] - process.interstitialPosition[0];
    const dy = process.hostPosition[1] - process.interstitialPosition[1];
    const dz = process.hostPosition[2] - process.interstitialPosition[2];
    
    animationData.interstitialPosition = [
      process.interstitialPosition[0] + dx * phaseProgress * 0.8,
      process.interstitialPosition[1] + dy * phaseProgress * 0.8,
      process.interstitialPosition[2] + dz * phaseProgress * 0.8
    ];
  } 
  else if (currentProgress < fusionPhaseEnd) {
    // Fusion phase - atoms combine and energy wave begins
    const phaseProgress = (currentProgress - approachPhaseEnd) / (fusionPhaseEnd - approachPhaseEnd);
    
    // Interstitial is at 80% distance to host
    const dx = process.hostPosition[0] - process.interstitialPosition[0];
    const dy = process.hostPosition[1] - process.interstitialPosition[1];
    const dz = process.hostPosition[2] - process.interstitialPosition[2];
    
    const fusionCenterX = process.interstitialPosition[0] + dx * 0.9;
    const fusionCenterY = process.interstitialPosition[1] + dy * 0.9;
    const fusionCenterZ = process.interstitialPosition[2] + dz * 0.9;
    
    // Both atoms start becoming less visible as they fuse
    animationData.interstitialVisible = 1 - phaseProgress;
    animationData.hostVisible = 1 - phaseProgress * 0.5; // Host fades more slowly
    
    // Energy wave starts to form
    animationData.energyWaveVisible = true;
    animationData.energyRadius = phaseProgress * 0.5; // Growing radius
    animationData.energyIntensity = phaseProgress;
    animationData.energyCenter = [fusionCenterX, fusionCenterY, fusionCenterZ];
  } 
  else {
    // Byproduct emission phase
    const phaseProgress = (currentProgress - fusionPhaseEnd) / (byproductPhaseEnd - fusionPhaseEnd);
    
    // Fusion center (where host was)
    const fusionCenterX = process.hostPosition[0];
    const fusionCenterY = process.hostPosition[1];
    const fusionCenterZ = process.hostPosition[2];
    
    // Original atoms are not visible
    animationData.interstitialVisible = 0;
    animationData.hostVisible = 0;
    
    // Energy wave expands and fades
    animationData.energyWaveVisible = true;
    animationData.energyRadius = 0.5 + phaseProgress * 1.5; // Continues expanding
    animationData.energyIntensity = Math.max(0, 1 - phaseProgress);
    animationData.energyCenter = [fusionCenterX, fusionCenterY, fusionCenterZ];
    
    // Byproducts become visible and move outward
    animationData.byproductsVisible = true;
    
    // Calculate positions for byproducts moving outward in different directions
    if (process.byproducts && process.byproducts.length > 0) {
      animationData.byproductPositions = process.byproducts.map((byproduct, index) => {
        // Create diverging paths based on index
        const angle = (index / process.byproducts.length) * Math.PI * 2;
        const distance = phaseProgress * 2;
        
        return {
          type: byproduct.type,
          energy: byproduct.energy,
          position: [
            fusionCenterX + Math.cos(angle) * distance,
            fusionCenterY + Math.sin(angle) * distance,
            fusionCenterZ + (Math.random() - 0.5) * distance
          ]
        };
      });
    }
  }
  
  return animationData;
};

/**
 * Calculate fusion statistics
 * @param {Array} processes - Array of fusion processes
 * @returns {Object} Statistical data about fusion processes
 */
export const calculateFusionStatistics = (processes) => {
  if (!processes || !Array.isArray(processes)) {
    return {
      totalProcesses: 0,
      activeProcesses: 0,
      completedProcesses: 0,
      totalEnergyReleased: 0,
      byproductCounts: {}
    };
  }
  
  const activeProcesses = processes.filter(p => p.status === 'active').length;
  const completedProcesses = processes.filter(p => p.status === 'completed').length;
  
  let totalEnergyReleased = 0;
  const byproductCounts = {};
  
  // Calculate total energy and byproduct counts
  processes.forEach(process => {
    // For completed processes, add full energy; for active ones, add proportional to progress
    const energyFactor = process.status === 'completed' ? 1 : (process.progress || 0);
    totalEnergyReleased += process.energyRelease * energyFactor;
    
    // Count byproducts for completed processes or based on progress
    if (process.byproducts && Array.isArray(process.byproducts) &&
        (process.status === 'completed' || (process.progress || 0) > 0.6)) {
      process.byproducts.forEach(byproduct => {
        const count = byproduct.count || 1;
        byproductCounts[byproduct.type] = (byproductCounts[byproduct.type] || 0) + count;
      });
    }
  });
  
  return {
    totalProcesses: processes.length,
    activeProcesses,
    completedProcesses,
    totalEnergyReleased,
    byproductCounts
  };
};

/**
 * Create fusion visualization data for Three.js
 * @param {Array} fusionProcesses - Array of fusion processes
 * @param {number} currentTime - Current timestamp
 * @returns {Object} Processed fusion data for visualization
 */
export const createFusionVisualizationData = (fusionProcesses, currentTime = Date.now()) => {
  if (!fusionProcesses || !Array.isArray(fusionProcesses)) {
    return {
      activeElements: [],
      energyWaves: [],
      byproducts: [],
      statistics: calculateFusionStatistics([])
    };
  }
  
  // Update process progress based on current time
  const updatedProcesses = updateFusionProcesses(fusionProcesses, currentTime);
  
  // Create visualization data for each process
  const visualizationData = updatedProcesses.map(process => 
    interpolateFusionProcess(process)
  );
  
  // Extract data for visualization
  const activeElements = [];
  const energyWaves = [];
  const byproducts = [];
  
  visualizationData.forEach(data => {
    if (!data) return;
    
    // Add active elements (interstitials and hosts that are visible)
    if (data.interstitialVisible) {
      activeElements.push({
        type: 'interstitial',
        position: data.interstitialPosition,
        opacity: data.interstitialVisible
      });
    }
    
    if (data.hostVisible) {
      activeElements.push({
        type: 'host',
        position: data.hostPosition,
        opacity: data.hostVisible
      });
    }
    
    // Add energy waves
    if (data.energyWaveVisible) {
      energyWaves.push({
        center: data.energyCenter,
        radius: data.energyRadius,
        intensity: data.energyIntensity
      });
    }
    
    // Add byproducts
    if (data.byproductsVisible && data.byproductPositions) {
      data.byproductPositions.forEach(byproduct => {
        byproducts.push({
          type: byproduct.type,
          position: byproduct.position,
          energy: byproduct.energy
        });
      });
    }
  });
  
  return {
    activeElements,
    energyWaves,
    byproducts,
    statistics: calculateFusionStatistics(updatedProcesses)
  };
}; 