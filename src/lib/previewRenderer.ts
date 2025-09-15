import { Message, Participant, ChatData } from '../components/ChatInterface';

// 聊天状态快照接口
export interface ChatSnapshot {
  messages: Message[];
  currentMessageIndex: number;
  scrollPosition: number;
  typingUsers: string[];
  messageStatuses: Map<string, MessageStatus>;
  timestamp: number;
}

// 消息状态接口
export interface MessageStatus {
  status: 'sending' | 'sent' | 'read';
  timestamp: number;
}

// 预览配置接口
export interface PreviewConfig {
  width: number;
  height: number;
  scale: number;
  quality: number;
  backgroundColor: string;
  showScrollbar: boolean;
}

// 关键帧接口
export interface Keyframe {
  id: string;
  time: number;
  messageIndex: number;
  type: 'message' | 'typing' | 'voice' | 'image' | 'recall' | 'location' | 'pause';
  title: string;
  thumbnail?: string;
  metadata?: {
    speaker?: string;
    content?: string;
    duration?: number;
  };
}

/**
 * 预览渲染器类
 * 负责生成聊天状态快照和预览缩略图
 */
export class PreviewRenderer {
  private previewCanvas: OffscreenCanvas;
  private previewContext: OffscreenCanvasRenderingContext2D;
  private config: PreviewConfig;
  private chatData: ChatData;
  private keyframes: Keyframe[] = [];

  constructor(chatData: ChatData, config: Partial<PreviewConfig> = {}) {
    this.chatData = chatData;
    this.config = {
      width: 375,
      height: 667,
      scale: 0.3, // 缩略图缩放比例
      quality: 0.8,
      backgroundColor: '#F7F7F7',
      showScrollbar: false,
      ...config
    };

    // 创建离屏Canvas用于预览渲染
    this.previewCanvas = new OffscreenCanvas(
      this.config.width * this.config.scale,
      this.config.height * this.config.scale
    );
    
    const context = this.previewCanvas.getContext('2d');
    if (!context) {
      throw new Error('无法创建Canvas 2D上下文');
    }
    this.previewContext = context;

    // 初始化关键帧
    this.generateKeyframes();
  }

  /**
   * 生成关键帧数据
   * 自动检测重要的时间点，如消息、语音、图片等
   */
  private generateKeyframes(): void {
    this.keyframes = [];
    let accumulatedTime = 0;

    this.chatData.messages.forEach((message, index) => {
      const duration = this.getMessageDuration(message);
      
      // 为每条重要消息创建关键帧
      if (this.shouldCreateKeyframe(message)) {
        const keyframe: Keyframe = {
          id: `keyframe-${index}`,
          time: accumulatedTime,
          messageIndex: index,
          type: message.type || 'message',
          title: this.generateKeyframeTitle(message),
          metadata: {
            speaker: message.speaker,
            content: message.content,
            duration
          }
        };

        this.keyframes.push(keyframe);
      }

      accumulatedTime += duration;
    });
  }

  /**
   * 判断是否应该为消息创建关键帧
   */
  private shouldCreateKeyframe(message: Message): boolean {
    // 为以下类型的消息创建关键帧：
    // 1. 语音消息
    // 2. 图片消息
    // 3. 位置消息
    // 4. 撤回消息
    // 5. 长文本消息（超过50字符）
    // 6. 暂停节点
    
    if (['voice', 'image', 'location', 'recall', 'pause'].includes(message.type || '')) {
      return true;
    }

    // 长文本消息
    if (message.content && message.content.length > 50) {
      return true;
    }

    // 每隔5条普通消息创建一个关键帧
    return false; // 这里可以根据需要调整策略
  }

