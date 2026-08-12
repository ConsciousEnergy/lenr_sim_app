/**
 * Development Proxy Configuration (LEGACY — NOT LOADED)
 *
 * Create React App auto-registered this file during development. The frontend
 * migrated to Vite in v0.3.6-beta, and Vite does not load `setupProxy.js`, so
 * nothing here runs. The live proxy configuration is `server.proxy` in
 * `vite.config.js`, which forwards `/api` and `/ws` to the backend on :8010.
 *
 * Retained only as a record of the mock health-check and log-sink endpoints the
 * CRA proxy used to provide; delete once those are confirmed unnecessary.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Add mock endpoints for development when backend is unavailable
  // Health check endpoint
  app.get('/api/health-check', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Frontend health check endpoint' });
  });
  
  // Log storage endpoint (mock for development)
  app.post('/api/logs', (req, res) => {
    // Just acknowledge receipt in development mode
    console.debug(`[DEV] Received ${req.body?.logs?.length || 0} log entries`);
    res.status(200).json({ status: 'ok', message: 'Logs received (dev mock)' });
  });
  
  // Provide mock error responses for common endpoints
  app.get('/api/*', (req, res, next) => {
    // Check if the request should be handled by the proxy
    // This is just to handle cases when backend is down
    if (req.headers['x-bypass-mock'] === 'true') {
      return next();
    }
    
    // Create mock response based on path
    if (req.path.includes('/health')) {
      res.status(200).json({ status: 'ok', environment: 'development' });
    } else {
      // Let the proxy try to handle it
      next();
    }
  });
  
  // Proxy API requests to backend with better error handling
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8010',
      changeOrigin: true,
      // Keep /api prefix because backend routes are mounted under /api.
      pathRewrite: {},
      // Don't log proxy errors to avoid console spam
      logLevel: 'silent',
      // Skip proxy for health check and logs
      filter: (path) => !path.includes('/health-check') && !path.includes('/logs'),
      // Handle proxy errors gracefully
      onError: (err, req, res) => {
        if (!res.headersSent) {
          res.writeHead(503, {
            'Content-Type': 'application/json',
          });
        }
        
        const json = { 
          error: 'service_unavailable', 
          message: 'The backend service is unavailable',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        };
        
        res.end(JSON.stringify(json));
      }
    }),
  );
}; 