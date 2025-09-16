import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Message, Participant, ChatScene } from './ChatInterface';
import { MessageBubble } from './MessageBubble';
import { TimeStamp } from './TimeStamp';
import { TypingIndicator } from './TypingIndicator';
import { LocationMessage } from './LocationMessage';
import { PauseIndicator } from './PauseIndicator';
import { VoiceMessage } from './VoiceMessage';
import { ImageMessage } from './ImageMessage';
import { RecallMessage } from './RecallMessage';

interface VirtualizedMessageListProps {
  messages: Message[];
  scene: ChatScene;
  currentMessageIndex: number;
  isPlaying: boolean;
  playMode?: 'normal' | 'loop' | 'preview';
  containerHeight: number;
  onScrollPositionChange?: (position: number) => void;
  scrollPosition?: number;
}

interface VirtualItem {
  index: number;
  height: number;
  offset: number;
  message: Message;
}

// 消息类型的预估高度
const MESSAGE_HEIGHT_ESTIMATES = {
  message: 60,      // 普通文字消息
  typing: 45,       // 输入状态
  pause: 30,        // 暂停指示器
  location: 120,    // 位置消息
  voice: 70,        // 语音消息
  image: 150,       // 图片消息
  recall: 50,       // 撤回消息
  timestamp: 25     // 时间戳
} as const;

// 缓冲区大小（在可见区域外渲染的项目数量）
const BUFFER_SIZE = 5;

