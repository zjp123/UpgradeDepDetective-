# UpgradeLens 项目搭建步骤

## 项目概述

UpgradeLens 是一个前端项目依赖版本兼容性检测工具，用于解决以下问题：

1. 老项目升级依赖版本时，发现多个依赖的最新版本之间不兼容
2. 项目搭建初期，某些依赖之间存在不兼容问题

该工具可以提前检测出哪些依赖版本不兼容，并给出匹配的版本建议，帮助开发者避免因依赖冲突导致的问题。

## 搭建步骤

### 1. 初始化项目

```bash
# 创建项目目录
mkdir UpgradeLens
cd UpgradeLens

# 初始化 package.json
npm init -y
```

### 2. 配置项目基本信息

修改 `package.json` 文件，添加项目描述、关键字和脚本命令：

```json
{
  "name": "upgrade-lens",
  "version": "1.0.0",
  "description": "前端项目依赖版本兼容性检测工具",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest"
  },
  "keywords": [
    "dependency",
    "compatibility",
    "version",
    "upgrade",
    "frontend"
  ],
  "author": "",
  "license": "MIT"
}
```

### 3. 安装核心依赖

```bash
# 安装主要依赖
npm install axios chalk commander inquirer semver

# 安装开发依赖
npm install --save-dev jest nodemon
```

### 4. 创建项目目录结构

```bash
mkdir -p src
```

### 5. 实现核心功能模块

#### 5.1 创建命令行入口文件 (src/index.js)

实现命令行界面，处理用户输入的参数，并调用相应的功能模块。

主要功能：
- 定义命令行参数和选项
- 提供交互式分析模式
- 协调各个功能模块的调用

#### 5.2 实现项目分析器 (src/analyzer.js)

负责分析项目的依赖信息，包括：
- 读取项目的 package.json 文件
- 提取依赖信息（dependencies, devDependencies, peerDependencies）
- 获取依赖的最新版本信息

#### 5.3 实现兼容性检查器 (src/compatibility.js)

核心功能模块，负责检测依赖之间的兼容性：
- 分析依赖对之间的兼容性
- 检查 peerDependencies 要求
- 分析升级到最新版本的兼容性
- 提供版本兼容性建议
- 维护已知兼容性问题数据库

#### 5.4 实现报告生成器 (src/report.js)

负责生成兼容性分析报告：
- 控制台输出彩色报告
- 生成 Markdown 格式的报告文件
- 展示兼容和不兼容的依赖对
- 提供升级分析和版本建议

### 6. 创建项目文档

#### 6.1 README.md

提供项目概述、安装和使用说明。

#### 6.2 prompt.md (本文档)

记录项目的搭建步骤和实现过程。

## 核心功能实现细节

### 依赖分析

1. 读取项目的 package.json 文件
2. 提取各类依赖信息
3. 通过 npm registry API 获取依赖的最新版本信息

### 兼容性检测算法

1. **依赖对分析**：生成所有依赖的两两组合，检查它们之间的兼容性
2. **peerDependencies 检查**：检查依赖的 peerDependencies 要求是否满足
3. **已知问题数据库**：维护常见的依赖兼容性问题，如 React 和 React DOM 版本必须匹配
4. **版本推荐**：当发现不兼容问题时，尝试找到兼容的版本组合
5. **升级分析**：分析升级到最新版本可能带来的兼容性问题

### 报告生成

1. 控制台输出彩色报告，使用 chalk 库增强可读性
2. 生成 Markdown 格式的详细报告，可保存为文件
3. 报告内容包括：兼容的依赖对、不兼容的依赖对、升级分析、版本建议

## 使用方法

### 基本用法

```bash
# 全局安装
npm install -g upgrade-lens

# 分析当前目录的项目
upgrade-lens

# 分析指定路径的项目
upgrade-lens --path /path/to/your/project

# 交互式分析模式
upgrade-lens -i

# 生成报告文件
upgrade-lens -o report.md
```

### 命令行选项

- `-p, --path <path>`: 指定项目路径（默认：当前目录）
- `-d, --deep`: 深度分析依赖关系
- `-i, --interactive`: 交互式分析模式
- `-o, --output <file>`: 输出报告到文件
- `-h, --help`: 显示帮助信息
- `-V, --version`: 显示版本号

## 后续优化方向

1. **扩展兼容性数据库**：收集更多常见的依赖兼容性问题
2. **支持更多包管理器**：增加对 yarn, pnpm 等的支持
3. **依赖图可视化**：提供依赖关系的可视化展示
4. **自动修复建议**：提供自动更新 package.json 的功能
5. **Web 界面**：开发 Web 界面，提供更友好的用户体验
6. **插件系统**：支持通过插件扩展功能
7. **CI/CD 集成**：提供与 CI/CD 系统集成的能力，在构建过程中自动检测兼容性问题