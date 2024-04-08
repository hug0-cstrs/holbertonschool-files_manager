const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

/**
 * Classe AppController
 * Contient des méthodes pour interagir avec l'état de l'API
 */
class AppController {
  // Méthode pour vérifier l'état de Redis et de la base de données et renvoyer une réponse JSON
  static getStatus(req, res) {
    // Vérifie si Redis et la base de données sont actifs
    if (redisClient.isAlive() && dbClient.isAlive()) {
      // Renvoye une réponse JSON avec l'état de Redis et de la base de données
      res.status(200).json({ redis: true, db: true }, 200);
    }
  }

  // Méthode pour obtenir les statistiques de la base de données
  // et de Redis et les renvoyer sous forme JSON
  static async getStats(req, res) {
    // Obtient le nombre d'utilisateurs depuis la base de données
    const users = await dbClient.nbUsers();
    // Obtient le nombre de fichiers depuis la base de données
    const files = await dbClient.nbFiles();
    // Créer un objet contenant les statistiques d'utilisateurs et de fichiers
    const obj = {
      users,
      files,
    };
    // Renvoie les statistiques sous forme JSON
    res.status(200).json(obj);
  }
}

module.exports = AppController;
