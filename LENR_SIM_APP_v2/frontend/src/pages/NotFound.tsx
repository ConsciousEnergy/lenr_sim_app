import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

/**
 * 404 Not Found page.
 * Displayed for any route that does not match a defined path.
 */
export default function NotFound() {
  const navigate = useNavigate();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      textAlign="center"
      p={4}
    >
      <Typography variant="h1" fontWeight={700} color="text.secondary" gutterBottom>
        404
      </Typography>
      <Typography variant="h5" gutterBottom>
        Page not found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 480 }}>
        The page you are looking for does not exist or has been moved.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/')} size="large">
        Back to Dashboard
      </Button>
    </Box>
  );
}
