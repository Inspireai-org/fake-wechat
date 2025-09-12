import React from 'react';
import { Message, Participant } from './ChatInterface';

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
  return (
    <div className={`flex items-end space-x-2 ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      {/* 头像 */}
      {!isCurrentUser && (
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
      )}

      {/* 消息内容 */}
      <div className={`max-w-[180px] px-2.5 py-1.5 ${
        isCurrentUser 
          ? 'bg-[#95EC69] text-black ml-auto rounded-lg rounded-br-sm' 
          : 'bg-white text-black rounded-lg rounded-bl-sm shadow-sm'
      }`}>
        {/* 发送者名称（仅在群聊中显示，这里为了演示保留） */}
        {!isCurrentUser && participant && (
          <div className="text-xs text-gray-500 mb-1">
            {participant.name}
          </div>
        )}
        
        {/* 消息文本 */}
        <div className="text-sm leading-5 whitespace-pre-wrap">
          {message.content}
        </div>
      </div>

      {/* 当前用户的头像 */}
      {isCurrentUser && (
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
      )}
    </div>
  );
};