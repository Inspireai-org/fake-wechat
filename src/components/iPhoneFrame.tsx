import React from 'react';
import { Wifi, Battery } from 'lucide-react';

interface iPhoneFrameProps {
  children: React.ReactNode;
}

const IPhoneFrame: React.FC<iPhoneFrameProps> = ({ children }) => {
  return (
    <div className="relative mx-auto bg-black rounded-[3rem] p-2 shadow-2xl" style={{ width: '393px', height: '852px' }}>
      {/* iPhone外壳 */}
      <div className="relative w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
        {/* 状态栏 */}
        <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center px-6 pt-3 pb-1 bg-transparent">
          {/* 左侧时间 */}
          <div className="text-black font-semibold text-[17px] leading-tight">
            2:58
          </div>
          
          {/* 右侧状态图标 */}
          <div className="flex items-center space-x-1">
            {/* 信号强度 */}
            <div className="flex items-center space-x-[2px]">
              <div className="w-[3px] h-[3px] bg-black rounded-full"></div>
              <div className="w-[3px] h-[5px] bg-black rounded-full"></div>
              <div className="w-[3px] h-[7px] bg-black rounded-full"></div>
              <div className="w-[3px] h-[9px] bg-black rounded-full"></div>
            </div>
            
            {/* WiFi图标 */}
            <Wifi className="w-4 h-4 text-black" strokeWidth={2.5} />
            
            {/* 电池 */}
            <div className="flex items-center">
              <span className="text-black font-medium text-[17px] mr-1">100</span>
              <Battery className="w-6 h-4 text-black fill-black" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="w-full h-full pt-12">
          {children}
        </div>

        {/* 底部Home Indicator */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-black rounded-full opacity-60"></div>
      </div>
    </div>
  );
};

export default IPhoneFrame;