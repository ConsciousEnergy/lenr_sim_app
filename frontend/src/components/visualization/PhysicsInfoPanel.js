import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import { styled } from '@mui/material/styles';
import { CONSTANTS, REACTION_TYPES } from '../../utils/physicsConstants';

// Styled components
const InfoPanel = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  maxWidth: '100%',
  marginBottom: theme.spacing(2),
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  marginBottom: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
}));

const InfoTooltip = styled(({className, ...props}) => (
  <Tooltip {...props} classes={{popper: className}} />
))(({ theme }) => ({
  [`& .MuiTooltip-tooltip`]: {
    maxWidth: 300,
    fontSize: '0.8rem',
    padding: theme.spacing(1.5),
  },
}));

const ValueCell = styled(TableCell)(({ theme, highlight }) => ({
  backgroundColor: highlight ? 'rgba(144, 202, 249, 0.2)' : 'inherit',
  fontWeight: highlight ? 'bold' : 'normal',
}));

const formatExponential = (value) => {
  if (typeof value !== 'number') return 'N/A';
  
  if (Math.abs(value) < 0.0001 || Math.abs(value) >= 10000) {
    return value.toExponential(4);
  }
  return value.toFixed(6);
};

/**
 * PhysicsInfoPanel Component
 * 
 * Displays detailed physics information about the LENR/CMNS simulation
 */
