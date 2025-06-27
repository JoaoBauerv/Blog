// app.js corrigido e ajustado
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const app = express();

app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: 'segredo123',
  resave: false,
  saveUninitialized: true
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Multer configuração
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

//-----------------------------------------------------------

// Rota inicial
app.get('/', (req, res) => res.render('index'));

// Rotas de usuário
app.get('/login', (req, res) => res.render('user/login', { error: null }));
app.get('/register', (req, res) => res.render('user/register', { error: null }));

app.post('/user/register', upload.single('foto'), (req, res) => {
  const { nome, email, senha } = req.body;
  const foto = req.file?.filename || null;
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
    if (result.length > 0) return res.render('user/register', { error: 'E-mail já registrado.' });
    const senhaHash = bcrypt.hashSync(senha, 10);
    db.query('INSERT INTO users SET ?', { nome, email, senha: senhaHash, foto }, (err2) => {
      if (err2) throw err2;
      res.redirect('/login');
    });
  });
});

app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
    if (result.length === 0) return res.render('user/login', { error: 'Usuário não encontrado.' });
    const user = result[0];
    if (!bcrypt.compareSync(senha, user.senha)) return res.render('user/login', { error: 'Senha incorreta.' });
    req.session.user = user;
    res.redirect('/');
  });
});

app.get('/perfil/:id', (req, res) => {
  const userId = req.params.id;
  db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) throw err;
    if (results.length === 0) return res.status(404).send('Usuário não encontrado.');
    res.render('user/perfil', { perfil: results[0] });
  });
});

app.get('/perfil/edit', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('user/edit', { user: req.session.user, error: null });
});

app.get('/perfil/edit/:id', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const userId = parseInt(req.params.id);
  if (userId !== req.session.user.id) return res.status(403).send('Acesso negado.');
  db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
    if (err || results.length === 0) return res.status(404).send('Usuário não encontrado.');
    res.render('user/edit', { user: results[0] });
  });
});

app.post('/perfil/edit', upload.single('foto'), (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const userId = req.session.user.id;
  const { nome, email, senha } = req.body;
  let updateFields = { nome, email };

  db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
    if (err || results.length === 0) return res.render('user/edit', { user: req.session.user, error: 'Erro ao atualizar perfil.' });
    const oldFoto = results[0].foto;
    if (senha) updateFields.senha = bcrypt.hashSync(senha, 10);
    if (req.file) updateFields.foto = req.file.filename;

    db.query('UPDATE users SET ? WHERE id = ?', [updateFields, userId], (err2) => {
      if (err2) return res.render('user/edit', { user: req.session.user, error: 'Erro ao atualizar perfil.' });
      if (req.file && oldFoto) {
        const oldFotoPath = path.join(__dirname, 'public', 'uploads', oldFoto);
        fs.unlink(oldFotoPath, (err3) => { if (err3) console.warn('Erro ao excluir foto antiga:', err3); });
      }
      db.query('SELECT * FROM users WHERE id = ?', [userId], (err4, results2) => {
        if (!err4 && results2.length > 0) req.session.user = results2[0];
        res.redirect(`/perfil/${userId}`);
      });
    });
  });
});

