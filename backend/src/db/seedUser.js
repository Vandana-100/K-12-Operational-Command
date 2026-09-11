const bcrypt = require("bcryptjs");
const db = require("./database");

const password = bcrypt.hashSync("admin123", 10);

const insertUser = db.prepare(`
  INSERT INTO users
  (name, email, password, role)
  VALUES (?, ?, ?, ?)
`);

insertUser.run(
  "Admin User",
  "admin@school.com",
  password,
  "Operations Admin"
);

console.log("Test user created successfully");