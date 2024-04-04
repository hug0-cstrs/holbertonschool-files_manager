const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.client = redis.createClient(); // create new client
    this.client.on('error', (error) => { // handle error
      console.error(error);
    });

    this.getAsync = promisify(this.client.get).bind(this.client); // promisify get method
  }

  isAlive() { // check if client is connected
    return this.client.connected;
  }

  async get(key) { // get value from key
    const val = await this.getAsync(key);
    return val;
  }

  async set(key, value, duration) { // set key value pair with duration
    this.client.set(key, value);
    this.client.expire(key, duration);
  }

  async del(key) { // delete key
    this.client.del(key);
  }
}

const redisClient = new RedisClient(); // create new instance of RedisClient
module.exports = redisClient;
