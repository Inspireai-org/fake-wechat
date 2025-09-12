import React from 'react';
import { Wifi, Battery } from 'lucide-react';

interface iPhoneFrameProps {
  children: React.ReactNode;
}

const IPhoneFrame: React.FC<iPhoneFrameProps> = ({ children }) => {
  return (
    <div className="relative mx-auto bg-black rounded-[2rem] p-1.5 shadow-xl" style={{ width: '280px', height: '600px' }}>
      {/* iPhone外壳 */}
      <div className="relative w-full h-full bg-white rounded-[1.8rem] overflow-hidden">
        {/* 状态栏 */}
        <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center px-4 pt-2 pb-1 bg-transparent">
          {/* 左侧时间 */}
          <div className="text-black font-semibold text-sm leading-tight">
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
            <Wifi className="w-3 h-3 text-black" strokeWidth={2.5} />
            
            {/* 电池 */}
            <div className="flex items-center">
              <span className="text-black font-medium text-sm mr-1">100</span>
              <Battery className="w-5 h-3 text-black fill-black" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="w-full h-full pt-8">
          {children}
        </div>

        {/* 底部Home Indicator */}
        <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-black rounded-full opacity-60"></div>
      </div>
    </div>
  );
};

export default IPhoneFrame;