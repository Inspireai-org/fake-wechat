import { useState, useCallback, useRef, useEffect } from 'react';
import { Message } from '../components/ChatInterface';

// 播放状态接口
export interface PlaybackState {
  // 基础播放状态
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  totalDuration: number;
  playbackSpeed: number;
  
  // 播放模式
  playMode: 'normal' | 'loop' | 'preview';
  
  // 消息状态
  currentMessageIndex: number;
  visibleMessages: Message[];
  
  // 滚动状态
  shouldAutoScroll: boolean;
  scrollPosition: number;
  
  // 历史记录
  history: PlaybackSnapshot[];
  historyIndex: number;
}

// 播放快照接口
export interface PlaybackSnapshot {
  timestamp: number;
  messageIndex: number;
  scrollPosition: number;
  playbackSpeed: number;
  playMode: 'normal' | 'loop' | 'preview';
}

// 播放控制接口
export interface PlaybackControls {
  // 基础控制
  play: () => void;
  pause: () => void;
  stop: () => void;
  reset: () => void;
  
  // 跳转控制
  seekToTime: (time: number) => void;
  seekToMessage: (index: number) => void;
  seekToProgress: (progress: number) => void;
  
  // 速度控制
  setPlaybackSpeed: (speed: number) => void;
  
  // 模式控制
  setPlayMode: (mode: 'normal' | 'loop' | 'preview') => void;
  
  // 历史记录控制
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // 滚动控制
  setAutoScroll: (enabled: boolean) => void;
  setScrollPosition: (position: number) => void;
}

// Hook 参数接口
interface UsePlaybackStateProps {
  messages: Message[];
  onAnimationComplete?: () => void;
  onStateChange?: (state: PlaybackState) => void;
}

/**
 * 播放状态管理类
 * 负责管理播放状态、历史记录、时间计算等核心逻辑
 */
class PlaybackStateManager {
  private state: PlaybackState;
  private listeners: Set<(state: PlaybackState) => void> = new Set();
  private messages: Message[];
  private animationTimer: NodeJS.Timeout | null = null;
  private onAnimationComplete?: () => void;

  constructor(messages: Message[], onAnimationComplete?: () => void) {
    this.messages = messages;
    this.onAnimationComplete = onAnimationComplete;
    
    // 初始化状态
    this.state = {
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      totalDuration: this.calculateTotalDuration(),
      playbackSpeed: 1,
      playMode: 'normal',
      currentMessageIndex: -1,
      visibleMessages: [],
      shouldAutoScroll: true,
      scrollPosition: 0,
      history: [],
      historyIndex: -1
    };
  }

  // 添加状态监听器
  public addListener(listener: (state: PlaybackState) => void): void {
    this.listeners.add(listener);
  }

  // 移除状态监听器
  public removeListener(listener: (state: PlaybackState) => void): void {
    this.listeners.delete(listener);
  }

  // 获取当前状态
  public getState(): PlaybackState {
    return { ...this.state };
  }

