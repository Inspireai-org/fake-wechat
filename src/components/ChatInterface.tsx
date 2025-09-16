import React, { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { TimeStamp } from './TimeStamp';
import { TypingIndicator } from './TypingIndicator';
import { LocationMessage } from './LocationMessage';
import { PauseIndicator } from './PauseIndicator';
import { VoiceMessage } from './VoiceMessage';
import { ImageMessage } from './ImageMessage';
import { RecallMessage } from './RecallMessage';
import { useAutoScroll } from '../hooks/useAutoScroll';

export interface Participant {
  name: string;
  avatar: string;
}

export interface Message {
  // Existing fields
  speaker?: string;
  content?: string;
  time?: string;
  type?: 'message' | 'pause' | 'typing' | 'location' | 'voice' | 'image' | 'recall';
  duration?: string;
  description?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  
  // New fields for enhanced features
  voiceDuration?: string;           // Voice duration like "10""
  voiceText?: string;                // Voice-to-text content
  imageUrl?: string | string[];      // Image URL(s) for single or multiple images
  imageDescription?: string;         // Image description
  status?: 'sending' | 'sent' | 'read'; // Message status
  statusDuration?: 'short' | 'medium' | 'long'; // Status duration
  animationDelay?: 'short' | 'medium' | 'long'; // Animation delay
  recalled?: boolean;                // Whether message is recalled
  recallDelay?: 'short' | 'medium' | 'long'; // Recall delay
  originalMessage?: string;          // Original message content for recall type
}

export interface ChatScene {
  title: string;
  participants: Participant[];
}

export interface ChatData {
  scene: ChatScene;
  messages: Message[];
  
  // New fields for animation and theme
  animationConfig?: {
    globalSpeed: number;
    defaultDelay: 'short' | 'medium' | 'long';
    enableEffects: {
      textReveal: boolean;
      focusEffect: boolean;
      blurBackground: boolean;
    };
  };
  
  theme?: {
    primaryColor: string;
    backgroundColor: string;
    fontFamily?: string;
  };
}

interface ChatInterfaceProps {
  chatData: ChatData;
  currentMessageIndex: number;
  isPlaying: boolean;
  playMode?: 'normal' | 'loop' | 'preview';
  shouldAutoScroll?: boolean;
  scrollPosition?: number;
  onScrollPositionChange?: (position: number) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  chatData,
  currentMessageIndex,
  isPlaying,
  playMode = 'normal',
  shouldAutoScroll = true,
  scrollPosition = 0,
  onScrollPositionChange
}) => {
  const { scene, messages } = chatData;
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  
  // 获取参与者信息
  const getParticipant = (name: string) => {
    return scene.participants.find(p => p.name === name);
  };

  // 计算可见消息列表
  const getVisibleMessages = () => {
    if (playMode === 'preview' || !isPlaying) {
      // 预览模式或非播放状态：显示所有消息
      return messages;
    } else {
      // 播放模式：只显示到当前索引的消息
      return messages.slice(0, Math.max(0, currentMessageIndex + 1));
    }
  };

  const visibleMessages = getVisibleMessages();

  // 智能滚动控制
  const scrollControls = useAutoScroll({
    containerRef: messagesContainerRef,
    enabled: shouldAutoScroll,
    defaultConfig: {
      behavior: 'smooth',
      block: 'end',
      duration: 300,
      easing: 'ease-out'
    },
    onScrollStateChange: (state) => {
      // 同步滚动位置到外部状态
      onScrollPositionChange?.(state.scrollTop);
    }
  });

  // 播放模式下的自动滚动效果
  useEffect(() => {
    if (shouldAutoScroll && playMode !== 'preview') {
      // 播放模式下，滚动到最新消息，确保底部有6px间距
      if (lastMessageRef.current) {
        const container = messagesContainerRef.current;
        if (container) {
          // 计算滚动位置，确保最新消息底部距离输入框6px
          const targetScrollTop = container.scrollHeight - container.clientHeight;
          scrollControls.scrollTo(targetScrollTop, {
            behavior: 'smooth',
            duration: 250
          });
        }
      }
    }
  }, [currentMessageIndex, shouldAutoScroll, playMode, scrollControls]);

  // 播放完成后确保滚动到底部
  useEffect(() => {
    if (!isPlaying && shouldAutoScroll && playMode !== 'preview' && currentMessageIndex >= 0) {
      // 播放停止后，如果有消息显示，确保滚动到最底部
      setTimeout(() => {
        if (lastMessageRef.current) {
          // 滚动到最后一条消息，确保底部有6px空间
          const container = messagesContainerRef.current;
          if (container) {
            const messageElement = lastMessageRef.current;
            const containerHeight = container.clientHeight;
            const messageRect = messageElement.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            // 计算需要滚动的位置，确保消息底部距离容器底部6px
            const targetScrollTop = container.scrollHeight - containerHeight;
            
            scrollControls.scrollTo(targetScrollTop, {
              behavior: 'smooth',
              duration: 300
            });
          }
        } else {
          // 如果没有 lastMessageRef，直接滚动到底部
          scrollControls.scrollToBottom({
            behavior: 'smooth',
            duration: 300
          });
        }
      }, 100); // 小延迟确保 DOM 更新完成
    }
  }, [isPlaying, shouldAutoScroll, playMode, currentMessageIndex, scrollControls]);

  // 预览模式下的滚动位置同步
  useEffect(() => {
    if (playMode === 'preview' && scrollPosition !== undefined) {
      // 预览模式下，直接设置滚动位置，不使用动画
      scrollControls.scrollTo(scrollPosition, {
        behavior: 'auto',
        duration: 0
      });
    }
  }, [scrollPosition, playMode, scrollControls]);

  // 处理手动滚动
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    // 手动滚动时，滚动状态会通过 useAutoScroll 的回调自动同步
    // 这里不需要额外处理
  };

  return (
    <div className="h-full w-full bg-[#F7F7F7] flex flex-col">
      {/* 聊天消息区域 */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-2 pt-2 pb-1.5 space-y-2 text-sm scrollbar-hide"
        onScroll={handleScroll}
        style={{ paddingBottom: '6px' }}
      >
      {visibleMessages.map((message, index) => {
        const participant = message.speaker ? getParticipant(message.speaker) : null;
        const isCurrentUser = message.speaker === scene.participants[0]?.name;
        const isLastMessage = index === visibleMessages.length - 1;

        if (message.type === 'pause') {
          return (
            <div 
              key={index}
              ref={isLastMessage ? lastMessageRef : undefined}
            >
              <PauseIndicator
                duration={message.duration || ''}
                description={message.description || ''}
              />
            </div>
          );
        }

        if (message.type === 'typing') {
          return (
            <div 
              key={index}
              ref={isLastMessage ? lastMessageRef : undefined}
            >
              <TypingIndicator
                participant={participant}
                isCurrentUser={isCurrentUser}
                isActive={index === currentMessageIndex && isPlaying}
                duration={message.statusDuration}
              />
            </div>
          );
        }

        if (message.type === 'location') {
          return (
            <div 
              key={index}
              ref={isLastMessage ? lastMessageRef : undefined}
            >
              <LocationMessage
                message={message}
                participant={participant}
                isCurrentUser={isCurrentUser}
              />
            </div>
          );
        }

        if (message.type === 'voice') {
          return (
            <div 
              key={index} 
              className="space-y-2"
              ref={isLastMessage ? lastMessageRef : undefined}
            >
              {message.time && <TimeStamp time={message.time} />}
              <VoiceMessage
                message={message}
                participant={participant}
                isCurrentUser={isCurrentUser}
                isPlaying={index <= currentMessageIndex}
              />
            </div>
          );
        }

        if (message.type === 'image') {
          return (
            <div 
              key={index} 
              className="space-y-2"
              ref={isLastMessage ? lastMessageRef : undefined}
            >
              {message.time && <TimeStamp time={message.time} />}
              <ImageMessage
                message={message}
                participant={participant}
                isCurrentUser={isCurrentUser}
              />
            </div>
          );
        }

        if (message.type === 'recall') {
          // 计算连续撤回的索引（用于错开动画）
          let recallIndex = 0;
          if (index > 0) {
            for (let i = index - 1; i >= 0; i--) {
              if (messages[i].type === 'recall') {
                recallIndex++;
              } else {
                break;
              }
            }
          }
          
          return (
            <div 
              key={index} 
              className="space-y-2"
              ref={isLastMessage ? lastMessageRef : undefined}
            >
              {message.time && <TimeStamp time={message.time} />}
              <RecallMessage
                originalMessage={message}
                recallDelay={message.recallDelay}
                showReEdit={false}
                index={recallIndex}
              />
            </div>
          );
        }

        // 普通文字消息
        return (
          <div 
            key={index} 
            className="space-y-2"
            ref={isLastMessage ? lastMessageRef : undefined}
          >
            {/* 时间戳 */}
            {message.time && (
              <TimeStamp time={message.time} />
            )}
            
            {/* 消息气泡 */}
            <MessageBubble
              message={message}
              participant={participant}
              isCurrentUser={isCurrentUser}
            />
          </div>
        );
      })}
      </div>
      
      {/* 底部输入栏 */}
      <div className="flex-shrink-0">
        <img 
          src="/input.png" 
          alt="WeChat Input Bar"
          className="w-full h-auto"
        />
      </div>
    </div>
  );
};