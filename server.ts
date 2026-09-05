import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON body
  app.use(express.json());

  // --- API Routes ---
  
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Mock Push endpoint for syncService
  app.post('/api/sync/push', (req, res) => {
    // In a real app, this would save to a database.
    // For now, we accept the push and return OK.
    const pendingData = req.body;
    console.log(`[API] Received push sync with ${pendingData.length} table groups.`);
    res.status(200).json({ success: true });
  });

  // Mock Pull endpoint for syncService
  app.get('/api/sync/pull', (req, res) => {
    // In a real app, this would fetch changes from a database since the provided timestamp.
    // For now, we return empty changes.
    const since = req.query.since;
    console.log(`[API] Received pull sync request since: ${since}`);
    res.status(200).json({});
  });

  // --- Vite Middleware (Development) or Static Serving (Production) ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
