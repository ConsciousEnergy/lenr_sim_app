import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, Tooltip, IconButton, Stack } from '@mui/material';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { getParticleSimulation } from '../api/api';
import ExportButton from './common/ExportButton';
import { arrayToCSV, exportParticleDataToExcel } from '../utils/exportUtils';

const Visualization3D = ({ simulationType = 'thermal', simulationParams = {} }) => {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sceneInfo, setSceneInfo] = useState(null);
  const [particleData, setParticleData] = useState(null);
  
  // Function to create and update the 3D scene
  const setupScene = (particles) => {
    if (!mountRef.current) return null;
    
    // Clear previous scene if it exists
    while(mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    
    // Scene setup
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);
    
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 10);
    scene.add(directionalLight);
    
    // Add particles to the scene
    const particlesGroup = new THREE.Group();
    scene.add(particlesGroup);
    
    // Different materials for different particle types
    const deuteriumMaterial = new THREE.MeshStandardMaterial({ color: 0x0088ff });
    const palladiumMaterial = new THREE.MeshStandardMaterial({ color: 0x996633 });
    
    particles.forEach(particle => {
      const geometry = new THREE.SphereGeometry(particle.radius, 16, 16);
      const material = particle.type === 'deuterium' ? deuteriumMaterial : palladiumMaterial;
      const mesh = new THREE.Mesh(geometry, material);
      
      mesh.position.set(particle.x, particle.y, particle.z);
      particlesGroup.add(mesh);
    });
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Return cleanup function
    return {
      cleanup: () => {
        window.removeEventListener('resize', handleResize);
        mountRef.current?.removeChild(renderer.domElement);
        renderer.dispose();
        
        // Dispose of geometries and materials
        particlesGroup.traverse((object) => {
          if (object.isMesh) {
            object.geometry.dispose();
            if (object.material.dispose) {
              object.material.dispose();
            }
          }
        });
      },
      particlesCount: particles.length,
      particleTypes: [...new Set(particles.map(p => p.type))].join(', '),
      boundingBox: calculateBoundingBox(particles)
    };
  };
  
  // Calculate the bounding box for a set of particles
  const calculateBoundingBox = (particles) => {
    if (!particles.length) return { min: [0, 0, 0], max: [0, 0, 0] };
    
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    
    particles.forEach(p => {
      min[0] = Math.min(min[0], p.x);
      min[1] = Math.min(min[1], p.y);
      min[2] = Math.min(min[2], p.z);
      
      max[0] = Math.max(max[0], p.x);
      max[1] = Math.max(max[1], p.y);
      max[2] = Math.max(max[2], p.z);
    });
    
    return { min, max };
  };
  
  // Fetch particle data and set up visualization
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await getParticleSimulation(simulationType, simulationParams);
        setParticleData(data);
        
        const info = setupScene(data.particles);
        setSceneInfo(info);
      } catch (err) {
        console.error('Error fetching particle data:', err);
        setError('Failed to load particle visualization data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    return () => {
      if (sceneInfo && sceneInfo.cleanup) {
        sceneInfo.cleanup();
      }
    };
  }, [simulationType, simulationParams]);

  // Handler for CSV export
  const handleExportCSV = () => {
    if (particleData && particleData.particles) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `particle_data_${simulationType}_${timestamp}.csv`;
      
      // Create CSV content with metadata and particle data
      let csvContent = "# Particle Simulation Metadata\n";
      csvContent += `# Simulation Type: ${simulationType}\n`;
      if (particleData.metadata) {
        Object.entries(particleData.metadata).forEach(([key, value]) => {
          csvContent += `# ${key}: ${value}\n`;
        });
      }
      csvContent += `# Total Particles: ${particleData.particles.length}\n`;
      csvContent += `# Timestamp: ${new Date().toISOString()}\n`;
      csvContent += "\n";
      
      // Add particle data
      csvContent += arrayToCSV(particleData.particles);
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handler for JSON export
  const handleExportJSON = () => {
    if (particleData) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `particle_data_${simulationType}_${timestamp}.json`;
      
      // Create JSON content
      const jsonData = {
        simulationType,
        metadata: particleData.metadata || {},
        totalParticles: particleData.particles.length,
        timestamp: new Date().toISOString(),
        particles: particleData.particles
      };
      
      // Create download link
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handler for Excel export
  const handleExportExcel = () => {
    if (particleData) {
      exportParticleDataToExcel(particleData, simulationType);
    }
  };
  
  return (
    <Paper sx={{ p: 2, height: 500, display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">
          3D Particle Visualization
        </Typography>
        {particleData && (
          <ExportButton 
            onExportCSV={handleExportCSV}
            onExportJSON={handleExportJSON}
            onExportExcel={handleExportExcel}
            tooltipTitle="Export particle data"
            buttonProps={{ size: 'small' }}
          />
        )}
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box 
        ref={mountRef} 
        sx={{ 
          flexGrow: 1, 
          position: 'relative',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        {loading && (
          <Box 
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              zIndex: 1
            }}
          >
            <CircularProgress />
          </Box>
        )}
      </Box>
      
      {sceneInfo && (
        <Box mt={2}>
          <Typography variant="body2" gutterBottom>
            Particles: {sceneInfo.particlesCount} ({sceneInfo.particleTypes})
          </Typography>
          <Typography variant="body2">
            Simulation volume: {Math.abs((sceneInfo.boundingBox.max[0] - sceneInfo.boundingBox.min[0]) * 
                                       (sceneInfo.boundingBox.max[1] - sceneInfo.boundingBox.min[1]) * 
                                       (sceneInfo.boundingBox.max[2] - sceneInfo.boundingBox.min[2])).toExponential(2)} m³
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default Visualization3D; 