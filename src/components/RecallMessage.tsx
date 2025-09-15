import React, { useState, useEffect, useRef } from 'react';
import { Message } from './ChatInterface';
import { MessageBubble } from './MessageBubble';

interface RecallMessageProps {
  originalMessage: Message;
  showReEdit?: boolean;
  recallDelay?: 'short' | 'medium' | 'long';
  onRecallComplete?: () => void;
  index?: number;
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
  recallDelay,
  onRecallComplete,
  index = 0
}) => {
  const [recallState, setRecallState] = useState<'showing' | 'fading' | 'recalled'>('showing');
  const [animationPhase, setAnimationPhase] = useState<'original' | 'transition' | 'recalled'>('original');
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // 清理之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 第一阶段：显示原始消息
    const delay = getDelayMs(recallDelay);
    
    timerRef.current = setTimeout(() => {
      // 第二阶段：开始淡出动画
      setRecallState('fading');
      setAnimationPhase('transition');
      
      // 第三阶段：显示撤回提示
      setTimeout(() => {
        setRecallState('recalled');
        setAnimationPhase('recalled');
        onRecallComplete?.();
      }, 500); // 淡出动画持续时间
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [recallDelay, onRecallComplete]);

  // 根据撤回状态渲染不同内容
  if (animationPhase === 'original' || animationPhase === 'transition') {
    // 显示原始消息（带淡出效果）
    const participant = originalMessage.speaker ? 
      { name: originalMessage.speaker, avatar: '' } : null;
    const isCurrentUser = originalMessage.speaker === '我';
    
    return (
      <div 
        className={`
          transition-all duration-500 transform
          ${recallState === 'fading' ? 'opacity-0 scale-95 -translate-y-2' : 'opacity-100 scale-100 translate-y-0'}
        `}
        style={{
          animationDelay: `${index * 100}ms` // 多条消息撤回时的错开效果
        }}
      >
        <MessageBubble
          message={originalMessage}
          participant={participant}
          isCurrentUser={isCurrentUser}
        />
      </div>
    );
  }

  if (animationPhase === 'recalled') {
    const recallText = originalMessage.speaker && originalMessage.speaker !== '我'
      ? `"${originalMessage.speaker}" 撤回了一条消息`
      : '你撤回了一条消息';

    return (
      <div className="text-center py-1 animate-fade-in">
        <span className="text-xs text-gray-400">
          {recallText}
          {showReEdit && (
            <button className="ml-1 text-blue-500 hover:underline transition-colors">
              重新编辑
            </button>
          )}
        </span>
      </div>
    );
  }

  return null;
};