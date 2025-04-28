# UpgradeLens - 前端项目依赖版本兼容性检测工具

## 项目简介

UpgradeLens 是一个专为前端项目设计的依赖版本兼容性检测工具。它可以帮助开发者在升级项目依赖或初始搭建项目时，提前发现不兼容的依赖版本并提供匹配的版本建议，从而避免因依赖版本不兼容导致的项目问题。

## 主要功能

- 分析项目的依赖关系和版本信息
- 检测依赖之间的兼容性问题
- 提供依赖升级的兼容性分析
- 推荐兼容的依赖版本组合
- 生成详细的兼容性报告
- 支持交互式分析模式

## 系统要求

- Node.js >= 14.16.0

## 安装

```bash
# 全局安装
npm install -g upgrade-lens

# 或者本地安装
npm install upgrade-lens --save-dev
```

## 使用方法

### 基本用法

```bash
# 分析当前目录的项目
upgrade-lens

# 分析指定路径的项目
upgrade-lens --path /path/to/your/project
```

### 命令行选项

```
Options:
  -p, --path <path>     指定项目路径 (默认: 当前目录)
  -d, --deep            深度分析依赖关系
  -i, --interactive     交互式分析模式
  -o, --output <file>   输出报告到文件
  -h, --help            显示帮助信息
  -V, --version         显示版本号
```

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

## 贡献

欢迎提交问题和功能请求！如果您想贡献代码，请先创建一个 issue 讨论您想要更改的内容。

## 许可证

[MIT](LICENSE)