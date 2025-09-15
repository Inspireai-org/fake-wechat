import { Message } from '../components/ChatInterface';
import { Keyframe } from '../components/TimelineControl';

// 时间轴段落接口
export interface TimelineSegment {
  startTime: number;
  endTime: number;
  messageIndex: number;
  type: 'message' | 'pause' | 'typing' | 'animation' | 'status';
  duration: number;
  metadata: {
    speaker?: string;
    content?: string;
    animationType?: string;
    messageType?: string;
  };
}

// 时间轴标记接口
export interface TimelineMarker {
  time: number;
  type: 'chapter' | 'bookmark' | 'error' | 'highlight';
  label: string;
  color: string;
}

// 时间轴数据接口
export interface TimelineData {
  totalDuration: number;
  segments: TimelineSegment[];
  keyframes: Keyframe[];
  markers: TimelineMarker[];
}

// 时间计算配置接口
export interface TimeCalculationConfig {
  // 基础时长配置
  baseMessageDelay: number;        // 基础消息延迟 (ms)
  typingSpeed: number;             // 打字速度 (字符/秒)
  minTypingDuration: number;       // 最小打字时长 (ms)
  maxTypingDuration: number;       // 最大打字时长 (ms)
  
  // 特殊消息类型时长
  voiceMessageDelay: number;       // 语音消息延迟 (ms)
  imageMessageDelay: number;       // 图片消息延迟 (ms)
  locationMessageDelay: number;    // 位置消息延迟 (ms)
  recallMessageDelay: number;      // 撤回消息延迟 (ms)
  
  // 状态持续时长
  statusDuration: {
    short: number;
    medium: number;
    long: number;
  };
  
  // 描述性时间映射
  descriptiveTimeMap: Record<string, number>;
}

// 默认时间计算配置
const DEFAULT_CONFIG: TimeCalculationConfig = {
  baseMessageDelay: 1500,
  typingSpeed: 3, // 3字符/秒
  minTypingDuration: 1000,
  maxTypingDuration: 8000,
  
  voiceMessageDelay: 2000,
  imageMessageDelay: 2500,
  locationMessageDelay: 2000,
  recallMessageDelay: 1000,
  
  statusDuration: {
    short: 1000,
    medium: 3000,
    long: 5000
  },
  
  descriptiveTimeMap: {
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
    '极短': 500,
    'very-short': 500,
    '极长': 10000,
    'very-long': 10000
  }
};

/**
 * 时间轴计算器类
 * 负责精确计算时间与消息索引的双向转换，关键帧检测等
 */
export class TimelineCalculator {
  private config: TimeCalculationConfig;
  private messages: Message[];
  private segments: TimelineSegment[];
  private keyframes: Keyframe[];
  private totalDuration: number;

  constructor(messages: Message[], config: Partial<TimeCalculationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.messages = messages;
    this.segments = [];
    this.keyframes = [];
    this.totalDuration = 0;
    
    this.calculateTimeline();
  }

  /**
   * 解析描述性时间字符串
   */
  private parseDescriptiveTime(duration: string | undefined): number {
    if (!duration) return this.config.baseMessageDelay;
    
    const normalizedDuration = duration.toLowerCase().replace(/\s+/g, '');
    
    // 检查描述性时间映射
    if (this.config.descriptiveTimeMap[normalizedDuration]) {
      return this.config.descriptiveTimeMap[normalizedDuration];
    }
    
    // 解析具体时间值（如 "2秒", "3s", "1分钟" 等）
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
    
    return this.config.baseMessageDelay;
  }

  /**
   * 计算单条消息的持续时间
   */
  private calculateMessageDuration(message: Message): number {
    switch (message.type) {
      case 'pause':
        return this.parseDescriptiveTime(message.duration);
        
      case 'typing':
        // 根据内容长度和打字速度计算
        const content = message.content || '';
        const calculatedDuration = Math.max(
          this.config.minTypingDuration,
          Math.min(
            this.config.maxTypingDuration,
            (content.length / this.config.typingSpeed) * 1000
          )
        );
        
        // 如果指定了状态持续时间，使用指定值
        if (message.statusDuration) {
          const statusDuration = this.config.statusDuration[message.statusDuration as keyof typeof this.config.statusDuration];
          return statusDuration || calculatedDuration;
        }
        
        return calculatedDuration;
        
      case 'voice':
        // 语音消息：解析语音时长 + 基础延迟
        const voiceDuration = this.parseVoiceDuration(message.voiceDuration);
        return voiceDuration + this.config.voiceMessageDelay;
        
      case 'image':
        return this.config.imageMessageDelay;
        
      case 'location':
        return this.config.locationMessageDelay;
        
      case 'recall':
        return this.parseDescriptiveTime(message.recallDelay) || this.config.recallMessageDelay;
        
      default:
        // 普通消息：根据内容长度和动画延迟计算
        if (message.animationDelay) {
          return this.parseDescriptiveTime(message.animationDelay);
        }
        
        // 根据内容长度自动计算
        const contentLength = message.content?.length || 0;
        const baseDuration = this.config.baseMessageDelay;
        const contentFactor = Math.min(contentLength * 50, 2000); // 最多增加2秒
        
        return baseDuration + contentFactor;
    }
  }

