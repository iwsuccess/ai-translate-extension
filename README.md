
# ✨ AI 翻译助手

<p align="center">
  <img src="icons/icon128.png" alt="AI 翻译助手" width="128" height="128" />
</p>

<p align="center">
  <strong>AI 驱动的 Chrome 浏览器翻译扩展</strong>
</p>

<p align="center">
  全页面翻译 · 划词翻译 · 网页总结 · 管理面板 · Token 统计
</p>

<p align="center">
  <a href="#-功能特性">功能特性</a> ·
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-获取-api-配置">获取 API 配置</a> ·
  <a href="#-项目结构">项目结构</a> ·
  <a href="#-使用指南">使用指南</a>

</p>

---

## 📖 简介

**AI 翻译助手**是一款轻量级、功能丰富的 Chrome 浏览器扩展，利用大语言模型（LLM）提供高质量的网页翻译与内容总结服务。插件兼容所有遵循 **OpenAI Chat Completions 协议**的 API 接口，用户可自由配置自己的 API Key、Base URL 和模型。

---

## 🚀 功能特性

<table>
  <tr>
    <td width="50%">
      <h4>🌐 全页面翻译</h4>
      <p>一键翻译当前网页的所有文字内容，支持进度条展示与随时暂停。翻译后可一键恢复原文。</p>
    </td>
    <td width="50%">
      <h4>🔤 划词翻译</h4>
      <p>选中网页中的任意文字，自动弹出翻译卡片。结果以 Markdown 格式渲染，支持一键复制。</p>
    </td>
  </tr>
  <tr>
    <td>
      <h4>📋 网页总结</h4>
      <p>智能提取页面核心内容，生成结构化的摘要。步骤化展示提取→分析→排版全过程，结果以 Markdown 格式渲染。</p>
    </td>
    <td>
      <h4>📊 管理面板</h4>
      <p>独立管理页面，提供 API 配置、语言偏好设置、翻译历史查看、Token 消耗统计与可视化。</p>
    </td>
  </tr>
  <tr>
    <td>
      <h4>🔧 灵活配置</h4>
      <p>支持自定义 API Key、Base URL、模型名称。兼容 DeepSeek、OpenAI、Moonshot、智谱 等所有 OpenAI 协议接口。</p>
    </td>
    <td>
      <h4>📜 翻译历史</h4>
      <p>自动记录每次翻译与总结，支持点击展开查看完整内容，含来源页面、语言方向、Token 消耗等详情。</p>
    </td>
  </tr>
</table>

---

## ⚡ 快速开始

### 1. 安装扩展

1. 下载本仓库代码到本地：

```bash
git clone https://github.com/iwsuccess/ai-translate-extension.git
```

2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 打开右上角的 **「开发者模式」** 开关
4. 点击 **「加载已解压的扩展程序」**，选择项目根目录

### 2. 配置 API

