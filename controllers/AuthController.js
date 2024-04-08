const sha1 = require('sha1');
const { v4: uuidv4 } = require('uuid');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

/** getConnect - creates an authentication token to sign-in a user
Stores in redis client the token as key and the userid as value
and sends back the created token
  Header params:
    - Authorization: base64-encoded credentials
*/
async function getConnect(req, res) {
  const header = req.headers.authorization.slice(6);
  const decoded = Buffer.from(header, 'base64').toString(); // decode base64
  const credentials = decoded.split(':');

  // get user from db using credentials from request
  const doc = { email: credentials[0], password: sha1(credentials[1]) };
  const user = await dbClient.client.collection('users').findOne(doc);
  if (user) {
    // set (token: userid) with redis client
    const token = uuidv4();
    const key = `auth_${token}`;
    redisClient.set(key, user._id.toString(), 24 * 3600);
    res.json({ token });
  } else res.status(401).json({ error: 'Unauthorized' });
}

/** getDisconnect - signs-out the user by deleten the connection token in
 the redis client.
  Header parans:
    - X-Token: token created when user signed-in
 */
async function getDisconnect(req, res) {
  const key = req.headers['x-token'];
  const token = await redisClient.get(`auth_${key}`);
  if (token) {
    redisClient.del(`auth_${key}`);
    res.status(204).end();
  } else res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { getConnect, getDisconnect };
