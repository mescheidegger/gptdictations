// controllers.js
const { createEphemeralToken, synthesizeTranscript  } = require('./services');
const NodeCache = require('node-cache');
const translationCache = new NodeCache({ stdTTL: 60 * 60 * 24 }); // Cache TTL set to 24 hours
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function postTranscripts(req, res) {
  try {
    // Destructure the JSON body
    const { transcript, whisperTranscript } = req.body;

    console.log('Received transcripts from client:');
    console.log('Transcript:', transcript);
    console.log('Whisper Transcript:', whisperTranscript);

    // Await the function call to get the result
    const result = await synthesizeTranscript(transcript, whisperTranscript);

    // Extract synthesized transcript
    const synthesizedTranscript = result.synthesized_transcript;

    console.log('Synthesized Transcript:', synthesizedTranscript);

    // Return only the synthesized transcript
    return res.json({
      synthesizedTranscript
    });

  } catch (error) {
    console.error('Error in postTranscripts:', error);
    return res.status(500).json({
      error: 'Failed to process transcripts',
      details: error.message,
    });
  }
}


async function getSession(req, res) {
  try {
    const tokenData = await createEphemeralToken();

    // Log entire ephemeral session object on the server
    console.log("Ephemeral session returned to client:", tokenData);

    // Return to the front end
    res.json(tokenData);
  } catch (error) {
    console.error("Error in getSession:", error);
    res.status(500).json({ error: 'Failed to get ephemeral token', details: error.message });
  }
}

// POST /api/audio - forwards SDP offer to OpenAI Realtime endpoint
async function audioToText(req, res) {
  try {
    const sdpOffer = req.body;
    if (!sdpOffer) {
      return res.status(400).json({ error: "Missing SDP offer in request body" });
    }

    const authHeader = req.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({ error: "Missing or invalid Authorization header" });
    }
    const ephemeralToken = authHeader.split(" ")[1];

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";

    const openaiResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: sdpOffer,
      headers: {
        "Authorization": `Bearer ${ephemeralToken}`,
        "Content-Type": "application/sdp"
      }
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      return res.status(openaiResponse.status).json({ error: errorText });
    }

    // The "answer" from OpenAI Realtime (SDP) we return to the client
    const answerSdp = await openaiResponse.text();
    return res.json({
      type: "answer",
      sdp: answerSdp
    });
  } catch (error) {
    console.error("Error in audioToText:", error);
    res.status(500).json({
      error: "Audio-to-text conversion failed",
      details: error.message
    });
  }
}


module.exports = { getSession, audioToText, postTranscripts };
