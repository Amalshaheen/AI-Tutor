
import React from 'react';
import { Status } from '../types';

interface RobotAvatarProps {
  status: Status;
}

const RobotAvatar: React.FC<RobotAvatarProps> = ({ status }) => {
  const getStatusClasses = () => {
    switch (status) {
      case Status.LISTENING:
        return 'border-blue-500 animate-pulse';
      case Status.SPEAKING:
        return 'border-green-500 animate-pulse';
      case Status.CONNECTING:
        return 'border-yellow-500 animate-spin';
      case Status.ERROR:
        return 'border-red-500';
      default:
        return 'border-sky-300';
    }
  };

  const getEyeExpression = () => {
    switch(status) {
      case Status.LISTENING:
        return <><div className="w-4 h-4 bg-blue-400 rounded-full"></div><div className="w-4 h-4 bg-blue-400 rounded-full"></div></>;
      case Status.SPEAKING:
        return <><div className="w-5 h-5 bg-green-400 rounded-full animate-ping"></div><div className="w-5 h-5 bg-green-400 rounded-full animate-ping animation-delay-300"></div></>;
      case Status.ERROR:
        return <><div className="w-4 h-2 bg-red-500 rounded-full transform rotate-45"></div><div className="w-4 h-2 bg-red-500 rounded-full transform -rotate-45"></div></>;
      default:
        return <><div className="w-4 h-4 bg-sky-700 rounded-full"></div><div className="w-4 h-4 bg-sky-700 rounded-full"></div></>;
    }
  };

  const getMouthExpression = () => {
    switch(status) {
      case Status.LISTENING:
        return <div className="w-10 h-2 bg-blue-400 rounded-full"></div>;
      case Status.SPEAKING:
         return <div className="w-8 h-8 border-4 border-green-400 rounded-full"></div>;
      case Status.ERROR:
        return <div className="w-10 h-5 border-b-4 border-red-500 rounded-b-full"></div>;
      default:
         return <div className="w-12 h-2 bg-sky-700 rounded-full"></div>;
    }
  };

  return (
    <div className={`w-48 h-48 rounded-full bg-white shadow-lg flex items-center justify-center border-8 transition-all duration-300 ${getStatusClasses()}`}>
      <div className="w-40 h-40 rounded-full bg-sky-200 flex flex-col items-center justify-center space-y-4">
        <div className="flex items-center justify-center space-x-6">
          {getEyeExpression()}
        </div>
        <div className="flex items-center justify-center">
          {getMouthExpression()}
        </div>
      </div>
    </div>
  );
};

export default RobotAvatar;