  /**
   * 生成关键帧标题
   */
  private generateKeyframeTitle(message: Message): string {
    switch (message.type) {
      case 'voice':
        return `${message.speaker}: 语音消息`;
      case 'image':
        return `${message.speaker}: 图片消息`;
      case 'location':
        return `${message.speaker}: 位置分享`;
      case 'recall':
        return `${message.speaker}: 撤回消息`;
      case 'typing':
        return `${message.speaker}: 正在输入...`;
      case 'pause':
        return `暂停 - ${message.description || ''}`;
      default:
        const preview = message.content ? 
          (message.content.length > 20 ? message.content.substring(0, 20) + '...' : message.content) : 
          '消息';
        return `${message.speaker}: ${preview}`;
    }
  }

  /**
   * 获取消息持续时间（毫秒）
   */
  private getMessageDuration(message: Message): number {
    if (message.type === 'pause') {
      return this.parseDescriptiveTime(message.duration);
    } else if (message.type === 'typing') {
      return this.parseDescriptiveTime(message.statusDuration || message.duration || '3s');
    } else if (message.type === 'recall') {
      return this.parseDescriptiveTime(message.recallDelay);
    } else {
      // 普通消息延迟
      if (message.animationDelay) {
        return this.parseDescriptiveTime(message.animationDelay);
      } else {
        // 根据内容长度自动调整
        const contentLength = message.content?.length || 0;
        const baseDelay = 1500;
        return Math.max(baseDelay, Math.min(contentLength * 50, 3000));
      }
    }
  }

  /**
   * 解析描述性时间为毫秒
   */
  private parseDescriptiveTime(duration: string | undefined): number {
    if (!duration) return 1500;
    
    const descriptiveTimeMap: Record<string, number> = {
      '稍后': 2000,
      '片刻后': 3000,
      '一会儿后': 4000,
      '很久之后': 8000,
      '许久之后': 10000,
      '短': 1000,
      'short': 1000,
      '中': 3000,
      'medium': 3000,
      '长': 5000,
      'long': 5000,
    };
    
    const normalizedDuration = duration.toLowerCase().replace(/\s+/g, '');
    if (descriptiveTimeMap[normalizedDuration]) {
      return descriptiveTimeMap[normalizedDuration];
    }
    
    const match = duration.match(/(\d+\.?\d*)\s*(秒|s|sec|second|分钟|m|min|minute|小时|h|hour)?/i);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2] || 's';
      
