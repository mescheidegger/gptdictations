// routes.js
const express = require('express');
const { getSession, audioToText, postTranscripts } = require('./controllers');
const router = express.Router();

// Route for obtaining an ephemeral key
router.get('/session', getSession);
// Route for handling the audio-to-text SDP offer
router.post('/audio', audioToText);
// Route for receiving final transcripts
router.post('/transcripts', postTranscripts);


module.exports = router;