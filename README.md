This project is a proof of concept for a Speech to Text synthesizer leveraging the new openAI Realtime API for audio capture.

User workflow:

1. User clicks "Start Capture".
2. Audio is transcribed using the OpenAI Realtime API AND Whisper-1 asyncrhonously
3. User clicks "Stop Capture"
4. Both transcripts are sent to a GPT4o call to generate a Synthesized Transcript - the model instructions are to compare both transcripts and deduce the likely hood of what is the most accurate version.

To set up the project:

1. npm init
2. Create a .env file in root directory with OPENAI_API_KEY
3. npm run startdev

Note:

1. Scripts in package.json are staged to be deployed via Digital Oceans App Platform