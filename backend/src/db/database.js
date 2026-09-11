const Database = require("better-sqlite3");

const db = new Database("k12_operations.db");

db.pragma("foreign_keys = ON");

console.log("SQLite database connected successfully");

module.exports = db;