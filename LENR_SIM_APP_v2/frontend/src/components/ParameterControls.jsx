import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  TextField,
  Slider,
  Select,
  MenuItem,
  Switch,
  Divider,
  Button,
  Tooltip,
  Stack,
  Typography,
  Grid,
  Alert,
  AlertTitle,
  FormControl,
  FormLabel,
  FormControlLabel,
  FormHelperText,
  Box
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';

const DEFAULT_VALUES = {
  // Basic parameters
  latticeType: 'FCC',
  latticeConstant: 3.89,
  temperature: 300,
  pressure: 1.0,
  deuteriumLoading: 0.6,
  // Advanced parameters
  dimensions: [10, 10, 10],
  defectConcentration: 0.01,
  enhancementFactor: 1.0,
  // Expert parameters
  potentialModel: 'morse',
  electronScreening: true,
  phononCoupling: true,
  quantumEffects: true
};

// Field wrapper mirroring antd's vertical Form.Item layout with a help tooltip
const Field = ({ label, help, error, children, size }) => (
  <Grid size={size}>
    <FormControl fullWidth error={!!error} sx={{ mb: 2 }}>
      <FormLabel sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <span>{label}</span>
        {help && (
          <Tooltip title={help}>
            <HelpOutlineIcon fontSize="inherit" sx={{ cursor: 'help' }} />
          </Tooltip>
        )}
      </FormLabel>
      {children}
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  </Grid>
);

/**
 * Component for simulation parameter controls
 *
 * @param {Object} props Component props
 * @param {Object} props.initialParameters Initial parameter values
 * @param {Function} props.onParametersChange Callback for parameter changes
 * @param {Function} props.onStartSimulation Callback for starting simulation
 * @param {boolean} props.disabled Whether controls are disabled
 * @param {string} props.mode Simulation mode ('basic', 'advanced', 'expert')
 */
