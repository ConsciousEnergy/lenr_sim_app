import React, { useState, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { styled } from '@mui/material/styles';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const DataUploader = ({ onDataUploaded }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    
    // Validate file type (.csv only)
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a valid CSV file.');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    
    // Parse CSV for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const lines = csvText.split('\n');
        
        // Parse headers
        const headers = lines[0].split(',').map(header => header.trim());
        
        // Parse rows (up to 10 for preview)
        const rows = [];
        const maxPreviewRows = Math.min(10, lines.length - 1);
        
        for (let i = 1; i <= maxPreviewRows; i++) {
          if (lines[i].trim() === '') continue;
          
          const cells = lines[i].split(',').map(cell => cell.trim());
          rows.push(cells);
        }
        
        setPreviewData({ headers, rows });
        
        // Call the parent component's callback
        if (onDataUploaded) {
          onDataUploaded({
            fileName: selectedFile.name,
            headers,
            rows,
            rawData: csvText
          });
        }
      } catch (err) {
        console.error('Error parsing CSV:', err);
        setError('Failed to parse CSV file. Please check the file format.');
      }
    };
    
    reader.onerror = () => {
      setError('Error reading file. Please try again.');
    };
    
    reader.readAsText(selectedFile);
  };

  // Reset file input and data
  const handleClearFile = () => {
    setFile(null);
    setPreviewData(null);
    setError(null);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Call parent with null to indicate data cleared
    if (onDataUploaded) {
      onDataUploaded(null);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Experimental Data Upload
      </Typography>
      
      <Paper sx={{ p: 2 }}>
        {!file ? (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Button
              component="label"
              variant="contained"
              startIcon={<CloudUploadIcon />}
            >
              Upload CSV File
              <VisuallyHiddenInput 
                type="file" 
                accept=".csv"
                onChange={handleFileChange}
                ref={fileInputRef}
              />
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Upload a CSV file with your experimental data
            </Typography>
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                File: {file.name}
              </Typography>
              <IconButton color="error" onClick={handleClearFile}>
                <DeleteIcon />
              </IconButton>
            </Box>
            
            {previewData && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Data Preview
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {previewData.headers.map((header, index) => (
                          <TableCell key={index}>{header}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewData.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex}>{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Showing up to 10 rows
                </Typography>
              </Box>
            )}
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default DataUploader; 