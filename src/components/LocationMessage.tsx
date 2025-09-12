import React from 'react';
import { Message, Participant } from './ChatInterface';
import { MapPin } from 'lucide-react';

interface LocationMessageProps {
  message: Message;
  participant: Participant | null;
  isCurrentUser: boolean;
}

export const LocationMessage: React.FC<LocationMessageProps> = ({
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
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
              {participant?.name?.charAt(0) || '?'}
            </div>
          )}
        </div>
      )}

      {/* 位置消息内容 */}
      <div className={`max-w-xs rounded-lg overflow-hidden ${
        isCurrentUser 
          ? 'bg-[#95EC69] ml-auto' 
          : 'bg-white border border-gray-200'
      }`}>
        {/* 发送者名称 */}
        {!isCurrentUser && participant && (
          <div className="px-3 pt-1.5 pb-0.5">
            <div className="text-xs text-gray-500">
              {participant.name}
            </div>
          </div>
        )}
        
        {/* 地图预览区域 */}
        <div className="bg-gray-100 h-24 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-6 h-6 text-gray-400 mx-auto mb-1" />
            <div className="text-xs text-gray-500">地图预览</div>
          </div>
        </div>
        
        {/* 位置信息 */}
        <div className="px-3 py-2">
          <div className="text-sm font-medium text-black mb-1">
            {message.content}
          </div>
          {message.coordinates && (
            <div className="text-xs text-gray-500">
              {message.coordinates.latitude.toFixed(4)}, {message.coordinates.longitude.toFixed(4)}
            </div>
          )}
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
            <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-medium">
              {participant?.name?.charAt(0) || '我'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};