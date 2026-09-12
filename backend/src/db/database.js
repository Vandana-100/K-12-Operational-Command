const Database = require("better-sqlite3");
const path = require("path");

const dbPath =
  process.env.DB_PATH ||
  path.join(__dirname, "..", "k12_operations.db");

const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

console.log("SQLite database connected successfully");

module.exports = db;