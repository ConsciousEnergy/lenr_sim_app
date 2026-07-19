import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import threeCleanup from '../../utils/threeCleanup';

interface LatticePoint {
  position: THREE.Vector3;
  energy: number;
}

interface LatticeConnection {
  start: number;
  end: number;
}

interface LatticeData {
  points: LatticePoint[];
  connections: LatticeConnection[];
}

type LatticeType = 'FCC' | 'BCC' | 'SC' | 'Diamond';

// Function to generate an FCC (Face-Centered Cubic) lattice
const generateFCCLattice = (
  size = 3,
  latticeConstant = 1.0
): LatticeData => {
  const points: LatticePoint[] = [];
  const connections: LatticeConnection[] = [];
  
  // Generate FCC lattice points
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      for (let k = 0; k < size; k++) {
        // Corner atom
        points.push({
          position: new THREE.Vector3(
            i * latticeConstant,
            j * latticeConstant,
            k * latticeConstant
          ),
          energy: Math.random()  // Random energy for demonstration
        });
        
        // Face-centered atoms (if not at the edge)
        if (i < size - 1 && j < size - 1) {
          points.push({
            position: new THREE.Vector3(
              (i + 0.5) * latticeConstant,
              (j + 0.5) * latticeConstant,
              k * latticeConstant
            ),
            energy: Math.random()
          });
        }
        
        if (i < size - 1 && k < size - 1) {
          points.push({
            position: new THREE.Vector3(
              (i + 0.5) * latticeConstant,
              j * latticeConstant,
              (k + 0.5) * latticeConstant
            ),
            energy: Math.random()
          });
        }
        
        if (j < size - 1 && k < size - 1) {
          points.push({
            position: new THREE.Vector3(
              i * latticeConstant,
              (j + 0.5) * latticeConstant,
              (k + 0.5) * latticeConstant
            ),
            energy: Math.random()
          });
        }
      }
    }
  }
  
  // Generate connections (nearest neighbors)
  const connectionDistance = latticeConstant * 0.75; // Adjust based on your needs
  
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const distance = points[i].position.distanceTo(points[j].position);
      if (distance < connectionDistance) {
        connections.push({ start: i, end: j });
      }
    }
  }
  
  return { points, connections };
};

// Function to generate a BCC (Body-Centered Cubic) lattice
const generateBCCLattice = (
  size = 3,
  latticeConstant = 1.0
): LatticeData => {
  const points: LatticePoint[] = [];
  const connections: LatticeConnection[] = [];
  
  // Generate BCC lattice points
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      for (let k = 0; k < size; k++) {
        // Corner atom
        points.push({
          position: new THREE.Vector3(
            i * latticeConstant,
            j * latticeConstant,
            k * latticeConstant
          ),
          energy: Math.random()
        });
        
        // Body-centered atom (if not at the edge)
        if (i < size - 1 && j < size - 1 && k < size - 1) {
          points.push({
            position: new THREE.Vector3(
              (i + 0.5) * latticeConstant,
              (j + 0.5) * latticeConstant,
              (k + 0.5) * latticeConstant
            ),
            energy: Math.random()
          });
        }
      }
    }
  }
  
  // Generate connections (nearest neighbors)
  const connectionDistance = latticeConstant * 0.9; // Adjusted for BCC
  
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const distance = points[i].position.distanceTo(points[j].position);
      if (distance < connectionDistance) {
        connections.push({ start: i, end: j });
      }
    }
  }
  
  return { points, connections };
};

// Function to generate a SC (Simple Cubic) lattice
const generateSCLattice = (
  size = 3,
  latticeConstant = 1.0
): LatticeData => {
  const points: LatticePoint[] = [];
  const connections: LatticeConnection[] = [];
  
  // Generate SC lattice points (only corners)
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      for (let k = 0; k < size; k++) {
        points.push({
          position: new THREE.Vector3(
            i * latticeConstant,
            j * latticeConstant,
            k * latticeConstant
          ),
          energy: Math.random()
        });
      }
    }
  }
  
  // Generate connections (nearest neighbors)
  const connectionDistance = latticeConstant * 1.1; // Slightly more than lattice constant
  
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const distance = points[i].position.distanceTo(points[j].position);
      if (distance < connectionDistance) {
        connections.push({ start: i, end: j });
      }
    }
  }
  
  return { points, connections };
};

