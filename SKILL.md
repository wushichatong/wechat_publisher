---
name: wechat-publisher
description: 独立的微信公众号文章发布工具。生成文章、AI 生图、直接发布到微信公众号草稿箱，无需预览。可分享给其他 OpenClaw 用户。
trigger: 当用户要求"发布微信文章"、"写公众号"、"直接发微信"时触发
---

# 微信公众号发布 Skill

独立的微信公众号文章发布工具，不依赖任务中心，直接调用微信 API 发布。

## 特性

- ✅ **直接发布**：无需预览，直接同步到微信公众号草稿箱
- ✅ **AI 生图**：集成 Gemini Pro 自动生成封面和插图
- ✅ **智能标题**：AI 生成 5-8 个候选标题供选择
- ✅ **自动排版**：转换为微信兼容的 HTML 格式
- ✅ **图片上传**：自动上传图片到微信 CDN
- ✅ **独立运行**：不依赖任务中心，可独立分享

## 配置

在 `~/.openclaw/workspace/.env` 或 OpenClaw 配置中添加：

```env
WECHAT_APPID=your_appid
WECHAT_APPSECRET=your_appsecret
GEMINI_API_KEY=your_gemini_key  # 用于生图
```

## 使用方法

### 1. 从主题创建文章

```
用户：写一篇关于"如何使用 AI 提升工作效率"的公众号文章，直接发布
```

AI 会：
1. 生成 5-8 个候选标题
2. 用户选择标题
3. 生成文章内容
4. 生成封面图（Gemini Pro）
5. 转换为微信 HTML
6. 上传图片到微信 CDN
7. 创建草稿并同步
8. 返回 Media ID

### 2. 从 Markdown 文件创建

```
用户：把这个 Markdown 文件发布到微信公众号
[附件: article.md]
```

### 3. 从已有内容创建

```
用户：把我刚才说的内容整理成公众号文章发布
```

## 工作流程

```
用户输入
  ↓
生成标题（AI）
  ↓
用户选择标题
  ↓
生成封面（Gemini Pro，后台）
  ↓
生成/解析内容
  ↓
等待封面生成完成
  ↓
转换为微信 HTML
  ↓
上传所有图片到微信 CDN
  ↓
创建草稿
  ↓
完成！返回 Media ID
```

## 核心脚本

### `scripts/publish.mjs`

主脚本，处理整个发布流程：

```bash
node ~/.openclaw/workspace/skills/wechat-publisher/scripts/publish.mjs \
  --title "文章标题" \
  --content "文章内容（Markdown）" \
  --author "龙虾"
```

参数：
- `--title` - 文章标题（必填）
- `--content` - 文章内容，Markdown 格式（必填）
- `--author` - 作者名（可选，默认"龙虾"）
- `--cover-prompt` - 封面图 prompt（可选，自动生成）
- `--no-cover` - 不生成封面，使用默认封面

### `scripts/wechat-api.mjs`

微信 API 封装：
- `getAccessToken()` - 获取并缓存 token
- `uploadImage(path)` - 上传图片到微信 CDN
- `createDraft(article)` - 创建草稿
- `listDrafts()` - 列出草稿
- `deleteDraft(mediaId)` - 删除草稿

### `scripts/renderer.mjs`

HTML 渲染器，Markdown → 微信兼容 HTML：
- 所有样式内联
- 代码块特殊处理（macOS 风格）
- 支持：标题、段落、列表、引用、代码、图片等

### `scripts/title-generator.mjs`

标题生成器，生成 5-8 个候选标题：
- 5 种类型：数字+结果型、痛点+解决方案型、对比+选择型、经验分享型、疑问+答案型
- 每个标题标注类型和字数
- 推荐最佳 1-2 个

## 标题生成规则

**核心原则：**
1. **字数控制**：20-27字最佳，不超过32字
2. **勾起好奇心**：制造知识漏洞，让人想点开
3. **明确利益**：告诉读者能获得什么
4. **简洁直接**：避免夸张，突出实用性
5. **包含关键词**：便于搜索引擎收录
6. **禁止 emoji**：微信公众号标题不支持 emoji

**标题类型模板：**

