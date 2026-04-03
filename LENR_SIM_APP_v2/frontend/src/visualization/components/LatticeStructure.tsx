import { useMemo } from 'react';
import * as THREE from 'three';
import ThreeJsLoader from './ThreeJsLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export type LatticePoint = {
  position: [number, number, number];
  element: string;
  occupancy?: number;
  energy?: number;
};

export type LatticeData = {
  points: LatticePoint[];
  connections: [number, number][];
  latticeConstants: [number, number, number];
  unitCell: 'sc' | 'bcc' | 'fcc' | 'hcp';
};

export type VisualizationMode = 'wireframe' | 'solid' | 'points';

// Define a type for a color mapping function
export type ColorMapFunction = (_value: number, _min: number, _max: number) => THREE.Color;

interface LatticeStructureProps {
  width?: number;
  height?: number;
  data: LatticeData;
  mode?: VisualizationMode;
  highlightEnergy?: boolean;
  showUnitCell?: boolean;
  onSceneReady?: (_scene: THREE.Scene) => void;
  colorMapFunction?: ColorMapFunction;
  optimizationLevel?: 'none' | 'low' | 'medium' | 'high';
}

const LatticeStructure: React.FC<LatticeStructureProps> = ({
  width = 800,
  height = 600,
  data,
  mode = 'solid',
  highlightEnergy = false,
  showUnitCell = true,
  onSceneReady,
  colorMapFunction,
  optimizationLevel = 'none'
}) => {
  // Create materials based on mode
  const materials = useMemo(() => ({
    wireframe: new THREE.LineBasicMaterial({ color: 0xffffff }),
    solid: new THREE.MeshPhongMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.8,
    }),
    points: new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.2,
      sizeAttenuation: true,
    }),
  }), []);

  // Calculate energy data range
  const energyRange = useMemo(() => {
    if (!highlightEnergy) return { min: 0, max: 0 };
    
    const energyValues = data.points.map(p => p.energy || 0);
    return {
      min: Math.min(...energyValues),
      max: Math.max(...energyValues)
    };
  }, [data.points, highlightEnergy]);

  // Default color scale for energy visualization
  const getDefaultEnergyColor = (energy: number) => {
    const scale = (energy - energyRange.min) / (energyRange.max - energyRange.min) || 0;
    return new THREE.Color().setHSL(0.7 * (1 - scale), 1, 0.5);
  };

  // Use the provided color function or default
  const getEnergyColor = (energy: number) => {
    if (colorMapFunction) {
      return colorMapFunction(energy, energyRange.min, energyRange.max);
    }
    return getDefaultEnergyColor(energy);
  };

  // Handle Three.js initialization
  const handleThreeJsReady = (_: any, renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
    // Set up orbit controls
    const controls = new OrbitControls(camera as THREE.PerspectiveCamera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Center the camera on the lattice
    const centerX = data.latticeConstants[0] / 2;
    const centerY = data.latticeConstants[1] / 2;
    const centerZ = data.latticeConstants[2] / 2;
    camera.position.set(centerX + 10, centerY + 10, centerZ + 10);
    camera.lookAt(centerX, centerY, centerZ);
    
    // Add ambient and directional lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create lattice points
    const pointsGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(data.points.length * 3);
    const colors = new Float32Array(data.points.length * 3);

    data.points.forEach((point, i) => {
      positions[i * 3] = point.position[0];
      positions[i * 3 + 1] = point.position[1];
      positions[i * 3 + 2] = point.position[2];

      const color = highlightEnergy && point.energy !== undefined
        ? getEnergyColor(point.energy)
        : new THREE.Color(0xffffff);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    });

    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Create connections
    const connectionsGeometry = new THREE.BufferGeometry();
    const connectionPositions = new Float32Array(data.connections.length * 6);

    data.connections.forEach(([from, to], i) => {
      const fromPoint = data.points[from].position;
      const toPoint = data.points[to].position;

      connectionPositions[i * 6] = fromPoint[0];
      connectionPositions[i * 6 + 1] = fromPoint[1];
      connectionPositions[i * 6 + 2] = fromPoint[2];
      connectionPositions[i * 6 + 3] = toPoint[0];
      connectionPositions[i * 6 + 4] = toPoint[1];
      connectionPositions[i * 6 + 5] = toPoint[2];
    });

    connectionsGeometry.setAttribute('position', new THREE.BufferAttribute(connectionPositions, 3));

    // Create meshes based on mode
    switch (mode) {
      case 'wireframe':
        const wireframe = new THREE.LineSegments(connectionsGeometry, materials.wireframe);
        scene.add(wireframe);
        break;

      case 'solid':
        // Create spheres for points
        data.points.forEach((point, index) => {
          const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
          
          // Clone the material to apply unique colors
          const material = materials.solid.clone();
          
          if (highlightEnergy && point.energy !== undefined) {
            material.color = getEnergyColor(point.energy);
          }
          
          const sphere = new THREE.Mesh(sphereGeometry, material);
          sphere.position.set(point.position[0], point.position[1], point.position[2]);
          sphere.userData = { pointIndex: index }; // Store reference for interactions
          scene.add(sphere);
        });

        // Optimize connections for large datasets
        if (optimizationLevel !== 'none' && data.connections.length > 1000) {
          // Use instanced meshes for large datasets
          const cylinderGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1, 8);
          cylinderGeometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
          
          const instancedMesh = new THREE.InstancedMesh(
            cylinderGeometry,
            materials.solid.clone(),
            data.connections.length
          );
          
          const matrix = new THREE.Matrix4();
          const position = new THREE.Vector3();
          const quaternion = new THREE.Quaternion();
          const scale = new THREE.Vector3();
          
          data.connections.forEach(([from, to], i) => {
            const fromPoint = new THREE.Vector3(...data.points[from].position);
            const toPoint = new THREE.Vector3(...data.points[to].position);
            
            const direction = toPoint.clone().sub(fromPoint);
            const length = direction.length();
            
            position.copy(fromPoint).add(direction.multiplyScalar(0.5));
            scale.set(1, 1, length);
            quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              direction.clone().normalize()
            );
            
            matrix.compose(position, quaternion, scale);
            instancedMesh.setMatrixAt(i, matrix);
          });
          
          instancedMesh.instanceMatrix.needsUpdate = true;
          scene.add(instancedMesh);
        } else {
          // Create cylinders for connections (traditional approach)
          data.connections.forEach(([from, to]) => {
            const fromPoint = new THREE.Vector3(...data.points[from].position);
            const toPoint = new THREE.Vector3(...data.points[to].position);
            
            const direction = toPoint.clone().sub(fromPoint);
            const length = direction.length();
            
            const cylinderGeometry = new THREE.CylinderGeometry(0.03, 0.03, length, 8);
            const cylinder = new THREE.Mesh(cylinderGeometry, materials.solid.clone());
            
            // Position and rotate cylinder
            cylinder.position.copy(fromPoint.clone().add(direction.multiplyScalar(0.5)));
            cylinder.lookAt(toPoint);
            cylinder.rotateX(Math.PI / 2);
            
            scene.add(cylinder);
          });
        }
        break;

      case 'points':
        const points = new THREE.Points(pointsGeometry, materials.points);
        scene.add(points);
        break;
    }

    // Add unit cell if requested
    if (showUnitCell) {
      const [a, b, c] = data.latticeConstants;
      const unitCellGeometry = new THREE.BoxGeometry(a, b, c);
      const unitCellMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
      const unitCellWireframe = new THREE.LineSegments(
        new THREE.WireframeGeometry(unitCellGeometry),
        unitCellMaterial
      );
      scene.add(unitCellWireframe);
    }

    // Call the onSceneReady prop if provided
    if (onSceneReady) {
      onSceneReady(scene);
    }
    
    // Animation loop for controls damping
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    
    animate();
  };
  
  // Error handling
  const handleError = (error: Error) => {
    console.error("Error in LatticeStructure:", error);
  };

  return (
    <ThreeJsLoader
      width={width}
      height={height}
      onThreeJsReady={handleThreeJsReady}
      onError={handleError}
      backgroundColor="#1a1a1a"
      fallback={
        <div style={{ textAlign: 'center' }}>
          <p>Failed to render lattice visualization. Please try refreshing the page.</p>
        </div>
      }
    />
  );
};

export default LatticeStructure; 