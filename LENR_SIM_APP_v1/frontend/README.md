# LENR Simulation App Frontend

## Overview

The frontend for the LENR (Low Energy Nuclear Reaction) Simulation Application provides an intuitive interface for scientists and researchers to explore quantum tunneling phenomena. Built with React and Material-UI, it features interactive visualizations, parameter controls, and real-time simulation capabilities.

## Color Scheme

The frontend UI uses a color scheme inspired by [conscious.energy](https://www.conscious.energy), featuring:

- **Primary**: Deep purple (#6A0DAD) - Represents quantum phenomena and high-energy states
- **Secondary**: Teal (#008080) - Represents stability and scientific precision
- **Accent Colors**: 
  - Purple: #8A2BE2
  - Blue: #1E90FF
  - Teal: #008080
  - Pink: #FF69B4

The color scheme is designed to create an immersive, futuristic interface that conveys the cutting-edge nature of LENR research while maintaining readability and accessibility.

## Key Features

- Interactive 2D and 3D visualizations of quantum tunneling phenomena
- Real-time parameter adjustment with immediate visual feedback
- Heatmap generation for parameter space exploration
- Particle cluster visualization with field strength indication
- Responsive design for desktop and tablet viewing
- Dark/light mode toggle
- Exportable simulation results and visualizations

## Component Structure

The frontend is organized into reusable components:

- **Layout Components**: AppBar, Sidebar, Footer, Page containers
- **Form Components**: Parameter controls, sliders, input fields
- **Visualization Components**: Charts, 3D renderers, heatmaps
- **Feedback Components**: Notifications, alerts, progress indicators
- **Data Display**: Tables, cards, result summaries

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```

## Theme Customization

The application uses a customized Material-UI theme defined in `src/theme/`. The theme can be modified by adjusting the following files:

- `src/theme/colors.js`: Color definitions and palettes
- `src/theme/theme.js`: Material-UI theme configuration
- `src/theme/index.js`: Theme exports

To apply custom styling to components, use the Material-UI `sx` prop or create styled components with the `styled` utility from `@mui/material/styles`.

## API Integration

The frontend communicates with the backend API using Axios. API client functions are organized in the `src/api/` directory:

- `api/client.js`: Base API client configuration
- `api/simulation.js`: Simulation-related API calls
- `api/visualization.js`: Visualization-related API calls

## Visualization Technologies

The application uses various libraries for scientific visualization:

- **Chart.js**: For 2D plots and charts
- **Three.js**: For 3D visualization
- **D3.js**: For complex data visualizations
- **react-plotly.js**: For interactive scientific charts

## Development Guidelines

### Code Style

- Use functional components with hooks
- Follow React best practices
- Use TypeScript for type safety
- Document components with JSDoc

### State Management

- Use React Context for global state
- Use React Query for server state
- Use local state (useState) for component-specific state

### Testing

- Write unit tests for all components
- Write integration tests for complex workflows
- Test accessibility using appropriate tools

## Deployment

The frontend is designed to be deployed to any static hosting service:

- Netlify
- Vercel
- AWS S3 + CloudFront
- GitHub Pages

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 