import React from 'react';
import { Message, Participant } from './ChatInterface';
import { MessageStatus } from './MessageStatus';

interface MessageBubbleProps {
  message: Message;
  participant: Participant | null;
  isCurrentUser: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  participant,
  isCurrentUser
}) => {
  if (isCurrentUser) {
    // 当前用户的消息：消息靠右，头像在最右侧
    return (
      <div className="flex items-end justify-end space-x-2">
        {/* 消息状态 - 显示在消息左侧 */}
        {message.status && (
          <div className="flex items-end">
            <MessageStatus 
              status={message.status} 
              duration={message.statusDuration || 'short'}
            />
          </div>
        )}
        
        {/* 消息内容 */}
        <div className="bg-[#95EC69] text-black rounded-lg rounded-br-sm px-2.5 py-1.5 max-w-[180px]">
          <div className="text-sm leading-5 whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
        
        {/* 当前用户的头像 */}
        <div className="w-7 h-7 rounded-md bg-gray-300 flex-shrink-0 overflow-hidden">
          {participant?.avatar ? (
            <img 
              src={participant.avatar} 
              alt={participant.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-medium">
              {participant?.name?.charAt(0) || '我'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 其他用户的消息：头像在左侧，消息在右侧
  return (
    <div className="flex items-end space-x-2">
      {/* 头像 */}
      <div className="w-7 h-7 rounded-md bg-gray-300 flex-shrink-0 overflow-hidden">
        {participant?.avatar ? (
          <img 
            src={participant.avatar} 
            alt={participant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
            {participant?.name?.charAt(0) || '?'}
          </div>
        )}
      </div>

      {/* 消息内容 */}
      <div className="bg-white text-black rounded-lg rounded-bl-sm shadow-sm px-2.5 py-1.5 max-w-[180px]">
        {/* 发送者名称（仅在群聊中显示，这里为了演示保留） */}
        {participant && (
          <div className="text-xs text-gray-500 mb-1">
            {participant.name}
          </div>
        )}
        
        {/* 消息文本 */}
        <div className="text-sm leading-5 whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    </div>
  );
};