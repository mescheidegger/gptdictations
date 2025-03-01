// app.js
const express = require('express');
const path = require('path');
const routes = require('./routes');
const app = express();

app.use(express.json());
// Parse plain text bodies when Content-Type is "application/sdp" (for the /audio endpoint)
app.use(express.text({ type: 'application/sdp' }));

app.set('trust proxy', 1);
app.use('/api', routes);

const port = process.env.PORT || 5000;

// Production configurations
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the 'build' folder in production
  app.use(express.static(path.join(__dirname, 'client/build'), {
    // Caching policy can go here
  }));
  // Serve index.html as a catch-all route
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
