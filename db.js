import dns from "node:dns"
dns.setServers(["8.8.8.8","8.8.4.4"])


import dotenv from "dotenv";
dotenv.config();

import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGO_URI;

if (!uri) {
  throw new Error("Please add MONGO_URI in .env");
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

export const connectDB = async () => {
  try {
    if (db) return db;

    await client.connect();

    db = client.db("medi-queue");

    await db.command({ ping: 1 });

    console.log(" Connected to MongoDB");

    return db;
  } catch (error) {
    console.log(" MongoDB Connection Error:", error);
  }
};

