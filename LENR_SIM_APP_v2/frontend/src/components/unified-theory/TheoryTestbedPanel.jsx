import React from 'react';
import { Alert, Box, Typography } from '@mui/material';
import TheoryTogglePanel from '../physics/TheoryTogglePanel';
import { buildTheoryConditions } from '../../utils/theoryConditions';

export default function TheoryTestbedPanel({ parameters, theoryResult }) {
  return (
    <Box>
      {theoryResult?.observables_bridge && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Observables bridge active: excess heat, helium proxy, and radiation bounds are available from backend contract.
        </Alert>
      )}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
          LENR Theory Testbed
        </Typography>
        <Typography variant="body2">
          Toggle individual theory modules on/off, adjust parameters, and compare
          their contributions side-by-side. Run the pipeline to see each theory&apos;s
          enhancement factor and confidence under the current simulation conditions.
        </Typography>
      </Alert>
      <TheoryTogglePanel conditions={buildTheoryConditions({ parameters })} />
    </Box>
  );
}
