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
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
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

  // 计算消息显示延迟
  const getMessageDelay = useCallback((message: Message): number => {
    const baseDelay = 1500; // 基础延迟1.5秒
    
    if (message.type === 'pause') {
      // 解析暂停时间
      const duration = message.duration || '1秒';
      const match = duration.match(/(\d+)(秒|分钟|小时)/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
          case '秒': return value * 1000;
          case '分钟': return value * 60 * 1000;
          case '小时': return value * 60 * 60 * 1000;
          default: return baseDelay;
        }
      }
      return baseDelay;
    } else if (message.type === 'typing') {
      // 解析打字时间
      const duration = message.duration || '3秒';
      const match = duration.match(/(\d+)秒/);
      if (match) {
        return parseInt(match[1]) * 1000;
      }
      return 3000; // 默认3秒
    } else {
      // 普通消息根据内容长度调整延迟
      const contentLength = message.content?.length || 0;
      return Math.max(baseDelay, contentLength * 100);
    }
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
      setCurrentMessageIndex(0);
    }
    setIsPlaying(true);
  }, [currentMessageIndex, messages.length]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    clearTimers();
  }, [clearTimers]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentMessageIndex(0);
    clearTimers();
  }, [clearTimers]);

  const setSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(Math.max(0.25, Math.min(4, speed)));
  }, []);

  const goToMessage = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(messages.length - 1, index));
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