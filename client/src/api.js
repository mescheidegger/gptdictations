// api.js
export async function getEphemeralKey() {
    const tokenResponse = await fetch('/api/session');
    if (!tokenResponse.ok) {
      throw new Error('Failed to retrieve ephemeral token.');
    }
    const tokenData = await tokenResponse.json();
  
    // The ephemeral token is typically in client_secret.value or client_secret
    const ephemeralKey =
      tokenData?.client_secret?.value || tokenData?.client_secret;
    if (!ephemeralKey) {
      throw new Error('No ephemeral key found in /api/session response.');
    }
  
    return ephemeralKey;
  }
  
  export async function postSdpOffer(ephemeralKey, offerSdp) {
    const sdpResponse = await fetch('/api/audio', {
      method: 'POST',
      body: offerSdp,
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        'Content-Type': 'application/sdp',
      },
    });
    if (!sdpResponse.ok) {
      const errorText = await sdpResponse.text();
      throw new Error('Error starting transcription: ' + errorText);
    }
  
    const answerData = await sdpResponse.json();
    return answerData;
  }
  
  /**
   * Post both transcripts (or just one) to your server.
   * Adjust the route /api/transcripts (or separate routes) to match your backend.
   */
  export async function postTranscripts(transcript, whisperTranscript) {
    const response = await fetch('/api/transcripts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript, whisperTranscript }),
    });
  
    if (!response.ok) {
      throw new Error('Failed to post transcripts');
    }
  
    return await response.json();
  }