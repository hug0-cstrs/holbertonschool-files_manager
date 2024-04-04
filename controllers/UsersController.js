import sha1 from 'sha1';
import DBClient from '../utils/db';

const Bull = require('bull');

class UsersController {
  static async postNew(req, res) {
    const user = new Bull('userQueue');

    const email = { email: req.body.email };
    if (!email) return res.status(400).send({ error: 'Missing email' });

    const password = { password: req.body.password };
    if (!password) return res.status(400).send({ error: 'Missing password' });

    const passOld = await DBClient.db.collection('users').findOne({ email });
    if (passOld) return res.status(400).send({ error: 'Already exist' });

    const passHash = sha1(password);
    const result = await DBClient.db
      .collection('users')
      .insertOne({ email, password: passHash });

    user.add({ userId: result.insertedId });
    return res.status(201).send({ id: result.insertedId, email });
  }
}

module.exports = UsersController;
