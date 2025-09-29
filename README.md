# 💡 Moment - 个人灵感记录应用

Moment 是一个使用 InsForge Backend Service 开发的个人灵感记录应用，帮助用户记录、管理和分享他们的创意想法。

## ✨ 功能特性

### 🔐 用户认证
- 邮箱密码注册/登录
- Google OAuth 登录
- GitHub OAuth 登录
- 安全的用户会话管理

### 📝 灵感管理
- **创建灵感**: 记录标题、内容、分类和心情
- **分类系统**: 想法、引言、思考、解决方案
- **心情标记**: 兴奋、平静、沮丧、充满希望
- **标签系统**: 自定义标签便于搜索和分类
- **图片附件**: 上传图片丰富灵感内容
- **私有设置**: 设置灵感为私有或公开

### 🔍 搜索与筛选
- **全文搜索**: 在标题和内容中搜索关键词
- **分类筛选**: 按分类快速查找灵感
- **心情筛选**: 按心情状态筛选
- **收藏筛选**: 只显示收藏的灵感

### ⭐ 交互功能
- **收藏系统**: 标记重要的灵感
- **编辑更新**: 随时修改灵感内容
- **删除管理**: 安全删除不需要的记录
- **详情查看**: 查看灵感的完整信息

### 👥 社交功能
- **关注系统**: 关注其他用户，建立社交网络
- **公开灵感**: 查看关注用户的公开灵感
- **小组功能**: 创建和加入兴趣小组
- **小组申请**: 申请加入私有小组，带有投票系统
- **申请过期**: 小组申请一个月自动过期
- **投票限制**: 每个成员对每个申请只能投一次票

### 🔔 通知系统
- **实时通知**: 关注、小组申请、投票等活动通知
- **通知管理**: 标记已读、筛选、清空通知
- **自动清理**: 过期申请自动处理并发送通知

## 🏗️ 技术架构

### 前端技术
- **HTML5**: 语义化标记
- **CSS3**: 现代响应式设计
- **Vanilla JavaScript**: 原生 ES6+ 开发
- **Vite**: 快速开发服务器

### 后端服务
- **InsForge Backend**: 完整的 BaaS 解决方案
- **PostgreSQL**: 可靠的关系型数据库
- **PostgREST**: 自动 REST API 生成
- **Row Level Security**: 数据安全控制
- **Edge Functions**: Deno 运行时的无服务器函数

### Edge Functions
- **apply-to-group.js**: 处理小组申请逻辑
- **submit-vote.js**: 处理投票提交和验证
- **cleanup-expired-applications.js**: 自动清理过期申请

### 存储服务
- **InsForge Storage**: 文件上传和管理
- **公共存储桶**: 图片和文档存储

## 📊 数据库设计

### 核心表结构

#### `inspirations` 表
```sql
CREATE TABLE inspirations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[], -- 标签数组
  category TEXT, -- 分类
  mood TEXT, -- 心情
  image_url TEXT, -- 图片URL
  audio_url TEXT, -- 音频URL
  is_favorite BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 社交功能表结构

##### `follows` 表 - 关注关系
```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
```

##### `groups` 表 - 小组信息
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

##### `group_members` 表 - 小组成员
```sql
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);
```

##### `group_applications` 表 - 小组申请
```sql
CREATE TABLE group_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 month'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

##### `application_votes` 表 - 申请投票
```sql
CREATE TABLE application_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES group_applications(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('approve', 'reject')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(application_id, voter_id)
);
```

##### `notifications` 表 - 通知系统
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 安全策略
- **Row Level Security (RLS)**: 启用行级安全
- **用户隔离**: 用户只能访问自己的数据
- **自动时间戳**: 创建和更新时间自动管理

## 🚀 快速开始

### 1. 环境要求
- Node.js 16+
- npm 或 yarn
- 现代浏览器 (Chrome, Firefox, Safari, Edge)

### 2. 安装依赖
```bash
npm install
```

### 3. 启动开发服务器
```bash
npm run dev
```

应用将在 http://localhost:3000 启动

### 4. 构建生产版本
```bash
npm run build
```

## 🔧 配置说明

### InsForge 配置
- **Backend URL**: `https://3wppa5bh.us-east.insforge.app`
- **API Key**: 已配置在应用中
- **存储桶**: `inspiration-files` (公共访问)

