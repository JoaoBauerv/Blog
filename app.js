const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();



app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));



// Rotas
app.get('/', (req, res) => res.render('index'));
app.get('/posts', (req, res) => res.render('posts'));


//app.listen(3006, () => console.log('Servidor rodando em http://localhost:3006'));

module.exports = app;
