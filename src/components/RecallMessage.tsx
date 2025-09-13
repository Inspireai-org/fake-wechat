import React, { useState, useEffect } from 'react';
import { Message } from './ChatInterface';

interface RecallMessageProps {
  originalMessage: Message;
  showReEdit?: boolean;
  recallDelay?: 'short' | 'medium' | 'long';
}

const getDelayMs = (delay: 'short' | 'medium' | 'long' | undefined): number => {
  switch (delay) {
    case 'short': return 1000;
    case 'medium': return 3000;
    case 'long': return 5000;
    default: return 2000;
  }
};

export const RecallMessage: React.FC<RecallMessageProps> = ({
  originalMessage,
  showReEdit = false,
  recallDelay
}) => {
  const [isRecalled, setIsRecalled] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowOriginal(false);
      setTimeout(() => {
        setIsRecalled(true);
      }, 300);
    }, getDelayMs(recallDelay));

    return () => clearTimeout(timer);
  }, [recallDelay]);

  if (!isRecalled && showOriginal) {
    return (
      <div className={`transition-opacity duration-300 ${!showOriginal ? 'opacity-0' : 'opacity-100'}`}>
        {originalMessage.content}
      </div>
    );
  }

  if (isRecalled) {
    const recallText = originalMessage.speaker 
      ? `"${originalMessage.speaker}" 撤回了一条消息`
      : '你撤回了一条消息';

    return (
      <div className="text-center py-1">
        <span className="text-xs text-gray-400">
          {recallText}
          {showReEdit && (
            <button className="ml-1 text-blue-500 hover:underline">
              重新编辑
            </button>
          )}
        </span>
      </div>
    );
  }

  return null;
};