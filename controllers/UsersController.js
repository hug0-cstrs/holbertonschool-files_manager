import { ObjectId } from 'mongodb';

const crypto = require('crypto');

const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

// Fonction pour hacher le mot de passe
function hashPasswd(password) {
  // Créer un objet de hachage SHA-1
  const hash = crypto.createHash('sha1');

  // Mets à jour le hachage avec le mot de passe fourni
  const data = hash.update(password, 'utf-8');

  // Génère le hachage au format hexadécimal
  const genHash = data.digest('hex');

  // Retourne le hachage généré
  return genHash;
}

// Définir la classe UsersController
class UsersController {
  // Méthode pour créer un nouvel utilisateur
  static async postNew(req, res) {
    // Récupère l'email et le mot de passe de la requête
    const { email, password } = req.body;

    // Vérifie si l'email et le mot de passe sont fournis
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    // Vérifie si l'utilisateur existe déjà dans la base de données
    const search = await dbClient.db.collection('users').find({ email }).toArray();
    if (search.length > 0) {
      return res.status(400).json({ error: 'Already exist' });
    }

    // Hache le mot de passe
    const hashpwd = hashPasswd(password);

    // Insére le nouvel utilisateur dans la base de données
    const addUser = await dbClient.db.collection('users').insertOne({ email, password: hashpwd });

    // Créer un objet représentant le nouvel utilisateur
    const newUser = { id: addUser.ops[0]._id, email: addUser.ops[0].email };

    // Renvoie la réponse avec les détails du nouvel utilisateur
    return res.status(201).json(newUser);
  }

  // Méthode pour obtenir les détails de l'utilisateur actuellement authentifié
  static async getMe(req, res) {
    // Récupère le jeton d'authentification de l'en-tête X-Token
    const key = req.header('X-Token');

    // Récupère la session de l'utilisateur à partir du jeton d'authentification dans Redis
    const session = await redisClient.get(`auth_${key}`);

    // Vérifie si le jeton est valide
    if (!key || key.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Vérifie si la session existe
    if (session) {
      // Recherche l'utilisateur dans la base de données par son identifiant
      const search = await dbClient.db.collection('users').find({ _id: ObjectId(session) }).toArray();

      // Vérifie si l'utilisateur est trouvé
      if (search.length > 0) {
        // Renvoie les détails de l'utilisateur
        return res.status(200).json({ id: search[0]._id, email: search[0].email });
      }
    }

    // Si la session n'existe pas ou l'utilisateur n'est pas trouvé,
    // renvoie une erreur d'authentification
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = UsersController;
