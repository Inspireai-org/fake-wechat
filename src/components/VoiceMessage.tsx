import React, { useState, useEffect } from 'react';
import { Message, Participant } from './ChatInterface';

interface VoiceMessageProps {
  message: Message;
  participant: Participant | null;
  isCurrentUser: boolean;
  isPlaying?: boolean;
}

export const VoiceMessage: React.FC<VoiceMessageProps> = ({
  message,
  participant,
  isCurrentUser,
  isPlaying = false
}) => {
  const [showText, setShowText] = useState(false);
  const [isPlayed, setIsPlayed] = useState(false);

  useEffect(() => {
    if (isPlaying && !isPlayed) {
      setIsPlayed(true);
      if (message.voiceText) {
        setTimeout(() => {
          setShowText(true);
        }, 1000);
      }
    }
  }, [isPlaying, isPlayed, message.voiceText]);

  const voiceDuration = message.voiceDuration || '1"';
  
  const renderVoiceBar = () => {
    const barWidth = Math.min(Math.max(60, parseInt(voiceDuration) * 8), 150);
    
    return (
      <div 
        className={`relative flex items-center px-2 py-1.5 rounded-lg ${
          isCurrentUser ? 'bg-[#95EC69]' : 'bg-white'
        }`}
        style={{ width: `${barWidth}px` }}
      >
        {!isCurrentUser && !isPlayed && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
        
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-1">
            <svg 
              width="14" 
              height="16" 
              viewBox="0 0 14 16" 
              fill="none"
              className={isCurrentUser ? 'text-black' : 'text-gray-600'}
            >
              <path 
                d="M2 8L2 10M6 4L6 12M10 6L10 10M14 8L14 8" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className={`text-xs ${isCurrentUser ? 'text-black' : 'text-gray-600'}`}>
            {voiceDuration}
          </span>
        </div>
      </div>
    );
  };

  if (isCurrentUser) {
    return (
      <div className="flex items-start justify-end space-x-2">
        <div className="flex flex-col items-end">
          {renderVoiceBar()}
          {showText && message.voiceText && (
            <div className="mt-1 bg-[#95EC69] text-black rounded-lg px-2.5 py-1.5 max-w-[180px] text-sm animate-fadeIn">
              {message.voiceText}
            </div>
          )}
        </div>
        <div className="w-7 h-7 rounded-md bg-gray-300 flex-shrink-0 overflow-hidden">
          {participant?.avatar && (
            <img 
              src={participant.avatar} 
              alt={participant.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-2">
      <div className="w-7 h-7 rounded-md bg-gray-300 flex-shrink-0 overflow-hidden">
        {participant?.avatar && (
          <img 
            src={participant.avatar} 
            alt={participant.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="flex flex-col">
        {renderVoiceBar()}
        {showText && message.voiceText && (
          <div className="mt-1 bg-white text-black rounded-lg px-2.5 py-1.5 max-w-[180px] text-sm animate-fadeIn">
            {message.voiceText}
          </div>
        )}
      </div>
    </div>
  );
};