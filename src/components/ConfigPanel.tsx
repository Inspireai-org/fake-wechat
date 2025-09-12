import React, { useState } from 'react';
import { Plus, Trash2, Upload, Edit3 } from 'lucide-react';
import { ChatData, Participant, Message } from './ChatInterface';
import { generateYamlConfig } from '../lib/yamlParser';

interface ConfigPanelProps {
  chatData: ChatData;
  onChatDataChange: (data: ChatData) => void;
  onYamlChange: (yaml: string) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  chatData,
  onChatDataChange,
  onYamlChange
}) => {
  const [activeTab, setActiveTab] = useState<'participants' | 'messages' | 'yaml'>('participants');
  const [editingMessage, setEditingMessage] = useState<number | null>(null);

  // 更新场景标题
  const updateTitle = (title: string) => {
    const newData = {
      ...chatData,
      scene: { ...chatData.scene, title }
    };
    onChatDataChange(newData);
    onYamlChange(generateYamlConfig(newData));
  };

  // 添加参与者
  const addParticipant = () => {
    const newParticipant: Participant = {
      name: `用户${chatData.scene.participants.length + 1}`,
      avatar: ''
    };
    const newData = {
      ...chatData,
      scene: {
        ...chatData.scene,
        participants: [...chatData.scene.participants, newParticipant]
      }
    };
    onChatDataChange(newData);
    onYamlChange(generateYamlConfig(newData));
  };

  // 更新参与者
  const updateParticipant = (index: number, participant: Participant) => {
    const newParticipants = [...chatData.scene.participants];
    newParticipants[index] = participant;
    const newData = {
      ...chatData,
      scene: { ...chatData.scene, participants: newParticipants }
    };
    onChatDataChange(newData);
    onYamlChange(generateYamlConfig(newData));
  };

  // 删除参与者
  const removeParticipant = (index: number) => {
    const newParticipants = chatData.scene.participants.filter((_, i) => i !== index);
    const newData = {
      ...chatData,
      scene: { ...chatData.scene, participants: newParticipants }
    };
    onChatDataChange(newData);
    onYamlChange(generateYamlConfig(newData));
  };

  // 添加消息
  const addMessage = () => {
    const newMessage: Message = {
      speaker: chatData.scene.participants[0]?.name || '',
      content: '新消息',
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      type: 'message'
    };
    const newData = {
      ...chatData,
      messages: [...chatData.messages, newMessage]
    };
    onChatDataChange(newData);
    onYamlChange(generateYamlConfig(newData));
  };

  // 更新消息
  const updateMessage = (index: number, message: Message) => {
    const newMessages = [...chatData.messages];
    newMessages[index] = message;
    const newData = {
      ...chatData,
      messages: newMessages
    };
    onChatDataChange(newData);
    onYamlChange(generateYamlConfig(newData));
  };

  // 删除消息
  const removeMessage = (index: number) => {
    const newMessages = chatData.messages.filter((_, i) => i !== index);
    const newData = {
      ...chatData,
      messages: newMessages
    };
    onChatDataChange(newData);
    onYamlChange(generateYamlConfig(newData));
  };

  // 处理头像上传
  const handleAvatarUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const avatar = e.target?.result as string;
        updateParticipant(index, { ...chatData.scene.participants[index], avatar });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* 标签页 */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'participants', label: '参与者' },
          { key: 'messages', label: '消息' },
          { key: 'yaml', label: 'YAML' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'participants' | 'messages' | 'yaml')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === tab.key
                ? 'text-[#07C160] border-b-2 border-[#07C160]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 场景标题 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            场景标题
          </label>
          <input
            type="text"
            value={chatData.scene.title}
            onChange={(e) => updateTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#07C160] focus:border-transparent"
          />
        </div>

        {/* 参与者标签页 */}
        {activeTab === 'participants' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">参与者</h3>
              <button
                onClick={addParticipant}
                className="flex items-center space-x-1 px-3 py-1 bg-[#07C160] text-white rounded-md hover:bg-[#06B050] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>添加</span>
              </button>
            </div>

            {chatData.scene.participants.map((participant, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    参与者 {index + 1}
                  </span>
                  {chatData.scene.participants.length > 1 && (
                    <button
                      onClick={() => removeParticipant(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* 头像 */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1">头像</label>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                      {participant.avatar ? (
                        <img
                          src={participant.avatar}
                          alt={participant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm">
                          {participant.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAvatarUpload(index, e)}
                        className="hidden"
                      />
                      <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors">
                        <Upload className="w-3 h-3" />
                        <span className="text-xs">上传</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 姓名 */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">姓名</label>
                  <input
                    type="text"
                    value={participant.name}
                    onChange={(e) => updateParticipant(index, { ...participant, name: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#07C160] focus:border-transparent"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 消息标签页 */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">消息列表</h3>
              <button
                onClick={addMessage}
                className="flex items-center space-x-1 px-3 py-1 bg-[#07C160] text-white rounded-md hover:bg-[#06B050] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>添加</span>
              </button>
            </div>

            {chatData.messages.map((message, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    消息 {index + 1}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingMessage(editingMessage === index ? null : index)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeMessage(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {editingMessage === index ? (
                  <div className="space-y-2">
                    <select
                      value={message.type || 'message'}
                      onChange={(e) => updateMessage(index, { ...message, type: e.target.value as 'message' | 'pause' | 'typing' | 'location' })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="message">普通消息</option>
                      <option value="pause">暂停</option>
                      <option value="typing">打字状态</option>
                      <option value="location">位置</option>
                    </select>

                    {(message.type === 'message' || !message.type) && (
                      <>
                        <select
                          value={message.speaker || ''}
                          onChange={(e) => updateMessage(index, { ...message, speaker: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">选择发送者</option>
                          {chatData.scene.participants.map(p => (
                            <option key={p.name} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                        <textarea
                          value={message.content || ''}
                          onChange={(e) => updateMessage(index, { ...message, content: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          rows={2}
                          placeholder="消息内容"
                        />
                        <input
                          type="text"
                          value={message.time || ''}
                          onChange={(e) => updateMessage(index, { ...message, time: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="时间 (如: 10:30)"
                        />
                      </>
                    )}

                    {message.type === 'pause' && (
                      <>
                        <input
                          type="text"
                          value={message.duration || ''}
                          onChange={(e) => updateMessage(index, { ...message, duration: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="持续时间 (如: 30分钟)"
                        />
                        <input
                          type="text"
                          value={message.description || ''}
                          onChange={(e) => updateMessage(index, { ...message, description: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="描述 (如: 等待中...)"
                        />
                      </>
                    )}

                    {message.type === 'typing' && (
                      <>
                        <select
                          value={message.speaker || ''}
                          onChange={(e) => updateMessage(index, { ...message, speaker: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">选择打字者</option>
                          {chatData.scene.participants.map(p => (
                            <option key={p.name} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={message.duration || ''}
                          onChange={(e) => updateMessage(index, { ...message, duration: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="持续时间 (如: 3秒)"
                        />
                      </>
                    )}

                    {message.type === 'location' && (
                      <>
                        <select
                          value={message.speaker || ''}
                          onChange={(e) => updateMessage(index, { ...message, speaker: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">选择发送者</option>
                          {chatData.scene.participants.map(p => (
                            <option key={p.name} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={message.content || ''}
                          onChange={(e) => updateMessage(index, { ...message, content: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="位置名称"
                        />
                        <input
                          type="text"
                          value={message.time || ''}
                          onChange={(e) => updateMessage(index, { ...message, time: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="时间 (如: 10:30)"
                        />
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    <div><strong>类型:</strong> {message.type || 'message'}</div>
                    {message.speaker && <div><strong>发送者:</strong> {message.speaker}</div>}
                    {message.content && <div><strong>内容:</strong> {message.content}</div>}
                    {message.time && <div><strong>时间:</strong> {message.time}</div>}
                    {message.duration && <div><strong>持续时间:</strong> {message.duration}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* YAML标签页 */}
        {activeTab === 'yaml' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">YAML配置</h3>
            <textarea
              value={generateYamlConfig(chatData)}
              onChange={(e) => onYamlChange(e.target.value)}
              className="w-full h-96 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#07C160] focus:border-transparent"
              placeholder="YAML配置内容..."
            />
          </div>
        )}
      </div>
    </div>
  );
};