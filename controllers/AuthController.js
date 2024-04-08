// Importer la fonction v4 de la bibliothèque uuid avec un alias uuidv4
import { v4 as uuidv4 } from 'uuid';

// Import du module crypto pour le hachage
const crypto = require('crypto');

const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

// Fonction pour hacher le mot de passe
function hashPasswd(password) {
  // Créer un objet de hachage SHA-1
  const hash = crypto.createHash('sha1');

  // Mets à jour le hachage avec le mot de passe fourni
  const data = hash.update(password, 'utf-8');

  // Génére le hachage au format hexadécimal
  const genHash = data.digest('hex');

  // Retourne le hachage généré
  return genHash;
}

class AuthController {
  // Méthode pour se connecter
  static async getConnect(req, res) {
    // Récupére l'en-tête Authorization
    const user = req.header('Authorization');
    // Vérifie si l'utilisateur est présent dans l'en-tête
    if (!user || user.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Décode les informations d'identification de l'en-tête
    const data = user.substring(6);
    const buff = Buffer.from(data, 'base64').toString('utf-8');
    const credentials = buff.split(':');

    // Vérifie si les informations d'identification sont valides
    if (!credentials || credentials.length === 1) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extraire l'email et le mot de passe des informations d'identification
    const email = credentials[0].toString('utf-8');
    const psswd = credentials[1].toString('utf-8');

    // Hache le mot de passe pour le comparer avec celui stocké en base de données
    const hashpwd = hashPasswd(psswd);

    // Recherche l'utilisateur dans la base de données par email et mot de passe haché
    const search = await dbClient.db.collection('users').find({ email, password: hashpwd }).toArray();

    // Vérifie si l'utilisateur existe dans la base de données et si le mot de passe correspond
    if (search.length < 1 || hashpwd !== search[0].password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Génére un jeton d'authentification unique
    const key = uuidv4();
    const token = `auth_${key}`;

    // Stocke le jeton dans Redis avec l'ID de l'utilisateur comme valeur associée
    await redisClient.set(token, search[0]._id.toString(), 86400);

    // Retourne le jeton généré
    return res.status(200).json({ token: key });
  }

  // Méthode pour se déconnecter
  static async getDisconnect(req, res) {
    // Récupére le jeton d'authentification de l'en-tête X-Token
    const key = req.header('X-Token');

    // Vérifie si le jeton est présent dans l'en-tête
    if (!key || key.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Vérifie si le jeton existe dans Redis
    if (await redisClient.get(`auth_${key}`)) {
      // Supprime le jeton de Redis
      await redisClient.del(`auth_${key}`);
      // Réponds avec un statut 204 (Pas de contenu) pour indiquer une déconnexion réussie
      return res.status(204).end();
    }

    // Retourne une erreur d'authentification si le jeton n'existe pas dans Redis
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = AuthController;
