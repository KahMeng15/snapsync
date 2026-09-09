const sqlite3 = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new sqlite3('snapsync-server/storage/db/snapsync.db');
bcrypt.hash('admin123', 10, (err, hash) => {
  db.prepare("UPDATE users SET email='operator@snapsync.local', password_hash=? WHERE role='admin'").run(hash);
  console.log("Admin credentials reset to operator@snapsync.local / admin123");
});