  // 更新状态并通知监听器
  private updateState(updates: Partial<PlaybackState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  // 计算总时长
  private calculateTotalDuration(): number {
    let totalTime = 0;
    
    for (const message of this.messages) {
      totalTime += this.getMessageDuration(message);
    }
    
    return totalTime;
  }

  // 获取单条消息的时长
  private getMessageDuration(message: Message): number {
    if (message.type === 'pause') {
      // 对于pause类型，使用特殊的压缩逻辑
      return this.parseDescriptiveTime(message.duration, true);
    } else if (message.type === 'typing') {
      return this.parseDescriptiveTime(message.statusDuration || message.duration || '3s');
    } else if (message.type === 'recall') {
      return this.parseDescriptiveTime(message.recallDelay);
    } else {
      // 普通消息延迟
      if (message.animationDelay) {
        return this.parseDescriptiveTime(message.animationDelay);
      } else {
        // 根据内容长度自动调整（更快的节奏）
        const contentLength = message.content?.length || 0;
        const baseDelay = 800;  // 基础延迟 0.8秒
        const extraDelay = contentLength * 20;  // 每个字符增加20ms
        return Math.max(baseDelay, Math.min(baseDelay + extraDelay, 1500));  // 最多1.5秒
      }
    }
  }

  // 解析描述性时间
  private parseDescriptiveTime(duration: string | undefined, compressForPause: boolean = false): number {
    if (!duration) return 800;  // 默认延迟调整为800ms
    
    // 支持的描述性时间映射（调整为更合理的值）
    const descriptiveTimeMap: Record<string, number> = {
      '稍后': 1000,      // 1秒
      '片刻后': 1500,    // 1.5秒
      '一会儿后': 2000,  // 2秒
      '很久之后': 3000,  // 3秒
      '许久之后': 4000,  // 4秒
      '短': 500,         // 0.5秒
      'short': 500,
      '中': 1000,        // 1秒
      'medium': 1000,
      '长': 2000,        // 2秒
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
      
      let milliseconds = 0;
      switch (unit.toLowerCase()) {
        case '秒':
        case 's':
        case 'sec':
        case 'second':
          milliseconds = value * 1000;
          break;
        case '分钟':
        case 'm':
        case 'min':
        case 'minute':
          milliseconds = value * 60 * 1000;
          break;
        case '小时':
        case 'h':
        case 'hour':
          milliseconds = value * 60 * 60 * 1000;
          break;
        default:
          milliseconds = value * 1000; // 默认为秒
      }
      
      // 如果是pause类型，根据设计文档压缩时长
      // 演绎时间应该在0.5-5秒之间
      if (compressForPause && milliseconds > 5000) {
        // 对长时间进行对数压缩
        // 1分钟 -> 2秒
        // 5分钟 -> 2.5秒
        // 30分钟 -> 3秒
        // 1小时 -> 3.5秒
        // 更长 -> 最多4秒
        if (milliseconds <= 60000) { // <= 1分钟
          return Math.min(milliseconds, 2000);
        } else if (milliseconds <= 300000) { // <= 5分钟
          return 2500;
        } else if (milliseconds <= 1800000) { // <= 30分钟
          return 3000;
        } else if (milliseconds <= 3600000) { // <= 1小时
          return 3500;
        } else {
          return 4000; // 超过1小时一律4秒
        }
      }
      
      return milliseconds;
    }
    
    return 1500; // 默认延迟
  }

  // 根据时间计算消息索引
  private calculateMessageIndexFromTime(time: number): number {
    let accumulatedTime = 0;
    
    for (let i = 0; i < this.messages.length; i++) {
      const messageDuration = this.getMessageDuration(this.messages[i]);
      
      if (accumulatedTime + messageDuration > time) {
        return i;
      }
      
      accumulatedTime += messageDuration;
    }
    
    return this.messages.length - 1;
  }

  // 根据消息索引计算时间
  private calculateTimeFromMessageIndex(index: number): number {
    let accumulatedTime = 0;
    
    for (let i = 0; i <= index && i < this.messages.length; i++) {
      accumulatedTime += this.getMessageDuration(this.messages[i]);
    }
    
    return accumulatedTime;
  }

  // 计算可见消息列表
  private calculateVisibleMessages(messageIndex: number): Message[] {
    if (this.state.playMode === 'preview') {
      // 预览模式显示所有消息
      return this.messages;
    } else {
      // 播放模式只显示到当前索引的消息
      return this.messages.slice(0, messageIndex + 1);
    }
  }

  // 计算滚动位置
  private calculateScrollPosition(messageIndex: number): number {
    // 简化的滚动位置计算，实际实现可能需要更复杂的逻辑
    const messageHeight = 60; // 平均消息高度
    const containerHeight = 600; // 容器高度
    
    const totalHeight = messageIndex * messageHeight;
    
    if (totalHeight > containerHeight) {
      return totalHeight - containerHeight + messageHeight;
    }
    
    return 0;
  }

  // 保存快照到历史记录
  private saveSnapshot(): void {
    const snapshot: PlaybackSnapshot = {
      timestamp: Date.now(),
      messageIndex: this.state.currentMessageIndex,
      scrollPosition: this.state.scrollPosition,
      playbackSpeed: this.state.playbackSpeed,
      playMode: this.state.playMode
    };

    // 如果当前不在历史记录的末尾，删除后续记录
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
    }

    // 添加新快照
    this.state.history.push(snapshot);
    
    // 限制历史记录数量
    const MAX_HISTORY = 50;
    if (this.state.history.length > MAX_HISTORY) {
      this.state.history = this.state.history.slice(-MAX_HISTORY);
    }

    this.updateState({
      history: this.state.history,
      historyIndex: this.state.history.length - 1
    });
  }

