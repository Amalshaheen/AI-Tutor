
import React from 'react';
import type { Message } from '../types';

interface TranscriptDisplayProps {
  transcript: Message[];
}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ transcript }) => {
  return (
    <div className="w-full max-w-4xl mt-4 p-4 space-y-4 overflow-y-auto bg-white/60 rounded-lg shadow-md h-64">
      {transcript.length === 0 && (
        <p className="text-center text-gray-500">Conversation history will appear here.</p>
      )}
      {transcript.map((msg, index) => (
        <div
          key={index}
          className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
        >
          <div
            className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl ${
              msg.role === 'user'
                ? 'bg-blue-500 text-white rounded-br-none'
                : 'bg-gray-200 text-gray-800 rounded-bl-none'
            }`}
          >
            <span className="font-bold capitalize">{msg.role === 'model' ? 'Sparky' : 'You'}: </span>
            <span>{msg.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TranscriptDisplay;
