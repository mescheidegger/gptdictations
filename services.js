// services.js
require('dotenv').config();
const axios = require('axios').default;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

async function synthesizeTranscript(transcript, whisperTranscript) {
  try {
    const response = await axios.post(
      OPENAI_URL,
      {
        model: 'gpt-4o',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'You are a transcription accuracy assistant. Your task is to analyze two provided transcriptions of the same spoken audio and generate the most accurate synthesized transcript. The first transcript is based on real-time understanding of spoken words, while the second transcript is a direct output from an automatic speech recognition system (Whisper-1). Identify which parts are more reliable, resolve any inconsistencies, and produce a final, polished version that is as faithful to the original speech as possible.'
          },
          {
            role: 'user',
            content: `Here are the two transcriptions:\n\n**Model Transcription:**\n${transcript}\n\n**Whisper Transcription:**\n${whisperTranscript}\n\nPlease synthesize the most accurate transcript.`
          }
        ],
        functions: [
          {
            name: 'synthesize_transcript',
            description: 'Generate the most accurate transcript by comparing two transcriptions.',
            parameters: {
              type: 'object',
              properties: {
                synthesized_transcript: {
                  type: 'string',
                  description: 'The final, most accurate transcript.'
                },
                confidence_score: {
                  type: 'number',
                  description: 'A confidence score (0-1) for how reliable this final transcript is.'
                }
              },
              required: ['synthesized_transcript', 'confidence_score']
            }
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const functionResponse = response.data.choices[0]?.message?.function_call;
    console.log(functionResponse);

    if (functionResponse && functionResponse.arguments) {
      const result = JSON.parse(functionResponse.arguments);
      return {
        synthesized_transcript: result.synthesized_transcript,
        confidence_score: result.confidence_score
      };
    } else {
      throw new Error('Unexpected API response format.');
    }
  } catch (error) {
    console.error('Error in synthesizeTranscript:', error.response?.data || error.message);
    throw new Error('Failed to generate synthesized transcript');
  }
}

// Create ephemeral token for a Realtime session
async function createEphemeralToken() {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY in environment variables.');
  }

  // Request the session with your preferred parameters
  // These new fields are from the updated Realtime docs
  const body = {
    // The "main" model for text generation
    model: "gpt-4o-realtime-preview-2024-12-17",

    // We want both audio (we are sending mic input) and text
    modalities: ["audio", "text"],

    // Some instructions for the assistant
    instructions: "You are a friendly assistant. Please transcribe exactly.",
    temperature: 0.6,

    // The Realtime docs say default is "pcm16", but let's be explicit
    input_audio_format: "pcm16",

    // Instruct Realtime to use Whisper-1 for internal audio transcription
    input_audio_transcription: {
      model: "whisper-1"
    },
        // Adjust turn detection settings
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5, // Sensitivity for detecting speech (adjust as needed)
      prefix_padding_ms: 200, // Minimum duration of speech before triggering
      silence_duration_ms: 1000 // Adjust this for better handling of pauses
    }
    
  };

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/realtime/sessions',
      body,
      {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("Ephemeral token data:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching ephemeral token:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = { createEphemeralToken, synthesizeTranscript };
