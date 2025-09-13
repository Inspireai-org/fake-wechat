import React, { useState, useEffect } from 'react';
import { Participant } from './ChatInterface';

interface TypingIndicatorProps {
  participant: Participant | null;
  isCurrentUser: boolean;
  isActive: boolean;
  duration?: 'short' | 'medium' | 'long';
  hesitate?: boolean;
  onTypingStatusChange?: (isTyping: boolean) => void;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  participant,
  isCurrentUser,
  isActive,
  duration = 'medium',
  hesitate = false,
  onTypingStatusChange
}) => {
  const [showTyping, setShowTyping] = useState(false);
  const [isHesitating, setIsHesitating] = useState(false);

  const getDurationMs = (dur: 'short' | 'medium' | 'long'): number => {
    switch (dur) {
      case 'short': return 1000;
      case 'medium': return 3000;
      case 'long': return 5000;
      default: return 3000;
    }
  };

  useEffect(() => {
    if (!isActive) {
      setShowTyping(false);
      onTypingStatusChange?.(false);
      return;
    }

    setShowTyping(true);
    onTypingStatusChange?.(true);

    if (hesitate) {
      const hesitateTimer = setTimeout(() => {
        setShowTyping(false);
        setIsHesitating(true);
        onTypingStatusChange?.(false);
        
        setTimeout(() => {
          setShowTyping(true);
          setIsHesitating(false);
          onTypingStatusChange?.(true);
        }, 1000);
      }, getDurationMs(duration) / 2);

      return () => clearTimeout(hesitateTimer);
    }
  }, [isActive, duration, hesitate, onTypingStatusChange]);

  if (!isActive || (!showTyping && !isHesitating)) return null;

  if (isCurrentUser) {
    // 当前用户的打字状态：指示器靠右，头像在最右侧
    return (
      <div className="flex items-end justify-end space-x-2">
        {/* 打字指示器 */}
        <div className="bg-[#95EC69] px-3 py-2 rounded-lg">
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
        
        {/* 当前用户的头像 */}
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
      </div>
    );
  }

  // 其他用户的打字状态
  return (
    <div className="flex items-end space-x-2">
      {/* 头像 */}
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

      {/* 打字指示器 */}
      <div className="bg-white border border-gray-200 px-3 py-2 rounded-lg">
        <div className="flex space-x-1">
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};