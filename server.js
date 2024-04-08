import express from 'express';

const routes = require('./routes/index');

const app = express();

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
app.use(express.json());
app.use('/', routes);
app.use('/status', routes);
app.use('/stats', routes);
app.use('/users', routes);
app.use('/connect', routes);
app.use('/disconnect', routes);
app.use('/files', routes);

module.exports = app;
