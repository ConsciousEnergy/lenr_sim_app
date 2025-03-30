import React, { useState } from 'react';
import { 
  Button, 
  Menu, 
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material';
import { 
  FileDownload as FileDownloadIcon,
  TableChart as TableChartIcon,
  Code as CodeIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';

/**
 * Reusable export button component with dropdown menu
 * @param {Object} props - Component props
 * @param {Function} props.onExportCSV - Handler for CSV export
 * @param {Function} props.onExportJSON - Handler for JSON export (optional)
 * @param {Function} props.onExportExcel - Handler for Excel export (optional)
 * @param {string} props.label - Button label (optional)
 * @param {string} props.tooltipTitle - Tooltip title (optional)
 * @param {Object} props.buttonProps - Additional props for the Button component
 */
const ExportButton = ({ 
  onExportCSV, 
  onExportJSON, 
  onExportExcel,
  label = 'Export', 
  tooltipTitle = 'Export data',
  buttonProps = {}
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleExport = (exportFn) => {
    if (exportFn) {
      exportFn();
    }
    handleClose();
  };
  
  return (
    <>
      <Tooltip title={tooltipTitle}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<FileDownloadIcon />}
          onClick={handleClick}
          aria-controls={open ? 'export-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          {...buttonProps}
        >
          {label}
        </Button>
      </Tooltip>
      
      <Menu
        id="export-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'export-button',
        }}
      >
        <MenuItem onClick={() => handleExport(onExportCSV)}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as CSV</ListItemText>
        </MenuItem>
        
        {onExportJSON && (
          <MenuItem onClick={() => handleExport(onExportJSON)}>
            <ListItemIcon>
              <CodeIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Export as JSON</ListItemText>
          </MenuItem>
        )}
        
        {onExportExcel && (
          <MenuItem onClick={() => handleExport(onExportExcel)}>
            <ListItemIcon>
              <TableChartIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Export as Excel</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default ExportButton; 