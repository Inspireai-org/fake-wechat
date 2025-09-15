import { ChatData } from '../components/ChatInterface';

export interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  template: ChatData;
}

// 预设场景模板
export const sceneTemplates: SceneTemplate[] = [
  {
    id: 'confession',
    name: '表白场景',
    description: '浪漫的表白对话，包含紧张、期待和甜蜜的情绪',
    category: '情感',
    template: {
      scene: {
        title: '表白时刻',
        participants: [
          { name: '我', avatar: '' },
          { name: '小雨', avatar: '' }
        ]
      },
      messages: [
        {
          speaker: '我',
          content: '在吗？有件事想和你说',
          time: '20:30',
          type: 'message',
          animationDelay: 'medium'
        },
        {
          type: 'pause',
          duration: '片刻后',
          description: '等待回复...'
        },
        {
          speaker: '小雨',
          content: '在的，什么事？',
          time: '20:31',
          type: 'message'
        },
        {
          type: 'typing',
          speaker: '我',
          statusDuration: 'long'
        },
        {
          speaker: '我',
          content: '我们认识这么久了...',
          time: '20:32',
          type: 'message',
          status: 'sending',
          statusDuration: 'medium'
        },
        {
          speaker: '我',
          content: '其实我一直想告诉你',
          time: '20:33',
          type: 'message'
        },
        {
          type: 'typing',
          speaker: '小雨',
          statusDuration: 'short'
        },
        {
          speaker: '小雨',
          content: '嗯？',
          time: '20:33',
          type: 'message'
        },
        {
          type: 'typing',
          speaker: '我',
          statusDuration: 'long'
        },
        {
          speaker: '我',
          content: '我喜欢你',
          time: '20:34',
          type: 'message',
          status: 'sending',
          statusDuration: 'long'
        },
        {
          type: 'pause',
          duration: '很久之后',
          description: '紧张地等待...'
        },
        {
          type: 'typing',
          speaker: '小雨',
          statusDuration: 'long'
        },
        {
          speaker: '小雨',
          content: '我也是...',
          time: '20:36',
          type: 'message'
        }
      ],
      animationConfig: {
        globalSpeed: 1.0,
        defaultDelay: 'medium',
        enableEffects: {
          textReveal: true,
          focusEffect: false,
          blurBackground: false
        }
      }
    }
  },
  {
    id: 'breakup',
    name: '分手场景',
    description: '难过的分手对话，包含犹豫、悲伤和释然',
    category: '情感',
    template: {
      scene: {
        title: '道别',
        participants: [
          { name: '我', avatar: '' },
          { name: '阿杰', avatar: '' }
        ]
      },
      messages: [
        {
          speaker: '阿杰',
          content: '我们需要谈谈',
          time: '21:00',
          type: 'message'
        },
        {
          speaker: '我',
          content: '怎么了？',
          time: '21:01',
          type: 'message'
        },
        {
          type: 'typing',
          speaker: '阿杰',
          statusDuration: 'long'
        },
        {
          speaker: '阿杰',
          content: '最近我一直在想我们的关系',
          time: '21:03',
          type: 'message'
        },
        {
          speaker: '阿杰',
          content: '可能我们不太合适',
          time: '21:04',
          type: 'message'
        },
        {
          type: 'pause',
          duration: '许久之后'
        },
        {
          speaker: '我',
          content: '是我做错了什么吗？',
          time: '21:06',
          type: 'message'
        },
        {
          speaker: '阿杰',
          content: '不是你的问题',
          time: '21:07',
          type: 'message'
        },
        {
          speaker: '阿杰',
          content: '是我自己需要一些空间',
          time: '21:07',
          type: 'message'
        },
        {
          type: 'recall',
          speaker: '我',
          originalMessage: '我们可以试着解决',
          recallDelay: 'short'
        },
        {
          speaker: '我',
          content: '我明白了',
          time: '21:10',
          type: 'message'
        },
        {
          speaker: '我',
          content: '祝你一切都好',
          time: '21:11',
          type: 'message'
        }
      ]
    }
  },
  {
    id: 'apology',
    name: '道歉场景',
    description: '真诚的道歉对话，包含反省、歉意和和解',
    category: '情感',
    template: {
      scene: {
        title: '和解',
        participants: [
          { name: '我', avatar: '' },
          { name: '小李', avatar: '' }
        ]
      },
      messages: [
        {
          speaker: '我',
          content: '对不起，昨天是我不对',
          time: '10:00',
          type: 'message'
        },
        {
          type: 'pause',
          duration: '稍后'
        },
        {
          speaker: '我',
          content: '我不应该那样说话',
          time: '10:01',
          type: 'message'
        },
        {
          type: 'typing',
          speaker: '小李',
          statusDuration: 'medium'
        },
        {
          speaker: '小李',
          content: '...',
          time: '10:03',
          type: 'message'
        },
        {
          speaker: '我',
          content: '我知道我伤害了你',
          time: '10:04',
          type: 'message'
        },
        {
          speaker: '我',
          content: '能原谅我吗？',
          time: '10:04',
          type: 'message',
          status: 'sending',
          statusDuration: 'long'
        },
        {
          type: 'pause',
          duration: '很久之后'
        },
        {
          speaker: '小李',
          content: '我也有不对的地方',
          time: '10:08',
          type: 'message'
        },
        {
          speaker: '小李',
          content: '我们都冷静一下吧',
          time: '10:09',
          type: 'message'
        },
        {
          speaker: '我',
          content: '好，谢谢你愿意理解',
          time: '10:10',
          type: 'message'
        }
      ]
    }
  },
  {
    id: 'birthday',
    name: '生日祝福',
    description: '温馨的生日祝福对话',
    category: '节日',
    template: {
      scene: {
        title: '生日快乐',
        participants: [
          { name: '我', avatar: '' },
          { name: '小美', avatar: '' }
        ]
      },
      messages: [
        {
          speaker: '我',
          content: '12点了！',
          time: '00:00',
          type: 'message'
        },
        {
          speaker: '我',
          content: '生日快乐！🎂',
          time: '00:00',
          type: 'message'
        },
        {
          speaker: '我',
          content: '第一个祝福送给你',
          time: '00:00',
          type: 'message'
        },
        {
          type: 'pause',
          duration: '片刻后'
        },
        {
          speaker: '小美',
          content: '哇！谢谢你还记得',
          time: '00:01',
          type: 'message'
        },
        {
          speaker: '小美',
          content: '你还没睡啊',
          time: '00:01',
          type: 'message'
        },
        {
          speaker: '我',
          content: '特意等到12点的',
          time: '00:02',
          type: 'message'
        },
        {
          type: 'image',
          speaker: '我',
          imageUrl: 'https://picsum.photos/seed/cake/200',
          imageDescription: '生日蛋糕',
          time: '00:02'
        },
        {
          speaker: '小美',
          content: '好感动！谢谢你',
          time: '00:03',
          type: 'message'
        }
      ]
    }
  },
  {
    id: 'interview',
    name: '面试邀请',
    description: 'HR发送面试邀请的对话',
    category: '工作',
    template: {
      scene: {
        title: '面试邀请',
        participants: [
          { name: '我', avatar: '' },
          { name: 'HR-张经理', avatar: '' }
        ]
      },
      messages: [
        {
          speaker: 'HR-张经理',
          content: '您好，我是XX公司的HR',
          time: '14:00',
          type: 'message'
        },
        {
          speaker: 'HR-张经理',
          content: '看到您投递的简历，想邀请您来面试',
          time: '14:00',
          type: 'message'
        },
        {
          speaker: '我',
          content: '您好！感谢您的邀请',
          time: '14:02',
          type: 'message'
        },
        {
          speaker: 'HR-张经理',
          content: '请问本周四下午3点方便吗？',
          time: '14:03',
          type: 'message'
        },
        {
          type: 'typing',
          speaker: '我',
          statusDuration: 'medium'
        },
        {
          speaker: '我',
          content: '可以的，请问地址在哪里？',
          time: '14:04',
          type: 'message'
        },
        {
          type: 'location',
          speaker: 'HR-张经理',
          description: 'XX大厦15楼',
          coordinates: {
            latitude: 31.2304,
            longitude: 121.4737
          },
          time: '14:05'
        },
        {
          speaker: 'HR-张经理',
          content: '到了前台报我的名字即可',
          time: '14:05',
          type: 'message'
        },
        {
          speaker: '我',
          content: '好的，谢谢！周四见',
          time: '14:06',
          type: 'message'
        }
      ]
    }
  },
  {
    id: 'reunion',
    name: '老友重逢',
    description: '多年未见的老朋友重新联系',
    category: '友情',
    template: {
      scene: {
        title: '老友重逢',
        participants: [
          { name: '我', avatar: '' },
          { name: '老王', avatar: '' }
        ]
      },
      messages: [
        {
          speaker: '老王',
          content: '是你吗？好久不见！',
          time: '19:30',
          type: 'message'
        },
        {
          speaker: '我',
          content: '老王！真的是你！',
          time: '19:31',
          type: 'message'
        },
        {
          speaker: '我',
          content: '有十年没见了吧',
          time: '19:31',
          type: 'message'
        },
        {
          speaker: '老王',
          content: '是啊，大学毕业后就没见过了',
          time: '19:32',
          type: 'message'
        },
        {
          type: 'voice',
          speaker: '老王',
          voiceDuration: '8"',
          voiceText: '最近怎么样？听说你去了北京发展',
          time: '19:33'
        },
        {
          speaker: '我',
          content: '还不错，你呢？还在老家吗？',
          time: '19:34',
          type: 'message'
        },
        {
          speaker: '老王',
          content: '我现在在深圳创业',
          time: '19:35',
          type: 'message'
        },
        {
          speaker: '老王',
          content: '有机会一定要聚一聚',
          time: '19:35',
          type: 'message'
        },
        {
          speaker: '我',
          content: '必须的！下次我去深圳找你',
          time: '19:36',
          type: 'message'
        }
      ]
    }
  }
];

// 获取所有模板
export function getAllTemplates(): SceneTemplate[] {
  return sceneTemplates;
}

// 根据类别获取模板
export function getTemplatesByCategory(category: string): SceneTemplate[] {
  return sceneTemplates.filter(t => t.category === category);
}

// 根据ID获取模板
export function getTemplateById(id: string): SceneTemplate | undefined {
  return sceneTemplates.find(t => t.id === id);
}

// 获取所有类别
export function getAllCategories(): string[] {
  const categories = new Set(sceneTemplates.map(t => t.category));
  return Array.from(categories);
}

// 应用模板到当前配置
export function applyTemplate(templateId: string, customizations?: Partial<ChatData>): ChatData | null {
  const template = getTemplateById(templateId);
  if (!template) return null;
  
  return {
    ...template.template,
    ...customizations,
    scene: {
      ...template.template.scene,
      ...(customizations?.scene || {})
    }
  };
}