### OAuth 提供商
- **Google**: 使用 InsForge 共享密钥
- **GitHub**: 使用 InsForge 共享密钥

## 📱 使用指南

### 用户注册/登录
1. 访问应用首页
2. 选择注册或登录
3. 填写邮箱和密码，或使用 OAuth 登录
4. 注册时需要提供昵称

### 记录灵感
1. 点击"记录灵感"按钮
2. 填写标题和内容（必填）
3. 选择分类和心情
4. 添加标签（可选）
5. 上传图片（可选）
6. 设置私有性
7. 保存记录

### 管理灵感
- **查看**: 点击灵感卡片查看详情
- **编辑**: 在详情页点击编辑按钮
- **收藏**: 点击星标图标
- **删除**: 点击垃圾桶图标（需确认）

### 搜索筛选
- **搜索框**: 输入关键词搜索
- **分类筛选**: 下拉选择特定分类
- **心情筛选**: 下拉选择特定心情
- **收藏筛选**: 切换只显示收藏

### 社交功能使用
- **关注用户**: 在用户列表中点击关注按钮
- **查看关注动态**: 查看关注用户的公开灵感
- **创建小组**: 填写小组名称和描述
- **申请加入**: 向私有小组提交申请
- **投票审核**: 小组成员对申请进行投票
- **通知管理**: 查看关注、申请、投票等通知

### Edge Functions 功能
- **智能申请**: 自动检查重复申请和过期状态
- **投票验证**: 确保每人只能投票一次
- **自动清理**: 定期处理过期申请并发送通知
- **通知推送**: 实时推送相关活动通知

## 🎨 设计特色

### 视觉设计
- **渐变背景**: 优雅的紫色渐变
- **卡片布局**: 现代化的卡片设计
- **响应式**: 适配各种屏幕尺寸
- **动画效果**: 流畅的交互动画

### 用户体验
- **直观操作**: 简单易懂的界面
- **快速反馈**: 实时的操作反馈
- **错误处理**: 友好的错误提示
- **加载状态**: 清晰的加载指示

## 🔐 安全特性

### 身份验证
- **JWT Token**: 安全的用户认证
- **会话管理**: 自动token刷新
- **OAuth 集成**: 第三方安全登录

### 数据安全
- **行级安全**: 数据库级别的访问控制
- **HTTPS**: 全程加密传输
- **输入验证**: 前端和后端双重验证

## 📈 性能优化

### 前端优化
- **按需加载**: 模块化代码结构
- **图片优化**: 自动压缩和懒加载
- **缓存策略**: 合理的浏览器缓存

### 后端优化
- **数据库索引**: 优化查询性能
- **API 缓存**: PostgREST 内置缓存
- **CDN 加速**: 静态资源加速

## 🛠️ 开发指南

### 项目结构
```
moment/
├── index.html          # 主页面
├── style.css          # 样式文件
├── app.js             # 主应用逻辑
├── package.json       # 项目配置
├── vite.config.js     # 构建配置
├── netlify.toml       # Netlify 部署配置
├── public/            # 静态资源目录
│   └── i18n.js        # 多语言配置文件
├── functions/          # Edge Functions 目录
│   ├── apply-to-group.js           # 小组申请处理
│   ├── submit-vote.js              # 投票提交处理
│   └── cleanup-expired-applications.js  # 过期申请清理
└── README.md          # 项目文档
```

### 代码规范
- **ES6+ 语法**: 使用现代 JavaScript
- **模块化**: 功能分离，便于维护
- **注释完整**: 关键功能详细注释
- **错误处理**: 完善的异常处理机制

### 扩展开发
- **新增功能**: 基于现有架构扩展
- **样式定制**: 修改 CSS 变量
- **API 集成**: 使用 InsForge SDK

## 📞 技术支持

### 常见问题
1. **登录失败**: 检查网络连接和凭据
2. **图片上传失败**: 确认文件格式和大小
3. **数据同步问题**: 刷新页面重新加载

### 反馈渠道
- 通过 GitHub Issues 报告问题
- 发送邮件到开发团队
- 查看 InsForge 官方文档

## 📄 许可证

本项目采用 MIT 许可证，详见 LICENSE 文件。

## 🙏 致谢

感谢 InsForge 团队提供优秀的 Backend-as-a-Service 平台，让开发变得如此简单高效。