> 💡 **使用前需要获取 API Key 和服务地址**，详见下方 [获取 API 配置](#-获取-api-配置) 章节。

1. 点击浏览器工具栏中的扩展图标，打开弹窗
2. 切换到 **⚙ 设置** 标签页（或点击 📊 图标进入完整管理面板）
3. 填入你的 **API Key**、**Base URL**、**模型名称**
4. 点击 **「测试连接」** 确认配置正确
5. 点击 **「保存设置」**

### 3. 开始使用

| 操作 | 方式 |
|------|------|
| 翻译整页 | 点击弹窗中的 **🌐 翻译页面** |
| 网页总结 | 点击弹窗中的 **📋 网页总结** |
| 划词翻译 | 在页面中选中文字，自动弹出翻译卡片 |
| 恢复原文 | 翻译后可点击 **↩ 恢复原文** |
| 查看历史 | 点击弹窗 📊 图标打开管理面板 → **📜 翻译历史** |
| 查看统计 | 管理面板 → **📊 消耗统计** |

---

## 🔑 获取 API 配置

本插件兼容所有 **OpenAI Chat Completions 协议**的 API 服务。以下是主流提供商的获取方式：

### DeepSeek（推荐）

DeepSeek 提供高性价比的大模型 API，注册即送免费额度。

| 配置项 | 值 |
|--------|-----|
| **Base URL** | `https://api.deepseek.com` |
| **获取地址** | [platform.deepseek.com](https://platform.deepseek.com/) |

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/) 注册/登录
2. 进入控制台 → **API Keys** → 创建新的 API Key
3. 推荐模型：`deepseek-chat`（通用）、`deepseek-reasoner`（推理）

---

### OpenAI

| 配置项 | 值 |
|--------|-----|
| **Base URL** | `https://api.openai.com` |
| **获取地址** | [platform.openai.com](https://platform.openai.com/) |

1. 访问 [OpenAI Platform](https://platform.openai.com/) 注册/登录
2. 进入 **API Keys** → 创建新的 Secret Key
3. 推荐模型：`gpt-4o`、`gpt-4o-mini`、`gpt-3.5-turbo`

---

### 其他兼容服务

以下服务同样支持 OpenAI 协议，配置方式相同，只需替换对应的 Base URL 和模型名称：

| 服务商 | Base URL | 获取地址 |
|--------|----------|----------|
| **Moonshot（月之暗面）** | `https://api.moonshot.cn` | [platform.moonshot.cn](https://platform.moonshot.cn/) |
| **智谱 AI（GLM）** | `https://open.bigmodel.cn/api/paas/v4` | [open.bigmodel.cn](https://open.bigmodel.cn/) |
| **零一万物** | `https://api.lingyiwanwu.com` | [platform.lingyiwanwu.com](https://platform.lingyiwanwu.com/) |
| **百川智能** | `https://api.baichuan-ai.com` | [platform.baichuan-ai.com](https://platform.baichuan-ai.com/) |
| **通义千问（阿里云）** | `https://dashscope.aliyuncs.com/compatible-mode/v1` | [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com/) |
| **Groq** | `https://api.groq.com/openai` | [console.groq.com](https://console.groq.com/) |
| **Together AI** | `https://api.together.xyz` | [together.ai](https://www.together.ai/) |

> ⚠️ **注意**：部分服务商的 Base URL 已包含 `/v1` 路径，插件会自动处理标准化，直接填入即可。如果连接失败，请尝试去掉末尾的 `/v1`。

---

## 🛠️ 技术实现

### 架构概览

```
┌─────────────────────────────────────────────────┐
│                   Popup (弹窗)                    │
│  popup.html / popup.js / popup.css               │
│  · 快捷操作入口 · API 配置 · 语言偏好            │
└─────────────────┬───────────────────────────────┘
                  │ chrome.runtime.sendMessage
                  ▼
┌─────────────────────────────────────────────────┐
│              Background (Service Worker)          │
│  background.js + lib/ai-client.js                │
│  · 代理 API 请求 · 转发指令到 Content Script    │
│  · 记录翻译历史 · 累积 Token 统计               │
└─────────────────┬───────────────────────────────┘
                  │ chrome.tabs.sendMessage
                  ▼
┌─────────────────────────────────────────────────┐
│           Content Script (注入页面)               │
│  content.js / content.css                        │
│  · DOM 文本提取与替换 · 划词翻译浮层            │
│  · 进度条 · 总结弹窗 · Markdown 渲染             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│             Dashboard (管理面板)                   │
│  dashboard.html / dashboard.js / dashboard.css    │
│  · API 配置 · 翻译历史 · Token 统计可视化       │
└─────────────────────────────────────────────────┘
```

### 关键依赖

- **零外部依赖**：全部使用原生 JavaScript 实现，无需 `node_modules`
- **Manifest V3**：遵循 Chrome 扩展最新规范，使用 Service Worker 代替 Background Page
- **AI 客户端**：`lib/ai-client.js` 封装 OpenAI 协议，支持单条/批量翻译、文本总结，自动返回 Token 用量

### 数据存储

| 存储位置 | 内容 |
|----------|------|
| `chrome.storage.sync` | API 配置、语言偏好（跨设备同步） |
| `chrome.storage.local` | 翻译历史（最多 200 条）、Token 统计数据 |

---

## 📁 项目结构

```
ai-translate-extension/
├── manifest.json              # Chrome 扩展配置 (Manifest V3)
├── .gitignore                 # Git 忽略规则
│
├── lib/
│   └── ai-client.js           # OpenAI 协议客户端（翻译/总结/Token 追踪）
│
├── background/
│   └── background.js          # Service Worker（消息路由/历史记录/统计）
│
├── content/
│   ├── content.js             # 注入脚本（翻译/划词/总结/Markdown 渲染）
│   └── content.css            # 注入样式
│
├── popup/
│   ├── popup.html             # 弹窗页面
│   ├── popup.js               # 弹窗逻辑
│   └── popup.css              # 弹窗样式
│
├── dashboard/
│   ├── dashboard.html         # 管理面板页面
│   ├── dashboard.js           # 管理面板逻辑
│   └── dashboard.css          # 管理面板样式
│
├── icons/
│   ├── icon16.png             # 扩展图标 16x16
│   ├── icon48.png             # 扩展图标 48x48
│   └── icon128.png            # 扩展图标 128x128
│
├── generate-icons.js          # 图标生成脚本（用于自定义）
└── test-api.js                # API 集成测试脚本
```

---

## 📋 使用指南

### 翻译偏好设置

在弹窗 **⚙ 设置** 标签或管理面板 **⚙ 设置** 标签中可配置：

- **源语言**：支持自动检测，或指定中文/英语/日语/韩语/法语/德语/西班牙语
- **目标语言**：同上，默认中文
- **总结语言**：中文 / English

### 翻译页面

1. 打开任意网页
2. 点击扩展图标，点击 **「翻译页面」**
3. 页面顶部出现进度条，顶部栏可点击 **「暂停」**
4. 翻译完成后可随时点击 **「恢复原文」** 撤销

### 网页总结

1. 打开任意网页
2. 点击扩展图标，点击 **「网页总结」**
3. 弹出模态窗口，依次展示：提取内容 → AI 分析 → 排版渲染
4. 结果以 Markdown 格式呈现，支持关闭或按 `Esc` 退出

### 划词翻译

1. 在网页中选中任意文字（2–3000 字符）
2. 自动弹出翻译卡片，展示原文与 Markdown 格式译文
3. 点击 **「复制译文」** 将结果复制到剪贴板
4. 按 `Esc` 或点击其他地方关闭

### 查看统计

1. 点击弹窗 📊 图标打开管理面板
2. 切换到 **📊 消耗统计** 标签
3. 查看 Token 总量、请求次数、翻译/总结分类统计
4. 柱状图直观展示翻译与总结的 Token 消耗比例

---

## ⚠️ 注意事项

- 本插件**不会收集或上传**你的 API Key 到任何第三方服务器，所有配置仅存储在浏览器本地
- 翻译质量和速度取决于你所使用的 API 服务商和模型
- Token 消耗由 API 服务商计费，请关注管理面板中的用量统计
- 如果在刚更新扩展后遇到问题，请**刷新目标网页**后重试

---

<p align="center">
  <sub>Made with ❤️ | MIT License</sub>
</p>