const PhysicsInfoPanel = ({ simulationData, simulationParameters }) => {
  // Check if we have valid data
  if (!simulationParameters) {
    return (
      <InfoPanel>
        <Typography variant="body1">No simulation data available</Typography>
      </InfoPanel>
    );
  }
  
  // Extract parameters
  const { 
    T, 
    lambda, 
    r0, 
    k_spring, 
    potential,
    T_impact,
    impact_duration
  } = simulationParameters;
  
  // Calculate some derived quantities
  const kB = CONSTANTS.BOLTZMANN_CONSTANT;
  const thermalEnergy = kB * T;
  const thermalEnergyEV = thermalEnergy / CONSTANTS.ELECTRON_CHARGE;
  
  const coulombBarrier = CONSTANTS.COULOMB_BARRIER_PD_D;
  const coulombBarrierRatio = thermalEnergyEV / coulombBarrier;
  
  const screenedBarrier = coulombBarrier / CONSTANTS.LATTICE_SCREENING_FACTOR;
  
  // Format reaction equation with proper subscripts and superscripts
  const formatEquation = (equation) => {
    // Replace superscripts 
    // (numbers after ^) with <sup> tags
    let formatted = equation.replace(/\^(\d+)/g, '<sup>$1</sup>');
    
    // Replace subscripts 
    // (numbers after _) with <sub> tags
    formatted = formatted.replace(/\_(\d+)/g, '<sub>$1</sub>');
    
    // Format isotope notation like ²D
    formatted = formatted.replace(/(\d+)([A-Za-z])/g, '<sup>$1</sup>$2');
    
    return formatted;
  };

  return (
    <InfoPanel>
      <SectionTitle variant="h6">
        CMNS/LENR Physics Information
        <InfoTooltip title="Physical parameters and calculations relevant to the simulation">
          <InfoIcon fontSize="small" sx={{ ml: 1 }} />
        </InfoTooltip>
      </SectionTitle>
      
      <Divider sx={{ my: 1 }} />
      
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Key Parameters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Parameter</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Units</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Temperature</TableCell>
                  <ValueCell highlight={T > 600}>{T}</ValueCell>
                  <TableCell>K</TableCell>
                  <TableCell>System temperature</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Thermal Energy</TableCell>
                  <ValueCell>{formatExponential(thermalEnergy)}</ValueCell>
                  <TableCell>J</TableCell>
                  <TableCell>k<sub>B</sub>T</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Thermal Energy</TableCell>
                  <ValueCell>{formatExponential(thermalEnergyEV)}</ValueCell>
                  <TableCell>eV</TableCell>
                  <TableCell>k<sub>B</sub>T in electron-volts</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Tunneling Parameter</TableCell>
                  <ValueCell>{formatExponential(lambda)}</ValueCell>
                  <TableCell>m</TableCell>
                  <TableCell>Quantum tunneling characteristic length</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Equilibrium Separation</TableCell>
                  <ValueCell>{formatExponential(r0)}</ValueCell>
                  <TableCell>m</TableCell>
                  <TableCell>Distance between nuclei at equilibrium</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Spring Constant</TableCell>
                  <ValueCell>{formatExponential(k_spring)}</ValueCell>
                  <TableCell>N/m</TableCell>
                  <TableCell>Effective spring constant of the bond</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Potential Model</TableCell>
                  <ValueCell highlight={true}>{potential === 'morse' ? 'Morse' : 'Harmonic'}</ValueCell>
                  <TableCell>-</TableCell>
                  <TableCell>Type of potential energy function</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
      
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Barrier Penetration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box mb={2}>
            <Typography variant="body2" paragraph>
              Fusion requires tunneling through the Coulomb barrier between positively charged nuclei.
              In LENR, various mechanisms may enhance tunneling probability.
            </Typography>
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Parameter</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Units</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Coulomb Barrier</TableCell>
                  <ValueCell>{coulombBarrier.toLocaleString()}</ValueCell>
                  <TableCell>eV</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Thermal/Barrier Ratio</TableCell>
                  <ValueCell>{formatExponential(coulombBarrierRatio)}</ValueCell>
                  <TableCell>-</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Screened Barrier</TableCell>
                  <ValueCell>{screenedBarrier.toLocaleString()}</ValueCell>
                  <TableCell>eV</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Screening Factor</TableCell>
                  <ValueCell highlight={true}>{CONSTANTS.LATTICE_SCREENING_FACTOR}</ValueCell>
                  <TableCell>-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box mt={2}>
            <Typography variant="body2">
              The metal lattice environment may enhance tunneling through:
            </Typography>
            <ul>
              <li>Electron screening effects</li>
              <li>Phonon-assisted tunneling</li>
              <li>Many-body coherent effects</li>
              <li>Surface plasmon polaritons</li>
            </ul>
          </Box>
        </AccordionDetails>
      </Accordion>
      
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Possible Reactions</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Reaction</TableCell>
                  <TableCell>Equation</TableCell>
                  <TableCell>Energy</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.values(REACTION_TYPES).map((reaction, index) => (
                  <TableRow key={index}>
                    <TableCell>{reaction.name}</TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        dangerouslySetInnerHTML={{ __html: formatEquation(reaction.equation) }} 
                      />
                    </TableCell>
                    <TableCell>
                      {reaction.name === 'D-D Fusion' ? '3.27 MeV' : 
                       reaction.name === 'D-Pd-D Fusion' ? '23.8 MeV' : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box mt={2}>
            <Typography variant="body2">
              These reactions are hypothetical mechanisms proposed to explain LENR/CMNS phenomena.
              The actual mechanisms are still under investigation by researchers.
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>
      
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Further Reading</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" paragraph>
            For more information on CMNS/LENR physics, consult these resources:
          </Typography>
          
          <ul>
            <li>
              <Link href="https://lenr-canr.org/" target="_blank" rel="noopener">
                LENR-CANR.org (Library of Papers)
              </Link>
            </li>
            <li>
              <Link href="https://www.sciencedirect.com/journal/journal-of-condensed-matter-nuclear-science" target="_blank" rel="noopener">
                Journal of Condensed Matter Nuclear Science
              </Link>
            </li>
            <li>
              <Link href="https://www.jcmns.org/" target="_blank" rel="noopener">
                JCMNS (Official Journal of the ISCMNS)
              </Link>
            </li>
            <li>
              <Link href="https://iccf24.org/" target="_blank" rel="noopener">
                International Conference on Cold Fusion (ICCF)
              </Link>
            </li>
          </ul>
        </AccordionDetails>
      </Accordion>
    </InfoPanel>
  );
};

export default PhysicsInfoPanel; 