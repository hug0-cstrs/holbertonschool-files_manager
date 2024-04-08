const express = require('express');
const { getStatus, getStats } = require('../controllers/AppController');
const { postNew, getMe } = require('../controllers/UsersController');
const { getConnect, getDisconnect } = require('../controllers/AuthController');
const {
  postUpload, getShow, getIndex, putPublish, putUnpublish, getFile,
} = require('../controllers/FilesController');

const router = express.Router();

// app routes
router.get('/', (req, res) => res.send('Hi, this is a file manager.'));
router.get('/status', (req, res) => getStatus(req, res));
router.get('/stats', (req, res) => getStats(req, res));

// user routes
router.post('/users', (req, res) => postNew(req, res));
router.get('/users/me', (req, res) => getMe(req, res));

// auth routes
router.get('/connect', (req, res) => getConnect(req, res));
router.get('/disconnect', (req, res) => getDisconnect(req, res));

// files routes
router.post('/files', (req, res) => postUpload(req, res));
router.get('/files/:id', (req, res) => getShow(req, res));
router.get('/files', (req, res) => getIndex(req, res));
router.put('/files/:id/publish', (req, res) => putPublish(req, res));
router.put('/files/:id/unpublish', (req, res) => putUnpublish(req, res));
router.get('/files/:id/data', (req, res) => getFile(req, res));

module.exports = router;
