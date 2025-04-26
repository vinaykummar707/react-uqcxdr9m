const express = require('express');
const textToLedMatrix = require('./api/textToLedMatrix');

const app = express();
const port = process.env.PORT || 3080;

app.use(express.json());

// API routes
app.use('/api/led-matrix', textToLedMatrix);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});