import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

const express = require('express');

const router = (app) => {
  const path = express.Router();
  app.use(express.json());
  app.use('/', path);

  path.get('/status', (req, res) => AppController.getStatus(req, res));
  path.get('/stats', (req, res) => AppController.getStats(req, res));
  path.post('/users', ((req, res) => UsersController.postNew(req, res)));
};

export default router;