const ParameterControls = ({
  initialParameters = {},
  onParametersChange = () => {},
  onStartSimulation = () => {},
  disabled = false,
  mode = 'basic'
}) => {
  const [values, setValues] = useState({ ...DEFAULT_VALUES });
  const [dimensionsText, setDimensionsText] = useState(DEFAULT_VALUES.dimensions.join(','));
  const [formErrors, setFormErrors] = useState({});
  const [advancedMode, setAdvancedMode] = useState(mode === 'advanced' || mode === 'expert');
  const [expertMode, setExpertMode] = useState(mode === 'expert');

  // Memoize stringified initialParameters to prevent infinite re-renders
  const initialParamsString = useMemo(() => JSON.stringify(initialParameters), [initialParameters]);
  const hasInitialized = useRef(false);

  // Initialize values with initial parameters
  useEffect(() => {
    const parsedParams = JSON.parse(initialParamsString);

    if (parsedParams && Object.keys(parsedParams).length > 0) {
      const merged = { ...DEFAULT_VALUES, ...parsedParams };
      setValues(merged);
      if (Array.isArray(merged.dimensions)) setDimensionsText(merged.dimensions.join(','));
      hasInitialized.current = true;
    } else if (!hasInitialized.current) {
      setValues({ ...DEFAULT_VALUES });
      setDimensionsText(DEFAULT_VALUES.dimensions.join(','));
      hasInitialized.current = true;
    }
  }, [initialParamsString]);

  // Update a single field, propagate the full value set
  const setField = useCallback((name, value) => {
    setValues(prev => {
      const next = { ...prev, [name]: value };
      onParametersChange(next);
      return next;
    });
  }, [onParametersChange]);

  const validate = useCallback(() => {
    const v = values;
    const errs = {};
    if (!v.latticeType) errs.latticeType = 'Please select a lattice type';
    if (v.latticeConstant == null || Number.isNaN(v.latticeConstant) || v.latticeConstant < 0.1 || v.latticeConstant > 10)
      errs.latticeConstant = 'Value must be between 0.1 and 10 Å';
    if (v.temperature == null || Number.isNaN(v.temperature) || v.temperature < 1 || v.temperature > 2000)
      errs.temperature = 'Value must be between 1 and 2000 K';
    if (v.pressure == null || Number.isNaN(v.pressure) || v.pressure < 0.01 || v.pressure > 1000)
      errs.pressure = 'Value must be between 0.01 and 1000 atm';
    if (v.deuteriumLoading == null || Number.isNaN(v.deuteriumLoading) || v.deuteriumLoading < 0 || v.deuteriumLoading > 1)
      errs.deuteriumLoading = 'Value must be between 0 and 1';
    if (advancedMode) {
      if (!Array.isArray(v.dimensions) || v.dimensions.length !== 3)
        errs.dimensions = 'Please enter dimensions as x,y,z (e.g., 10,10,10)';
      if (v.defectConcentration == null || Number.isNaN(v.defectConcentration) || v.defectConcentration < 0 || v.defectConcentration > 0.5)
        errs.defectConcentration = 'Value must be between 0 and 0.5';
      if (v.enhancementFactor == null || Number.isNaN(v.enhancementFactor) || v.enhancementFactor < 1 || v.enhancementFactor > 1000)
        errs.enhancementFactor = 'Value must be between 1 and 1000';
    }
    if (expertMode && !v.potentialModel) errs.potentialModel = 'Please select a potential model';
    return errs;
  }, [values, advancedMode, expertMode]);

  const handleSubmit = () => {
    const errs = validate();
    setFormErrors(errs);
    if (Object.keys(errs).length === 0) {
      onStartSimulation(values);
    }
  };

  const handleReset = () => {
    if (initialParameters && Object.keys(initialParameters).length > 0) {
      const merged = { ...DEFAULT_VALUES, ...initialParameters };
      setValues(merged);
      if (Array.isArray(merged.dimensions)) setDimensionsText(merged.dimensions.join(','));
      onParametersChange(merged);
    } else {
      setValues({ ...DEFAULT_VALUES });
      setDimensionsText(DEFAULT_VALUES.dimensions.join(','));
      onParametersChange({ ...DEFAULT_VALUES });
    }
    setFormErrors({});
  };

  const numberField = (name, extra = {}) => (
    <TextField
      type="number"
      size="small"
      fullWidth
      disabled={disabled}
      value={values[name] ?? ''}
      onChange={(e) => {
        const raw = e.target.value;
        setField(name, raw === '' ? '' : Number(raw));
      }}
      inputProps={extra.inputProps}
      InputProps={extra.InputProps}
    />
  );

  return (
    <Card>
      <CardHeader
        avatar={<SettingsIcon />}
        title="Simulation Parameters"
        action={
          <Stack direction="row" spacing={2} alignItems="center" sx={{ pr: 1 }}>
            <Tooltip title="Toggle Advanced Parameters">
              <FormControlLabel
                control={
                  <Switch
                    checked={advancedMode}
                    onChange={(e) => setAdvancedMode(e.target.checked)}
                    disabled={disabled}
                  />
                }
                label={advancedMode ? 'Advanced' : 'Basic'}
              />
            </Tooltip>

            {advancedMode && (
              <Tooltip title="Toggle Expert Parameters">
                <FormControlLabel
                  control={
                    <Switch
                      checked={expertMode}
                      onChange={(e) => setExpertMode(e.target.checked)}
                      disabled={disabled}
                    />
                  }
                  label={expertMode ? 'Expert' : 'Advanced'}
                />
              </Tooltip>
            )}
          </Stack>
        }
      />
      <CardContent>
        {/* Basic Parameters */}
        <Typography variant="subtitle1" gutterBottom>Basic Parameters</Typography>

        <Grid container spacing={2}>
          <Field label="Lattice Type" help="Crystal structure type for the simulation" error={formErrors.latticeType} size={{ xs: 12, sm: 6, md: 4 }}>
            <Select
              size="small"
              value={values.latticeType || ''}
              onChange={(e) => setField('latticeType', e.target.value)}
              disabled={disabled}
            >
              <MenuItem value="FCC">Face-Centered Cubic (FCC)</MenuItem>
              <MenuItem value="BCC">Body-Centered Cubic (BCC)</MenuItem>
              <MenuItem value="HCP">Hexagonal Close-Packed (HCP)</MenuItem>
              <MenuItem value="Diamond">Diamond Cubic</MenuItem>
            </Select>
          </Field>

          <Field label="Lattice Constant (Å)" help="Lattice constant in Angstroms" error={formErrors.latticeConstant} size={{ xs: 12, sm: 6, md: 4 }}>
            {numberField('latticeConstant', { inputProps: { min: 0.1, max: 10, step: 0.01 } })}
          </Field>

          <Field label="Temperature (K)" help="Simulation temperature in Kelvin" error={formErrors.temperature} size={{ xs: 12, sm: 6, md: 4 }}>
            {numberField('temperature', { inputProps: { min: 1, max: 2000, step: 1 } })}
          </Field>

          <Field label="Pressure (atm)" help="Ambient pressure in atmospheres" error={formErrors.pressure} size={{ xs: 12, sm: 6 }}>
            <Box sx={{ px: 1 }}>
              <Slider
                min={0.01}
                max={1000}
                step={0.01}
                value={typeof values.pressure === 'number' ? values.pressure : 1}
                onChange={(e, val) => setField('pressure', val)}
                disabled={disabled}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v} atm`}
                marks={[
                  { value: 0.01, label: '0.01' },
                  { value: 1, label: '1' },
                  { value: 10, label: '10' },
                  { value: 100, label: '100' },
                  { value: 1000, label: '1000' }
                ]}
              />
            </Box>
          </Field>

          <Field label="Deuterium Loading Ratio (D/Pd)" help="Ratio of deuterium atoms to palladium atoms" error={formErrors.deuteriumLoading} size={{ xs: 12, sm: 6 }}>
            <Box sx={{ px: 1 }}>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={typeof values.deuteriumLoading === 'number' ? values.deuteriumLoading : 0.6}
                onChange={(e, val) => setField('deuteriumLoading', val)}
                disabled={disabled}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => v.toFixed(2)}
                marks={[
                  { value: 0, label: '0' },
                  { value: 0.2, label: '0.2' },
                  { value: 0.4, label: '0.4' },
                  { value: 0.6, label: '0.6' },
                  { value: 0.8, label: '0.8' },
                  { value: 1, label: '1' }
                ]}
              />
            </Box>
          </Field>
        </Grid>

        {/* Advanced Parameters */}
        {advancedMode && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>Advanced Parameters</Typography>

            <Grid container spacing={2}>
              <Field label="Lattice Dimensions" help="Dimensions of the simulation box in unit cells" error={formErrors.dimensions} size={{ xs: 12, sm: 6 }}>
                <TextField
                  size="small"
                  fullWidth
                  disabled={disabled}
                  placeholder="Format: x,y,z (e.g., 10,10,10)"
                  value={dimensionsText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDimensionsText(val);
                    const dims = val.split(',').map(v => parseInt(v.trim(), 10)).filter(v => !Number.isNaN(v));
                    if (dims.length === 3) setField('dimensions', dims);
                  }}
                />
              </Field>

              <Field label="Defect Concentration" help="Fraction of lattice sites with defects" error={formErrors.defectConcentration} size={{ xs: 12, sm: 6 }}>
                <Box sx={{ px: 1 }}>
                  <Slider
                    min={0}
                    max={0.5}
                    step={0.001}
                    value={typeof values.defectConcentration === 'number' ? values.defectConcentration : 0.01}
                    onChange={(e, val) => setField('defectConcentration', val)}
                    disabled={disabled}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => v.toFixed(3)}
                    marks={[
                      { value: 0, label: '0' },
                      { value: 0.1, label: '0.1' },
                      { value: 0.2, label: '0.2' },
                      { value: 0.3, label: '0.3' },
                      { value: 0.4, label: '0.4' },
                      { value: 0.5, label: '0.5' }
                    ]}
                  />
                </Box>
              </Field>

              <Field label="Enhancement Factor" help="Screening enhancement factor for fusion rates" error={formErrors.enhancementFactor} size={{ xs: 12, sm: 6 }}>
                {numberField('enhancementFactor', { inputProps: { min: 1, max: 1000, step: 1 } })}
              </Field>
            </Grid>
          </>
        )}

        {/* Expert Parameters */}
        {expertMode && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>Expert Parameters</Typography>

            <Grid container spacing={2}>
              <Field label="Potential Model" help="Mathematical model for interatomic potentials" error={formErrors.potentialModel} size={{ xs: 12, sm: 6 }}>
                <Select
                  size="small"
                  value={values.potentialModel || ''}
                  onChange={(e) => setField('potentialModel', e.target.value)}
                  disabled={disabled}
                >
                  <MenuItem value="morse">Morse Potential</MenuItem>
                  <MenuItem value="lennard-jones">Lennard-Jones</MenuItem>
                  <MenuItem value="yukawa">Yukawa (Screened Coulomb)</MenuItem>
                  <MenuItem value="harmonic">Harmonic Oscillator</MenuItem>
                </Select>
              </Field>

              <Field label="Electron Screening" help="Include electron screening effects" size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={<Switch checked={!!values.electronScreening} onChange={(e) => setField('electronScreening', e.target.checked)} disabled={disabled} />}
                  label={values.electronScreening ? 'Enabled' : 'Disabled'}
                />
              </Field>

              <Field label="Phonon Coupling" help="Include phonon-assisted tunneling effects" size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={<Switch checked={!!values.phononCoupling} onChange={(e) => setField('phononCoupling', e.target.checked)} disabled={disabled} />}
                  label={values.phononCoupling ? 'Enabled' : 'Disabled'}
                />
              </Field>

              <Field label="Quantum Effects" help="Include quantum tunneling effects" size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={<Switch checked={!!values.quantumEffects} onChange={(e) => setField('quantumEffects', e.target.checked)} disabled={disabled} />}
                  label={values.quantumEffects ? 'Enabled' : 'Disabled'}
                />
              </Field>
            </Grid>
          </>
        )}

        {/* Error Display */}
        {Object.keys(formErrors).length > 0 && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            <AlertTitle>Validation Errors</AlertTitle>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {Object.entries(formErrors).map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Action Buttons */}
        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleReset} disabled={disabled}>
              Reset
            </Button>
            <Button variant="outlined" startIcon={<SaveIcon />} onClick={() => { /* Save current settings functionality would go here */ }} disabled={disabled}>
              Save Settings
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={disabled}>
              Start Simulation
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ParameterControls;
