import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Alert, 
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteIcon from '@mui/icons-material/Delete';
import PreviewIcon from '@mui/icons-material/Preview';

// Styled components
const UploadBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  marginBottom: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
  border: `2px dashed ${theme.palette.divider}`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  height: '150px',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    borderColor: theme.palette.primary.main,
  }
}));

const HiddenInput = styled('input')({
  display: 'none',
});

const Uploader = ({ onUpload, onDataParsed }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileChange = (event) => {
    const files = event.target.files;
    if (files.length) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    // Reset states
    setError('');
    
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size is too large (max 5MB)');
      return;
    }
    
    // Set the file
    setFile(file);
    
    // Preview the file
    parseCSV(file, true);
  };

  const parseCSV = (file, isPreview = false) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        const lines = content.split(/\\r?\\n/).filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
          setError('CSV file must contain a header row and at least one data row');
          return;
        }
        
        // Parse headers
        const headers = lines[0].split(',').map(header => header.trim());
        
        // Check required headers (Temperature, Power)
        if (!headers.includes('Temperature') || !headers.includes('Power')) {
          setError('CSV must contain "Temperature" and "Power" columns');
          return;
        }
        
        // Parse data rows
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          const rowValues = lines[i].split(',').map(value => value.trim());
          if (rowValues.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
              // Try to convert to number if possible
              const value = rowValues[index];
              row[header] = isNaN(value) ? value : parseFloat(value);
            });
            data.push(row);
          }
        }
        
        if (isPreview) {
          // For preview, limit to 5 rows
          setPreviewHeaders(headers);
          setPreviewData(data.slice(0, 5));
        } else {
          // For actual processing, use all data
          onDataParsed && onDataParsed({ headers, data });
        }
      } catch (err) {
        setError(`Error parsing CSV: ${err.message}`);
      }
    };
    
    reader.onerror = () => {
      setError('Error reading the file');
    };
    
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
      
      // Parse the file for actual processing
      parseCSV(file, false);
      
      // Simulate API call
      const formData = new FormData();
      formData.append('file', file);
      
      // Call the onUpload callback
      onUpload && await onUpload(formData);
      
      // Ensure progress completes
      clearInterval(interval);
      setUploadProgress(100);
      
      // Reset upload state after 1 second
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);
      
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewData([]);
    setPreviewHeaders([]);
  };

  const handleOpenPreview = () => {
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Upload Experimental Data
      </Typography>
      
      <Typography variant="body1" paragraph>
        Upload a CSV file containing experimental temperature and power data.
        The file should have headers and include "Temperature" and "Power" columns.
      </Typography>
      
      {!file ? (
        <UploadBox
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => document.getElementById('csv-file-input').click()}
        >
          <CloudUploadIcon fontSize="large" color="primary" />
          <Typography variant="body1" align="center" sx={{ mt: 2 }}>
            Drag & Drop your CSV file here or click to browse
          </Typography>
          <HiddenInput
            accept=".csv"
            id="csv-file-input"
            type="file"
            onChange={handleFileChange}
          />
        </UploadBox>
      ) : (
        <Box>
          <List>
            <ListItem
              secondaryAction={
                <Box>
                  <Button 
                    startIcon={<PreviewIcon />}
                    onClick={handleOpenPreview}
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    Preview
                  </Button>
                  <Button 
                    startIcon={<DeleteIcon />}
                    onClick={handleRemoveFile}
                    color="error"
                    size="small"
                  >
                    Remove
                  </Button>
                </Box>
              }
            >
              <ListItemIcon>
                <InsertDriveFileIcon />
              </ListItemIcon>
              <ListItemText
                primary={file.name}
                secondary={`${(file.size / 1024).toFixed(2)} KB`}
              />
            </ListItem>
          </List>
          
          {uploading && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" align="center" display="block" sx={{ mt: 1 }}>
                Uploading... {uploadProgress}%
              </Typography>
            </Box>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<FileUploadIcon />}
              onClick={handleUpload}
              disabled={uploading}
            >
              Process Data
            </Button>
          </Box>
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Data Preview</DialogTitle>
        <DialogContent>
          {previewData.length > 0 ? (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {previewHeaders.map((header, index) => (
                      <TableCell key={index}>{header}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {previewHeaders.map((header, cellIndex) => (
                        <TableCell key={cellIndex}>{row[header]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body1">No preview data available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Uploader; 