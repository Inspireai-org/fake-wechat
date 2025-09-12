import React from 'react';
import { Participant } from './ChatInterface';

interface TypingIndicatorProps {
  participant: Participant | null;
  isCurrentUser: boolean;
  isActive: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  participant,
  isCurrentUser,
  isActive
}) => {
  if (!isActive) return null;

  return (
    <div className={`flex items-end space-x-2 ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      {/* 头像 */}
      {!isCurrentUser && (
        <div className="w-7 h-7 rounded-md bg-gray-300 flex-shrink-0 overflow-hidden">
          {participant?.avatar ? (
            <img 
              src={participant.avatar} 
              alt={participant.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
              {participant?.name?.charAt(0) || '?'}
            </div>
          )}
        </div>
      )}

      {/* 打字指示器 */}
      <div className={`px-3 py-2 rounded-lg ${
        isCurrentUser 
          ? 'bg-[#95EC69] ml-auto' 
          : 'bg-white border border-gray-200'
      }`}>
        <div className="flex space-x-1">
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>

      {/* 当前用户的头像 */}
      {isCurrentUser && (
        <div className="w-7 h-7 rounded-md bg-gray-300 flex-shrink-0 overflow-hidden">
          {participant?.avatar ? (
            <img 
              src={participant.avatar} 
              alt={participant.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-medium">
              {participant?.name?.charAt(0) || '我'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};