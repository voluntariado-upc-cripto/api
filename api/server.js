const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const jsonServer = require('json-server');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yaml');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid'); // para generar IDs únicos

const app = express();
const jsonServerRouter = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

app.use(cors());
app.use(bodyParser.json());



app.use(middlewares);


//ids:

// Endpoints personalizados:
function simpleHash(password) {
  let hash = 0;
  
  // Iteramos sobre cada carácter de la contraseña
  for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      // Realizamos una operación matemática simple para generar un hash
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convertir a un entero de 32 bits
  }

  // Convertimos el hash a hexadecimal
  return hash.toString(16);
}

// GET accounts
app.get('/api/v1/accounts', (req, res) => {
  const db = jsonServerRouter.db;
  const accounts = db.get('accounts').value();
  res.json(accounts);
});

//POST accounts 1
app.post('/api/v1/accounts/manual_hash', async (req, res) => {
  console.log("Datos recibidos en /api/v1/accounts:", req.body);
  const db = jsonServerRouter.db;
  const { email, pass } = req.body;

  // Verifica si el usuario o el email ya existen
  const existingUser = db.get('accounts').find(account=>account.email===email).value();
  if (existingUser) {
    return res.status(400).json({ error: 'User or email already exists' });
  }


  const newAccount = {
    _id: uuidv4(),
    email,
    pass:simpleHash(pass),
    type:0,
  };

  db.get('accounts').push(newAccount).write();
  res.status(201).json(newAccount);
});

//POST accounts 2
app.post('/api/v1/accounts/bcrypt_hash', async (req, res) => {
  console.log("Datos recibidos en /api/v1/accounts:", req.body);
  const db = jsonServerRouter.db;
  const { email, pass } = req.body;

  // Verifica si el usuario o el email ya existen
  const existingUser = db.get('accounts').find(account=>account.email===email).value();
  if (existingUser) {
    return res.status(400).json({ error: 'User or email already exists' });
  }

  saltRounds=10;
  const newAccount = {
    _id: uuidv4(),
    email,
    pass:await bcrypt.hash(pass, saltRounds),
    type:1,
  };

  db.get('accounts').push(newAccount).write();
  res.status(201).json(newAccount);
});
//login

app.post('/api/v1/accounts/login', (req, res) => {
  console.log("Datos recibidos en /api/v1/login:", req.body);
  const db = jsonServerRouter.db;
  const { email,pass } = req.body; // Verifica que 'pass' coincida con el nombre enviado desde el frontend

  const account = db.get('accounts').find(account =>account.email === email).value();

  if (account) {
    if(account.type===0){
      const hashedPass=simpleHash(pass);
      if(hashedPass===account.pass){
        res.json({ message: 'Login successful', email: account.email, _id: account._id });
      }
      else{
        res.status(401).json({ error: 'Invalid credentials' });
      }
    }
    else if(account.tyoe===1){
      const validPass=bcrypt.compareSync(pass, account.pass);
      if(validPass){
        res.json({ message: 'Login successful', email: account.email, _id: account._id });
      }
      else{
        res.status(401).json({ error: 'Invalid credentials' });
      }
    }
    else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`JSON Server is running on port ${port}`);
});
