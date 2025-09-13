import yaml from 'js-yaml';
import { ChatData, Message, Participant } from '../components/ChatInterface';

export interface YamlConfig {
  scene: {
    title: string;
    participants: Array<{
      name: string;
      avatar: string;
    }>;
    theme?: {
      primaryColor?: string;
      backgroundColor?: string;
      fontFamily?: string;
    };
    animation?: {
      globalSpeed?: number;
      defaultDelay?: 'short' | 'medium' | 'long';
    };
  };
  messages: Array<{
    speaker?: string;
    content?: string;
    time?: string;
    type?: string;
    duration?: string;
    description?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    // New fields for enhanced features
    voiceDuration?: string;
    voiceText?: string;
    imageUrl?: string | string[];
    imageDescription?: string;
    status?: 'sending' | 'sent' | 'read';
    statusDuration?: 'short' | 'medium' | 'long';
    animationDelay?: 'short' | 'medium' | 'long';
    recalled?: boolean;
    recallDelay?: 'short' | 'medium' | 'long';
    hesitate?: boolean;
    originalMessage?: string;
  }>;
}

/**
 * 解析YAML配置文件
 */
export function parseYamlConfig(yamlContent: string): ChatData {
  try {
    const config = yaml.load(yamlContent) as YamlConfig;
    
    if (!config || !config.scene || !config.messages) {
      throw new Error('Invalid YAML structure: missing scene or messages');
    }

    // 转换参与者数据
    const participants: Participant[] = config.scene.participants.map(p => ({
      name: p.name,
      avatar: p.avatar
    }));

    // 转换消息数据
    const messages: Message[] = config.messages.map(m => {
      const message: Message = {
        speaker: m.speaker,
        content: m.content,
        time: m.time,
        type: (m.type as Message['type']) || 'message'
      };

      // 处理特殊类型的消息
      if (m.type === 'pause') {
        message.duration = m.duration;
        message.description = m.description;
      } else if (m.type === 'typing') {
        message.duration = m.duration;
      } else if (m.type === 'location') {
        message.coordinates = m.coordinates;
      } else if (m.type === 'voice') {
        message.voiceDuration = m.voiceDuration;
        message.voiceText = m.voiceText;
      } else if (m.type === 'image') {
        message.imageUrl = m.imageUrl;
        message.imageDescription = m.imageDescription;
      } else if (m.type === 'recall') {
        message.content = m.originalMessage;
        message.recalled = true;
        message.recallDelay = m.recallDelay;
      }

      // 处理通用字段
      if (m.status) message.status = m.status;
      if (m.statusDuration) message.statusDuration = m.statusDuration;
      if (m.animationDelay) message.animationDelay = m.animationDelay;

      return message;
    });

    // 构建ChatData对象
    const chatData: ChatData = {
      scene: {
        title: config.scene.title,
        participants
      },
      messages
    };

    // 添加动画配置
    if (config.scene.animation) {
      chatData.animationConfig = {
        globalSpeed: config.scene.animation.globalSpeed || 1.0,
        defaultDelay: config.scene.animation.defaultDelay || 'medium',
        enableEffects: {
          textReveal: false,
          focusEffect: false,
          blurBackground: false
        }
      };
    }

    // 添加主题配置
    if (config.scene.theme) {
      chatData.theme = {
        primaryColor: config.scene.theme.primaryColor || '#95EC69',
        backgroundColor: config.scene.theme.backgroundColor || '#F7F7F7',
        fontFamily: config.scene.theme.fontFamily
      };
    }

    return chatData;
  } catch (error) {
    console.error('Failed to parse YAML:', error);
    throw new Error(`YAML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 生成YAML配置文件内容
 */
export function generateYamlConfig(chatData: ChatData): string {
  const config: YamlConfig = {
    scene: {
      title: chatData.scene.title,
      participants: chatData.scene.participants.map(p => ({
        name: p.name,
        avatar: p.avatar
      }))
    },
    messages: chatData.messages.map(m => {
      const message: Record<string, unknown> = {
        speaker: m.speaker,
        content: m.content,
        time: m.time
      };

      if (m.type && m.type !== 'message') {
        message.type = m.type;
      }

      if (m.type === 'pause') {
        message.duration = m.duration;
        message.description = m.description;
      } else if (m.type === 'typing') {
        message.duration = m.duration;
      } else if (m.type === 'location') {
        message.coordinates = m.coordinates;
      }

      return message;
    })
  };

  return yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true
  });
}

/**
 * 验证YAML配置的有效性
 */
export function validateYamlConfig(yamlContent: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const config = yaml.load(yamlContent) as YamlConfig;
    
    if (!config) {
      errors.push('YAML content is empty or invalid');
      return { isValid: false, errors };
    }

    // 验证scene结构
    if (!config.scene) {
      errors.push('Missing "scene" section');
    } else {
      if (!config.scene.title) {
        errors.push('Missing scene title');
      }
      if (!config.scene.participants || !Array.isArray(config.scene.participants)) {
        errors.push('Missing or invalid participants array');
      } else {
        config.scene.participants.forEach((p, index) => {
          if (!p.name) {
            errors.push(`Participant ${index + 1}: missing name`);
          }
          if (!p.avatar) {
            errors.push(`Participant ${index + 1}: missing avatar`);
          }
        });
      }
    }

    // 验证messages结构
    if (!config.messages || !Array.isArray(config.messages)) {
      errors.push('Missing or invalid messages array');
    } else {
      config.messages.forEach((m, index) => {
        if (m.type === 'pause') {
          if (!m.duration) {
            errors.push(`Message ${index + 1}: pause type missing duration`);
          }
        } else if (m.type === 'typing') {
          if (!m.speaker) {
            errors.push(`Message ${index + 1}: typing type missing speaker`);
          }
          if (!m.duration) {
            errors.push(`Message ${index + 1}: typing type missing duration`);
          }
        } else if (m.type === 'location') {
          if (!m.speaker) {
            errors.push(`Message ${index + 1}: location type missing speaker`);
          }
          if (!m.content) {
            errors.push(`Message ${index + 1}: location type missing content`);
          }
          if (!m.coordinates) {
            errors.push(`Message ${index + 1}: location type missing coordinates`);
          }
        } else {
          // 普通消息
          if (!m.speaker) {
            errors.push(`Message ${index + 1}: missing speaker`);
          }
          if (!m.content) {
            errors.push(`Message ${index + 1}: missing content`);
          }
        }
      });
    }

  } catch (error) {
    errors.push(`YAML syntax error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}