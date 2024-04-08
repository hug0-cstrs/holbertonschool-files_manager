const express = require('express');
const bodyParser = require('body-parser');
const router = require('./routes/index');

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/', router);
app.use('/status', router);
app.use('/stats', router);
app.use('/users', router);
app.use('/connect', router);
app.use('/disconnect', router);
app.use('/files', router);

app.listen(port);

module.exports = app;