// Function to generate a Diamond cubic lattice
const generateDiamondLattice = (
  size = 2,
  latticeConstant = 1.0
): LatticeData => {
  const points: LatticePoint[] = [];
  const connections: LatticeConnection[] = [];
  
  // Generate Diamond lattice points (two FCC lattices offset by 1/4)
  // First FCC sublattice
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      for (let k = 0; k < size; k++) {
        // Corner atom
        points.push({
          position: new THREE.Vector3(
            i * latticeConstant,
            j * latticeConstant,
            k * latticeConstant
          ),
          energy: Math.random()
        });
        
        // Face-centered atoms
        if (i < size - 1 && j < size - 1) {
          points.push({
            position: new THREE.Vector3(
              (i + 0.5) * latticeConstant,
              (j + 0.5) * latticeConstant,
              k * latticeConstant
            ),
            energy: Math.random()
          });
        }
        
        if (i < size - 1 && k < size - 1) {
          points.push({
            position: new THREE.Vector3(
              (i + 0.5) * latticeConstant,
              j * latticeConstant,
              (k + 0.5) * latticeConstant
            ),
            energy: Math.random()
          });
        }
        
        if (j < size - 1 && k < size - 1) {
          points.push({
            position: new THREE.Vector3(
              i * latticeConstant,
              (j + 0.5) * latticeConstant,
              (k + 0.5) * latticeConstant
            ),
            energy: Math.random()
          });
        }
      }
    }
  }
  
  // Second FCC sublattice, offset by (1/4, 1/4, 1/4)
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      for (let k = 0; k < size; k++) {
        // Offset atoms
        points.push({
          position: new THREE.Vector3(
            (i + 0.25) * latticeConstant,
            (j + 0.25) * latticeConstant,
            (k + 0.25) * latticeConstant
          ),
          energy: Math.random()
        });
        
        // Offset face-centered atoms
        if (i < size - 1 && j < size - 1) {
          points.push({
            position: new THREE.Vector3(
              (i + 0.75) * latticeConstant,
              (j + 0.75) * latticeConstant,
              (k + 0.25) * latticeConstant
            ),
            energy: Math.random()
          });
        }
        
        if (i < size - 1 && k < size - 1) {
          points.push({
            position: new THREE.Vector3(
              (i + 0.75) * latticeConstant,
              (j + 0.25) * latticeConstant,
              (k + 0.75) * latticeConstant
            ),
            energy: Math.random()
          });
        }
        
        if (j < size - 1 && k < size - 1) {
          points.push({
            position: new THREE.Vector3(
              (i + 0.25) * latticeConstant,
              (j + 0.75) * latticeConstant,
              (k + 0.75) * latticeConstant
            ),
            energy: Math.random()
          });
        }
      }
    }
  }
  
  // Generate connections (nearest neighbors) - diamond has a specific connection pattern
  // Note: In diamond, each atom is connected to its 4 nearest neighbors
  const connectionDistance = latticeConstant * 0.45; // Adjusted for diamond
  
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const distance = points[i].position.distanceTo(points[j].position);
      if (distance < connectionDistance) {
        connections.push({ start: i, end: j });
      }
    }
  }
  
  return { points, connections };
};

// Function to generate lattice data based on type
const generateLatticeData = (
  latticeType: LatticeType, 
  size = 3, 
  latticeConstant = 1.0
): LatticeData => {
  switch (latticeType) {
    case 'FCC':
      return generateFCCLattice(size, latticeConstant);
    case 'BCC':
      return generateBCCLattice(size, latticeConstant);
    case 'SC':
      return generateSCLattice(size, latticeConstant);
    case 'Diamond':
      return generateDiamondLattice(size, latticeConstant);
    default:
      return generateFCCLattice(size, latticeConstant);
  }
};

// Function to map energy value to color
const getColorFromEnergy = (energy: number): THREE.Color => {
  // Simple blue (cold) to red (hot) gradient
  return new THREE.Color(energy, 0, 1 - energy);
};

