## Third-Party Dependencies
This project uses third-party libraries and external APIs (e.g., OpenAI). Their respective licenses and terms of service apply. This project is licensed under MIT, but usage of third-party services must comply with their own terms.


This project is a proof of concept for a Speech to Text synthesizer leveraging the new openAI Realtime API for audio capture.

User workflow:

1. User clicks "Start Capture".
2. Audio is transcribed using the OpenAI Realtime API AND Whisper-1 asynchronously
3. User clicks "Stop Capture"
4. Both transcripts are sent to a GPT4o call to generate a Synthesized Transcript - the model instructions are to compare both transcripts and deduce the likely hood of what is the most accurate version.

To set up the project:

1. npm init
2. Create a .env file in root directory with OPENAI_API_KEY
3. npm run startdev

Prod Deployment:

1. Scripts in package.json are staged to be deployed via Digital Oceans App Platform

Implementation Notes:

1. When prompting the Realtime API with instructions to transcribe, it will ALWAYS respond to the user (current as of preview mode) with a "Got it." type response. The front end is set up to discard this response and make the user wait before speaking so this text is not part of the transcript.

2. In services.js -> createEphemeralToken the turn_detection settings can be used to alter the sensitivity settings for speech capturing, minimum duration of noise which is considered "speech", and length of silence before the model ends a "turn" and responds with text.

3. In services.js -> synthesizeTranscript the reasoning model is not set up to be domain specific. You can create your own "domain expert" AI assistant for analyzing the transcripts. The function is set up to generate a "confidence score" for how reliable it thinks the transcript is.

4. rateLimit.js is not used in this proof of concept but can be passed into routes for a production deployment

Technical Workflow High Level:

1. The client-side requests an "EphemeralKey" - fancy way of saying temporary token on client side for making a request to openAI.

2. The client side attempts to issue a P2p connection with openAI - when using openAI's API's they handle the failure scenarios if a P2P connection cannot be established, switch over to a "TURN" server (google it).

3. A data channel is created for messages.

4. The browser requests access to the user's microphone and the audio stream is added to the WebRTC connection.

5. The client creates and sends an SDP Offer to the backend.

6. OpenAI responds with an SDP Answer completing the handshake and enabling the audio transmission (the backend handles forwarding the SDP offer and completing the handshake).

7. The ephemeral key will expire after 1 minute (hardcoded by openAI), but the data channel will remain open and the speech capture will not be interrupted.