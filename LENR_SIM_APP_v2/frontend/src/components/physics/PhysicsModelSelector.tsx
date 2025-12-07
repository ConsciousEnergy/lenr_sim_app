import React, { useState, useEffect } from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Chip,
  Tooltip,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  Stack,
  FormHelperText,
  IconButton,
  ListSubheader,
  SelectChangeEvent
} from '@mui/material';
import {
  InfoOutlined,
  CheckCircle,
  Cancel,
  ExpandMore
} from '@mui/icons-material';
import physicsModelRegistry from './PhysicsModelRegistry';
import type { PhysicsModel, PhysicsModelCategory } from './PhysicsModelRegistry';

export interface PhysicsModelSelectorProps {
  currentParameters: Record<string, any>;
  onModelSelect: (modelId: string) => void;
  selectedModelId?: string;
  showCompatibilityInfo?: boolean;
}

/**
 * A component for selecting physics models from the registry.
 * Provides grouping by category, compatibility checking, and model information.
 */
const PhysicsModelSelector: React.FC<PhysicsModelSelectorProps> = ({
  currentParameters,
  onModelSelect,
  selectedModelId,
  showCompatibilityInfo = true
}) => {
  const [models, setModels] = useState<PhysicsModel[]>([]);
  const [compatibilityMessages, setCompatibilityMessages] = useState<Record<string, string[]>>({});

  // Load models from registry and check compatibility
  useEffect(() => {
    const allModels = physicsModelRegistry.getAllModels();
    setModels(allModels);
    
    // Check compatibility for each model
    const compatibilityResults: Record<string, string[]> = {};
    allModels.forEach(model => {
      const { compatible, issues } = physicsModelRegistry.checkModelCompatibility(
        model.id, 
        currentParameters
      );
      compatibilityResults[model.id] = issues;
    });
    
    setCompatibilityMessages(compatibilityResults);
  }, [currentParameters]);

  // Helper to determine if a model is compatible
  const isModelCompatible = (modelId: string): boolean => {
    return !compatibilityMessages[modelId]?.some(msg => msg.startsWith('Error:'));
  };

  // Helper to render compatibility indicator
  const renderCompatibilityStatus = (modelId: string) => {
    if (!showCompatibilityInfo) return null;
    
    const isCompatible = isModelCompatible(modelId);
    
    return (
      <Tooltip 
        title={
          <div>
            {compatibilityMessages[modelId]?.map((msg, idx) => (
              <div key={idx} style={{ 
                color: msg.startsWith('Error:') ? '#ff4d4f' : 
                       msg.startsWith('Warning:') ? '#faad14' : '#52c41a' 
              }}>
                {msg}
              </div>
            ))}
          </div>
        }
      >
        {isCompatible ? 
          <CheckCircle color="success" fontSize="small" /> : 
          <Cancel color="error" fontSize="small" />
        }
      </Tooltip>
    );
  };

  // Helper to render model tags
  const renderModelTags = (model: PhysicsModel) => {
    return (
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
        {model.tags?.map(tag => (
          <Chip key={tag} label={tag} size="small" color="primary" variant="outlined" />
        ))}
      </Stack>
    );
  };

  // Handler for model selection
  const handleModelChange = (event: SelectChangeEvent<string>) => {
    onModelSelect(event.target.value);
  };

  // Group models by category
  const modelsByCategory: Record<PhysicsModelCategory, PhysicsModel[]> = models.reduce(
    (acc, model) => {
      if (!acc[model.category]) {
        acc[model.category] = [];
      }
      acc[model.category].push(model);
      return acc;
    }, 
    {} as Record<PhysicsModelCategory, PhysicsModel[]>
  );

  // Get selected model details
  const selectedModel = selectedModelId 
    ? models.find(model => model.id === selectedModelId)
    : undefined;

  return (
    <Box className="physics-model-selector">
      <Stack spacing={2} sx={{ width: '100%' }}>
        <FormControl fullWidth>
          <InputLabel id="physics-model-select-label">Physics Model</InputLabel>
          <Select
            labelId="physics-model-select-label"
            id="physics-model-select"
            value={selectedModelId || ''}
            onChange={handleModelChange}
            label="Physics Model"
          >
            {Object.entries(modelsByCategory).map(([category, categoryModels]) => [
              <ListSubheader key={`header-${category}`}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </ListSubheader>,
              ...categoryModels.map(model => (
                <MenuItem 
                  key={model.id} 
                  value={model.id}
                  disabled={!isModelCompatible(model.id)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <span>{model.name}</span>
                  {renderCompatibilityStatus(model.id)}
                </MenuItem>
              ))
            ]).flat()}
          </Select>
        </FormControl>

        {selectedModel && (
          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardHeader title={selectedModel.name} titleTypographyProps={{ variant: 'h6' }} />
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="body2">{selectedModel.description}</Typography>
                
                {renderModelTags(selectedModel)}
                
                <Divider textAlign="left">References</Divider>
                <List dense sx={{ pl: 2 }}>
                  {selectedModel.references?.map((ref, idx) => (
                    <ListItem key={idx} disablePadding>
                      <ListItemText
                        primary={
                          <Typography variant="body2">
                            {ref.title} {ref.authors?.join(', ')} {ref.year && `(${ref.year})`}
                            {ref.url && (
                              <IconButton 
                                href={ref.url} 
                                target="_blank"
                                rel="noopener noreferrer"
                                size="small"
                                sx={{ ml: 1 }}
                              >
                                <InfoOutlined fontSize="small" />
                              </IconButton>
                            )}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
                
                {showCompatibilityInfo && compatibilityMessages[selectedModel.id]?.length > 0 && (
                  <>
                    <Divider textAlign="left">Compatibility</Divider>
                    <Stack spacing={1}>
                      {compatibilityMessages[selectedModel.id].map((msg, idx) => {
                        const severity = msg.startsWith('Error:') ? 'error' : 
                                      msg.startsWith('Warning:') ? 'warning' : 'success';
                        return (
                          <Alert 
                            key={idx}
                            severity={severity}
                            sx={{ mb: 1 }}
                          >
                            {msg}
                          </Alert>
                        );
                      })}
                    </Stack>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
};

export default PhysicsModelSelector; 