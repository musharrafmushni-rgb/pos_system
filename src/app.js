const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  const publicDir = path.join(__dirname, '..', 'public');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"]
        }
      }
    })
  );
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/health', (req, res) => {
    res.json({
      success: true,
      status: 'ok',
      reservationTtlMs: env.reservationTtlMs
    });
  });

  app.get('/favicon.ico', (req, res) => res.status(204).end());

  app.use('/api', apiRoutes);
  app.use(express.static(publicDir));

  app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use((req, res) => {
    if (req.path.startsWith('/api') || req.accepts('html') !== 'html') {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    return res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use(errorHandler);
  return app;
}

module.exports = createApp;
