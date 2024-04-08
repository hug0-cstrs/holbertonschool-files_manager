/* eslint-disable */
import express from 'express';

const routes = require('./routes/index');

const app = express();

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
app.use(express.json());
app.use('/', routes);
module.exports = app;
