const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');
const app = express();

app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'segredo123',
  resave: false,
  saveUninitialized: true
}));

// Multer configuração
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Rotas
app.get('/', (req, res) => res.render('index'));
app.get('/login', (req, res) => res.render('login', { error: null }));
app.get('/register', (req, res) => res.render('register', { error: null }));

app.post('/register', upload.single('foto'), (req, res) => {
  const { nome, email, senha } = req.body;
  const foto = req.file.filename;
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
    if (result.length > 0) return res.render('register', { error: 'E-mail já registrado.' });
    const senhaHash = bcrypt.hashSync(senha, 10);
    db.query('INSERT INTO users SET ?', {
      nome, email, senha: senhaHash, foto
    }, (err) => {
      if (err) throw err;
      res.redirect('/login');
    });
  });
});

app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
    if (result.length === 0) return res.render('login', { error: 'Usuário não encontrado.' });
    const user = result[0];
    if (!bcrypt.compareSync(senha, user.senha)) return res.render('login', { error: 'Senha incorreta.' });
    req.session.user = user;
    res.redirect('/dashboard');
  });
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('dashboard', { user: req.session.user });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.listen(3006, () => console.log('Servidor rodando em http://localhost:3006'));

module.exports = app;