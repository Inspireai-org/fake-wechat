# 微信聊天模拟器

一个高度还原微信聊天界面的网页工具，用于生成逼真的微信对话动图。支持YAML配置驱动，能够模拟真实的微信聊天场景，包括消息发送动画、打字状态、暂停等待等交互效果。

## ✨ 功能特性

- 🎨 **完美还原微信UI**：1:1复刻微信聊天界面，包括消息气泡、头像、时间戳等
- 📝 **YAML配置驱动**：通过简单的YAML文件配置对话内容和参与者信息
- 🎬 **动画效果**：模拟真实的微信消息发送动画和交互效果
- 🎯 **多种消息类型**：支持文字消息、位置分享、打字状态、暂停等待等
- 📱 **响应式设计**：适配桌面和移动设备
- 🎥 **GIF导出**：支持将聊天动画导出为GIF格式
- ⚡ **纯前端实现**：无需后端服务器，可直接部署到静态网站

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm（推荐）或 npm

### 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 启动开发服务器

```bash
# 使用 pnpm
pnpm dev

# 或使用 npm
npm run dev
```

启动后访问 `http://localhost:5173` 即可使用。

## 📖 使用说明

### 1. 基本操作

1. **加载配置**：工具会自动加载 `public/sample.yaml` 作为示例配置
2. **编辑配置**：在左侧配置面板中编辑YAML内容
3. **预览动画**：点击播放按钮查看聊天动画效果
4. **导出GIF**：点击导出按钮生成GIF动图

### 2. YAML配置格式

#### 基本结构

```yaml
# 对话场景配置
scene:
  title: "朋友间的对话"
  participants:
    - name: "小明"
      avatar: "avatar1.jpg"
    - name: "小红" 
      avatar: "avatar2.jpg"

# 对话内容
messages:
  - speaker: "小明"
    content: "你今天有空吗？"
    time: "10:30"

  - speaker: "小红"
    content: "现在在忙，等会儿联系你"
    time: "10:31"
```

#### 参与者配置

```yaml
scene:
  title: "对话标题"  # 可选，对话场景标题
  participants:
    - name: "参与者姓名"     # 必填，显示的昵称
      avatar: "头像文件名"   # 可选，头像图片
```

#### 消息类型

##### 1. 文字消息

```yaml
- speaker: "发送者姓名"
  content: "消息内容"
  time: "10:30"  # 可选，时间戳
```

##### 2. 暂停等待

```yaml
- type: "pause"
  duration: "30分钟"      # 暂停时长描述
  description: "等待中..."  # 可选，暂停说明
```

##### 3. 打字状态

```yaml
- type: "typing"
  speaker: "小红"
  duration: "3秒"  # 打字动画持续时间
```

##### 4. 位置分享

```yaml
- type: "location"
  speaker: "小明"
  content: "商业街星巴克"
  coordinates: 
    latitude: 31.2304
    longitude: 121.4737
  time: "11:04"
```

### 3. 动画控制

- **播放/暂停**：控制动画播放状态
- **速度调节**：调整动画播放速度（0.5x - 2x）
- **进度控制**：拖拽进度条跳转到指定位置
- **重置**：重新开始播放动画

### 4. GIF导出

1. 点击「导出GIF」按钮
2. 调整导出设置：
   - **质量**：控制GIF文件大小和清晰度
   - **帧率**：控制动画流畅度
   - **尺寸**：选择导出分辨率
3. 点击「开始录制」生成GIF文件

## 🛠️ 技术栈

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **样式框架**：Tailwind CSS
- **状态管理**：Zustand
- **YAML解析**：js-yaml
- **GIF生成**：gif.js
- **动画录制**：html2canvas

## 📁 项目结构

```
src/
├── components/          # React组件
│   ├── ChatInterface.tsx    # 聊天界面主组件
│   ├── ConfigPanel.tsx      # 配置面板
│   ├── MessageBubble.tsx    # 消息气泡组件
│   ├── TypingIndicator.tsx  # 打字状态指示器
│   ├── LocationMessage.tsx  # 位置消息组件
│   └── ...
├── hooks/               # 自定义Hook
│   ├── useAnimationControl.ts  # 动画控制逻辑
│   ├── useGifExport.ts         # GIF导出功能
│   └── useTheme.ts             # 主题管理
├── lib/                 # 工具库
│   ├── yamlParser.ts        # YAML解析器
│   └── utils.ts             # 通用工具函数
└── pages/               # 页面组件
    └── Home.tsx             # 主页面
```

## 🎯 使用场景

- 📱 **产品演示**：制作产品功能演示动图
- 🎓 **教学材料**：创建教学案例和培训素材
- 📝 **营销素材**：生成社交媒体营销内容
- 🎬 **内容创作**：制作视频素材和动图内容
- 💼 **商务展示**：创建商务沟通场景演示

## ❓ 常见问题

### Q: 如何添加自定义头像？
A: 将头像图片放入 `public` 目录，然后在YAML配置中引用文件名即可。

### Q: 支持哪些图片格式？
A: 支持常见的图片格式：jpg, png, gif, webp等。

### Q: 如何调整消息显示时间间隔？
A: 在YAML配置中使用 `pause` 类型消息来控制时间间隔。

### Q: GIF文件太大怎么办？
A: 可以降低导出质量、减少帧率或缩小尺寸来减小文件大小。

### Q: 能否自定义消息气泡颜色？
A: 目前使用微信标准颜色，如需自定义可修改CSS样式文件。

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📞 支持

如果您在使用过程中遇到问题，请：

1. 查看本文档的常见问题部分
2. 检查YAML配置格式是否正确
3. 在GitHub上提交Issue

---

**享受创作微信聊天动图的乐趣吧！** 🎉# Auto-deploy test Tue Sep 16 18:34:46 CST 2025
