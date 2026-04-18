// Export the Express app without starting the HTTP server
// This avoids EADDRINUSE in tests
export { default as app } from '../../app';
