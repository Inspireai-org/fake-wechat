import React from 'react';
import { ChevronLeft, MoreHorizontal } from 'lucide-react';

interface WeChatNavBarProps {
  contactName: string;
  onBack?: () => void;
  onMore?: () => void;
}

const WeChatNavBar: React.FC<WeChatNavBarProps> = ({ 
  contactName, 
  onBack, 
  onMore 
}) => {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-[#EDEDED] border-b border-[#D1D1D6]">
      {/* 返回按钮 */}
      <button 
        onClick={onBack}
        className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-black/5 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-black" strokeWidth={2} />
      </button>
      
      {/* 联系人姓名 */}
      <div className="flex-1 text-center">
        <h1 className="text-black font-medium text-sm leading-tight">
          {contactName}
        </h1>
      </div>
      
      {/* 更多按钮 */}
      <button 
        onClick={onMore}
        className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-black/5 transition-colors"
      >
        <MoreHorizontal className="w-5 h-5 text-black" strokeWidth={2} />
      </button>
    </div>
  );
};

export default WeChatNavBar;