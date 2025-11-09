import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  MenuItem,
  InputAdornment,
  Tooltip,
  IconButton,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import PhysicsUnitConverter, { 
  getUnitFamily, 
  getUnitName, 
  getAvailableUnits, 
  formatWithUnit,
  UnitFamily
} from './PhysicsUnitConverter';

export interface UnitConverterFieldProps {
  label: string;
  value: number;
  unit: string;
  allowedUnits?: string[];
  onChange?: (value: number, unit: string) => void;
  disabled?: boolean;
  helperText?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  style?: React.CSSProperties;
}

/**
 * A text field with unit selection dropdown that handles unit conversions
 */
const UnitConverterField: React.FC<UnitConverterFieldProps> = ({
  label,
  value,
  unit,
  allowedUnits,
  onChange,
  disabled = false,
  helperText,
  size = 'small',
  fullWidth = false,
  min,
  max,
  step,
  precision = 3,
  style
}) => {
  const [localValue, setLocalValue] = useState<string>(value.toString());
  const [localUnit, setLocalUnit] = useState<string>(unit);
  const [availableUnits, setAvailableUnits] = useState<string[]>([unit]);

  // Update available units when the component mounts or the unit changes
  useEffect(() => {
    const unitFamily = getUnitFamily(unit);
    if (unitFamily) {
      // Get all available units for this unit family
      let units = getAvailableUnits(unitFamily as UnitFamily);
      
      // Filter to allowed units if provided
      if (allowedUnits && allowedUnits.length > 0) {
        units = units.filter(u => allowedUnits.includes(u));
      }
      
      setAvailableUnits(units);
    }
  }, [unit, allowedUnits]);

  // Update local value when input value or unit changes
  useEffect(() => {
    const formattedValue = formatValueForDisplay(value, precision);
    setLocalValue(formattedValue);
    setLocalUnit(unit);
  }, [value, unit, precision]);

  // Format numeric values appropriately
  const formatValueForDisplay = (num: number, precision: number): string => {
    if (Math.abs(num) < 0.001 || Math.abs(num) >= 10000) {
      return num.toExponential(precision);
    }
    return num.toFixed(precision);
  };

  // Handle text field value changes
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Try to parse as a number and notify parent
    const parsedValue = parseFloat(newValue);
    if (!isNaN(parsedValue)) {
      notifyChange(parsedValue, localUnit);
    }
  };

  // Handle unit selection changes
  const handleUnitChange = (e: SelectChangeEvent) => {
    const newUnit = e.target.value;
    setLocalUnit(newUnit);
    
    // Convert the current value to the new unit
    const parsedValue = parseFloat(localValue);
    if (!isNaN(parsedValue)) {
      const convertedValue = PhysicsUnitConverter.convertUnit(parsedValue, localUnit, newUnit);
      setLocalValue(formatValueForDisplay(convertedValue, precision));
      notifyChange(convertedValue, newUnit);
    }
  };

  // Notify parent component of changes
  const notifyChange = useCallback((newValue: number, newUnit: string) => {
    if (onChange) {
      onChange(newValue, newUnit);
    }
  }, [onChange]);

  return (
    <FormControl 
      variant="outlined" 
      size={size} 
      fullWidth={fullWidth}
      sx={{ mb: 1.5, ...style }}
    >
      <InputLabel>{label}</InputLabel>
      <OutlinedInput
        type="text"
        value={localValue}
        onChange={handleValueChange}
        disabled={disabled}
        inputProps={{ 
          step,
          min,
          max,
          style: { paddingRight: 0 }
        }}
        endAdornment={
          <InputAdornment position="end">
            <Select
              value={localUnit}
              onChange={handleUnitChange}
              label=""
              disabled={disabled}
              sx={{ 
                minWidth: 60,
                '& .MuiSelect-select': {
                  padding: size === 'small' ? '5px 14px 5px 8px' : '8px 14px 8px 10px',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none'
                }
              }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300
                  }
                }
              }}
            >
              {availableUnits.map((unitOption) => (
                <MenuItem key={unitOption} value={unitOption}>
                  {unitOption}
                </MenuItem>
              ))}
            </Select>
            {helperText && (
              <Tooltip title={helperText}>
                <IconButton size="small" sx={{ ml: 0.5 }}>
                  <InfoIcon fontSize="inherit" color="action" />
                </IconButton>
              </Tooltip>
            )}
          </InputAdornment>
        }
        label={label}
      />
    </FormControl>
  );
};

export default UnitConverterField; 