      switch (unit.toLowerCase()) {
        case '秒':
        case 's':
        case 'sec':
        case 'second':
          return value * 1000;
        case '分钟':
        case 'm':
        case 'min':
        case 'minute':
          return value * 60 * 1000;
        case '小时':
        case 'h':
        case 'hour':
          return value * 60 * 60 * 1000;
        default:
          return value * 1000;
      }
    }
    
    return 1500;
  }

  /**
   * 根据时间计算消息索引
   */
  private calculateMessageIndexFromTime(time: number): number {
    let accumulatedTime = 0;
    
    for (let i = 0; i < this.chatData.messages.length; i++) {
      const messageDuration = this.getMessageDuration(this.chatData.messages[i]);
      
      if (accumulatedTime + messageDuration > time) {
        return i;
      }
      
      accumulatedTime += messageDuration;
    }
    
    return this.chatData.messages.length - 1;
  }

  /**
   * 获取指定索引处的可见消息
   */
  private getVisibleMessagesAtIndex(messageIndex: number): Message[] {
    return this.chatData.messages.slice(0, messageIndex + 1);
  }

  /**
   * 获取指定索引处的正在输入用户
   */
  private getTypingUsersAtIndex(messageIndex: number): string[] {
    const typingUsers: string[] = [];
    
    // 检查当前消息是否为输入状态
    if (messageIndex >= 0 && messageIndex < this.chatData.messages.length) {
      const currentMessage = this.chatData.messages[messageIndex];
      if (currentMessage.type === 'typing' && currentMessage.speaker) {
        typingUsers.push(currentMessage.speaker);
      }
    }
    
    return typingUsers;
  }

  /**
   * 获取指定索引处的消息状态
   */
  private getMessageStatusesAtIndex(messageIndex: number): Map<string, MessageStatus> {
    const statuses = new Map<string, MessageStatus>();
    
    // 遍历到当前索引的所有消息，收集状态信息
    for (let i = 0; i <= messageIndex && i < this.chatData.messages.length; i++) {
      const message = this.chatData.messages[i];
      if (message.status && message.speaker) {
        statuses.set(`message-${i}`, {
          status: message.status,
          timestamp: Date.now() - (messageIndex - i) * 1000 // 模拟时间戳
        });
      }
    }
    
    return statuses;
  }

  /**
   * 计算指定索引处的滚动位置
   */
  private calculateScrollPositionAtIndex(messageIndex: number): number {
    const messageHeight = 60; // 平均消息高度
    const containerHeight = this.config.height;
    
    const totalHeight = messageIndex * messageHeight;
    
    if (totalHeight > containerHeight) {
      return totalHeight - containerHeight + messageHeight;
    }
    
    return 0;
  }

  /**
   * 生成指定时间点的聊天状态快照
   */
  public async generatePreview(time: number): Promise<ChatSnapshot> {
    const messageIndex = this.calculateMessageIndexFromTime(time);
    const messages = this.getVisibleMessagesAtIndex(messageIndex);
    const scrollPosition = this.calculateScrollPositionAtIndex(messageIndex);
    const typingUsers = this.getTypingUsersAtIndex(messageIndex);
    const messageStatuses = this.getMessageStatusesAtIndex(messageIndex);

    return {
      messages,
      currentMessageIndex: messageIndex,
      scrollPosition,
      typingUsers,
      messageStatuses,
      timestamp: Date.now()
    };
  }

  /**
   * 渲染聊天状态快照到Canvas
   */
  private async renderChatSnapshot(snapshot: ChatSnapshot): Promise<void> {
    const ctx = this.previewContext;
    const { width, height, scale } = this.config;
    
    // 清空画布
    ctx.fillStyle = this.config.backgroundColor;
    ctx.fillRect(0, 0, width * scale, height * scale);
    
    // 设置缩放
    ctx.save();
    ctx.scale(scale, scale);
    
    // 渲染背景
    ctx.fillStyle = '#F7F7F7';
    ctx.fillRect(0, 0, width, height);
    
    // 渲染消息列表
    await this.renderMessages(ctx, snapshot);
    
    // 渲染输入栏
    this.renderInputBar(ctx);
    
    // 渲染正在输入指示器
    if (snapshot.typingUsers.length > 0) {
      this.renderTypingIndicators(ctx, snapshot.typingUsers);
    }
    
    ctx.restore();
  }

  /**
   * 渲染消息列表
   */
  private async renderMessages(ctx: OffscreenCanvasRenderingContext2D, snapshot: ChatSnapshot): Promise<void> {
    const messageHeight = 60;
    const startY = 50; // 顶部导航栏高度
    const maxVisibleMessages = Math.floor((this.config.height - 100) / messageHeight); // 减去导航栏和输入栏
    
    // 计算可见消息范围
    const scrollOffset = Math.floor(snapshot.scrollPosition / messageHeight);
    const visibleMessages = snapshot.messages.slice(
      Math.max(0, scrollOffset),
      Math.min(snapshot.messages.length, scrollOffset + maxVisibleMessages)
    );
    
    // 渲染每条可见消息
    for (let i = 0; i < visibleMessages.length; i++) {
      const message = visibleMessages[i];
      const y = startY + i * messageHeight - (snapshot.scrollPosition % messageHeight);
      
      await this.renderMessage(ctx, message, y);
    }
  }

  /**
   * 渲染单条消息
   */
  private async renderMessage(ctx: OffscreenCanvasRenderingContext2D, message: Message, y: number): Promise<void> {
    const participant = this.getParticipant(message.speaker);
    const isCurrentUser = message.speaker === this.chatData.scene.participants[0]?.name;
    
    if (message.type === 'typing') {
      this.renderTypingMessage(ctx, message, participant, y);
    } else if (message.type === 'pause') {
      this.renderPauseMessage(ctx, message, y);
    } else {
      this.renderTextMessage(ctx, message, participant, isCurrentUser, y);
    }
  }

  /**
   * 渲染文本消息
   */
  private renderTextMessage(
    ctx: OffscreenCanvasRenderingContext2D, 
    message: Message, 
    participant: Participant | null, 
    isCurrentUser: boolean, 
    y: number
  ): void {
    const bubbleWidth = 180;
    const bubbleHeight = 40;
    const avatarSize = 28;
    const padding = 10;
    
    if (isCurrentUser) {
      // 当前用户消息（右侧）
      const bubbleX = this.config.width - bubbleWidth - avatarSize - padding * 2;
      const avatarX = this.config.width - avatarSize - padding;
      
      // 渲染消息气泡
      ctx.fillStyle = '#95EC69';
      this.roundRect(ctx, bubbleX, y, bubbleWidth, bubbleHeight, 8);
      ctx.fill();
      
      // 渲染消息文本
      ctx.fillStyle = '#000000';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      const text = message.content || '';
      const maxWidth = bubbleWidth - 20;
      this.wrapText(ctx, text, bubbleX + 10, y + bubbleHeight / 2, maxWidth, 14);
      
      // 渲染头像
      this.renderAvatar(ctx, participant, avatarX, y + 6, avatarSize);
      
    } else {
      // 其他用户消息（左侧）
      const avatarX = padding;
      const bubbleX = avatarSize + padding * 2;
      
      // 渲染头像
      this.renderAvatar(ctx, participant, avatarX, y + 6, avatarSize);
      
      // 渲染消息气泡
      ctx.fillStyle = '#FFFFFF';
      this.roundRect(ctx, bubbleX, y, bubbleWidth, bubbleHeight, 8);
      ctx.fill();
      
      // 渲染消息文本
      ctx.fillStyle = '#000000';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      const text = message.content || '';
      const maxWidth = bubbleWidth - 20;
      this.wrapText(ctx, text, bubbleX + 10, y + bubbleHeight / 2, maxWidth, 14);
    }
  }

  /**
   * 渲染输入状态消息
   */
  private renderTypingMessage(
    ctx: OffscreenCanvasRenderingContext2D, 
    message: Message, 
    participant: Participant | null, 
    y: number
  ): void {
    const avatarSize = 28;
    const padding = 10;
    const avatarX = padding;
    const indicatorX = avatarSize + padding * 2;
    
    // 渲染头像
    this.renderAvatar(ctx, participant, avatarX, y + 6, avatarSize);
    
    // 渲染输入指示器
    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, indicatorX, y + 10, 60, 20, 10);
    ctx.fill();
    
    // 渲染输入动画点
    ctx.fillStyle = '#999999';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(indicatorX + 15 + i * 10, y + 20, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * 渲染暂停消息
   */
  private renderPauseMessage(ctx: OffscreenCanvasRenderingContext2D, message: Message, y: number): void {
    ctx.fillStyle = '#999999';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const text = message.description || '暂停';
    ctx.fillText(text, this.config.width / 2, y + 20);
  }

  /**
   * 渲染头像
   */
  private renderAvatar(
    ctx: OffscreenCanvasRenderingContext2D, 
    participant: Participant | null, 
    x: number, 
    y: number, 
    size: number
  ): void {
    // 渲染头像背景
    ctx.fillStyle = participant ? '#4A90E2' : '#CCCCCC';
    this.roundRect(ctx, x, y, size, size, 4);
    ctx.fill();
    
    // 渲染头像文字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${size * 0.4}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const initial = participant?.name?.charAt(0) || '?';
    ctx.fillText(initial, x + size / 2, y + size / 2);
  }

  /**
   * 渲染输入栏
   */
  private renderInputBar(ctx: OffscreenCanvasRenderingContext2D): void {
    const inputHeight = 50;
    const y = this.config.height - inputHeight;
    
    // 渲染输入栏背景
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, y, this.config.width, inputHeight);
    
    // 渲染输入框
    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, 10, y + 10, this.config.width - 80, 30, 15);
    ctx.fill();
    
    // 渲染发送按钮
    ctx.fillStyle = '#1AAD19';
    this.roundRect(ctx, this.config.width - 60, y + 10, 50, 30, 15);
    ctx.fill();
  }

  /**
   * 渲染正在输入指示器
   */
  private renderTypingIndicators(ctx: OffscreenCanvasRenderingContext2D, typingUsers: string[]): void {
    // 简化实现，在输入栏上方显示正在输入提示
    const y = this.config.height - 70;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    const text = `${typingUsers.join(', ')} 正在输入...`;
    ctx.fillText(text, 10, y);
  }

  /**
   * 获取参与者信息
   */
  private getParticipant(name?: string): Participant | null {
    if (!name) return null;
    return this.chatData.scene.participants.find(p => p.name === name) || null;
  }

  /**
   * 绘制圆角矩形
   */
  private roundRect(
    ctx: OffscreenCanvasRenderingContext2D, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * 文本换行渲染
   */
  private wrapText(
    ctx: OffscreenCanvasRenderingContext2D, 
    text: string, 
    x: number, 
    y: number, 
    maxWidth: number, 
    lineHeight: number
  ): void {
    const words = text.split('');
    let line = '';
    let currentY = y - lineHeight / 2;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && i > 0) {
        ctx.fillText(line, x, currentY);
        line = words[i];
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    
    ctx.fillText(line, x, currentY);
  }

  /**
   * 生成预览缩略图
   */
  public async renderThumbnail(snapshot: ChatSnapshot): Promise<string> {
    await this.renderChatSnapshot(snapshot);
    
    // 转换为ImageBitmap然后生成DataURL
    const imageBitmap = this.previewCanvas.transferToImageBitmap();
    
    // 创建临时Canvas用于转换
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.previewCanvas.width;
    tempCanvas.height = this.previewCanvas.height;
    
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      throw new Error('无法创建临时Canvas上下文');
    }
    
    tempCtx.drawImage(imageBitmap, 0, 0);
    
    return tempCanvas.toDataURL('image/jpeg', this.config.quality);
  }

  /**
   * 获取关键帧列表
   */
  public getKeyframes(): Keyframe[] {
    return [...this.keyframes];
  }

  /**
   * 根据时间获取最近的关键帧
   */
  public getNearestKeyframe(time: number): Keyframe | null {
    if (this.keyframes.length === 0) return null;
    
    let nearestKeyframe = this.keyframes[0];
    let minDistance = Math.abs(nearestKeyframe.time - time);
    
    for (const keyframe of this.keyframes) {
      const distance = Math.abs(keyframe.time - time);
      if (distance < minDistance) {
        minDistance = distance;
        nearestKeyframe = keyframe;
      }
    }
    
    return nearestKeyframe;
  }

  /**
   * 更新聊天数据
   */
  public updateChatData(chatData: ChatData): void {
    this.chatData = chatData;
    this.generateKeyframes();
  }

  /**
   * 更新预览配置
   */
  public updateConfig(config: Partial<PreviewConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 重新创建Canvas如果尺寸发生变化
    if (config.width || config.height || config.scale) {
      this.previewCanvas = new OffscreenCanvas(
        this.config.width * this.config.scale,
        this.config.height * this.config.scale
      );
      
      const context = this.previewCanvas.getContext('2d');
      if (!context) {
        throw new Error('无法创建Canvas 2D上下文');
      }
      this.previewContext = context;
    }
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    // OffscreenCanvas会自动清理，这里主要是清理引用
    this.keyframes = [];
  }
}

/**
 * 创建预览渲染器实例
 */
export function createPreviewRenderer(
  chatData: ChatData, 
  config?: Partial<PreviewConfig>
): PreviewRenderer {
  return new PreviewRenderer(chatData, config);
}