  /**
   * 解析语音时长
   */
  private parseVoiceDuration(voiceDuration: string | undefined): number {
    if (!voiceDuration) return 3000; // 默认3秒
    
    // 解析 "10"" 格式
    const match = voiceDuration.match(/(\d+)[""]?/);
    if (match) {
      return parseInt(match[1]) * 1000;
    }
    
    return 3000;
  }

  /**
   * 计算完整时间轴
   */
  private calculateTimeline(): void {
    this.segments = [];
    this.keyframes = [];
    let currentTime = 0;

    for (let i = 0; i < this.messages.length; i++) {
      const message = this.messages[i];
      const duration = this.calculateMessageDuration(message);
      
      // 创建时间轴段落
      const segment: TimelineSegment = {
        startTime: currentTime,
        endTime: currentTime + duration,
        messageIndex: i,
        type: this.getSegmentType(message),
        duration,
        metadata: {
          speaker: message.speaker,
          content: message.content,
          messageType: message.type,
          animationType: this.getAnimationType(message)
        }
      };
      
      this.segments.push(segment);
      
      // 检测并创建关键帧
      if (this.isKeyframeMessage(message)) {
        const keyframe = this.createKeyframe(message, i, currentTime);
        this.keyframes.push(keyframe);
      }
      
      currentTime += duration;
    }
    
    this.totalDuration = currentTime;
  }

  /**
   * 获取段落类型
   */
  private getSegmentType(message: Message): TimelineSegment['type'] {
    switch (message.type) {
      case 'pause':
        return 'pause';
      case 'typing':
        return 'typing';
      case 'recall':
        return 'animation';
      default:
        return 'message';
    }
  }

  /**
   * 获取动画类型
   */
  private getAnimationType(message: Message): string {
    switch (message.type) {
      case 'typing':
        return 'typing-indicator';
      case 'recall':
        return 'message-recall';
      case 'voice':
        return 'voice-message';
      case 'image':
        return 'image-message';
      case 'location':
        return 'location-message';
      default:
        return 'message-appear';
    }
  }

  /**
   * 判断是否为关键帧消息
   */
  private isKeyframeMessage(message: Message): boolean {
    // 特殊类型消息都是关键帧
    if (['voice', 'image', 'location', 'recall', 'typing'].includes(message.type || '')) {
      return true;
    }
    
    // 长消息也是关键帧
    if ((message.content?.length || 0) > 50) {
      return true;
    }
    
    // 有特殊动画延迟的消息
    if (message.animationDelay && message.animationDelay !== 'short') {
      return true;
    }
    
    return false;
  }

  /**
   * 创建关键帧
   */
  private createKeyframe(message: Message, index: number, time: number): Keyframe {
    const getKeyframeColor = (type: string): string => {
      switch (type) {
        case 'voice':
          return '#10B981'; // 绿色
        case 'image':
          return '#3B82F6'; // 蓝色
        case 'location':
          return '#EF4444'; // 红色
        case 'recall':
          return '#F59E0B'; // 黄色
        case 'typing':
          return '#8B5CF6'; // 紫色
        case 'pause':
          return '#6B7280'; // 灰色
        default:
          return '#06B6D4'; // 青色
      }
    };

    const getKeyframeTitle = (message: Message): string => {
      switch (message.type) {
        case 'voice':
          return `语音消息 (${message.voiceDuration || '3"'})`;
        case 'image':
          return '图片消息';
        case 'location':
          return '位置消息';
        case 'recall':
          return '撤回消息';
        case 'typing':
          return '正在输入...';
        case 'pause':
          return `暂停 (${message.duration || '短'})`;
        default:
          const content = message.content || '';
          return content.length > 20 ? content.substring(0, 20) + '...' : content;
      }
    };

    return {
      id: `keyframe-${index}-${time}`,
      time,
      messageIndex: index,
      type: (message.type as Keyframe['type']) || 'message',
      title: getKeyframeTitle(message),
      color: getKeyframeColor(message.type || 'message')
    };
  }

  /**
   * 根据时间计算消息索引
   */
  public getMessageIndexFromTime(time: number): number {
    // 边界检查
    if (time <= 0) return -1;
    if (time >= this.totalDuration) return this.messages.length - 1;

    // 二分查找最优化
    let left = 0;
    let right = this.segments.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const segment = this.segments[mid];
      
      if (time >= segment.startTime && time < segment.endTime) {
        return segment.messageIndex;
      } else if (time < segment.startTime) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    
    // 如果没有找到精确匹配，返回最接近的索引
    const closestSegment = this.segments.find(segment => 
      time >= segment.startTime && time <= segment.endTime
    );
    
    return closestSegment ? closestSegment.messageIndex : this.messages.length - 1;
  }

