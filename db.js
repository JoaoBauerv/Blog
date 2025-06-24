const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'blog'
});
conn.connect(err => {
  if (err) throw err;
  console.log("MySQL conectado.");
});
module.exports = conn;