const LatticeTest: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const linesRef = useRef<THREE.LineSegments | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  
  const [latticeData, setLatticeData] = useState<LatticeData | null>(null);
  const [viewMode, setViewMode] = useState<'solid' | 'wireframe' | 'points'>('wireframe');
  const [showEnergy, setShowEnergy] = useState<boolean>(true);
  const [showUnitCell, setShowUnitCell] = useState<boolean>(true);
  const [latticeType, setLatticeType] = useState<LatticeType>('FCC');
  const [latticeSize, setLatticeSize] = useState<number>(3);
  const [particleSize, setParticleSize] = useState<number>(0.1);
  
  // Generate lattice data
  // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
    setLatticeData(generateLatticeData(latticeType, latticeSize, 1.0));
  }, [latticeType, latticeSize]);
  
  // Set up and manage the 3D scene
  useEffect(() => {
    if (!containerRef.current || !latticeData) return;
    
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x111111);
    
    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    cameraRef.current = camera;
    camera.position.set(5, 5, 5);
    camera.lookAt(1.5, 1.5, 1.5);
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Clear container
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);
    
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.target.set(1.5, 1.5, 1.5);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);
    
    // Grid helper for reference
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);
    
    // Render loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    
    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer || !container) return;
      
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      
      renderer.setSize(newWidth, newHeight);
    };
    
    window.addEventListener('resize', handleResize);
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      
      threeCleanup.cleanupThreeJS(scene, renderer, controls);
    };
  }, [latticeData]);
  
  // Update visualization based on user selections
  useEffect(() => {
    if (!sceneRef.current || !latticeData) return;
    
    const scene = sceneRef.current;
    
    // Remove existing visualizations
    if (pointsRef.current) scene.remove(pointsRef.current);
    if (linesRef.current) scene.remove(linesRef.current);
    if (meshRef.current) scene.remove(meshRef.current);
    
    // Clear any existing unit cell outlines
    scene.children = scene.children.filter(child => 
      !(child instanceof THREE.LineSegments && child.userData.isUnitCell));
    
    // Add unit cell outline if enabled
    if (showUnitCell) {
      const unitCellSize = latticeSize;
      const cellGeo = new THREE.BoxGeometry(unitCellSize, unitCellSize, unitCellSize);
      const cellEdges = new THREE.EdgesGeometry(cellGeo);
      const cellLines = new THREE.LineSegments(
        cellEdges,
        new THREE.LineBasicMaterial({ color: 0x444444 })
      );
      cellLines.userData.isUnitCell = true;
      cellLines.position.set(latticeSize/2, latticeSize/2, latticeSize/2);
      scene.add(cellLines);
    }
    
    // Render points
    if (viewMode === 'points' || viewMode === 'wireframe') {
      const pointsGeometry = new THREE.BufferGeometry();
      const positions: number[] = [];
      const colors: number[] = [];
      
      latticeData.points.forEach(point => {
        positions.push(point.position.x, point.position.y, point.position.z);
        
        const color = showEnergy 
          ? getColorFromEnergy(point.energy) 
          : new THREE.Color(0xffffff);
          
        colors.push(color.r, color.g, color.b);
      });
      
      pointsGeometry.setAttribute(
        'position', 
        new THREE.Float32BufferAttribute(positions, 3)
      );
      
      pointsGeometry.setAttribute(
        'color', 
        new THREE.Float32BufferAttribute(colors, 3)
      );
      
      const pointsMaterial = new THREE.PointsMaterial({
        size: particleSize,
        vertexColors: true,
      });
      
      const points = new THREE.Points(pointsGeometry, pointsMaterial);
      pointsRef.current = points;
      scene.add(points);
    }
    
    // Render lines for connections
    if (viewMode === 'wireframe') {
      const linesGeometry = new THREE.BufferGeometry();
      const positions: number[] = [];
      
      latticeData.connections.forEach(connection => {
        const start = latticeData.points[connection.start].position;
        const end = latticeData.points[connection.end].position;
        
        positions.push(start.x, start.y, start.z);
        positions.push(end.x, end.y, end.z);
      });
      
      linesGeometry.setAttribute(
        'position', 
        new THREE.Float32BufferAttribute(positions, 3)
      );
      
      const linesMaterial = new THREE.LineBasicMaterial({
        color: 0xaaaaaa,
        opacity: 0.7,
        transparent: true
      });
      
      const lines = new THREE.LineSegments(linesGeometry, linesMaterial);
      linesRef.current = lines;
      scene.add(lines);
    }
    
    // Render solid mesh
    if (viewMode === 'solid') {
      // Create a merged geometry for all points
      const sphereGeometry = new THREE.SphereGeometry(particleSize * 0.5, 16, 16);
      const instancedMesh = new THREE.InstancedMesh(
        sphereGeometry,
        new THREE.MeshPhongMaterial(),
        latticeData.points.length
      );
      
      const dummy = new THREE.Object3D();
      
      latticeData.points.forEach((point, index) => {
        dummy.position.copy(point.position);
        dummy.updateMatrix();
        
        instancedMesh.setMatrixAt(index, dummy.matrix);
        
        const color = showEnergy 
          ? getColorFromEnergy(point.energy) 
          : new THREE.Color(0xdddddd);
          
        instancedMesh.setColorAt(index, color);
      });
      
      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
      }
      
      meshRef.current = instancedMesh;
      scene.add(instancedMesh);
    }
    
    // Generate color legend for energy
    const updateEnergyLegend = () => {
      if (!legendRef.current) return;
      const legend = legendRef.current;
      
      // Clear existing legend
      while (legend.firstChild) {
        legend.removeChild(legend.firstChild);
      }
      
      if (showEnergy) {
        legend.style.display = 'block';
        
        // Create gradient container
        const gradientDiv = document.createElement('div');
        gradientDiv.style.width = '100%';
        gradientDiv.style.height = '20px';
        gradientDiv.style.marginBottom = '5px';
        gradientDiv.style.background = 'linear-gradient(to right, blue, red)';
        legend.appendChild(gradientDiv);
        
        // Create labels
        const labelsDiv = document.createElement('div');
        labelsDiv.style.display = 'flex';
        labelsDiv.style.justifyContent = 'space-between';
        
        const lowLabel = document.createElement('span');
        lowLabel.textContent = 'Low Energy';
        lowLabel.style.fontSize = '10px';
        
        const highLabel = document.createElement('span');
        highLabel.textContent = 'High Energy';
        highLabel.style.fontSize = '10px';
        
        labelsDiv.appendChild(lowLabel);
        labelsDiv.appendChild(highLabel);
        legend.appendChild(labelsDiv);
      } else {
        legend.style.display = 'none';
      }
    };
    
    updateEnergyLegend();
    
    return () => {
      // Clean up visualizations when view mode changes
      if (pointsRef.current) scene.remove(pointsRef.current);
      if (linesRef.current) scene.remove(linesRef.current);
      if (meshRef.current) scene.remove(meshRef.current);
    };
  }, [latticeData, viewMode, showEnergy, showUnitCell, latticeSize, particleSize]);
  
  if (!latticeData) {
    return <div>Loading lattice data...</div>;
  }
  
  return (
    <div className="lattice-test-container" style={{ width: '100%', height: '600px' }}>
      <div className="controls" style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '10px', 
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '4px',
        zIndex: 10,
        width: '230px',
        maxHeight: '90%',
        overflowY: 'auto'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Lattice Visualization</h3>
        
        <div className="control-group" style={{ marginBottom: '15px' }}>
          <label>Lattice Type: </label>
          <div className="button-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
            {(['FCC', 'BCC', 'SC', 'Diamond'] as LatticeType[]).map(type => (
              <button 
                key={type}
                onClick={() => setLatticeType(type)}
                style={{ 
                  background: latticeType === type ? '#4a90e2' : '#333',
                  padding: '5px 8px',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  flex: '1 0 40%'
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        
        <div className="control-group" style={{ marginBottom: '15px' }}>
          <label>View Mode: </label>
          <div className="button-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
            <button 
              onClick={() => setViewMode('solid')}
              style={{ 
                background: viewMode === 'solid' ? '#4a90e2' : '#333',
                padding: '5px 10px',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                flex: '1'
              }}
            >
              Solid
            </button>
            <button 
              onClick={() => setViewMode('wireframe')}
              style={{ 
                background: viewMode === 'wireframe' ? '#4a90e2' : '#333',
                padding: '5px 10px',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                flex: '1'
              }}
            >
              Wireframe
            </button>
            <button 
              onClick={() => setViewMode('points')}
              style={{ 
                background: viewMode === 'points' ? '#4a90e2' : '#333',
                padding: '5px 10px',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                flex: '1'
              }}
            >
              Points
            </button>
          </div>
        </div>
        
        <div className="control-group" style={{ marginBottom: '15px' }}>
          <label>Lattice Size: {latticeSize}</label>
          <input 
            type="range" 
            min="1" 
            max="5" 
            step="1" 
            value={latticeSize}
            onChange={(e) => setLatticeSize(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        
        <div className="control-group" style={{ marginBottom: '15px' }}>
          <label>Particle Size: {particleSize.toFixed(2)}</label>
          <input 
            type="range" 
            min="0.05" 
            max="0.3" 
            step="0.01" 
            value={particleSize}
            onChange={(e) => setParticleSize(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        
        <div className="control-group" style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={showEnergy} 
              onChange={() => setShowEnergy(!showEnergy)}
              style={{ marginRight: '8px' }}
            />
            Show Energy Colors
          </label>
        </div>
        
        <div className="control-group" style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={showUnitCell} 
              onChange={() => setShowUnitCell(!showUnitCell)}
              style={{ marginRight: '8px' }}
            />
            Show Unit Cell
          </label>
        </div>
        
        <div 
          ref={legendRef}
          className="energy-legend" 
          style={{ 
            marginTop: '10px', 
            padding: '5px', 
            background: 'rgba(0,0,0,0.5)', 
            borderRadius: '4px',
            display: showEnergy ? 'block' : 'none'
          }}
        >
          {/* Legend content will be generated in the useEffect */}
        </div>
        
        <div className="info-panel" style={{ marginTop: '15px', fontSize: '11px' }}>
          <p>Lattice Info:</p>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            <li>Type: {latticeType}</li>
            <li>Points: {latticeData?.points.length || 0}</li>
            <li>Connections: {latticeData?.connections.length || 0}</li>
          </ul>
          <p style={{ fontSize: '10px', fontStyle: 'italic', marginTop: '10px' }}>
            Use mouse to rotate, zoom with scroll wheel, and pan with right-click drag.
          </p>
        </div>
      </div>
      
      <div 
        ref={containerRef} 
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default LatticeTest; 