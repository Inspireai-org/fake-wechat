import React, { useState, useEffect } from 'react';

interface MessageStatusProps {
  status: 'sending' | 'sent' | 'read';
  duration: 'short' | 'medium' | 'long';
}

const getDurationMs = (duration: 'short' | 'medium' | 'long'): number => {
  switch (duration) {
    case 'short': return 1000;
    case 'medium': return 3000;
    case 'long': return 5000;
    default: return 1000;
  }
};

export const MessageStatus: React.FC<MessageStatusProps> = ({
  status: initialStatus,
  duration
}) => {
  const [currentStatus, setCurrentStatus] = useState<'sending' | 'sent' | 'read'>(initialStatus);

  useEffect(() => {
    if (initialStatus === 'sending') {
      const timer = setTimeout(() => {
        setCurrentStatus('sent');
        
        // 如果初始状态就是read，继续转换到read状态
        if (initialStatus === 'sending') {
          const readTimer = setTimeout(() => {
            setCurrentStatus('read');
          }, getDurationMs(duration) / 2);
          
          return () => clearTimeout(readTimer);
        }
      }, getDurationMs(duration));
      
      return () => clearTimeout(timer);
    } else if (initialStatus === 'sent') {
      // 如果直接是sent状态，也可以转换到read
      const timer = setTimeout(() => {
        setCurrentStatus('read');
      }, getDurationMs(duration));
      
      return () => clearTimeout(timer);
    } else {
      // 如果初始状态是其他值，直接设置
      setCurrentStatus(initialStatus);
    }
  }, [initialStatus, duration]);

  if (currentStatus === 'sending') {
    return (
      <div className="ml-1 animate-spin transition-all duration-300">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle
            cx="6"
            cy="6"
            r="5"
            stroke="#999"
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="10 5"
          />
        </svg>
      </div>
    );
  }

  if (currentStatus === 'sent') {
    return (
      <div className="ml-1 transition-all duration-300 animate-fade-in">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="#999" strokeWidth="1" fill="none" />
          <path d="M3 6L5 8L9 4" stroke="#999" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  if (currentStatus === 'read') {
    return (
      <div className="ml-1 transition-all duration-300 animate-fade-in">
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M1 6L3 8L7 4" stroke="#4A90E2" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 6L9 8L13 4" stroke="#4A90E2" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  return null;
};