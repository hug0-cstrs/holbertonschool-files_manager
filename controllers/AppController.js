const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

/** getStatus - callback for route GET /status
 returns json data if both Redis and mongoDB clients are connected
 */
function getStatus(req, res) {
  if (redisClient.isAlive() && dbClient.isAlive()) {
    res.status(200).json({ redis: true, db: true });
  }
}

/** getStats - callback for route GET /stats
 uses functions from the db client to return number of users
 and files.
 */
async function getStats(req, res) {
  const userNum = await dbClient.nbUsers();
  const fileNum = await dbClient.nbFiles();
  res.status(200).json({ users: userNum, files: fileNum });
}

module.exports = { getStats, getStatus };
