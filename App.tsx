
import React, { useState, useRef, useCallback } from 'react';
import type { Session } from '@google/genai';
import { connectToGemini, disconnectFromGemini } from './services/geminiService';
import { Status, type Message } from './types';
import RobotAvatar from './components/RobotAvatar';
import Controls from './components/Controls';
import TranscriptDisplay from './components/TranscriptDisplay';

const App: React.FC = () => {
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [language, setLanguage] = useState<'en-US' | 'ml-IN'>('en-US');
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [currentUserText, setCurrentUserText] = useState('');
  const [currentModelText, setCurrentModelText] = useState('');

  const sessionRef = useRef<Session | null>(null);
  const userTextRef = useRef('');
  const modelTextRef = useRef('');

  const handleStatusUpdate = useCallback((newStatus: Status) => {
    setStatus(newStatus);
  }, []);

  const handleTranscription = useCallback((text: string, isFinal: boolean, isUserInput: boolean) => {
    if (isUserInput) {
      userTextRef.current += text;
      setCurrentUserText(userTextRef.current);
    } else {
      modelTextRef.current += text;
      setCurrentModelText(modelTextRef.current);
    }
  }, []);

  const handleTurnComplete = useCallback(() => {
    const userMessage: Message = { role: 'user', text: userTextRef.current };
    const modelMessage: Message = { role: 'model', text: modelTextRef.current };

    if (userTextRef.current.trim() || modelTextRef.current.trim()) {
        setTranscript(prev => [...prev, userMessage, modelMessage]);
    }
    
    userTextRef.current = '';
    modelTextRef.current = '';
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

  return (
    <div className="relative flex flex-col items-center justify-between min-h-screen bg-sky-100 text-gray-800 font-sans p-4 md:p-8">
      <div className="absolute top-4 right-4 z-10">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'en-US' | 'ml-IN')}
          className="bg-white/80 rounded-md p-2 shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500"
          disabled={status !== Status.IDLE && status !== Status.ERROR}
          aria-label="Select language"
        >
          <option value="en-US">English</option>
          <option value="ml-IN">മലയാളം (Malayalam)</option>
        </select>
      </div>

      <header className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-sky-700">Sparky</h1>
        <p className="text-lg md:text-xl text-sky-600">Your Friendly AI Learning Buddy</p>
      </header>
      
      <main className="flex flex-col items-center justify-center flex-grow w-full max-w-4xl my-8">
        <RobotAvatar status={status} />
        <div className="h-20 mt-6 w-full text-center p-2 rounded-lg bg-white/50 shadow-inner min-h-[5rem]">
           <p className="text-gray-500 italic">
            {status === Status.LISTENING && (currentUserText ? `You: "${currentUserText}"` : "Listening...")}
            {status === Status.SPEAKING && (currentModelText ? `Sparky: "${currentModelText}"` : "Thinking...")}
            {status === Status.IDLE && "Click 'Start Talking' to ask Sparky a question!"}
            {status === Status.CONNECTING && "Getting ready..."}
            {status === Status.ERROR && "Oops! Something went wrong. Please try again."}
          </p>
        </div>
        <TranscriptDisplay transcript={transcript} />
      </main>

      <footer className="w-full flex justify-center">
        <Controls status={status} onToggleConnection={handleToggleConnection} />
      </footer>
    </div>
  );
};

export default App;