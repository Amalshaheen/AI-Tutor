import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import type { Session } from '@google/genai';
import { Status } from '../types';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';

interface ConnectOptions {
  onStatusUpdate: (status: Status) => void;
  onTranscription: (text: string, isFinal: boolean, isUserInput: boolean) => void;
  onTurnComplete: () => void;
  language: 'en-IN' | 'ml-IN';
}

let inputAudioContext: AudioContext;
let outputAudioContext: AudioContext;
let scriptProcessor: ScriptProcessorNode;
let mediaStreamSource: MediaStreamAudioSourceNode;
let outputGainNode: GainNode;
let sources = new Set<AudioBufferSourceNode>();
let nextStartTime = 0;

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const systemInstructions = {
    'en-IN': 'You are a friendly, patient, and encouraging robot friend named Sparky. You are talking to a child in early elementary school. Your goal is to answer their questions in a simple, fun, and educational way. Use short sentences, ask questions back to encourage curiosity, and always be positive. Never use complex words without explaining them.',
    'ml-IN': 'നിങ്ങൾ സ്പാർക്കി എന്ന് പേരുള്ള സൗഹൃദപരവും ക്ഷമയും പ്രോത്സാഹനവും നൽകുന്ന ഒരു റോബോട്ട് സുഹൃത്താണ്. നിങ്ങൾ ഒരു പ്രൈമറി സ്കൂൾ കുട്ടിയോടാണ് സംസാരിക്കുന്നത്. അവരുടെ ചോദ്യങ്ങൾക്ക് ലളിതവും രസകരവും വിജ്ഞാനപ്രദവുമായ രീതിയിൽ ഉത്തരം നൽകുക എന്നതാണ് നിങ്ങളുടെ ലക്ഷ്യം. ചെറിയ വാക്യങ്ങൾ ഉപയോഗിക്കുക, ജിജ്ഞാസ വളർത്താൻ ചോദ്യങ്ങൾ തിരികെ ചോദിക്കുക, എപ്പോഴും പോസിറ്റീവായിരിക്കുക. വിശദീകരിക്കാതെ സങ്കീർണ്ണമായ വാക്കുകൾ ഒരിക്കലും ഉപയോഗിക്കരുത്.'
};

export const connectToGemini = async (options: ConnectOptions): Promise<Session> => {
  const { onStatusUpdate, onTranscription, onTurnComplete, language } = options;

  inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  outputGainNode = outputAudioContext.createGain();
  outputGainNode.connect(outputAudioContext.destination);

  let isFirstModelChunk = true;

  const speechConfig: {
      languageCode: string;
      voiceConfig?: { prebuiltVoiceConfig: { voiceName: string } };
  } = {
      languageCode: language,
  };

  if (language === 'en-IN') {
      speechConfig.voiceConfig = { prebuiltVoiceConfig: { voiceName: 'Zephyr' } };
  }

  const sessionPromise: Promise<Session> = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: () => {
        onStatusUpdate(Status.LISTENING);
        startMicrophone(sessionPromise);
      },
      onmessage: async (message: LiveServerMessage) => {
        if (message.serverContent?.inputTranscription) {
          // FIX: The `Transcription` object does not have an `isFinal` property.
          const { text } = message.serverContent.inputTranscription;
          onTranscription(text, false, true);
        }
        if (message.serverContent?.outputTranscription) {
           // FIX: The `Transcription` object does not have an `isFinal` property.
           const { text } = message.serverContent.outputTranscription;
           if (isFirstModelChunk) {
               onStatusUpdate(Status.SPEAKING);
               isFirstModelChunk = false;
           }
           onTranscription(text, false, false);
        }
        if (message.serverContent?.turnComplete) {
            onTurnComplete();
            isFirstModelChunk = true;
            onStatusUpdate(Status.LISTENING);
        }

        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
        if (base64Audio) {
           if (isFirstModelChunk) {
               onStatusUpdate(Status.SPEAKING);
               isFirstModelChunk = false;
           }
          playAudio(base64Audio);
        }
      },
      onerror: async (e: ErrorEvent) => {
        console.error('Gemini session error:', e);
        onStatusUpdate(Status.ERROR);
        disconnectFromGemini(await sessionPromise);
      },
      onclose: (e: CloseEvent) => {
        console.log('Gemini session closed.');
        stopMicrophone();
      },
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: speechConfig,
      systemInstruction: systemInstructions[language],
      inputAudioTranscription: { languageCode: language },
      outputAudioTranscription: { languageCode: language },
    },
  });

  return sessionPromise;
};

const startMicrophone = async (sessionPromise: Promise<Session>) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamSource = inputAudioContext.createMediaStreamSource(stream);
    scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
      const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
      const l = inputData.length;
      const int16 = new Int16Array(l);
      for (let i = 0; i < l; i++) {
        int16[i] = inputData[i] * 32768;
      }
      const pcmBlob = {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
      };
      
      sessionPromise.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    mediaStreamSource.connect(scriptProcessor);
    scriptProcessor.connect(inputAudioContext.destination);
  } catch (error) {
    console.error("Microphone access denied:", error);
  }
};

const stopMicrophone = () => {
    if (mediaStreamSource) {
        mediaStreamSource.mediaStream.getTracks().forEach(track => track.stop());
        mediaStreamSource.disconnect();
    }
    if (scriptProcessor) {
        scriptProcessor.disconnect();
    }
    if (inputAudioContext && inputAudioContext.state !== 'closed') {
        inputAudioContext.close();
    }
};


const playAudio = async (base64Audio: string) => {
  nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
  const audioBuffer = await decodeAudioData(
    decode(base64Audio),
    outputAudioContext,
    24000,
    1,
  );
  const source = outputAudioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(outputGainNode);
  source.addEventListener('ended', () => {
    sources.delete(source);
  });

  source.start(nextStartTime);
  nextStartTime += audioBuffer.duration;
  sources.add(source);
};


export const disconnectFromGemini = (session: Session) => {
  session.close();
  stopMicrophone();
  if (outputAudioContext && outputAudioContext.state !== 'closed') {
      outputAudioContext.close();
  }
  sources.forEach(source => source.stop());
  sources.clear();
  nextStartTime = 0;
};