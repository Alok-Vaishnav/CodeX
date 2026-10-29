import mongoose from "mongoose";
import MongoStore from "connect-mongo";

export async function connectDatabase(uri) {
  await mongoose.connect(uri);
}

export function createSessionStore(uri, ttlSeconds) {
  return MongoStore.create({ mongoUrl: uri, collectionName: "sessions", ttl: ttlSeconds });
}
