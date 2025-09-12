import React, { useState, useRef, useEffect } from 'react';
import { ChatInterface, ChatData } from './components/ChatInterface';
import { ConfigPanel } from './components/ConfigPanel';
import { PlaybackControls } from './components/PlaybackControls';
import { useAnimationControl } from './hooks/useAnimationControl';
import { useGifExport } from './hooks/useGifExport';
import { parseYamlConfig, generateYamlConfig } from './lib/yamlParser';
import WeChatNavBar from './components/WeChatNavBar';
import IPhoneFrame from './components/iPhoneFrame';

function App() {
  const [chatData, setChatData] = useState<ChatData>({
    scene: {
      title: "朋友间的对话",
      participants: [
        { name: "小明", avatar: "" },
        { name: "小红", avatar: "" }
      ]
    },
    messages: [
      {
        speaker: "小明",
        content: "你今天有空吗？",
        time: "10:30",
        type: "message"
      },
      {
        speaker: "小红",
        content: "现在在忙，等会儿联系你",
        time: "10:31",
        type: "message"
      }
    ]
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 动画控制
  const [animationState, animationControls] = useAnimationControl({
    messages: chatData.messages,
    onAnimationComplete: () => {
      console.log('Animation completed');
    }
  });

  // GIF导出
  const { exportState, exportToGif, resetExportState } = useGifExport();
  
  // 处理聊天数据更新
  const handleChatDataChange = (newChatData: ChatData) => {
    setChatData(newChatData);
  };
  
  // 处理YAML更新
  const handleYamlChange = (yaml: string) => {
    try {
      const newChatData = parseYamlConfig(yaml);
      setChatData(newChatData);
    } catch (error) {
      console.error('Failed to parse YAML:', error);
    }
  };
  
  // 处理GIF导出
  const handleExportGif = () => {
    if (chatContainerRef.current) {
      exportToGif(chatContainerRef, chatData.messages);
    }
  };



  // 监听消息索引更新事件（用于GIF导出）
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleUpdateMessageIndex = (event: CustomEvent) => {
      animationControls.goToMessage(event.detail);
    };

    container.addEventListener('updateMessageIndex', handleUpdateMessageIndex as EventListener);
    return () => {
      container.removeEventListener('updateMessageIndex', handleUpdateMessageIndex as EventListener);
    };
  }, [animationControls]);

  // 加载默认YAML配置
  useEffect(() => {
    fetch('/sample.yaml')
      .then(response => response.text())
      .then(yaml => {
        try {
          const defaultChatData = parseYamlConfig(yaml);
          setChatData(defaultChatData);
        } catch (error) {
          console.error('Failed to load default YAML:', error);
        }
      })
      .catch(error => {
        console.error('Failed to fetch sample.yaml:', error);
      });
  }, []);

  return (
    <div className="h-screen w-screen bg-gray-100 flex">
      {/* 左侧：手机预览区域 */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <IPhoneFrame>
          <div ref={chatContainerRef} className="h-full w-full flex flex-col">
            <WeChatNavBar 
              contactName={chatData.scene.participants.find((p: { name: string }) => p.name !== chatData.scene.participants[0]?.name)?.name || '聊天'}
            />
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                chatData={chatData}
                currentMessageIndex={animationState.currentMessageIndex}
                isPlaying={animationState.isPlaying}
              />
            </div>
          </div>
        </IPhoneFrame>
        
        {/* 播放控制器 */}
        <div className="mt-3 w-full max-w-sm">
          <PlaybackControls
            animationState={animationState}
            animationControls={animationControls}
            onExportGif={handleExportGif}
            isExporting={exportState.isExporting}
          />
        </div>
      </div>
      
      {/* 右侧：配置面板 */}
      <ConfigPanel
        chatData={chatData}
        onChatDataChange={handleChatDataChange}
        onYamlChange={handleYamlChange}
      />
    </div>
  );
}

export default App;
