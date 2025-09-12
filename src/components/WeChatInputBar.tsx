import React, { useState } from 'react';
import { Mic, Smile, Plus } from 'lucide-react';

interface WeChatInputBarProps {
  onSendMessage?: (message: string) => void;
}

export const WeChatInputBar: React.FC<WeChatInputBarProps> = ({ 
  onSendMessage 
}) => {
  const [message, setMessage] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  const handleSend = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-[#F7F7F7] border-t border-gray-200 px-2 py-2 flex items-end space-x-2">
      {/* 语音/键盘切换按钮 */}
      <button 
        onClick={() => setIsVoiceMode(!isVoiceMode)}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
      >
        {isVoiceMode ? (
          <div className="text-gray-600 text-xs font-medium">键</div>
        ) : (
          <Mic className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {/* 输入区域 */}
      <div className="flex-1 flex items-end space-x-2">
        {isVoiceMode ? (
          /* 按住说话按钮 */
          <div className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-2 text-center text-sm text-gray-600">
            按住 说话
          </div>
        ) : (
          /* 文字输入框 */
          <div className="flex-1 bg-white border border-gray-200 rounded-md overflow-hidden">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="发送消息"
              className="w-full px-3 py-2 text-sm resize-none outline-none max-h-20"
              rows={1}
              style={{
                minHeight: '32px',
                height: Math.max(32, Math.min(80, message.split('\n').length * 20))
              }}
            />
          </div>
        )}

        {/* 表情按钮 */}
        <button className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
          <Smile className="w-5 h-5 text-gray-600" />
        </button>

        {/* 更多功能 / 发送按钮 */}
        {message.trim() ? (
          <button 
            onClick={handleSend}
            className="flex-shrink-0 bg-[#07C160] text-white px-3 py-1.5 rounded-md text-sm font-medium"
          >
            发送
          </button>
        ) : (
          <button className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
            <Plus className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
};