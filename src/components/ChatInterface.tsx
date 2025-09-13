import React from 'react';
import { MessageBubble } from './MessageBubble';
import { TimeStamp } from './TimeStamp';
import { TypingIndicator } from './TypingIndicator';
import { LocationMessage } from './LocationMessage';
import { PauseIndicator } from './PauseIndicator';
import { VoiceMessage } from './VoiceMessage';
import { ImageMessage } from './ImageMessage';
import { RecallMessage } from './RecallMessage';

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
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  chatData,
  currentMessageIndex,
  isPlaying
}) => {
  const { scene, messages } = chatData;
  
  // 获取参与者信息
  const getParticipant = (name: string) => {
    return scene.participants.find(p => p.name === name);
  };

  // 渲染消息列表（只显示到当前索引，如果没有播放则显示所有消息）
  const visibleMessages = isPlaying ? messages.slice(0, currentMessageIndex + 1) : messages;

  return (
    <div className="h-full w-full bg-[#F7F7F7] flex flex-col">
      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 text-sm scrollbar-hide">
      {visibleMessages.map((message, index) => {
        const participant = message.speaker ? getParticipant(message.speaker) : null;
        const isCurrentUser = message.speaker === scene.participants[0]?.name;

        if (message.type === 'pause') {
          return (
            <PauseIndicator
              key={index}
              duration={message.duration || ''}
              description={message.description || ''}
            />
          );
        }

        if (message.type === 'typing') {
          return (
            <TypingIndicator
              key={index}
              participant={participant}
              isCurrentUser={isCurrentUser}
              isActive={index === currentMessageIndex && isPlaying}
              duration={message.statusDuration}
            />
          );
        }

        if (message.type === 'location') {
          return (
            <LocationMessage
              key={index}
              message={message}
              participant={participant}
              isCurrentUser={isCurrentUser}
            />
          );
        }

        if (message.type === 'voice') {
          return (
            <div key={index} className="space-y-2">
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
            <div key={index} className="space-y-2">
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
          return (
            <div key={index} className="space-y-2">
              {message.time && <TimeStamp time={message.time} />}
              <RecallMessage
                originalMessage={message}
                recallDelay={message.recallDelay}
                showReEdit={false}
              />
            </div>
          );
        }

        // 普通文字消息
        return (
          <div key={index} className="space-y-2">
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