import { useState, useCallback, useRef } from 'react';

export interface Animation {
  type: 'message' | 'typing' | 'status' | 'recall' | 'scene';
  target: string;
  duration: number;
  delay: number;
  easing?: string;
}

interface AnimationController {
  setGlobalSpeed: (multiplier: number) => void;
  getDelayMs: (delay: 'short' | 'medium' | 'long') => number;
  queueAnimation: (animation: Animation) => void;
  playAnimations: () => Promise<void>;
  pauseAnimations: () => void;
  enableTextReveal: (enabled: boolean) => void;
  enableFocusEffect: (messageId: string) => void;
  enableBlurBackground: (enabled: boolean) => void;
}

export const useAnimationController = (): AnimationController => {
  const [globalSpeed, setGlobalSpeed] = useState(1.0);
  const [_textRevealEnabled, setTextRevealEnabled] = useState(false);
  const [_focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const [_blurBackgroundEnabled, setBlurBackgroundEnabled] = useState(false);
  const animationQueue = useRef<Animation[]>([]);
  const isPlaying = useRef(false);

  const getDelayMs = useCallback((delay: 'short' | 'medium' | 'long'): number => {
    const baseDelay = {
      short: 1000,
      medium: 3000,
      long: 5000
    }[delay];
    
    return baseDelay / globalSpeed;
  }, [globalSpeed]);

  const queueAnimation = useCallback((animation: Animation) => {
    animationQueue.current.push({
      ...animation,
      duration: animation.duration / globalSpeed,
      delay: animation.delay / globalSpeed
    });
  }, [globalSpeed]);

  const playAnimations = useCallback(async () => {
    isPlaying.current = true;
    
    for (const animation of animationQueue.current) {
      if (!isPlaying.current) break;
      
      await new Promise(resolve => setTimeout(resolve, animation.delay));
      
      if (!isPlaying.current) break;
      
      await new Promise(resolve => setTimeout(resolve, animation.duration));
    }
    
    animationQueue.current = [];
    isPlaying.current = false;
  }, []);

  const pauseAnimations = useCallback(() => {
    isPlaying.current = false;
  }, []);

  const enableTextReveal = useCallback((enabled: boolean) => {
    setTextRevealEnabled(enabled);
  }, []);

  const enableFocusEffect = useCallback((messageId: string) => {
    setFocusedMessageId(messageId);
    setTimeout(() => {
      setFocusedMessageId(null);
    }, 3000 / globalSpeed);
  }, [globalSpeed]);

  const enableBlurBackground = useCallback((enabled: boolean) => {
    setBlurBackgroundEnabled(enabled);
  }, []);

  return {
    setGlobalSpeed,
    getDelayMs,
    queueAnimation,
    playAnimations,
    pauseAnimations,
    enableTextReveal,
    enableFocusEffect,
    enableBlurBackground
  };
};