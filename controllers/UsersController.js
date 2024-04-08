const sha1 = require('sha1');
const { ObjectId } = require('mongodb');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

/**
 * postNew - callback for route POST /users
 * Adds a user to the datbase
 * JSON body in post request:
 *  - email
 *  - password
 */
async function postNew(req, res) {
  const { email } = req.body; // const email = req.body.email;
  const pwd = req.body.password;

  if (!email) res.status(400).json({ error: 'Missing email' });
  if (!pwd) res.status(400).json({ error: 'Missing password ' });

  // check if email already exists in db
  const found = await dbClient.client.collection('users').find({ email }).count();
  if (found > 0) {
    res.status(400).json({ error: 'Already exist' });
    return;
  }
  // encrypt password and insert user in datbase
  const usr = { email, password: sha1(pwd) };
  const user = await dbClient.client.collection('users').insertOne(usr);
  if (user) res.status(201).json({ id: user.ops[0]._id, email: user.ops[0].email });
  else res.status(500).json({ error: 'Could not create user' });
}

/** getMe - retrieves the user that is currently signed-in with its connection token
 If user is found with the correct token, it sends the user's _id and email back.
   Header params:
     - X-token: token used as connection when user signs-in.
 */
async function getMe(req, res) {
  const key = req.headers['x-token'];
  // get user id from token key
  const userId = await redisClient.get(`auth_${key}`);
  if (userId) {
    // get user in db with user id
    const user = await dbClient.client.collection('users').findOne({ _id: ObjectId(userId) });
    res.json({ id: user._id, email: user.email });
  } else res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { postNew, getMe };
