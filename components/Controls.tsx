import React from 'react';
import { Status } from '../types';

interface ControlsProps {
  status: Status;
  onToggleConnection: () => void;
  buttonText: string;
}

const Controls: React.FC<ControlsProps> = ({ status, onToggleConnection, buttonText }) => {
  const isBusy = status === Status.CONNECTING;
  const isConnected = status === Status.LISTENING || status === Status.SPEAKING;

  const getButtonClasses = () => {
    if (isConnected) return 'bg-red-500 hover:bg-red-600';
    return 'bg-green-500 hover:bg-green-600';
  };

  return (
    <button
      onClick={onToggleConnection}
      disabled={isBusy}
      className={`px-8 py-4 text-white font-bold text-xl rounded-full shadow-lg transform transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-75 ${getButtonClasses()} ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {buttonText}
    </button>
  );
};

export default Controls;