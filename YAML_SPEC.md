# 微信对话生成器 YAML 配置规范

## 概述
本文档定义了微信对话生成器的 YAML 配置文件格式，用于创建动态的微信聊天动画效果。

## 基本结构

```yaml
scene:         # 场景配置（必需）
  title:       # 对话标题
  participants: # 参与者列表
  theme:       # 主题配置（可选）
  animation:   # 动画配置（可选）

messages:      # 消息列表（必需）
  - ...        # 消息项
```

## Scene 场景配置

### 必需字段

```yaml
scene:
  title: "对话标题"
  participants:
    - name: "参与者1"
      avatar: "头像URL或base64"
    - name: "参与者2"
      avatar: "头像URL或base64"
```

### 可选字段

```yaml
scene:
  theme:
    primaryColor: "#95EC69"      # 主色调（默认微信绿）
    backgroundColor: "#F7F7F7"    # 背景色
    fontFamily: "字体名称"        # 自定义字体
  
  animation:
    globalSpeed: 1.0              # 全局速度倍率（0.5=慢速，2.0=快速）
    defaultDelay: medium          # 默认延迟（short/medium/long）
```

## Messages 消息类型

### 1. 文本消息（默认类型）

```yaml
- speaker: "发送者名称"
  content: "消息内容"
  time: "21:30"                  # 时间戳
  status: sent                   # 消息状态：sending/sent/read
  statusDuration: short           # 状态持续时间：short/medium/long
  animationDelay: medium          # 动画延迟：short/medium/long
```

### 2. 语音消息

```yaml
- type: voice
  speaker: "发送者"
  voiceDuration: "15\""           # 语音时长（如 "10\"" 表示10秒）
  voiceText: "语音转文字内容"     # 可选：语音转换后的文字
  time: "21:35"
```

### 3. 图片消息

```yaml
# 单图
- type: image
  speaker: "发送者"
  imageUrl: "图片URL"
  imageDescription: "图片描述"   # 可选：图片说明文字
  time: "21:36"

# 多图（自动拼接布局）
- type: image
  speaker: "发送者"
  imageUrl: 
    - "图片URL1"
    - "图片URL2"
    - "图片URL3"
  imageDescription: "图片组描述"
  time: "21:37"
```

### 4. 位置消息

```yaml
- type: location
  speaker: "发送者"
  content: "位置名称"
  coordinates:
    latitude: 39.9042
    longitude: 116.4074
  time: "21:38"
```

### 5. 输入状态

```yaml
- type: typing
  speaker: "输入者"
  statusDuration: long            # 持续时间：short(1秒)/medium(3秒)/long(5秒)
  hesitate: true                  # 可选：是否显示犹豫效果（输入-停止-再输入）
```

### 6. 暂停/等待

```yaml
- type: pause
  duration: "3s"                  # 持续时间（如 "2s", "500ms"）
  description: "等待描述"         # 可选：说明等待原因
```

### 7. 消息撤回

```yaml
- type: recall
  speaker: "撤回者"
  originalMessage: "原始消息内容"
  recallDelay: short              # 撤回延迟：short/medium/long
  time: "21:40"
```

## 时间控制说明

### 延迟级别
- `short`: 约1秒
- `medium`: 约3秒（默认）
- `long`: 约5秒

### 应用场景
- `animationDelay`: 消息出现前的延迟
- `statusDuration`: 消息状态（如"发送中"）的持续时间
- `recallDelay`: 消息显示多久后被撤回

## 完整示例

```yaml
scene:
  title: "重逢"
  participants:
    - name: "小明"
      avatar: "https://example.com/avatar1.jpg"
    - name: "小红"
      avatar: "https://example.com/avatar2.jpg"
  theme:
    primaryColor: "#95EC69"
  animation:
    globalSpeed: 1.0
    defaultDelay: medium

messages:
  # 开场白
  - speaker: "小明"
    content: "好久不见"
    time: "20:00"
    status: sent
    
  # 对方输入中
  - type: typing
    speaker: "小红"
    statusDuration: long
    hesitate: true
    
  # 语音回复
  - type: voice
    speaker: "小红"
    voiceDuration: "8\""
    voiceText: "是啊，真的好久了"
    time: "20:01"
    
  # 等待
  - type: pause
    duration: "2s"
    description: "双方陷入回忆"
    
  # 发送照片
  - type: image
    speaker: "小明"
    imageUrl: "https://example.com/memory.jpg"
    imageDescription: "我们以前的合照"
    time: "20:02"
    
  # 撤回消息
  - type: recall
    speaker: "小红"
    originalMessage: "我一直在想你"
    recallDelay: short
    time: "20:03"
    
  # 最终消息
  - speaker: "小红"
    content: "明天见面聊吧"
    time: "20:04"
    status: read
    statusDuration: medium
```

## AI 生成指南

### 生成原则
1. **真实性**：模拟真实的微信对话节奏和习惯
2. **情感递进**：通过消息状态、撤回、语音等展现情感变化
3. **时间节奏**：合理使用延迟和暂停营造氛围
4. **视觉效果**：适当使用图片、语音等富媒体消息

### 建议的消息组合模式

#### 犹豫表达
```yaml
- type: typing
  speaker: "A"
  hesitate: true
  statusDuration: long
- type: recall
  speaker: "A"
  originalMessage: "其实我..."
  recallDelay: short
- speaker: "A"
  content: "没什么"
```

#### 情感爆发
```yaml
- type: voice
  speaker: "B"
  voiceDuration: "15\""
  voiceText: "重要的话语内容"
- type: pause
  duration: "3s"
  description: "对方在消化信息"
```

#### 回忆分享
```yaml
- type: image
  speaker: "A"
  imageUrl: ["url1", "url2"]
  imageDescription: "回忆描述"
- speaker: "A"
  content: "还记得这个吗？"
```

### 注意事项
1. 第一个参与者默认为当前用户（消息靠右显示）
2. 时间戳应保持递增顺序
3. 语音时长使用 `"数字\""` 格式（如 `"10\""` 表示10秒）
4. 图片URL需要是可访问的公开链接
5. 撤回消息会显示系统提示文字
6. typing状态不需要time字段，因为它是临时状态

## 验证规则

### 必需检查
- scene.title 不能为空
- scene.participants 至少需要2个参与者
- 每个参与者必须有 name 和 avatar
- messages 数组不能为空

### 类型检查
- type 字段只能是：message/voice/image/location/typing/pause/recall
- status 只能是：sending/sent/read
- 延迟类型只能是：short/medium/long
- coordinates 必须包含 latitude 和 longitude

### 逻辑检查
- 时间戳应保持递增（可选）
- speaker 应该是 participants 中定义的名称
- recall 类型必须有 originalMessage 字段
- voice 类型必须有 voiceDuration 字段