const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const DB_FILE = path.join(__dirname, 'data', 'reservas.db');
const db = new sqlite3.Database(DB_FILE);

// Inicializa banco de dados
function initDb() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT,
      email TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS mesas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      capacidade INTEGER NOT NULL,
      localizacao TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      mesa_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      hora TEXT NOT NULL,
      FOREIGN KEY(cliente_id) REFERENCES clientes(id),
      FOREIGN KEY(mesa_id) REFERENCES mesas(id)
    )`);
  });
}

initDb();

function handleError(res, err) {
  res.status(500).json({ error: err.message });
}

function validateEmail(email) {
  return /.+@.+\..+/.test(email);
}

function validateFuture(dateStr, timeStr) {
  const now = new Date();
  const dt = new Date(`${dateStr}T${timeStr}`);
  return dt > now;
}

// Clientes
app.get('/clientes', (req, res) => {
  db.all('SELECT * FROM clientes', (err, rows) => {
    if (err) return handleError(res, err);
    res.json(rows);
  });
});

app.post('/clientes', (req, res) => {
  const { nome, telefone, email } = req.body;
  if (!nome || (email && !validateEmail(email))) {
    return res.status(400).json({ error: 'Dados de cliente inválidos' });
  }
  const stmt = db.prepare('INSERT INTO clientes (nome, telefone, email) VALUES (?, ?, ?)');
  stmt.run(nome, telefone || '', email || '', function (err) {
    if (err) return handleError(res, err);
    res.status(201).json({ id: this.lastID, nome, telefone, email });
  });
});

app.put('/clientes/:id', (req, res) => {
  const { nome, telefone, email } = req.body;
  if (!nome || (email && !validateEmail(email))) {
    return res.status(400).json({ error: 'Dados de cliente inválidos' });
  }
  const stmt = db.prepare('UPDATE clientes SET nome=?, telefone=?, email=? WHERE id=?');
  stmt.run(nome, telefone || '', email || '', req.params.id, function (err) {
    if (err) return handleError(res, err);
    res.json({ id: req.params.id, nome, telefone, email });
  });
});

app.delete('/clientes/:id', (req, res) => {
  db.run('DELETE FROM clientes WHERE id=?', req.params.id, function (err) {
    if (err) return handleError(res, err);
    res.json({ success: true });
  });
});

// Mesas
app.get('/mesas', (req, res) => {
  db.all('SELECT * FROM mesas', (err, rows) => {
    if (err) return handleError(res, err);
    res.json(rows);
  });
});

app.post('/mesas', (req, res) => {
  const { capacidade, localizacao } = req.body;
  if (typeof capacidade !== 'number') {
    return res.status(400).json({ error: 'Capacidade inválida' });
  }
  const stmt = db.prepare('INSERT INTO mesas (capacidade, localizacao) VALUES (?, ?)');
  stmt.run(capacidade, localizacao || '', function (err) {
    if (err) return handleError(res, err);
    res.status(201).json({ id: this.lastID, capacidade, localizacao });
  });
});

app.put('/mesas/:id', (req, res) => {
  const { capacidade, localizacao } = req.body;
  if (typeof capacidade !== 'number') {
    return res.status(400).json({ error: 'Capacidade inválida' });
  }
  const stmt = db.prepare('UPDATE mesas SET capacidade=?, localizacao=? WHERE id=?');
  stmt.run(capacidade, localizacao || '', req.params.id, function (err) {
    if (err) return handleError(res, err);
    res.json({ id: req.params.id, capacidade, localizacao });
  });
});

app.delete('/mesas/:id', (req, res) => {
  db.run('DELETE FROM mesas WHERE id=?', req.params.id, function (err) {
    if (err) return handleError(res, err);
    res.json({ success: true });
  });
});

function mesaOcupada(mesaId, data, hora, cb) {
  const sql = 'SELECT COUNT(*) AS total FROM reservas WHERE mesa_id=? AND data=? AND hora=?';
  db.get(sql, [mesaId, data, hora], (err, row) => {
    if (err) return cb(err);
    cb(null, row.total > 0);
  });
}

// Reservas
app.get('/reservas', (req, res) => {
  const sql = `SELECT r.id, c.nome AS cliente, m.id AS mesa, r.data, r.hora
               FROM reservas r
               JOIN clientes c ON r.cliente_id=c.id
               JOIN mesas m ON r.mesa_id=m.id
               ORDER BY r.data, r.hora`;
  db.all(sql, (err, rows) => {
    if (err) return handleError(res, err);
    res.json(rows);
  });
});

app.post('/reservas', (req, res) => {
  const { cliente_id, mesa_id, data, hora } = req.body;
  if (!cliente_id || !mesa_id || !data || !hora || !validateFuture(data, hora)) {
    return res.status(400).json({ error: 'Dados de reserva inválidos' });
  }
  mesaOcupada(mesa_id, data, hora, (err, ocupada) => {
    if (err) return handleError(res, err);
    if (ocupada) {
      return res.status(409).json({ error: 'Mesa já está reservada para esse horário' });
    }
    const stmt = db.prepare('INSERT INTO reservas (cliente_id, mesa_id, data, hora) VALUES (?, ?, ?, ?)');
    stmt.run(cliente_id, mesa_id, data, hora, function (err) {
      if (err) return handleError(res, err);
      res.status(201).json({ id: this.lastID, cliente_id, mesa_id, data, hora });
    });
  });
});

app.put('/reservas/:id', (req, res) => {
  const { cliente_id, mesa_id, data, hora } = req.body;
  if (!cliente_id || !mesa_id || !data || !hora || !validateFuture(data, hora)) {
    return res.status(400).json({ error: 'Dados de reserva inválidos' });
  }
  mesaOcupada(mesa_id, data, hora, (err, ocupada) => {
    if (err) return handleError(res, err);
    if (ocupada) {
      return res.status(409).json({ error: 'Mesa já está reservada para esse horário' });
    }
    const stmt = db.prepare("UPDATE reservas SET cliente_id=?, mesa_id=?, data=?, hora=? WHERE id=?");
    stmt.run(cliente_id, mesa_id, data, hora, req.params.id, function (err) {
      if (err) return handleError(res, err);
      res.json({ id: req.params.id, cliente_id, mesa_id, data, hora });
    });
  });
});

app.delete('/reservas/:id', (req, res) => {
  db.run('DELETE FROM reservas WHERE id=?', req.params.id, function (err) {
    if (err) return handleError(res, err);
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
