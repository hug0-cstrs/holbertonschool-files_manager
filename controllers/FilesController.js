const fs = require('fs');
const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

/** postUpload - controller for route POST /files
  Creates a file or a folder on the path `/temp/files_manager/*` containing data.
   Header params:
     - x-token: connection token created when user signs-in
   JSON body:
     - name: name of the file
     - type: folder | file | image
     - parentId: id of the parent folder or zero for current folder
     - isPublic: true | false
     - data: base64 encoded string to decode as the file's content
*/
async function postUpload(req, res) {
  const key = req.headers['x-token']; // get token from header
  const userId = await redisClient.get(`auth_${key}`);

  let user = ''; // find connected user
  if (userId) user = await dbClient.client.collection('users').findOne({ _id: ObjectId(userId) });
  // MIGHT NEED TO GUARD USER
  const { name } = req.body; // name
  if (!name) res.status(400).json({ error: 'Missing name' });

  const { type } = req.body; // type
  if (!type || !['folder', 'image', 'file'].includes(type)) res.status(400).json({ error: 'Missing type' });

  let path = '/tmp/files_manager'; // create file/folder in this path
  const parentId = req.body.parentId || 0; // parentId
  if (parentId !== 0) {
    const parentFile = await dbClient.client.collection('files').findOne({ _id: ObjectId(parentId) });
    if (!parentFile) {
      res.status(400).json({ error: 'Parent not found' });
      return;
    } if (parentFile.type !== 'folder') {
      res.status(400).json({ error: 'Parent is not a folder' });
      return;
    } path = parentFile.localPath;
  }

  const isPublic = req.body.isPublic || false; // isPublic

  let { data } = req.body; // data
  if (!data && type !== 'folder') res.status(400).json({ error: 'Missing data' });
  else if (data) data = Buffer.from(data, 'base64').toString(); // decode data

  const file = uuidv4();
  path += `/${file}`;

  // check if /tmp/files_manager exists, if not create it
  if (!fs.existsSync('/tmp/files_manager')) fs.mkdirSync('/tmp/files_manager');

  if (type === 'folder') fs.mkdirSync(path);
  else fs.writeFileSync(path, data);

  // save document on db
  const docFile = await dbClient.client.collection('files').insertOne({
    userId: user._id, name, type, isPublic, parentId, localPath: path,
  });
  if (docFile) {
    res.json({
      id: docFile.ops[0]._id, userId: docFile.ops[0].userId, name, type, isPublic, parentId,
    });
  }
}

/** getShow - Callback for GET /files/:id
  Retrieves a document based on the document's id
  Header params:
    - x-token: connection token created when user signs-in
  Get parameters:
    - id: document id
 */
async function getShow(req, res) {
  const key = req.headers['x-token']; // get token from header
  const userId = await redisClient.get(`auth_${key}`);
  const fileId = req.params.id;

  let user = ''; // find and store user
  if (userId) user = await dbClient.client.collection('users').findOne({ _id: ObjectId(userId) });
  else res.status(401).json({ error: 'Unauthorized' });

  // find the document with userID and document id (_id)
  const doc = await dbClient.client.collection('files').findOne({ userId: ObjectId(user._id), _id: ObjectId(fileId) });
  if (doc) res.json(doc);
  else res.status(404).json({ error: 'Not found' });
}

/** getIndex - Callback for GET /files
  Retrieves all documents of a user.

  Optional query strings:
    - parentId: filter by a doc's parentId
    - page: pagination (20 docs per page)
  Header params:
   - x-token: connection token created when user signs-in
 */
async function getIndex(req, res) {
  const key = req.headers['x-token']; // get token from header
  const userId = await redisClient.get(`auth_${key}`);

  let user = ''; // find and store user
  if (userId) user = await dbClient.client.collection('users').findOne({ _id: ObjectId(userId) });
  else res.status(401).json({ error: 'Unauthorized' });

  let docs = '';
  let documents = []; // to return

  // if parentId is passed as query string, filter by this id. Otherwise filter by userId
  if (req.query.parentId) {
    docs = await dbClient.client.collection('files').find({ parentId: req.query.parentId });
  } else docs = await dbClient.client.collection('files').find({ userId: ObjectId(user._id) });

  // if page is passed as query string, only get the 20 items of that page
  if (req.query.page) {
    const pagination = await dbClient.client.collection('files').aggregate([
      {
        $facet: {
          data: [{ $skip: (req.query.page * 2) }, { $limit: 2 }],
        },
      },
    ], docs);
    await pagination.forEach((data) => {
      documents = data.data;
    });
  } else await docs.forEach((d) => documents.push(d)); // without pagination

  if (documents) res.json(documents);
  else res.status(404).json({ error: 'Not Found' });
}

/** getPublish - Callback for PUT files/id/publish
  sets isPublic to true on a file document given its id

  Header params:
    - x-token: connection token created when user signs-in
  Request params:
    - id: id of document to modify
 */
async function putPublish(req, res) {
  const key = req.headers['x-token']; // get token from header
  const userId = await redisClient.get(`auth_${key}`);

  let user = ''; // find and store user
  if (userId) user = await dbClient.client.collection('users').findOne({ _id: ObjectId(userId) });
  else res.status(401).json({ error: 'Unauthorized' });

  const docId = req.params.id;
  const doc = await dbClient.client.collection('files').findOne({ _id: ObjectId(docId), userId: user._id });
  if (doc) {
    doc.isPublic = true;
    res.json(doc);
  } else res.status(401).json({ error: 'Not found' });
}

/** putUnpublish - Callback for PUT /files/:id/unpublish
  sets isPublic to false on a file document given its id

  Header params:
    - x-token: connection token created when user signs-in
  Request params:
    - id: id of the document to modify
 */
async function putUnpublish(req, res) {
  const key = req.headers['x-token']; // get token from header
  const userId = await redisClient.get(`auth_${key}`);

  let user = ''; // find and store user
  if (userId) user = await dbClient.client.collection('users').findOne({ _id: ObjectId(userId) });
  else res.status(401).json({ error: 'Unauthorized' });

  const docId = req.params.id;
  const doc = await dbClient.client.collection('files').findOne({ _id: ObjectId(docId), userId: user._id });
  if (doc) {
    doc.isPublic = false;
    res.json(doc);
  } else res.status(401).json({ error: 'Not found' });
}

async function getFile(req, res) {
  const key = req.headers['x-token']; // get token from header
  const userId = await redisClient.get(`auth_${key}`);

  let user = ''; // find and store user
  if (userId) user = await dbClient.client.collection('users').findOne({ _id: ObjectId(userId) });

  const docId = req.params.id;
  const doc = await dbClient.client.collection('files').findOne({ _id: ObjectId(docId) });
  if (doc) {
    // if doc is not public, the user must be authenticated in order to read the file
    if (!doc.isPublic && user === '') res.status(404).json({ error: 'Not Found' });
    else if (doc.type === 'folder') res.status(400).json({ error: 'A folder doesn\'t have content' });
    else {
      fs.readFile(doc.localPath, 'utf-8', (err, data) => {
        if (err) res.status(401).json({ error: 'Not found' }); // can't read file
        else {
          res.setHeader('Content-Type', mime.lookup(doc.name));
          res.end(data);
        }
      });
    }
  } else res.status(401).json({ error: 'Not found' }); // doc not found
}

module.exports = {
  postUpload, getShow, getIndex, putPublish, putUnpublish, getFile,
};
