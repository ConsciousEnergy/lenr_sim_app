import React, { useState } from 'react';
import { 
  Button, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import TableChartIcon from '@mui/icons-material/TableChart';
import CodeIcon from '@mui/icons-material/Code';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { exportAsCSV, exportAsJSON } from '../../api/export';

/**
 * Reusable export button component with dropdown menu for different export formats
 */
const ExportButton = ({ 
  data, 
  disabled = false, 
  buttonText = "Export", 
  fileName = "simulation_data",
  showCSV = true,
  showJSON = true
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState('');
  const [customFileName, setCustomFileName] = useState(fileName);
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const openExportDialog = (format) => {
    setExportFormat(format);
    setCustomFileName(fileName);
    setOpenDialog(true);
    handleClose();
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
  };

  const handleExport = () => {
    if (exportFormat === 'csv') {
      exportAsCSV(data, customFileName);
    } else if (exportFormat === 'json') {
      exportAsJSON(data, customFileName);
    }
    handleDialogClose();
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<GetAppIcon />}
        onClick={handleClick}
        disabled={disabled || !data}
        size="small"
      >
        {buttonText}
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {showCSV && (
          <MenuItem onClick={() => openExportDialog('csv')}>
            <ListItemIcon>
              <TableChartIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>CSV</ListItemText>
          </MenuItem>
        )}
        
        {showJSON && (
          <MenuItem onClick={() => openExportDialog('json')}>
            <ListItemIcon>
              <CodeIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>JSON</ListItemText>
          </MenuItem>
        )}
      </Menu>
      
      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>Export as {exportFormat.toUpperCase()}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="filename"
            label="File Name"
            fullWidth
            variant="outlined"
            value={customFileName}
            onChange={(e) => setCustomFileName(e.target.value)}
            helperText={`The file will be saved as ${customFileName}.${exportFormat}`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleExport} variant="contained" color="primary">
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ExportButton; 