  /**
   * 根据消息索引计算时间
   */
  public getTimeFromMessageIndex(index: number): number {
    // 边界检查
    if (index < 0) return 0;
    if (index >= this.segments.length) return this.totalDuration;

    return this.segments[index].startTime;
  }

  /**
   * 根据进度百分比计算时间
   */
  public getTimeFromProgress(progress: number): number {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    return clampedProgress * this.totalDuration;
  }

  /**
   * 根据时间计算进度百分比
   */
  public getProgressFromTime(time: number): number {
    if (this.totalDuration === 0) return 0;
    return Math.max(0, Math.min(1, time / this.totalDuration));
  }

  /**
   * 获取指定时间范围内的消息索引列表
   */
  public getMessageIndicesInTimeRange(startTime: number, endTime: number): number[] {
    const indices: number[] = [];
    
    for (const segment of this.segments) {
      if (segment.startTime < endTime && segment.endTime > startTime) {
        indices.push(segment.messageIndex);
      }
    }
    
    return indices.sort((a, b) => a - b);
  }

  /**
   * 获取下一个关键帧
   */
  public getNextKeyframe(currentTime: number): Keyframe | null {
    const nextKeyframe = this.keyframes.find(keyframe => keyframe.time > currentTime);
    return nextKeyframe || null;
  }

  /**
   * 获取上一个关键帧
   */
  public getPreviousKeyframe(currentTime: number): Keyframe | null {
    const previousKeyframes = this.keyframes.filter(keyframe => keyframe.time < currentTime);
    return previousKeyframes.length > 0 ? previousKeyframes[previousKeyframes.length - 1] : null;
  }

  /**
   * 获取最接近指定时间的关键帧
   */
  public getClosestKeyframe(time: number, tolerance: number = 500): Keyframe | null {
    let closestKeyframe: Keyframe | null = null;
    let minDistance = Infinity;
    
    for (const keyframe of this.keyframes) {
      const distance = Math.abs(keyframe.time - time);
      if (distance <= tolerance && distance < minDistance) {
        minDistance = distance;
        closestKeyframe = keyframe;
      }
    }
    
    return closestKeyframe;
  }

  /**
   * 像素级精确进度计算
   */
  public calculatePixelPreciseProgress(
    pixelPosition: number, 
    containerWidth: number
  ): { time: number; messageIndex: number; progress: number } {
    const progress = Math.max(0, Math.min(1, pixelPosition / containerWidth));
    const time = this.getTimeFromProgress(progress);
    const messageIndex = this.getMessageIndexFromTime(time);
    
    return { time, messageIndex, progress };
  }

  /**
   * 获取时间轴数据
   */
  public getTimelineData(): TimelineData {
    return {
      totalDuration: this.totalDuration,
      segments: [...this.segments],
      keyframes: [...this.keyframes],
      markers: [] // 可以在后续版本中添加标记功能
    };
  }

  /**
   * 获取段落信息
   */
  public getSegmentAtTime(time: number): TimelineSegment | null {
    return this.segments.find(segment => 
      time >= segment.startTime && time < segment.endTime
    ) || null;
  }

  /**
   * 获取消息在时间轴中的位置信息
   */
  public getMessageTimeInfo(messageIndex: number): {
    startTime: number;
    endTime: number;
    duration: number;
    progress: number;
  } | null {
    const segment = this.segments[messageIndex];
    if (!segment) return null;
    
    return {
      startTime: segment.startTime,
      endTime: segment.endTime,
      duration: segment.duration,
      progress: this.getProgressFromTime(segment.startTime)
    };
  }

  /**
   * 更新消息列表并重新计算时间轴
   */
  public updateMessages(messages: Message[]): void {
    this.messages = messages;
    this.calculateTimeline();
  }

  /**
   * 获取性能统计信息
   */
  public getPerformanceStats(): {
    totalMessages: number;
    totalDuration: number;
    averageMessageDuration: number;
    keyframeCount: number;
    segmentCount: number;
  } {
    const averageMessageDuration = this.segments.length > 0 
      ? this.totalDuration / this.segments.length 
      : 0;

    return {
      totalMessages: this.messages.length,
      totalDuration: this.totalDuration,
      averageMessageDuration,
      keyframeCount: this.keyframes.length,
      segmentCount: this.segments.length
    };
  }
}

/**
 * 创建时间轴计算器实例的工厂函数
 */
export function createTimelineCalculator(
  messages: Message[], 
  config?: Partial<TimeCalculationConfig>
): TimelineCalculator {
  return new TimelineCalculator(messages, config);
}

/**
 * 时间格式化工具函数
 */
export const timeUtils = {
  /**
   * 格式化毫秒为 MM:SS 格式
   */
  formatTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  },

  /**
   * 格式化毫秒为详细时间格式
   */
  formatDetailedTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
  },

  /**
   * 解析时间字符串为毫秒
   */
  parseTimeString(timeString: string): number {
    const parts = timeString.split(':').map(Number);
    if (parts.length === 2) {
      return (parts[0] * 60 + parts[1]) * 1000;
    } else if (parts.length === 3) {
      return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
    }
    return 0;
  }
};

export default TimelineCalculator;