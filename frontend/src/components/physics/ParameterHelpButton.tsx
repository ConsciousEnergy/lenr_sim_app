import React, { useState } from 'react';
import { 
  IconButton, 
  Tooltip, 
  Badge,
  useTheme,
  SxProps,
  Theme
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import WarningIcon from '@mui/icons-material/Warning';
import ParameterDocumentation, { ParameterDocumentationData } from './ParameterDocumentation';
import { PhysicsParameter } from './PhysicsParameterInput';

export interface ParameterHelpButtonProps {
  parameter?: PhysicsParameter;
  documentation?: ParameterDocumentationData;
  hasWarnings?: boolean;
  hasDocumentation?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: 'default' | 'inherit' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  sx?: SxProps<Theme>;
  className?: string;
}

/**
 * A button that triggers the parameter documentation dialog
 */
const ParameterHelpButton: React.FC<ParameterHelpButtonProps> = ({
  parameter,
  documentation,
  hasWarnings = false,
  hasDocumentation = true,
  size = 'small',
  color = 'default',
  sx,
  className
}) => {
  const theme = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Determine which icon to show
  const getIcon = () => {
    if (hasWarnings) {
      return <WarningIcon fontSize={size} color="warning" />;
    }
    if (hasDocumentation) {
      return <MenuBookIcon fontSize={size} />;
    }
    return <HelpOutlineIcon fontSize={size} />;
  };

  // Get tooltip text
  const getTooltipText = () => {
    if (hasWarnings) {
      return 'Important information and warnings';
    }
    if (hasDocumentation) {
      return 'View detailed documentation';
    }
    return 'Help and information';
  };

  // Handle click to open the dialog
  const handleClick = () => {
    setDialogOpen(true);
  };

  // Handle dialog close
  const handleClose = () => {
    setDialogOpen(false);
  };

  return (
    <>
      <Tooltip title={getTooltipText()}>
        <IconButton
          size={size}
          color={color}
          onClick={handleClick}
          aria-label="Help"
          className={className}
          sx={{
            ml: 0.5,
            transition: 'all 0.2s',
            '&:hover': {
              color: hasWarnings 
                ? theme.palette.warning.main 
                : theme.palette.primary.main,
              transform: 'scale(1.1)'
            },
            ...sx
          }}
        >
          {hasDocumentation ? (
            <Badge
              variant="dot"
              color={hasWarnings ? 'warning' : 'primary'}
              overlap="circular"
              invisible={!hasDocumentation && !hasWarnings}
            >
              {getIcon()}
            </Badge>
          ) : (
            getIcon()
          )}
        </IconButton>
      </Tooltip>
      
      <ParameterDocumentation
        parameter={parameter}
        documentation={documentation}
        open={dialogOpen}
        onClose={handleClose}
      />
    </>
  );
};

export default ParameterHelpButton; 