  // 从快照恢复状态
  private restoreSnapshot(snapshot: PlaybackSnapshot): void {
    const visibleMessages = this.calculateVisibleMessages(snapshot.messageIndex);
    
    this.updateState({
      currentMessageIndex: snapshot.messageIndex,
      currentTime: this.calculateTimeFromMessageIndex(snapshot.messageIndex),
      scrollPosition: snapshot.scrollPosition,
      playbackSpeed: snapshot.playbackSpeed,
      playMode: snapshot.playMode,
      visibleMessages
    });
  }

  // 清理定时器
  private clearTimer(): void {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
  }

  // 开始动画循环
  private startAnimationLoop(): void {
    this.clearTimer();
    
    // 如果是从头开始（索引为-1），立即显示第一条消息
    if (this.state.currentMessageIndex === -1 && this.messages.length > 0) {
      this.seekToMessage(0);
    }
    
    this.playNextMessage();
  }

  // 停止动画循环
  private stopAnimationLoop(): void {
    this.clearTimer();
  }

  // 播放下一条消息
  private playNextMessage(): void {
    if (this.state.currentMessageIndex >= this.messages.length - 1) {
      // 播放完成
      if (this.state.playMode === 'loop') {
        // 循环模式，重新开始
        this.seekToMessage(-1);
        this.startAnimationLoop();
      } else {
        // 普通模式，停止播放
        this.updateState({ isPlaying: false, isPaused: false });
        this.onAnimationComplete?.();
      }
      return;
    }

    const nextIndex = this.state.currentMessageIndex + 1;
    const nextMessage = this.messages[nextIndex];
    const delay = this.getMessageDuration(nextMessage) / this.state.playbackSpeed;

    // 设置定时器，等待后再显示下一条消息
    this.animationTimer = setTimeout(() => {
      if (this.state.isPlaying) {
        // 更新到下一条消息
        this.seekToMessage(nextIndex);
        // 继续播放下一条
        this.playNextMessage();
      }
    }, delay);
  }

  // 播放控制方法
  public play(): void {
    if (this.state.currentMessageIndex >= this.messages.length - 1) {
      // 如果已经播放完毕，重新开始
      this.seekToMessage(-1);
    }
    
    this.updateState({
      isPlaying: true,
      isPaused: false,
      playMode: this.state.playMode === 'preview' ? 'normal' : this.state.playMode
    });
    
    this.startAnimationLoop();
  }

  public pause(): void {
    this.updateState({
      isPlaying: false,
      isPaused: true
    });
    
    this.stopAnimationLoop();
  }

  public stop(): void {
    this.updateState({
      isPlaying: false,
      isPaused: false
    });
    
    this.stopAnimationLoop();
  }

  public reset(): void {
    this.updateState({
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      currentMessageIndex: -1,
      visibleMessages: this.state.playMode === 'preview' ? this.messages : [],
      scrollPosition: 0
    });
    
    this.stopAnimationLoop();
    this.saveSnapshot();
  }

  // 跳转控制方法
  public seekToTime(time: number): void {
    const messageIndex = this.calculateMessageIndexFromTime(time);
    this.seekToMessage(messageIndex);
  }

  public seekToMessage(index: number): void {
    const clampedIndex = Math.max(-1, Math.min(this.messages.length - 1, index));
    const visibleMessages = this.calculateVisibleMessages(clampedIndex);
    const scrollPosition = this.calculateScrollPosition(clampedIndex);
    const currentTime = this.calculateTimeFromMessageIndex(clampedIndex);

    this.updateState({
      currentMessageIndex: clampedIndex,
      currentTime,
      visibleMessages,
      scrollPosition
    });

    this.saveSnapshot();

    // 如果正在播放，重新开始动画循环
    if (this.state.isPlaying) {
      this.startAnimationLoop();
    }
  }

  public seekToProgress(progress: number): void {
    const targetTime = progress * this.state.totalDuration;
    this.seekToTime(targetTime);
  }

