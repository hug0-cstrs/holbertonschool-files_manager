import { MongoClient } from 'mongodb';

class DBClient { // Class to manage the connection to the database
  constructor() { // Constructor method that creates a new MongoDB client
    this.host = process.env.DB_HOST || 'localhost'; // sets the host to the value of the DB_HOST environment variable or 'localhost'
    this.port = process.env.DB_PORT || 27017;
    // sets the port to the value of the DB_PORT environment variable or 27017
    this.database = process.env.DB_DATABASE || 'files_manager'; // sets the database to the value of the DB_DATABASE environment variable or 'files_manager'
    this.client = new MongoClient(`mongodb://${this.host}:${this.port}`, { useUnifiedTopology: true });
    this.client.connect(); // connects to the MongoDB client
    this.db = this.client.db(this.database);
    // sets the database to the value of the DB_DATABASE environment variable or 'files_manager'
  }

  isAlive() { // isAlive method that returns a boolean indicating if the client is connected
    if (this.client.isConnected()) {
      return true;
    }
    return false;
  }

  async nbUsers() { // nbUsers method that returns the number of users in the database
    this.db = this.client.db(this.database);
    // sets the database to the value of the DB_DATABASE environment variable or 'files_manager'
    const collection = await this.db.collection('users'); // retrieves the 'users' collection from the database
    return collection.countDocuments(); // returns the number of documents in the collection
  }

  async nbFiles() { // nbFiles method that returns the number of files in the database
    this.db = this.client.db(this.database);
    // sets the database to the value of the DB_DATABASE environment variable or 'files_manager'
    const collection = await this.db.collection('files'); // retrieves the 'files' collection from the database
    return collection.countDocuments(); // returns the number of documents in the collection
  }
}

const dbClient = new DBClient(); // creates a new DBClient instance
module.exports = dbClient; // exports the DBClient instance
