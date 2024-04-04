import AppController from '../controllers/AppController';

const express = require('express');

const router = (app) => {
  const path = express.Router();
  app.use(express.json());
  app.use('/', path);

  path.get('/status', ((req, res) => AppController.getStatus(req, res)));
  path.get('/stats', ((req, res) => AppController.getStats(req, res)));
};

export default router;
