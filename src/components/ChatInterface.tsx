import React from 'react';
import { MessageBubble } from './MessageBubble';
import { TimeStamp } from './TimeStamp';
import { TypingIndicator } from './TypingIndicator';
import { LocationMessage } from './LocationMessage';
import { PauseIndicator } from './PauseIndicator';

export interface Participant {
  name: string;
  avatar: string;
}

export interface Message {
  speaker?: string;
  content?: string;
  time?: string;
  type?: 'message' | 'pause' | 'typing' | 'location';
  duration?: string;
  description?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ChatScene {
  title: string;
  participants: Participant[];
}

export interface ChatData {
  scene: ChatScene;
  messages: Message[];
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
    <div className="h-full w-full bg-[#F7F7F7] overflow-y-auto px-3 py-3 space-y-3">
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
  );
};