  // 速度控制
  public setPlaybackSpeed(speed: number): void {
    const clampedSpeed = Math.max(0.1, Math.min(5, speed));
    this.updateState({ playbackSpeed: clampedSpeed });
    
    // 如果正在播放，重新开始动画循环以应用新速度
    if (this.state.isPlaying) {
      this.startAnimationLoop();
    }
  }

  // 模式控制
  public setPlayMode(mode: 'normal' | 'loop' | 'preview'): void {
    const visibleMessages = this.calculateVisibleMessages(this.state.currentMessageIndex);
    
    this.updateState({
      playMode: mode,
      visibleMessages
    });
  }

  // 历史记录控制
  public undo(): void {
    if (this.state.historyIndex > 0) {
      const snapshot = this.state.history[this.state.historyIndex - 1];
      this.restoreSnapshot(snapshot);
      this.updateState({ historyIndex: this.state.historyIndex - 1 });
    }
  }

  public redo(): void {
    if (this.state.historyIndex < this.state.history.length - 1) {
      const snapshot = this.state.history[this.state.historyIndex + 1];
      this.restoreSnapshot(snapshot);
      this.updateState({ historyIndex: this.state.historyIndex + 1 });
    }
  }

  public canUndo(): boolean {
    return this.state.historyIndex > 0;
  }

  public canRedo(): boolean {
    return this.state.historyIndex < this.state.history.length - 1;
  }

  // 滚动控制
  public setAutoScroll(enabled: boolean): void {
    this.updateState({ shouldAutoScroll: enabled });
  }

  public setScrollPosition(position: number): void {
    this.updateState({ scrollPosition: position });
  }

  // 更新消息列表
  public updateMessages(messages: Message[]): void {
    this.messages = messages;
    const totalDuration = this.calculateTotalDuration();
    const visibleMessages = this.calculateVisibleMessages(this.state.currentMessageIndex);
    
    this.updateState({
      totalDuration,
      visibleMessages
    });
  }

  // 清理资源
  public destroy(): void {
    this.clearTimer();
    this.listeners.clear();
  }
}

/**
 * 播放状态管理 Hook
 * 提供完整的播放控制功能，包括播放、暂停、跳转、速度控制、历史记录等
 */
export function usePlaybackState({
  messages,
  onAnimationComplete,
  onStateChange
}: UsePlaybackStateProps): [PlaybackState, PlaybackControls] {
  const managerRef = useRef<PlaybackStateManager | null>(null);
  const [state, setState] = useState<PlaybackState>(() => {
    const manager = new PlaybackStateManager(messages, onAnimationComplete);
    managerRef.current = manager;
    return manager.getState();
  });

  // 状态变化监听器
  const handleStateChange = useCallback((newState: PlaybackState) => {
    setState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  // 初始化管理器
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new PlaybackStateManager(messages, onAnimationComplete);
    }
    
    managerRef.current.addListener(handleStateChange);
    
    return () => {
      managerRef.current?.removeListener(handleStateChange);
    };
  }, [handleStateChange, messages, onAnimationComplete]);

  // 更新消息列表
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.updateMessages(messages);
    }
  }, [messages]);

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      managerRef.current?.destroy();
    };
  }, []);

  // 创建控制接口
  const controls: PlaybackControls = {
    play: () => managerRef.current?.play(),
    pause: () => managerRef.current?.pause(),
    stop: () => managerRef.current?.stop(),
    reset: () => managerRef.current?.reset(),
    seekToTime: (time: number) => managerRef.current?.seekToTime(time),
    seekToMessage: (index: number) => managerRef.current?.seekToMessage(index),
    seekToProgress: (progress: number) => managerRef.current?.seekToProgress(progress),
    setPlaybackSpeed: (speed: number) => managerRef.current?.setPlaybackSpeed(speed),
    setPlayMode: (mode: 'normal' | 'loop' | 'preview') => managerRef.current?.setPlayMode(mode),
    undo: () => managerRef.current?.undo(),
    redo: () => managerRef.current?.redo(),
    canUndo: () => managerRef.current?.canUndo() || false,
    canRedo: () => managerRef.current?.canRedo() || false,
    setAutoScroll: (enabled: boolean) => managerRef.current?.setAutoScroll(enabled),
    setScrollPosition: (position: number) => managerRef.current?.setScrollPosition(position)
  };

  return [state, controls];
}