import { useState, useEffect, useCallback, useRef } from 'react';
import { Message } from '../components/ChatInterface';

export interface AnimationState {
  isPlaying: boolean;
  currentMessageIndex: number;
  playbackSpeed: number;
  totalMessages: number;
}

export interface AnimationControls {
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  goToMessage: (index: number) => void;
}

interface UseAnimationControlProps {
  messages: Message[];
  onAnimationComplete?: () => void;
}

export function useAnimationControl({ 
  messages, 
  onAnimationComplete 
}: UseAnimationControlProps): [AnimationState, AnimationControls] {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 清理定时器
  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // 解析描述性时间
  const parseDescriptiveTime = (duration: string | undefined): number => {
    if (!duration) return 800;
    
    // 支持的描述性时间映射（与 usePlaybackState 保持一致）
    const descriptiveTimeMap: Record<string, number> = {
      '稍后': 1000,
      '片刻后': 1500,
      '一会儿后': 2000,
      '很久之后': 3000,
      '许久之后': 4000,
      '短': 500,
      'short': 500,
      '中': 1000,
      'medium': 1000,
      '长': 2000,
      'long': 2000,
    };
    
    // 首先检查是否是描述性时间
    const normalizedDuration = duration.toLowerCase().replace(/\s+/g, '');
    if (descriptiveTimeMap[normalizedDuration]) {
      return descriptiveTimeMap[normalizedDuration];
    }
    
    // 解析具体时间值（如 "2秒", "3s", "1分钟" 等）
    const match = duration.match(/(\d+\.?\d*)\s*(秒|s|sec|second|分钟|m|min|minute|小时|h|hour)?/i);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2] || 's';
      
      switch (unit.toLowerCase()) {
        case '秒':
        case 's':
        case 'sec':
        case 'second':
          return value * 1000;
        case '分钟':
        case 'm':
        case 'min':
        case 'minute':
          return value * 60 * 1000;
        case '小时':
        case 'h':
        case 'hour':
          return value * 60 * 60 * 1000;
        default:
          return value * 1000; // 默认为秒
      }
    }
    
    return 1500; // 默认延迟
  };

  // 优化过长的等待时间
  const optimizeDelay = (delay: number): number => {
    const MAX_COMFORTABLE_DELAY = 8000; // 最大舒适等待时间8秒
    const MIN_DELAY = 500; // 最小延迟0.5秒
    
    if (delay > MAX_COMFORTABLE_DELAY) {
      // 对超长延迟进行对数压缩
      return Math.min(MAX_COMFORTABLE_DELAY, Math.log(delay / 1000) * 2000 + 3000);
    }
    
    return Math.max(MIN_DELAY, delay);
  };

  // 计算消息显示延迟
  const getMessageDelay = useCallback((message: Message): number => {
    let delay: number;
    
    if (message.type === 'pause') {
      // 解析暂停时间
      delay = parseDescriptiveTime(message.duration);
    } else if (message.type === 'typing') {
      // 输入状态延迟
      if (message.statusDuration) {
        delay = parseDescriptiveTime(message.statusDuration);
      } else {
        delay = parseDescriptiveTime(message.duration || '3s');
      }
    } else if (message.type === 'recall') {
      // 撤回延迟
      delay = parseDescriptiveTime(message.recallDelay);
    } else {
      // 普通消息延迟
      if (message.animationDelay) {
        delay = parseDescriptiveTime(message.animationDelay);
      } else {
        // 根据内容长度自动调整
        const contentLength = message.content?.length || 0;
        const baseDelay = 1500;
        delay = Math.max(baseDelay, Math.min(contentLength * 50, 3000));
      }
    }
    
    // 应用延迟优化
    return optimizeDelay(delay);
  }, []);

  // 播放下一条消息
  const playNextMessage = useCallback(() => {
    if (currentMessageIndex >= messages.length - 1) {
      setIsPlaying(false);
      onAnimationComplete?.();
      return;
    }

    const nextIndex = currentMessageIndex + 1;
    const nextMessage = messages[nextIndex];
    const delay = getMessageDelay(nextMessage) / playbackSpeed;

    setCurrentMessageIndex(nextIndex);

    // 设置下一条消息的定时器
    timeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        playNextMessage();
      }
    }, delay);
  }, [currentMessageIndex, messages, playbackSpeed, isPlaying, getMessageDelay, onAnimationComplete]);

  // 播放控制
  const play = useCallback(() => {
    if (currentMessageIndex >= messages.length - 1) {
      // 如果已经播放完毕，重新开始
      setCurrentMessageIndex(-1);
    }
    setIsPlaying(true);
  }, [currentMessageIndex, messages.length]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    clearTimers();
  }, [clearTimers]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentMessageIndex(-1);
    clearTimers();
  }, [clearTimers]);

  const setSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(Math.max(0.25, Math.min(4, speed)));
  }, []);

  const goToMessage = useCallback((index: number) => {
    const clampedIndex = Math.max(-1, Math.min(messages.length - 1, index));
    setCurrentMessageIndex(clampedIndex);
    if (isPlaying) {
      clearTimers();
      // 如果正在播放，继续播放
      setTimeout(() => {
        if (isPlaying) {
          playNextMessage();
        }
      }, 100);
    }
  }, [messages.length, isPlaying, clearTimers, playNextMessage]);

  // 当播放状态改变时处理播放逻辑
  useEffect(() => {
    if (isPlaying) {
      playNextMessage();
    } else {
      clearTimers();
    }
  }, [isPlaying, playNextMessage, clearTimers]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const state: AnimationState = {
    isPlaying,
    currentMessageIndex,
    playbackSpeed,
    totalMessages: messages.length
  };

  const controls: AnimationControls = {
    play,
    pause,
    reset,
    setSpeed,
    goToMessage
  };

  return [state, controls];
}