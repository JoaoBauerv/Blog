const express = require('express');
const path = require('path');

const app = express();



app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (_, res) => res.render('index'));


//app.listen(3006, () => console.log('Servidor rodando em http://localhost:3006'));

module.exports = app;
