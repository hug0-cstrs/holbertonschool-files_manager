/* eslint-disable */
import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AuthController {
  /**
   * Should sign-in the user by generating a new authentication token
   */
  static async getConnect(request, response) {
    const Authorization = request.header('Authorization') || '';
    const credentials = Authorization.split(' ')[1];
    if (!credentials) return response.status(401).send({ error: 'Unauthorized' });
    const decodedCredentials = Buffer.from(credentials, 'base64').toString('utf-8');

    const [email, password] = decodedCredentials.split(':');
    if (!email || !password) return response.status(401).send({ error: 'Unauthorized' });

    const sha1Password = sha1(password);

    // Find the user associate to this email and with this password
    const finishedCreds = { email, password: sha1Password };
    const user = await dbClient.users.findOne(finishedCreds);
    // If no user has been found
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    // Generate a random string (using uuidv4) as token
    const token = uuidv4();
    const key = `auth_${token}`;
    const hoursForExpiration = 24;

    // Use this key for storing in Redis the user ID for 24 hours
    await redisClient.set(key, user._id.toString(), hoursForExpiration * 3600);

    return response.status(200).send({ token });
  }

  /**
   * Should sign-out the user based on the token
   */
  static async getDisconnect(request, response) {
    // retrieve the user from the token
    const token = request.headers['x-token'];
    const user = await redisClient.get(`auth_${token}`);
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    // delete the token in Redis
    await redisClient.del(`auth_${token}`);
    return response.status(204).end();
  }
}

module.exports = AuthController;
