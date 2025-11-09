import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  Button,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  TextField,
  Chip,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  PlayArrow as PlayArrowIcon,
  Science as ScienceIcon
} from '@mui/icons-material';

import { getElementSymbol, formatReactionEquation } from '../../services';

/**
 * Visual Reaction Builder Component
 * 
 * Provides an intuitive, visual interface for designing custom fusion reactions
 * with real-time feedback on reaction balance and energetics.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.initialReaction - Initial reaction data (optional)
 * @param {Function} props.onSave - Save callback function
 * @param {Function} props.onTest - Test reaction callback function
 * @param {Function} props.onCancel - Cancel callback function
 * @returns {JSX.Element} Visual Reaction Builder component
 */
const VisualReactionBuilder = ({ 
  initialReaction = null, 
  onSave, 
  onTest, 
  onCancel 
}) => {
  // Initialize reaction state from props or create a new empty one
  const [reaction, setReaction] = useState({
    name: '',
    reactant1_z: 1,
    reactant1_a: 1,
    reactant2_z: 1,
    reactant2_a: 1,
    products: [{ name: '', z: 2, a: 2, branch_ratio: 1.0 }],
    q_value: 1.0
  });
  
  // Validation state
  const [errors, setErrors] = useState([]);
  const [isBalanced, setIsBalanced] = useState(false);
  
  // Update reaction state from props when initialReaction changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
    if (initialReaction) {
      setReaction(initialReaction);
    }
  }, [initialReaction]);
  
  // Validate reaction whenever it changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
    validateReaction();
  }, [reaction]);
  
  // Handle input change for reaction properties
  const handleInputChange = (field, value) => {
    setReaction(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle reactant change
  const handleReactantChange = (reactantNum, field, value) => {
    const reactantField = `reactant${reactantNum}_${field}`;
    setReaction(prev => ({
      ...prev,
      [reactantField]: value
    }));
  };
  
  // Handle product change
  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...reaction.products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value
    };
    
    setReaction(prev => ({
      ...prev,
      products: updatedProducts
    }));
  };
  
  // Add a new product
  const handleAddProduct = () => {
    // Calculate likely values for a new product based on conservation laws
    const inputZ = reaction.reactant1_z + reaction.reactant2_z;
    const inputA = reaction.reactant1_a + reaction.reactant2_a;
    
    // Sum up existing products
    let currentOutputZ = 0;
    let currentOutputA = 0;
    let totalBranchRatio = 0;
    
    reaction.products.forEach(product => {
      currentOutputZ += product.z * product.branch_ratio;
      currentOutputA += product.a * product.branch_ratio;
      totalBranchRatio += product.branch_ratio;
    });
    
    // Determine suggested values for new product
    const remainingBranchRatio = Math.max(0, Math.min(1 - totalBranchRatio, 1));
    
    // If branch ratios already sum to 1, adjust existing products
    if (remainingBranchRatio <= 0) {
      const updatedProducts = reaction.products.map((product, i) => ({
        ...product,
        branch_ratio: product.branch_ratio * 0.9 // Scale down existing products
      }));
      
      setReaction(prev => ({
        ...prev,
        products: [
          ...updatedProducts,
          { name: '', z: inputZ - currentOutputZ, a: inputA - currentOutputA, branch_ratio: 0.1 }
        ]
      }));
    } else {
      // Otherwise, use the remaining branch ratio
      setReaction(prev => ({
        ...prev,
        products: [
          ...prev.products,
          { name: '', z: inputZ - currentOutputZ, a: inputA - currentOutputA, branch_ratio: remainingBranchRatio }
        ]
      }));
    }
  };
  
  // Remove a product
  const handleRemoveProduct = (index) => {
    const updatedProducts = [...reaction.products];
    updatedProducts.splice(index, 1);
    
    setReaction(prev => ({
      ...prev,
      products: updatedProducts
    }));
  };
  
  // Validate reaction
  const validateReaction = () => {
    const validationErrors = [];
    
    // Check for required fields
    if (!reaction.name) {
      validationErrors.push('Reaction name is required');
    }
    
    if (!Number.isInteger(reaction.reactant1_z) || reaction.reactant1_z < 0) {
      validationErrors.push('Reactant 1 atomic number (Z) must be a non-negative integer');
    }
    
    if (!Number.isInteger(reaction.reactant1_a) || reaction.reactant1_a <= 0) {
      validationErrors.push('Reactant 1 mass number (A) must be a positive integer');
    }
    
    if (!Number.isInteger(reaction.reactant2_z) || reaction.reactant2_z < 0) {
      validationErrors.push('Reactant 2 atomic number (Z) must be a non-negative integer');
    }
    
    if (!Number.isInteger(reaction.reactant2_a) || reaction.reactant2_a <= 0) {
      validationErrors.push('Reactant 2 mass number (A) must be a positive integer');
    }
    
    if (reaction.q_value <= 0) {
      validationErrors.push('Q-value must be positive');
    }
    
    // Check products
    if (!reaction.products || !Array.isArray(reaction.products) || reaction.products.length === 0) {
      validationErrors.push('At least one product is required');
    } else {
      // Calculate total charge and mass for conservation check
      const inputZ = reaction.reactant1_z + reaction.reactant2_z;
      const inputA = reaction.reactant1_a + reaction.reactant2_a;
      let outputZ = 0;
      let outputA = 0;
      let totalBranchRatio = 0;
      
      // Validate each product
      for (let i = 0; i < reaction.products.length; i++) {
        const product = reaction.products[i];
        
        if (!Number.isInteger(product.z) || product.z < 0) {
          validationErrors.push(`Product ${i + 1} atomic number (Z) must be a non-negative integer`);
        } else {
          outputZ += product.z * product.branch_ratio;
        }
        
        if (!Number.isInteger(product.a) || product.a <= 0) {
          validationErrors.push(`Product ${i + 1} mass number (A) must be a positive integer`);
        } else {
          outputA += product.a * product.branch_ratio;
        }
        
        if (product.branch_ratio <= 0 || product.branch_ratio > 1) {
          validationErrors.push(`Product ${i + 1} branch ratio must be between 0 and 1`);
        }
        
        totalBranchRatio += product.branch_ratio;
      }
      
      // Check branch ratios sum to 1
      if (Math.abs(totalBranchRatio - 1) > 0.01) {
        validationErrors.push(`Branch ratios must sum to 1.0 (currently ${totalBranchRatio.toFixed(2)})`);
      }
      
      // Check conservation laws
      const isZBalanced = Math.abs(inputZ - outputZ) < 1e-10;
      const isABalanced = Math.abs(inputA - outputA) < 1e-10;
      
      setIsBalanced(isZBalanced && isABalanced);
      
      if (!isZBalanced) {
        validationErrors.push(`Charge is not conserved (input: ${inputZ}, output: ${outputZ.toFixed(2)})`);
      }
      
      if (!isABalanced) {
        validationErrors.push(`Mass number is not conserved (input: ${inputA}, output: ${outputA.toFixed(2)})`);
      }
    }
    
    setErrors(validationErrors);
    return validationErrors.length === 0;
  };
  
  // Handle save button click
  const handleSave = () => {
    if (validateReaction()) {
      onSave && onSave(reaction);
    }
  };
  
  // Handle test button click
  const handleTest = () => {
    if (validateReaction()) {
      onTest && onTest(reaction);
    }
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              {initialReaction ? 'Edit Reaction' : 'Create New Reaction'}
            </Typography>
            <TextField
              label="Reaction Name"
              value={reaction.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              fullWidth
              error={errors.some(e => e.includes('name'))}
              helperText={errors.find(e => e.includes('name'))}
              sx={{ mb: 2 }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ mb: 2 }}>
              <Chip label="Reactants" color="primary" />
            </Divider>
            
            <Grid container spacing={3} alignItems="center">
              {/* Reactant 1 */}
              <Grid item xs={5}>
                <Card variant="outlined" sx={{ 
                  p: 1, 
                  position: 'relative', 
                  bgcolor: '#f5f5f5',
                  border: '2px solid #1976d2'
                }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Reactant 1</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          label="Z (Atomic Number)"
                          type="number"
                          value={reaction.reactant1_z}
                          onChange={(e) => handleReactantChange(1, 'z', parseInt(e.target.value, 10))}
                          fullWidth
                          InputProps={{ inputProps: { min: 0 } }}
                          error={errors.some(e => e.includes('Reactant 1 atomic'))}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="A (Mass Number)"
                          type="number"
                          value={reaction.reactant1_a}
                          onChange={(e) => handleReactantChange(1, 'a', parseInt(e.target.value, 10))}
                          fullWidth
                          InputProps={{ inputProps: { min: 1 } }}
                          error={errors.some(e => e.includes('Reactant 1 mass'))}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Chip 
                        label={`${reaction.reactant1_a}${getElementSymbol(reaction.reactant1_z)}`}
                        color="primary"
                        size="large"
                        sx={{ 
                          fontSize: '1.5rem', 
                          height: 'auto', 
                          p: 1,
                          borderRadius: '50%',
                          width: '80px',
                          height: '80px'
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={2} sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="textSecondary">+</Typography>
              </Grid>
              
              {/* Reactant 2 */}
              <Grid item xs={5}>
                <Card variant="outlined" sx={{ 
                  p: 1, 
                  position: 'relative', 
                  bgcolor: '#f5f5f5',
                  border: '2px solid #1976d2'
                }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Reactant 2</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          label="Z (Atomic Number)"
                          type="number"
                          value={reaction.reactant2_z}
                          onChange={(e) => handleReactantChange(2, 'z', parseInt(e.target.value, 10))}
                          fullWidth
                          InputProps={{ inputProps: { min: 0 } }}
                          error={errors.some(e => e.includes('Reactant 2 atomic'))}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="A (Mass Number)"
                          type="number"
                          value={reaction.reactant2_a}
                          onChange={(e) => handleReactantChange(2, 'a', parseInt(e.target.value, 10))}
                          fullWidth
                          InputProps={{ inputProps: { min: 1 } }}
                          error={errors.some(e => e.includes('Reactant 2 mass'))}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Chip 
                        label={`${reaction.reactant2_a}${getElementSymbol(reaction.reactant2_z)}`}
                        color="primary"
                        size="large"
                        sx={{ 
                          fontSize: '1.5rem', 
                          height: 'auto', 
                          p: 1,
                          borderRadius: '50%',
                          width: '80px',
                          height: '80px'
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
          
          <Grid item xs={12} sx={{ textAlign: 'center', my: 1 }}>
            <ArrowForwardIcon sx={{ fontSize: 40, color: isBalanced ? 'success.main' : 'error.main' }} />
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ mb: 2 }}>
              <Chip label="Products" color="secondary" />
            </Divider>
            
            <Grid container spacing={3}>
              {reaction.products.map((product, index) => (
                <Grid item xs={4} key={index}>
                  <Card variant="outlined" sx={{ 
                    p: 1, 
                    position: 'relative',
                    bgcolor: '#f8f8f8',
                    border: '2px solid #9c27b0'
                  }}>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveProduct(index)}
                      sx={{ position: 'absolute', top: 5, right: 5 }}
                      color="error"
                      disabled={reaction.products.length <= 1}
                    >
                      <DeleteIcon />
                    </IconButton>
                    
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Product {index + 1}
                      </Typography>
                      
                      <TextField
                        label="Name"
                        value={product.name}
                        onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                        fullWidth
                        size="small"
                        sx={{ mb: 2 }}
                      />
                      
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField
                            label="Z"
                            type="number"
                            value={product.z}
                            onChange={(e) => handleProductChange(index, 'z', parseInt(e.target.value, 10))}
                            fullWidth
                            size="small"
                            InputProps={{ inputProps: { min: 0 } }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            label="A"
                            type="number"
                            value={product.a}
                            onChange={(e) => handleProductChange(index, 'a', parseInt(e.target.value, 10))}
                            fullWidth
                            size="small"
                            InputProps={{ inputProps: { min: 1 } }}
                          />
                        </Grid>
                      </Grid>
                      
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Chip 
                          label={`${product.a}${getElementSymbol(product.z)}`}
                          color="secondary"
                          size="large"
                          sx={{ 
                            fontSize: '1.2rem', 
                            height: 'auto', 
                            p: 0.5,
                            borderRadius: '50%',
                            width: '70px',
                            height: '70px'
                          }}
                        />
                      </Box>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          Branch Ratio: {(product.branch_ratio * 100).toFixed(0)}%
                        </Typography>
                        <Slider
                          value={product.branch_ratio * 100}
                          onChange={(e, newValue) => handleProductChange(index, 'branch_ratio', newValue / 100)}
                          valueLabelDisplay="auto"
                          step={1}
                          min={1}
                          max={100}
                          valueLabelFormat={(value) => `${value}%`}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              
              <Grid item xs={4}>
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddProduct}
                    fullWidth
                    sx={{ height: 200 }}
                  >
                    Add Product
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ mb: 2 }}>
              <Chip label="Energy" color="warning" />
            </Divider>
            
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Q-Value (MeV)</Typography>
              <TextField
                type="number"
                value={reaction.q_value}
                onChange={(e) => handleInputChange('q_value', parseFloat(e.target.value))}
                error={errors.some(e => e.includes('Q-value'))}
                helperText={errors.find(e => e.includes('Q-value'))}
                InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                sx={{ width: 200 }}
              />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                The Q-value represents the energy released in the reaction.
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ mb: 2 }}>
              <Chip label="Reaction Equation" />
            </Divider>
            
            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="h6" fontFamily="monospace" textAlign="center">
                {formatReactionEquation(reaction)}
              </Typography>
            </Box>
          </Grid>
          
          {errors.length > 0 && (
            <Grid item xs={12}>
              <Box sx={{ bgcolor: 'error.light', p: 2, borderRadius: 1, mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Please fix the following errors:
                </Typography>
                <ul>
                  {errors.map((error, index) => (
                    <li key={index}>
                      <Typography variant="body2">{error}</Typography>
                    </li>
                  ))}
                </ul>
              </Box>
            </Grid>
          )}
          
          <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" onClick={onCancel}>
              Cancel
            </Button>
            
            <Button
              variant="contained"
              color="secondary"
              startIcon={<ScienceIcon />}
              onClick={handleTest}
              disabled={errors.length > 0}
            >
              Test Reaction
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={errors.length > 0}
            >
              Save Reaction
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default VisualReactionBuilder; 