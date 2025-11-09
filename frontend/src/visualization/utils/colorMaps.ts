import * as THREE from 'three';

// Define the structure for a color map
export interface ColorMap {
  name: string;
  threeColors: THREE.Color[];
  stops: number[];
  cssGradient: string;
}

// Define specific color maps
const temperatureDefault: ColorMap = {
  name: 'temperature_default',
  threeColors: [
    new THREE.Color(0x0000ff), // Blue (cold)
    new THREE.Color(0x00ffff), // Cyan
    new THREE.Color(0x00ff00), // Green
    new THREE.Color(0xffff00), // Yellow
    new THREE.Color(0xff0000), // Red (hot)
  ],
  stops: [0, 0.25, 0.5, 0.75, 1],
  get cssGradient() {
    const hexColors = this.threeColors.map(c => `#${c.getHexString()}`);
    return `linear-gradient(to right, ${hexColors.join(', ')})`;
  }
};

const energyDefault: ColorMap = {
  name: 'energy_default',
  threeColors: [
    new THREE.Color(0x000044), // Deep blue (low energy)
    new THREE.Color(0x0044aa), // Blue
    new THREE.Color(0x00aaff), // Light blue
    new THREE.Color(0xffaa00), // Orange
    new THREE.Color(0xff4400), // Red (high energy)
  ],
  stops: [0, 0.25, 0.5, 0.75, 1],
  get cssGradient() {
    const hexColors = this.threeColors.map(c => `#${c.getHexString()}`);
    return `linear-gradient(to right, ${hexColors.join(', ')})`;
  }
};

const reactionRateDefault: ColorMap = {
  name: 'reaction_rate_default',
  threeColors: [
    new THREE.Color(0x000000), // Black (no reactions)
    new THREE.Color(0x004400), // Dark green
    new THREE.Color(0x00aa00), // Green
    new THREE.Color(0xaaff00), // Yellow-green
    new THREE.Color(0xffaa00), // Orange (many reactions)
  ],
  stops: [0, 0.25, 0.5, 0.75, 1],
  get cssGradient() {
    const hexColors = this.threeColors.map(c => `#${c.getHexString()}`);
    return `linear-gradient(to right, ${hexColors.join(', ')})`;
  }
};

// Add other predefined maps if needed (like Viridis from legend)
const viridisMap: ColorMap = {
  name: 'viridis',
  threeColors: [
    new THREE.Color('#440154'), 
    new THREE.Color('#414487'), 
    new THREE.Color('#2a788e'), 
    new THREE.Color('#22a884'), 
    new THREE.Color('#7ad151'), 
    new THREE.Color('#fde725')
  ],
  stops: [0, 0.2, 0.4, 0.6, 0.8, 1],
  get cssGradient() {
    const hexColors = this.threeColors.map(c => `#${c.getHexString()}`);
    return `linear-gradient(to right, ${hexColors.join(', ')})`;
  }
};

// Collection of all available color maps
export const colorMaps: { [key: string]: ColorMap } = {
  temperature_default: temperatureDefault,
  energy_default: energyDefault,
  reaction_rate_default: reactionRateDefault,
  viridis: viridisMap,
  // Add other maps here
};

// Helper function to get a color from a map based on value
export function getColorFromMap(
  value: number,
  min: number,
  max: number,
  map: ColorMap
): THREE.Color {
  const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min) || 0));

  for (let i = 0; i < map.stops.length - 1; i++) {
    if (normalizedValue >= map.stops[i] && normalizedValue <= map.stops[i + 1]) {
      const segmentPos = (normalizedValue - map.stops[i]) /
                         (map.stops[i + 1] - map.stops[i]);
      
      const color1 = map.threeColors[i];
      const color2 = map.threeColors[i + 1];
      
      // Check if colors are valid THREE.Color objects before lerping
      if (color1 instanceof THREE.Color && color2 instanceof THREE.Color) {
          return new THREE.Color().copy(color1).lerp(color2, segmentPos);
      } else {
          console.error("Invalid color object encountered in color map:", map.name, i);
          // Fallback to the first color if interpolation fails
          return map.threeColors[0]?.clone() ?? new THREE.Color(0xffffff); 
      }
    }
  }
  // Fallback: return the last color if value is exactly 1 or something went wrong
  return map.threeColors[map.threeColors.length - 1]?.clone() ?? new THREE.Color(0xffffff); 
}

// Function to get the appropriate default color map based on visualization type
export const getDefaultColorMapForType = (visType: 'temperature' | 'energy' | 'reaction_rate'): ColorMap => {
  switch (visType) {
    case 'temperature': return colorMaps.temperature_default;
    case 'energy': return colorMaps.energy_default;
    case 'reaction_rate': return colorMaps.reaction_rate_default;
    default: return colorMaps.energy_default; // Fallback
  }
}; 