app.get('/user/delete/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  if (!req.session.user || req.session.user.id !== userId) return res.status(403).send('Acesso negado.');

  db.query('SELECT foto FROM users WHERE id = ?', [userId], (err, userResults) => {
    if (err || userResults.length === 0) return res.status(404).send('Usuário não encontrado.');
    const userFoto = userResults[0].foto;
    db.query('SELECT imagem FROM posts WHERE id_user = ?', [userId], (err2, postResults) => {
      if (err2) return res.status(500).send('Erro ao buscar posts do usuário.');
      db.query('DELETE FROM posts WHERE id_user = ?', [userId], (err3) => {
        if (err3) return res.status(500).send('Erro ao deletar posts do usuário.');
        db.query('DELETE FROM users WHERE id = ?', [userId], (err4) => {
          if (err4) return res.status(500).send('Erro ao deletar usuário.');
          if (userFoto) {
            const fotoPath = path.join(__dirname, 'public', 'uploads', userFoto);
            fs.unlink(fotoPath, (err5) => { if (err5) console.warn('Erro ao excluir foto do usuário:', err5); });
          }
          postResults.forEach(post => {
            if (post.imagem) {
              const imgPath = path.join(__dirname, 'public', 'uploads', post.imagem);
              fs.unlink(imgPath, (err6) => { if (err6) console.warn('Erro ao excluir imagem do post:', err6); });
            }
          });
          req.session.destroy();
          res.redirect('/login');
        });
      });
    });
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// POSTS
app.get('/post/new', (req, res) => {
  res.render('post/new-post');
});

app.post('/post/new', upload.single('imagem'), (req, res) => {
  const { titulo, conteudo } = req.body;
  const imagem = req.file ? req.file.filename : null;
  const id_user = req.session.user.id;

  db.query('INSERT INTO posts (titulo, conteudo, imagem, id_user) VALUES (?, ?, ?, ?)',
    [titulo, conteudo, imagem, id_user],
    (err) => {
      if (err) throw err;
      res.redirect('/posts');
    }
  );
});

app.get('/posts', (_, res) => {
  const sql = `
    SELECT posts.*, users.nome, users.foto AS foto_autor
    FROM posts
    JOIN users ON posts.id_user = users.id
    ORDER BY posts.id DESC
  `;
  db.query(sql, (err, posts) => {
    if (err) throw err;
    res.render('post/posts', { posts });
  });
});

app.get('/post/edit/:id', (req, res) => {
  const postId = req.params.id;
  const userId = req.session.user.id;
  db.query('SELECT * FROM posts WHERE id = ? AND id_user = ?', [postId, userId], (err, results) => {
    if (err) throw err;
    if (results.length === 0) return res.send('Não autorizado!');
    res.render('post/edit-post', { post: results[0] });
  });
});

app.post('/post/edit', upload.single('image'), (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const { id, title, content } = req.body;
  const imagem = req.file ? req.file.filename : null;
  if (!id) return res.status(400).send('ID do post não enviado.');

  db.query('SELECT imagem FROM posts WHERE id = ? AND id_user = ?', [id, req.session.user.id], (err, results) => {
    if (err || results.length === 0) {
      return res.render('post/edit-post', {
        error: 'Erro ao atualizar post ou permissão negada.',
        post: { id, titulo: title, conteudo: content, imagem: req.file?.filename || null }
      });
    }

    const oldImage = results[0].imagem;
    let query = 'UPDATE posts SET titulo = ?, conteudo = ?';
    const params = [title, content];
    if (imagem) {
      query += ', imagem = ?';
      params.push(imagem);
    }
    query += ' WHERE id = ? AND id_user = ?';
    params.push(id, req.session.user.id);

    db.query(query, params, (err2, result) => {
      if (err2 || result.affectedRows === 0) {
        return res.render('post/edit-post', {
          error: 'Erro ao atualizar post ou permissão negada.',
          post: { id, titulo: title, conteudo: content, imagem: req.file?.filename || null }
        });
      }

      if (imagem && oldImage) {
        const oldImagePath = path.join(__dirname, 'public', 'uploads', oldImage);
        fs.unlink(oldImagePath, (err3) => {
          if (err3) console.warn('Erro ao excluir imagem antiga do post:', err3);
        });
      }

      res.redirect('/posts');
    });
  });
});

app.get('/post/delete/:id', (req, res) => {
  const postId = req.params.id;
  const userId = req.session.user.id;
  db.query('SELECT imagem FROM posts WHERE id = ? AND id_user = ?', [postId, userId], (err, results) => {
    if (err || results.length === 0) return res.redirect('/posts');
    const imagem = results[0].imagem;
    db.query('DELETE FROM posts WHERE id = ? AND id_user = ?', [postId, userId], (err2) => {
      if (err2) return res.redirect('/posts');
      if (imagem) {
        const imagePath = path.join(__dirname, 'public', 'uploads', imagem);
        fs.unlink(imagePath, (err3) => {
          if (err3) console.warn('Erro ao excluir a imagem do post:', err3);
        });
      }
      res.redirect('/posts');
    });
  });
});

//----------------------------------------------------------------

app.listen(3006, () => console.log('Servidor rodando em http://localhost:3006'));

module.exports = app;
