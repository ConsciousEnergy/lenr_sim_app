import React, { useState, useEffect } from 'react';
import { 
  TextField,
  Slider,
  Typography,
  Box,
  InputAdornment,
  Tooltip,
  FormControl,
  FormLabel,
  Grid,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ParameterHelpButton from './ParameterHelpButton';
import { ParameterDocumentationData } from './ParameterDocumentation';

// Types for physics parameters
export interface PhysicsParameter {
  name: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  description: string;
  validation?: (value: number) => boolean | string;
  documentation?: ParameterDocumentationData;
  hasWarnings?: boolean;
}

export interface PhysicsParameterInputProps {
  parameter: PhysicsParameter;
  onChange: (name: string, value: number) => void;
}

/**
 * Single physics parameter input component with validation
 */
export const PhysicsParameterInput: React.FC<PhysicsParameterInputProps> = ({ 
  parameter, 
  onChange 
}) => {
  const [value, setValue] = useState<number>(parameter.value);
  const [error, setError] = useState<string | null>(null);

  // Format display value based on magnitude
  const formatDisplayValue = (val: number): string => {
    if (Math.abs(val) < 0.01 || Math.abs(val) >= 10000) {
      return val.toExponential(2);
    }
    return val.toFixed(Math.abs(val) < 0.1 ? 3 : 2);
  };

  // Validate value whenever it changes
  useEffect(() => {
    if (parameter.validation) {
      const validationResult = parameter.validation(value);
      if (typeof validationResult === 'string') {
        setError(validationResult);
      } else {
        setError(validationResult ? null : 'Invalid value');
      }
    } else {
      setError(null);
    }
  }, [value, parameter]);

  const handleChange = (newValue: number) => {
    setValue(newValue);
    onChange(parameter.name, newValue);
  };

  return (
    <Box mb={2}>
      <Box display="flex" alignItems="center" mb={1}>
        <Typography variant="subtitle2" component="span" sx={{ mr: 1 }}>
          {parameter.label}
        </Typography>
        {parameter.documentation ? (
          <ParameterHelpButton
            parameter={parameter}
            documentation={parameter.documentation}
            hasDocumentation={!!parameter.documentation}
            hasWarnings={parameter.hasWarnings}
            size="small"
          />
        ) : (
          <Tooltip title={parameter.description}>
            <HelpOutlineIcon fontSize="small" color="action" />
          </Tooltip>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flexGrow: 1, width: '75%' }}>
          <Slider
            value={value}
            min={parameter.min}
            max={parameter.max}
            step={parameter.step}
            onChange={(_, newValue) => handleChange(newValue as number)}
            aria-labelledby={`${parameter.name}-slider`}
            valueLabelDisplay="auto"
            valueLabelFormat={(val) => `${formatDisplayValue(val)} ${parameter.unit}`}
          />
        </Box>
        <Box sx={{ width: '25%' }}>
          <TextField
            value={value}
            onChange={(e) => {
              const newVal = parseFloat(e.target.value);
              if (!isNaN(newVal)) {
                handleChange(newVal);
              }
            }}
            type="number"
            size="small"
            fullWidth
            error={!!error}
            helperText={error}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">{parameter.unit}</InputAdornment>
              ),
              inputProps: {
                min: parameter.min,
                max: parameter.max,
                step: parameter.step,
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

// Common validation functions for physics parameters
export const validationFunctions = {
  // Temperature validation (must be positive and reasonable)
  temperature: (value: number): boolean | string => {
    if (value <= 0) return 'Temperature must be positive';
    if (value > 5000) return 'Temperature exceeds reasonable range';
    return true;
  },
  
  // Pressure validation (must be positive and realistic)
  pressure: (value: number): boolean | string => {
    if (value <= 0) return 'Pressure must be positive';
    if (value > 1000) return 'Pressure exceeds reasonable range';
    return true;
  },
  
  // Length validation (must be positive)
  length: (value: number): boolean | string => {
    if (value <= 0) return 'Length must be positive';
    return true;
  },
  
  // Energy validation (must be valid physical value)
  energy: (value: number): boolean | string => {
    if (value < 0) return 'Energy cannot be negative';
    return true;
  }
};

export default PhysicsParameterInput; 