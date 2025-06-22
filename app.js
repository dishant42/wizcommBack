const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const routes = require('./routes');
const path = require('path');

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});