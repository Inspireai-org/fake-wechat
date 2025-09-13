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
      }, getDurationMs(duration));
      
      return () => clearTimeout(timer);
    }
  }, [initialStatus, duration]);

  if (currentStatus === 'sending') {
    return (
      <div className="ml-1 animate-spin">
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
      <div className="ml-1">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="#999" strokeWidth="1" fill="none" />
          <path d="M3 6L5 8L9 4" stroke="#999" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  if (currentStatus === 'read') {
    return (
      <div className="ml-1">
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M1 6L3 8L7 4" stroke="#4A90E2" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 6L9 8L13 4" stroke="#4A90E2" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  return null;
};