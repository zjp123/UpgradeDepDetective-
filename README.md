# UpgradeLens - 前端项目依赖版本兼容性检测工具

## 项目简介

UpgradeLens 是一个专为前端项目设计的依赖版本兼容性检测工具。它可以帮助开发者在升级项目依赖或初始搭建项目时，提前发现不兼容的依赖版本并提供匹配的版本建议，从而避免因依赖版本不兼容导致的项目问题。

## 主要功能

- **依赖分析**: 自动读取 package.json 并获取所有依赖的最新版本信息
- **兼容性检测**: 检查依赖之间的版本兼容性，识别潜在冲突
- **升级分析**: 分析哪些依赖可以安全升级，哪些需要谨慎处理
- **详细报告**: 生成清晰的兼容性报告，包含具体的问题和建议
- **交互模式**: 支持交互式选择要检查的依赖类型
- **多格式输出**: 支持控制台输出和文件输出（JSON/Markdown）
- **插件系统**: 支持通过插件扩展功能，提供灵活的钩子机制

## 系统要求

- Node.js >= 14.16.0
- 使用ESM模块系统
- 注意：本项目使用ES模块，处理JSON文件时采用fs模块读取而非直接导入

## 安装

```bash
# 全局安装
npm install -g upgrade-lens

# 或者本地安装
npm install upgrade-lens --save-dev
```

## 使用方法

### 基本使用

```bash
# 分析当前目录的项目
npx upgrade-lens

# 分析指定路径的项目
npx upgrade-lens -p /path/to/your/project

# 启用深度分析
npx upgrade-lens -d

# 交互式模式
npx upgrade-lens -i

# 输出到文件
npx upgrade-lens -o report.json
npx upgrade-lens -o report.md
```

### 插件管理

```bash
# 列出所有插件
npx upgrade-lens plugin list

# 启用/禁用插件
npx upgrade-lens plugin enable react-ecosystem-plugin
npx upgrade-lens plugin disable example-plugin

# 配置插件
npx upgrade-lens plugin config security-audit-plugin

# 创建新插件
npx upgrade-lens plugin create my-custom-plugin

# 删除插件
npx upgrade-lens plugin remove old-plugin
```

### 命令行选项

### 命令行选项

#### 主命令选项
- `-p, --path <path>`: 指定项目路径（默认：当前目录）
- `-d, --deep`: 启用深度分析，检查更多依赖关系
- `-i, --interactive`: 交互式模式，可选择检查的依赖类型
- `-o, --output <file>`: 将报告输出到指定文件
- `-h, --help`: 显示帮助信息
- `-V, --version`: 显示版本号

#### 插件管理命令
- `plugin list`: 列出所有插件
- `plugin enable <name>`: 启用指定插件
- `plugin disable <name>`: 禁用指定插件
- `plugin config <name>`: 配置指定插件
- `plugin create <name>`: 创建新插件
- `plugin remove <name>`: 删除指定插件

### 示例

```bash
# 交互式分析模式
upgrade-lens -i

# 生成报告文件
upgrade-lens -o report.md

# 深度分析并生成报告
upgrade-lens -d -o report.md
```

## 报告示例

分析完成后，UpgradeLens 会生成类似下面的报告：

```
📊 依赖兼容性分析报告
====================

✅ 兼容的依赖对: 10
  • react@17.0.2 和 react-dom@17.0.2
  • react@17.0.2 和 react-router@5.2.0
  ...

❌ 不兼容的依赖对: 2
  • react@17.0.2 和 react-router@6.0.0
    原因: react-router 6.0.0 需要 react@>=16.8，但当前版本是 17.0.2
    推荐版本:
      - react: 17.0.2
      - react-router: 5.3.0
  ...

🔄 依赖升级分析
==============

✅ 可以安全升级的依赖: 5
  • axios: 0.21.1 → 0.24.0
  • lodash: 4.17.20 → 4.17.21
  ...

⚠️ 升级可能导致问题的依赖: 2
  • react-router: 5.2.0 → 6.0.0
    可能的问题:
      - 与 react-router-dom 不兼容: react-router 6.0.0 需要 react-router-dom 6.0.0
  ...

💡 版本兼容性建议
==============

react-router 的推荐版本:
  • 版本 5.3.0 兼容: react, react-router-dom
```

## 插件系统

UpgradeLens 提供了强大的插件系统，允许开发者扩展工具的功能。

### 内置插件

1. **React生态系统插件** (`react-ecosystem-plugin`)
   - 检测React和React DOM版本匹配
   - React Router版本兼容性检查
   - TypeScript类型定义版本匹配

2. **安全审计插件** (`security-audit-plugin`)
   - 检测已知安全漏洞
   - 识别过时的依赖包
   - 提供安全风险评估

3. **示例插件** (`example-plugin`)
   - 演示插件开发模式
   - 提供开发参考

### 插件开发

详细的插件开发指南请参考 [插件系统文档](./docs/plugin-system.md)。

## 后续优化方向

1. **缓存机制**：缓存npm包信息，提高重复分析的速度
2. **并发优化**：并行获取包信息，提升分析效率
3. **更智能的兼容性检测**：基于语义化版本和实际使用情况的智能分析
4. **Web界面**：提供可视化的Web界面进行依赖管理
5. **CI/CD集成**：支持在持续集成中自动检测依赖兼容性
6. ~~**插件系统**：支持通过插件扩展功能~~ ✅ **已完成**
7. **多包管理器支持**：支持yarn、pnpm等其他包管理器
8. **依赖图可视化**：生成依赖关系图表
9. ~~**安全漏洞检测**：集成安全漏洞数据库~~ ✅ **已通过插件实现**
10. **自动修复建议**：提供自动化的依赖升级方案

## 贡献

欢迎提交问题和功能请求！如果您想贡献代码，请先创建一个 issue 讨论您想要更改的内容。

## 许可证

[MIT](LICENSE)