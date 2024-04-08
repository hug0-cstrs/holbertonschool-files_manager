import { ObjectId } from 'mongodb'; // import ObjectId from 'mongodb'
import { v4 as uuidv4 } from 'uuid'; // import { v4 as uuidv4 } from 'uuid'

const fs = require('fs');
const mime = require('mime-types'); // import mime from 'mime-types'
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

/**
 * Classe FilesController
 * Contient des méthodes pour interagir avec les fichiers
 * stockés dans la base de données et le système de fichiers
 * de l'API
  */
class FilesController {
  // Méthode pour télécharger un fichier
  static async postUpload(req, res) {
    const key = req.header('X-Token'); // Récupère la clé d'authentification de l'en-tête
    const session = await redisClient.get(`auth_${key}`); // Vérifie si la clé est présente dans Redis
    if (!key || key.length === 0) { // Vérifie si la clé est vide
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (session) { // Vérifie si la session est valide
      const { name } = req.body; // Récupère le nom du fichier
      const { type } = req.body; // Récupère le type du fichier
      let { parentId } = req.body; // Récupère l'ID du parent
      const { isPublic } = req.body; // Récupère le statut public du fichier
      const { data } = req.body; // Récupère les données du fichier
      const types = ['folder', 'file', 'image']; // Types de fichiers autorisés

      if (!name) { // Vérifie si le nom est vide
        return (res.status(400).json({ error: 'Missing name' }));
      } if ((!type) || types.includes(type) === false) {
        // Vérifie si le type est vide ou non autorisé
        return (res.status(400).json({ error: 'Missing type' }));
      }

      if (!data && type !== types[0]) { // Vérifie si les données sont vides
        return (res.status(400).json({ error: 'Missing data' }));
      }
      if (!parentId) { parentId = 0; } // Vérifie si le parent est vide
      if (parentId !== 0) { // Vérifie si le parent est différent de 0
        const search = await dbClient.db.collection('files').find({ _id: ObjectId(parentId) }).toArray(); // Recherche le parent
        if (search.length < 1) { // Vérifie si le parent n'existe pas
          return (res.status(400).json({ error: 'Parent not found' }));
        }
        if (types[0] !== search[0].type) { // Vérifie si le parent n'est pas un dossier
          return (res.status(400).json({ error: 'Parent is not a folder' }));
        }
      }
      const userId = session; // Récupère l'ID de l'utilisateur
      if (type === types[0]) { // Vérifie si le type est un dossier
        const folder = await dbClient.db.collection('files').insertOne({ // Crée un dossier
          name,
          type,
          userId: ObjectId(userId),
          parentId: parentId !== 0 ? ObjectId(parentId) : 0,
          // Vérifie si le parent est différent de 0
          isPublic: isPublic || false,
        });
        return res.status(201).json({ // Retourne le dossier créé
          id: folder.ops[0]._id,
          userId: folder.ops[0].userId,
          name: folder.ops[0].name,
          type: folder.ops[0].type,
          isPublic: folder.ops[0].isPublic,
          parentId: folder.ops[0].parentId,
        });
      }

      const buff = Buffer.from(data, 'base64').toString('utf-8'); // Convertit les données en base64
      const path = process.env.FOLDER_PATH || '/tmp/files_manager'; // Définit le chemin du dossier
      const newFile = uuidv4(); // Génère un nom de fichier unique

      if (!fs.existsSync(path)) { // Vérifie si le dossier existe
        fs.mkdirSync(path, { recursive: true }); // Crée le dossier
      }
      fs.writeFile(`${path}/${newFile}`, buff, (err) => { // Écrit les données dans le fichier
        if (err) {
          return (res.status(400).json({ error: err.message }));
        }
        return true;
      });
      const file = await dbClient.db.collection('files').insertOne({ // Crée un fichier
        name,
        type,
        userId: ObjectId(userId),
        parentId: parentId !== 0 ? ObjectId(parentId) : 0,
        isPublic: isPublic || false,
        data,
        localPath: `${path}/${newFile}`,
      });

      return res.status(201).json({ // Retourne le fichier créé
        id: file.ops[0]._id,
        userId: file.ops[0].userId,
        name: file.ops[0].name,
        type: file.ops[0].type,
        isPublic: file.ops[0].isPublic,
        parentId: file.ops[0].parentId,
      });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  static async getShow(req, res) { // Méthode pour afficher un fichier
    const key = req.header('X-Token'); // Récupère la clé d'authentification de l'en-tête
    const session = await redisClient.get(`auth_${key}`); // Vérifie si la clé est présente dans Redis
    if (!key || key.length === 0) { // Vérifie si la clé est vide
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (session) { // Vérifie si la session est valide
      const { id } = req.params; // Récupère l'ID du fichier
      const search = await dbClient.db.collection('files').find({ _id: ObjectId(id) }).toArray(); // Recherche le fichier
      if (!search || search.length < 1) { // Vérifie si le fichier n'existe pas
        return res.status(404).json({ error: 'Not found' });
      }
      return (res.json({ // Retourne le fichier
        id: search[0]._id,
        userId: search[0].userId,
        name: search[0].name,
        type: search[0].type,
        isPublic: search[0].isPublic,
        parentId: search[0].parentId,
      }));
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  static async getIndex(req, res) { // Méthode pour afficher les fichiers
    const key = req.header('X-Token');
    const session = await redisClient.get(`auth_${key}`);
    if (!key || key.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (session) {
      let { parentId } = req.query;
      if (!parentId) { parentId = '0'; }
      if (parentId === '0') {
        const search = await dbClient.db.collection('files').find({ parentId: parseInt(parentId, 10) }).toArray(); // Recherche les fichiers
        if (search) {
          return res.status(200).send(search);
        }
      } else if (parentId !== 0) {
        const search = await dbClient.db.collection('files').find({ parentId: ObjectId(parentId) }).toArray();
        if (search) {
          return res.status(200).send(search);
        }
      }
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  static async putPublish(req, res) { // Méthode pour publier un fichier
    const key = req.header('X-Token');
    const session = await redisClient.get(`auth_${key}`);
    if (!key || key.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (session) {
      const { id } = req.params;
      if (!id || id === '') {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      let search = [];
      try {
        search = await dbClient.db.collection('files').find({ _id: ObjectId(id), userId: ObjectId(session) }).toArray();
      } catch (e) {
        return (res.status(404).json({ error: 'Not found' }));
      }
      if (!search || search.length < 1) {
        return (res.status(404).json({ error: 'Not found' }));
      }
      await dbClient.db.collection('files').updateOne({ _id: ObjectId(id) }, { $set: { isPublic: true } }); // Met à jour le statut public
      const search1 = await dbClient.db.collection('files').find({ _id: ObjectId(id), userId: ObjectId(session) }).toArray();
      if (!search1 || search1.length < 1) { // Vérifie si le fichier n'existe pas
        return (res.status(404).json({ error: 'Not found' }));
      }
      return res.status(200).json({ // Retourne le fichier
        id: search1[0]._id,
        userId: search1[0].userId,
        name: search1[0].name,
        type: search1[0].type,
        isPublic: search1[0].isPublic,
        parentId: search1[0].parentId,
      });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  static async putUnpublish(req, res) { // Méthode pour dépublier un fichier
    const key = req.header('X-Token');
    const session = await redisClient.get(`auth_${key}`);
    if (!key || key.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (session) {
      const { id } = req.params;
      if (!id || id === '') {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      let search = [];
      try {
        search = await dbClient.db.collection('files').find({ _id: ObjectId(id), userId: ObjectId(session) }).toArray();
      } catch (e) {
        return (res.status(404).json({ error: 'Not found' }));
      }
      if (!search || search.length < 1) {
        return (res.status(404).json({ error: 'Not found' }));
      }
      await dbClient.db.collection('files').updateOne({ _id: ObjectId(id) }, { $set: { isPublic: false } });
      const search1 = await dbClient.db.collection('files').find({ _id: ObjectId(id), userId: ObjectId(session) }).toArray();
      if (!search1 || search1.length < 1) {
        return (res.status(404).json({ error: 'Not found' }));
      }
      return res.status(200).json({
        id: search1[0]._id,
        userId: search1[0].userId,
        name: search1[0].name,
        type: search1[0].type,
        isPublic: search1[0].isPublic,
        parentId: search1[0].parentId,
      });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  static async getFile(req, res) { // Méthode pour obtenir un fichier
    const { id } = req.params;
    if (!id || id === '') { // Vérifie si l'ID est vide
      return res.status(404).json({ error: 'Not found' });
    }
    let search = [];
    try {
      search = await dbClient.db.collection('files').find({ _id: ObjectId(id) }).toArray();
    } catch (e) {
      return (res.status(404).json({ error: 'Not found' }));
    }
    if (!search || search.length < 1) {
      return (res.status(404).json({ error: 'Not found' }));
    }
    if (search[0].type === 'folder') {
      return res.status(400).json({ error: 'A folder doesn\'t have content' });
    }
    if (search[0].isPublic === false) {
      const key = req.header('X-Token');
      const session = await redisClient.get(`auth_${key}`);
      if (!key || key.length === 0) {
        return res.status(404).json({ error: 'Not found' });
      }
      if (session) {
        let search1 = [];
        try {
          search1 = await dbClient.db.collection('files').find({ _id: ObjectId(id), userId: ObjectId(session) }).toArray();
        } catch (e) {
          return (res.status(404).json({ error: 'Not found' }));
        }
        if (!search1 || search1.length < 1) { // Vérifie si le fichier n'existe pas
          return (res.status(404).json({ error: 'Not found' }));
        }
        if (!fs.existsSync(search1[0].localPath)) { // Vérifie si le fichier existe
          return res.status(404).json({ error: 'Not found' });
        }

        const type = mime.contentType(search1[0].name); // Récupère le type du fichier
        const charset = type.split('=')[1]; // Récupère le jeu de caractères
        try {
          const data = fs.readFileSync(search1[0].localPath, charset); // Lit les données du fichier
          return res.send(data); // Retourne les données
        } catch (e) {
          return (res.status(404).json({ error: 'Not found' }));
        }
      }
      return res.status(404).json({ error: 'Not found' });
    }

    const search2 = await dbClient.db.collection('files').find({ _id: ObjectId(id) }).toArray();
    if (!search2 || search2.length < 1) {
      return (res.status(404).json({ error: 'Not found' }));
    }
    if (!fs.existsSync(search2[0].localPath)) {
      return res.status(404).json({ error: 'Not found' });
    }
    const type = mime.contentType(search2[0].name);
    const charset = type.split('=')[1];
    try {
      const data = fs.readFileSync(search2[0].localPath, charset);
      return res.send(data);
    } catch (e) {
      return (res.status(404).json({ error: 'Not found' }));
    }
  }
}

module.exports = FilesController;