1. **数字+结果型**（推荐，效果最好）
   - 格式：`[时间/数量对比] + [结果] + [工具/方法] + [情感词]`
   - 示例：`1小时音频3分钟转文档，这个免费AI工具太好用了`

2. **痛点+解决方案型**
   - 格式：`[痛点场景] + [解决方案] + [效果/特点]`
   - 示例：`音频转文字还在手打？这个免费工具准确率98%`

3. **对比+选择型**
   - 格式：`[对比项] + [测试过程] + [最终选择]`
   - 示例：`音频转文字：测了4个工具，最后我选了这个免费的`

4. **经验分享型**
   - 格式：`[真实经历] + [结果] + [方法]`
   - 示例：`接了个音频转文档的活，用AI 5分钟搞定赚了500`

5. **疑问+答案型**
   - 格式：`[疑问句] + [答案提示]`
   - 示例：`音频转文字哪个工具最好用？实测4种方案`

## 生图功能

使用现有的 `gemini-imagegen` skill：

```bash
uv run ~/.openclaw/workspace/skills/gemini-imagegen/scripts/imagegen.py \
  --prompt "封面描述" \
  --filename /tmp/cover.png \
  --model pro \
  --timeout 600
```

封面要求：
- 横版 16:9
- 主题相关
- 现代扁平设计风格
- **所有文字必须使用中文**

## 微信 HTML 渲染

### 代码块（微信兼容）

macOS 风格（红黄绿三圆点）：

```html
<section style="border-radius:10px;overflow:hidden;background:#2b2b2b;">
  <!-- 标题栏 -->
  <section style="display:flex;gap:6px;padding:10px 14px;background:#3a3a3a;">
    <span style="width:12px;height:12px;border-radius:50%;background:#ff5f57;"></span>
    <span style="width:12px;height:12px;border-radius:50%;background:#febc2e;"></span>
    <span style="width:12px;height:12px;border-radius:50%;background:#28c840;"></span>
  </section>
  <!-- 代码区 -->
  <section style="padding:16px 20px;background:#2b2b2b;">
    <span style="display:block;...">第一行</span>
    <span style="display:block;...">第二行</span>
  </section>
</section>
```

关键点：
- 每行用 `<span display:block>` 包裹
- 所有空格转 `&nbsp;`
- 外层 `<section overflow-x:auto>`

### 样式规范

- 所有样式内联
- 字体：17px，行高 1.75
- 标题：h2 20px，h3 18px
- 段落间距：20px
- 引用块：左侧蓝色边框
- 图片：圆角 8px，最大宽度 100%

## 注意事项

- **标题禁止 emoji**：微信公众号标题不支持 emoji
- **内容合规**：
  - 禁止：翻墙、梯子、VPN、科学上网等敏感词
  - 禁止：政治敏感内容、违反国内法律法规的内容
- **图片必须用 Pro 模型**（flash 中文效果差）
- **Pro 模型后台运行**（耗时 1-3 分钟）

## 错误处理

- Token 过期自动重试
- 图片上传失败回退到默认封面
- 网络错误重试 3 次
- 详细的错误日志

## 示例

### 完整流程示例

```javascript
// 1. 生成标题
const titles = await generateTitles(content);
console.log('候选标题：', titles);

// 2. 用户选择标题
const selectedTitle = titles[0].title;

// 3. 生成封面（后台）
const coverPromise = generateCover(selectedTitle, content);

// 4. 转换内容
const html = await markdownToWechatHTML(content);

// 5. 等待封面
const coverPath = await coverPromise;

// 6. 上传图片
const thumbMediaId = await uploadImage(coverPath);
const processedHTML = await uploadInlineImages(html);

// 7. 创建草稿
const result = await createDraft({
  title: selectedTitle,
  content: processedHTML,
  thumbMediaId,
  author: '龙虾',
});

console.log('草稿创建成功！Media ID:', result.mediaId);
```

## 分享

这个 skill 可以通过 ClawHub 分享给其他 OpenClaw 用户：

1. 创建 GitHub 仓库
2. 推送代码
3. 在 ClawHub 上发布
4. 其他用户可以通过 `clawhub install wechat-publisher` 安装

## 依赖

- Node.js 18+
- Gemini API Key（用于生图）
- 微信公众号 AppID 和 AppSecret

## License

MIT
