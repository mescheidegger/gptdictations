import React, { useState, useRef } from 'react';
import { Card, Container, Button, Spinner, Alert } from 'react-bootstrap';

// Import your new API helpers
import {
  getEphemeralKey,
  postSdpOffer,
  postTranscripts,
} from './api';

function Dictate() {
  // React state & refs
  const [transcript, setTranscript] = useState('');
  const [whisperTranscript, setWhisperTranscript] = useState('');
  const [synthesizedTranscript, setSynthesizedTranscript] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);

  // ** New: track waiting for forced greeting to be discarded **
  const [waitingForGreeting, setWaitingForGreeting] = useState(false);

  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const dataChannelRef = useRef(null);

  // ----------------
  // Stop the capture
  // ----------------
  async function stopCapture() {
    // Stop all tracks in the microphone stream (if any)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Close the RTCPeerConnection (if any)
    if (pcRef.current) {
      pcRef.current.close();
    }

    // Clear out references
    streamRef.current = null;
    pcRef.current = null;
    dataChannelRef.current = null;

    // Post the transcripts to your server
    try {
      setSynthesizing(true);
      const transcriptResult = await postTranscripts(transcript, whisperTranscript);
      setSynthesizedTranscript(transcriptResult);
      setSynthesizing(false);
      console.log('Transcripts posted successfully.');
    } catch (err) {
      console.error('Error posting transcripts:', err);
    }

    // Toggle UI state to show "Start Capture" button
    setCapturing(false);

    // Reset waitingForGreeting (in case user restarts later)
    setWaitingForGreeting(false);
  }

  // -------------------------------------------
  // Start capture: main logic for transcription
  // -------------------------------------------
  async function startCapture() {
    let sessionStarted = false;

    // Clear any old transcript
    setTranscript('');
    setWhisperTranscript('');
    setSynthesizedTranscript('');
    // ** Indicate we are waiting for that forced greeting to complete **
    setWaitingForGreeting(true);

    try {
      // 1) Retrieve ephemeral key
      const ephemeralKey = await getEphemeralKey();

      // 2) Create a new RTCPeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 3) Create a DataChannel named "oai-events"
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      // We'll accumulate partial transcripts here
      let partialTranscript = '';
      let partialWhisperTranscript = '';

      // Helper function
      function stripQuotes(raw) {
        return raw.replace(/^["']|["']$/g, '').replace(/\n/g, ' ');
      }

      // We’ll discard the first "response.done" if it’s a greeting
      let discardFirstResponse = true;

      

      // 3a) DataChannel open event
      dc.onopen = () => {
        console.log('Data channel open! Sending instructions...');

        // (a) "session.update": request text only
        dc.send(
          JSON.stringify({
            type: 'session.update',
            session: { modalities: ['text'] },
          })
        );

        // (b) "conversation.item.create" as system message
        dc.send(
          JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text:
                    'You are a transcription assistant. ' +
                    'ONLY transcribe user speech exactly as spoken. ' +
                    'No greetings, no commentary, no extra text. Do not respond with anything other than transcribed text.',
                },
              ],
            },
          })
        );

        // (c) "response.create": request text output
        dc.send(
          JSON.stringify({
            type: 'response.create',
            response: { modalities: ['text'] },
          })
        );
      };

      // 3b) DataChannel message event
      dc.onmessage = (evt) => {
        //console.log('Raw DC message:', evt.data);

        let msg;
        try {
          msg = JSON.parse(evt.data);
        } catch (err) {
          console.error('Error parsing data channel message:', err);
          return;
        }
        //console.log('Parsed DC message:', msg);

        // ----------------------------------------------------------------
        // Discard the first forced "response.done"
        // Once we do, we can set waitingForGreeting = false
        // ----------------------------------------------------------------
        if (discardFirstResponse && msg.type === 'response.text.done') {
          console.log('Discarding first forced response from model...');
          console.log('Parsed DC message:', msg);
          discardFirstResponse = false;
          setWaitingForGreeting(false); // **Now user can speak**
          return;
        }

        // Handle partial/final transcripts
        switch (msg.type) {         

          // Final text via "response.text.done"
          case 'response.text.done': {
            console.log('Transcription complete (final, text.done).');
            console.log('Parsed DC message - response text done:', msg);
            
            if (msg.text) {  // Directly accessing "text" property
              partialTranscript += stripQuotes(msg.text) + ' ';
              setTranscript(partialTranscript);
              console.log('Updated transcript:', partialTranscript);
            }

            break;
          }


          // Whisper transcript
          case 'conversation.item.input_audio_transcription.completed': {
            console.log('Whisper Transcription complete.');
            if (msg.transcript) {
              partialWhisperTranscript += stripQuotes(msg.transcript) + ' ';
              setWhisperTranscript(partialWhisperTranscript.trim());
            } else {
              console.warn('No transcript found in message:', msg);
            }
            break;
          }

          default:
            console.log('Ignored event type:', msg.type);
            console.log('Parsed DC message:', msg);
            break;
        }
      };

      // 4) If TTS were enabled, you'd receive remote audio tracks here
      pc.ontrack = (event) => {
        console.log('Received remote track:', event.streams[0]);
      };

      // 5) Capture microphone audio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });
      streamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 6) Create local SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 7) Send the SDP offer to your backend (using the helper)
      const answerData = await postSdpOffer(ephemeralKey, offer.sdp);

      // 8) Set the remote description
      await pc.setRemoteDescription(answerData);
      console.log(answerData);

      sessionStarted = true;
      setCapturing(true);
    } catch (error) {
      console.error('Error in startCapture:', error);
    } finally {
      if (!sessionStarted) {
        stopCapture();
      }
    }
  }

  // ---------------------------------
  // UI
  // ---------------------------------
  return (
    <Container>
      <Card className="custom-card mt-3">
        <Card.Header as="h5">Dictate
          <br></br>
          {!capturing ? (
              <Button className="button-normal mt-3" onClick={startCapture}>
                Start Capture
              </Button>
            ) : (
              <Button variant="danger" onClick={stopCapture}>
                Stop Capture
              </Button>
            )}
        </Card.Header>
        <Card.Body>
          {/** 
           * If capturing is true AND we’re still waiting for greeting to be discarded, 
           * show a Spinner and a warning message. 
           */}
          {waitingForGreeting && (
            <div>
              <Spinner animation="border" role="status">
                
              </Spinner>
              <Alert variant="warning" className="mt-3">
                Please wait — do not speak yet. The system is preparing for your input.
              </Alert>
            </div>
          )}

          {/** Once greeting is discarded, user can speak freely */}
          {capturing && !waitingForGreeting && (
            <Alert variant="success" className="mt-3">
              Ready! You can speak now.
            </Alert>
          )}

          <div style={{ marginTop: '1rem' }}>
            <h5>4o Transcript </h5>
            <Card.Text>This is what the 4o model understood you said:</Card.Text>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{transcript}</pre>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <h5>Whisper Transcript</h5>
            <Card.Text>This is what the Whisper model heard you say:</Card.Text>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{whisperTranscript}</pre>
          </div>                 
          <div style={{ marginTop: '1rem' }}>
            <h5>Synthesized Transcript</h5>
            <Card.Text>This is a synthesized transcript from 4o, using both transcripts above - what it beleives is the correct transcription:</Card.Text>
            {synthesizing && (
            <div>
              <Spinner animation="border" role="status">
                
              </Spinner>
              <Alert variant="warning" className="mt-3">
                Compiling a synthesized transcript.
              </Alert>
            </div>
            )}
            <pre style={{ whiteSpace: 'pre-wrap' }}>{synthesizedTranscript.synthesizedTranscript}</pre>
          </div>     
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Dictate;
