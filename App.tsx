import React, { useState, useRef, useCallback } from 'react';
import type { Session } from '@google/genai';
import { connectToGemini, disconnectFromGemini } from './services/geminiService';
import { Status, type Message } from './types';
import RobotAvatar from './components/RobotAvatar';
import Controls from './components/Controls';
import TranscriptDisplay from './components/TranscriptDisplay';

const uiStrings = {
  'en-IN': {
    title: 'Sparky',
    subtitle: 'Your Friendly AI Learning Buddy',
    selectLanguage: 'Select language',
    langName: 'English (India)',
    malayalamName: 'മലയാളം (Malayalam)',
    statusListening: 'Listening...',
    statusThinking: 'Thinking...',
    statusIdle: "Click 'Start Talking' to ask Sparky a question!",
    statusConnecting: 'Getting ready...',
    statusError: 'Oops! Something went wrong. Please try again.',
    you: 'You',
    sparky: 'Sparky',
    startTalking: 'Start Talking',
    stopTalking: 'Stop Talking',
    connecting: 'Connecting...',
    transcriptPlaceholder: 'Conversation history will appear here.',
  },
  'ml-IN': {
    title: 'സ്പാർക്കി',
    subtitle: 'നിങ്ങളുടെ പഠന സഹായി',
    selectLanguage: 'ഭാഷ തിരഞ്ഞെടുക്കുക',
    langName: 'English (India)',
    malayalamName: 'മലയാളം (Malayalam)',
    statusListening: 'കേൾക്കുന്നു...',
    statusThinking: 'ചിന്തിക്കുന്നു...',
    statusIdle: "ചോദ്യം ചോദിക്കാൻ 'സംസാരിച്ചു തുടങ്ങാം' ക്ലിക്ക് ചെയ്യുക!",
    statusConnecting: 'തയ്യാറെടുക്കുന്നു...',
    statusError: 'ക്ഷമിക്കണം! ഒരു പിശക് സംഭവിച്ചു. ദയവായി വീണ്ടും ശ്രമിക്കുക.',
    you: 'നിങ്ങൾ',
    sparky: 'സ്പാർക്കി',
    startTalking: 'സംസാരിച്ചു തുടങ്ങാം',
    stopTalking: 'സംസാരം നിർത്തുക',
    connecting: 'ബന്ധപ്പെടുന്നു...',
    transcriptPlaceholder: 'സംഭാഷണ ചരിത്രം ഇവിടെ ദൃശ്യമാകും.',
  }
};


const App: React.FC = () => {
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [language, setLanguage] = useState<'en-IN' | 'ml-IN'>('en-IN');
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [currentUserText, setCurrentUserText] = useState('');
  const [currentModelText, setCurrentModelText] = useState('');

  const sessionRef = useRef<Session | null>(null);
  const finalUserTextRef = useRef('');
  const finalModelTextRef = useRef('');

  const t = uiStrings[language];

  const handleStatusUpdate = useCallback((newStatus: Status) => {
    setStatus(newStatus);
  }, []);

  const handleTranscription = useCallback((text: string, isFinal: boolean, isUserInput: boolean) => {
    if (isUserInput) {
      // User input transcription is cumulative; it replaces the previous text.
      finalUserTextRef.current = text;
      setCurrentUserText(text);
    } else {
      // Model output transcription is incremental; we append it.
      finalModelTextRef.current += text;
      setCurrentModelText(finalModelTextRef.current);
    }
  }, []);

  const handleTurnComplete = useCallback(() => {
    const userMessage: Message = { role: 'user', text: finalUserTextRef.current };
    const modelMessage: Message = { role: 'model', text: finalModelTextRef.current };

    if (finalUserTextRef.current.trim() || finalModelTextRef.current.trim()) {
        setTranscript(prev => [...prev, userMessage, modelMessage]);
    }
    
    finalUserTextRef.current = '';
    finalModelTextRef.current = '';
    setCurrentUserText('');
    setCurrentModelText('');
  }, []);


  const handleToggleConnection = useCallback(async () => {
    if (status === Status.IDLE || status === Status.ERROR) {
      try {
        setStatus(Status.CONNECTING);
        setTranscript([]);
        const session = await connectToGemini({
          onStatusUpdate: handleStatusUpdate,
          onTranscription: handleTranscription,
          onTurnComplete: handleTurnComplete,
          language: language,
        });
        sessionRef.current = session;
      } catch (error) {
        console.error('Failed to connect:', error);
        setStatus(Status.ERROR);
      }
    } else {
      if (sessionRef.current) {
        disconnectFromGemini(sessionRef.current);
        sessionRef.current = null;
        setStatus(Status.IDLE);
      }
    }
  }, [status, handleStatusUpdate, handleTranscription, handleTurnComplete, language]);

  const getButtonText = () => {
    const isBusy = status === Status.CONNECTING;
    const isConnected = status === Status.LISTENING || status === Status.SPEAKING;
    if (isBusy) return t.connecting;
    if (isConnected) return t.stopTalking;
    return t.startTalking;
  };

  return (
    <div className="relative flex flex-col items-center justify-between min-h-screen bg-sky-100 text-gray-800 font-sans p-4 md:p-8">
      <div className="absolute top-4 right-4 z-10">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'en-IN' | 'ml-IN')}
          className="bg-white/80 rounded-md p-2 shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500"
          disabled={status !== Status.IDLE && status !== Status.ERROR}
          aria-label={t.selectLanguage}
        >
          <option value="en-IN">{t.langName}</option>
          <option value="ml-IN">{t.malayalamName}</option>
        </select>
      </div>

      <header className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-sky-700">{t.title}</h1>
        <p className="text-lg md:text-xl text-sky-600">{t.subtitle}</p>
      </header>
      
      <main className="flex flex-col items-center justify-center flex-grow w-full max-w-4xl my-8">
        <RobotAvatar status={status} />
        <div className="h-20 mt-6 w-full text-center p-2 rounded-lg bg-white/50 shadow-inner min-h-[5rem]">
           <p className="text-gray-500 italic">
            {status === Status.LISTENING && (currentUserText ? `${t.you}: "${currentUserText}"` : t.statusListening)}
            {status === Status.SPEAKING && (currentModelText ? `${t.sparky}: "${currentModelText}"` : t.statusThinking)}
            {status === Status.IDLE && t.statusIdle}
            {status === Status.CONNECTING && t.statusConnecting}
            {status === Status.ERROR && t.statusError}
          </p>
        </div>
        <TranscriptDisplay 
          transcript={transcript} 
          placeHolderText={t.transcriptPlaceholder}
          userLabel={t.you}
          modelLabel={t.sparky}
        />
      </main>

      <footer className="w-full flex justify-center">
        <Controls 
          status={status} 
          onToggleConnection={handleToggleConnection} 
          buttonText={getButtonText()}
        />
      </footer>
    </div>
  );
};

export default App;