export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  scene,
  currentMessageIndex,
  isPlaying,
  playMode = 'normal',
  containerHeight,
  onScrollPositionChange,
  scrollPosition = 0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(scrollPosition);
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // 获取参与者信息
  const getParticipant = useCallback((name: string) => {
    return scene.participants.find(p => p.name === name);
  }, [scene.participants]);

  // 计算可见消息列表
  const visibleMessages = useMemo(() => {
    if (playMode === 'preview' || !isPlaying) {
      return messages;
    } else {
      return messages.slice(0, Math.max(0, currentMessageIndex + 1));
    }
  }, [messages, playMode, isPlaying, currentMessageIndex]);

  // 计算每个消息项的高度（包括时间戳）
  const getItemHeight = useCallback((index: number): number => {
    // 先检查是否有实际测量的高度
    const measuredHeight = itemHeights.get(index);
    if (measuredHeight) {
      return measuredHeight;
    }

    // 使用预估高度
    const message = visibleMessages[index];
    if (!message) return MESSAGE_HEIGHT_ESTIMATES.message;

    let height = MESSAGE_HEIGHT_ESTIMATES[message.type || 'message'];
    
    // 如果有时间戳，增加高度
    if (message.time) {
      height += MESSAGE_HEIGHT_ESTIMATES.timestamp;
    }

    // 根据内容长度调整高度（简单估算）
    if (message.content && message.content.length > 50) {
      const extraLines = Math.ceil((message.content.length - 50) / 25);
      height += extraLines * 20;
    }

    return height;
  }, [visibleMessages, itemHeights]);

  // 计算虚拟项目列表
  const virtualItems = useMemo((): VirtualItem[] => {
    const items: VirtualItem[] = [];
    let offset = 0;

    for (let i = 0; i < visibleMessages.length; i++) {
      const height = getItemHeight(i);
      items.push({
        index: i,
        height,
        offset,
        message: visibleMessages[i]
      });
      offset += height;
    }

    return items;
  }, [visibleMessages, getItemHeight]);

  // 计算总高度
  const totalHeight = useMemo(() => {
    return virtualItems.reduce((sum, item) => sum + item.height, 0);
  }, [virtualItems]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const start = Math.max(0, 
      virtualItems.findIndex(item => item.offset + item.height > scrollTop) - BUFFER_SIZE
    );
    
    const end = Math.min(virtualItems.length - 1,
      virtualItems.findIndex(item => item.offset > scrollTop + containerHeight) + BUFFER_SIZE
    );

    return {
      start: start === -1 ? 0 : start,
      end: end === -1 ? virtualItems.length - 1 : end
    };
  }, [virtualItems, scrollTop, containerHeight]);

  // 获取可见的虚拟项目
  const visibleVirtualItems = useMemo(() => {
    return virtualItems.slice(visibleRange.start, visibleRange.end + 1);
  }, [virtualItems, visibleRange]);

  // 测量实际高度
  const measureItemHeight = useCallback((index: number, element: HTMLDivElement) => {
    const height = element.getBoundingClientRect().height;
    setItemHeights(prev => {
      const newMap = new Map(prev);
      newMap.set(index, height);
      return newMap;
    });
  }, []);

  // 处理滚动事件
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScrollPositionChange?.(newScrollTop);
  }, [onScrollPositionChange]);

  // 同步外部滚动位置
  useEffect(() => {
    if (containerRef.current && Math.abs(scrollTop - scrollPosition) > 1) {
      containerRef.current.scrollTop = scrollPosition;
      setScrollTop(scrollPosition);
    }
  }, [scrollPosition, scrollTop]);

  // 自动滚动到最新消息（播放模式）
  useEffect(() => {
    if (isPlaying && playMode !== 'preview' && containerRef.current) {
      const lastItemIndex = visibleMessages.length - 1;
      if (lastItemIndex >= 0) {
        const lastItem = virtualItems[lastItemIndex];
        if (lastItem) {
          const targetScrollTop = Math.max(0, lastItem.offset + lastItem.height - containerHeight);
          containerRef.current.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [currentMessageIndex, isPlaying, playMode, virtualItems, containerHeight, visibleMessages.length]);

  // 渲染单个消息项
  const renderMessageItem = useCallback((virtualItem: VirtualItem) => {
    const { index, message } = virtualItem;
    const participant = message.speaker ? getParticipant(message.speaker) : null;
    const isCurrentUser = message.speaker === scene.participants[0]?.name;

    // 创建ref回调来测量高度
    const refCallback = (element: HTMLDivElement | null) => {
      if (element) {
        itemRefs.current.set(index, element);
        measureItemHeight(index, element);
      } else {
        itemRefs.current.delete(index);
      }
    };

    const commonProps = {
      key: index,
      ref: refCallback,
      style: {
        position: 'absolute' as const,
        top: virtualItem.offset,
        width: '100%',
        minHeight: virtualItem.height
      }
    };

    if (message.type === 'pause') {
      return (
        <div {...commonProps}>
          <PauseIndicator
            duration={message.duration || ''}
            description={message.description || ''}
          />
        </div>
      );
    }

    if (message.type === 'typing') {
      return (
        <div {...commonProps}>
          <TypingIndicator
            participant={participant}
            isCurrentUser={isCurrentUser}
            isActive={index === currentMessageIndex && isPlaying}
            duration={message.statusDuration}
          />
        </div>
      );
    }

    if (message.type === 'location') {
      return (
        <div {...commonProps}>
          <LocationMessage
            message={message}
            participant={participant}
            isCurrentUser={isCurrentUser}
          />
        </div>
      );
    }

    if (message.type === 'voice') {
      return (
        <div {...commonProps} className="space-y-2 px-2">
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
        <div {...commonProps} className="space-y-2 px-2">
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
      // 计算连续撤回的索引
      let recallIndex = 0;
      if (index > 0) {
        for (let i = index - 1; i >= 0; i--) {
          if (visibleMessages[i].type === 'recall') {
            recallIndex++;
          } else {
            break;
          }
        }
      }

      return (
        <div {...commonProps} className="space-y-2 px-2">
          {message.time && <TimeStamp time={message.time} />}
          <RecallMessage
            originalMessage={message}
            recallDelay={message.recallDelay}
            showReEdit={false}
            index={recallIndex}
          />
        </div>
      );
    }

    // 普通文字消息
    return (
      <div {...commonProps} className="space-y-2 px-2">
        {message.time && <TimeStamp time={message.time} />}
        <MessageBubble
          message={message}
          participant={participant}
          isCurrentUser={isCurrentUser}
        />
      </div>
    );
  }, [getParticipant, scene.participants, currentMessageIndex, isPlaying, measureItemHeight, visibleMessages]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto scrollbar-hide"
      onScroll={handleScroll}
      style={{ height: containerHeight }}
    >
      {/* 虚拟容器 */}
      <div
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        {/* 渲染可见的消息项 */}
        {visibleVirtualItems.map(renderMessageItem)}
      </div>
    </div>
  );
};