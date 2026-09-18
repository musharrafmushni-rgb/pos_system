const mongoose = require('mongoose');
const env = require('./env');

let memoryReplSet;

async function startInMemoryReplicaSet() {
  const { MongoMemoryReplSet } = require('mongodb-memory-server');
  console.log('[db] Starting in-memory MongoDB replica set (no Docker)...');

  memoryReplSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' }
  });
  await memoryReplSet.waitUntilRunning();
  return memoryReplSet.getUri('pos_system');
}

async function connectWithUri(uri) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000
  });
}

async function connectDatabase() {
  mongoose.set('strictQuery', true);

  if (env.useInMemoryMongo) {
    await connectWithUri(await startInMemoryReplicaSet());
  } else {
    try {
      await connectWithUri(env.mongoUri);
    } catch (err) {
      console.warn('[db] Could not connect to MONGODB_URI. Falling back to in-memory MongoDB.');
      console.warn(`[db] Reason: ${err.message}`);
      await connectWithUri(await startInMemoryReplicaSet());
    }
  }

  const { host, name } = mongoose.connection;
  console.log(`[db] Connected to MongoDB at ${host}/${name}`);
}

async function disconnectDatabase() {
  await mongoose.disconnect();
  if (memoryReplSet) {
    await memoryReplSet.stop();
    memoryReplSet = null;
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase
};
