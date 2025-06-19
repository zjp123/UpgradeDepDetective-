# UpgradeLens 插件系统

## 概述

UpgradeLens 插件系统允许开发者通过插件扩展工具的功能，提供了灵活的钩子机制来在分析流程的各个阶段注入自定义逻辑。

## 插件架构

### 核心组件

1. **PluginManager** - 插件管理器，负责插件的加载、注册和执行
2. **BasePlugin** - 插件基类，提供插件的标准接口
3. **HOOKS** - 钩子系统，定义了可扩展的执行点
4. **PluginCLI** - 插件命令行管理工具

### 钩子系统

插件系统提供以下钩子点：

- `BEFORE_ANALYZE` - 项目分析前
- `AFTER_ANALYZE` - 项目分析后
- `ANALYZE_PACKAGE` - 分析单个包时
- `BEFORE_COMPATIBILITY_CHECK` - 兼容性检查前
- `AFTER_COMPATIBILITY_CHECK` - 兼容性检查后
- `CHECK_PAIR_COMPATIBILITY` - 检查依赖对兼容性时
- `CUSTOM_CHECK` - 自定义检查
- `BEFORE_REPORT_GENERATION` - 报告生成前
- `AFTER_REPORT_GENERATION` - 报告生成后
- `FORMAT_REPORT` - 格式化报告时

## 创建插件

### 1. 使用CLI创建插件模板

```bash
npx upgrade-lens plugin create my-plugin
```

### 2. 手动创建插件

创建一个继承自 `BasePlugin` 的类：

```javascript
import { BasePlugin, HOOKS } from '../src/plugin-interface.js';
import chalk from 'chalk';

export class MyPlugin extends BasePlugin {
  constructor() {
    super('my-plugin', '1.0.0');
    this.description = '我的自定义插件';
    this.author = 'Your Name';
  }

  async initialize() {
    console.log(`插件 ${this.name} 初始化完成`);
    
    // 注册钩子
    this.registerHook(HOOKS.AFTER_ANALYZE, this.afterAnalyze.bind(this));
    this.registerHook(HOOKS.FORMAT_REPORT, this.formatReport.bind(this));
  }

  async afterAnalyze(data) {
    // 在项目分析后执行的逻辑
    console.log(`发现 ${Object.keys(data.dependencies || {}).length} 个依赖`);
  }

  async formatReport(data) {
    // 添加自定义报告内容
    if (!data.additionalReports) {
      data.additionalReports = [];
    }
    
    data.additionalReports.push(
      '\n' + chalk.green('✨ 自定义插件报告') + '\n' +
      '这是来自我的插件的自定义内容\n'
    );
  }

  async cleanup() {
    console.log(`插件 ${this.name} 清理完成`);
  }
}

export default MyPlugin;
```

### 3. 配置插件

在 `plugins/plugin-config.json` 中添加插件配置：

```json
{
  "plugins": {
    "my-plugin": {
      "enabled": true,
      "config": {
        "customOption": "value",
        "enableFeature": true
      }
    }
  }
}
```

## 插件管理

### 命令行管理

```bash
# 列出所有插件
npx upgrade-lens plugin list

# 启用插件
npx upgrade-lens plugin enable my-plugin

# 禁用插件
npx upgrade-lens plugin disable my-plugin

# 配置插件
npx upgrade-lens plugin config my-plugin

# 创建新插件
npx upgrade-lens plugin create new-plugin

# 删除插件
npx upgrade-lens plugin remove old-plugin
```

### 配置文件管理

插件配置文件位于 `plugins/plugin-config.json`：

```json
{
  "global": {
    "timeout": 5000,
    "enableLogging": true,
    "failOnPluginError": false
  },
  "plugins": {
    "plugin-name": {
      "enabled": true,
      "config": {
        "option1": "value1",
        "option2": true
      }
    }
  }
}
```

## 内置插件

### 1. React生态系统插件 (react-ecosystem-plugin)

检测React生态系统的兼容性问题：
- React和React DOM版本匹配
- React Router版本兼容性
- TypeScript类型定义版本匹配

### 2. 安全审计插件 (security-audit-plugin)

检测依赖包的安全漏洞：
- 已知CVE漏洞检测
- 过时依赖包识别
- 安全风险评估

### 3. 示例插件 (example-plugin)

演示插件开发的基本模式和最佳实践。

## 插件开发最佳实践

### 1. 错误处理

```javascript
async myHookHandler(data) {
  try {
    // 插件逻辑
  } catch (error) {
    console.error(`插件 ${this.name} 执行失败:`, error.message);
    // 不要抛出错误，除非是致命错误
  }
}
```

### 2. 配置管理

```javascript
// 获取配置值，提供默认值
const enableFeature = this.getConfigValue('enableFeature', true);
const customMessage = this.getConfigValue('customMessage', 'Default message');
```

### 3. 日志输出

```javascript
// 根据配置控制日志输出
if (this.getConfigValue('enableLogging', true)) {
  console.log(chalk.blue(`${this.name}: 执行某项操作`));
}
```

### 4. 数据修改

```javascript
// 安全地修改数据
async modifyData(data) {
  // 检查数据结构
  if (!data.customField) {
    data.customField = [];
  }
  
  // 添加数据
  data.customField.push({
    source: this.name,
    timestamp: new Date().toISOString(),
    data: 'custom data'
  });
}
```

### 5. 异步操作

```javascript
// 正确处理异步操作
async fetchExternalData(packageName) {
  try {
    const response = await fetch(`https://api.example.com/package/${packageName}`);
    return await response.json();
  } catch (error) {
    console.warn(`获取 ${packageName} 的外部数据失败:`, error.message);
    return null;
  }
}
```

## 插件API参考

### BasePlugin 类

#### 方法

- `constructor(name, version)` - 构造函数
- `initialize()` - 初始化插件
- `cleanup()` - 清理插件资源
- `registerHook(hookName, handler)` - 注册钩子处理器
- `setConfig(config)` - 设置插件配置
- `getConfig()` - 获取插件配置
- `getConfigValue(key, defaultValue)` - 获取配置项值
- `enable()` - 启用插件
- `disable()` - 禁用插件

#### 属性

- `name` - 插件名称
- `version` - 插件版本
- `description` - 插件描述
- `author` - 插件作者
- `enabled` - 是否启用
- `config` - 插件配置

### 钩子数据结构

#### ANALYZE_PACKAGE
```javascript
{
  packageName: string,
  packageInfo: {
    currentVersion: string,
    latestVersion: string,
    publishedDate: string,
    // ... 其他包信息
  }
}
```

#### CHECK_PAIR_COMPATIBILITY
```javascript
{
  package1: string,
  package2: string,
  version1: string,
  version2: string,
  compatible: boolean,
  reason: string
}
```

#### FORMAT_REPORT
```javascript
{
  result: {
    compatible: Array,
    incompatible: Array,
    unknown: Array,
    upgrades: Object
  },
  dependencies: Object,
  projectPath: string,
  additionalReports: Array
}
```

## 故障排除

### 常见问题

1. **插件加载失败**
   - 检查插件文件路径是否正确
   - 确认插件语法无误
   - 查看控制台错误信息

2. **钩子未执行**
   - 确认插件已启用
   - 检查钩子名称是否正确
   - 验证钩子注册代码

3. **配置不生效**
   - 检查配置文件格式
   - 确认配置键名正确
   - 重启应用以加载新配置

### 调试技巧

1. 启用详细日志：
```json
{
  "global": {
    "enableLogging": true
  }
}
```

2. 使用调试输出：
```javascript
console.log(`[${this.name}] Debug:`, data);
```

3. 检查插件状态：
```bash
npx upgrade-lens plugin list
```

## 贡献插件

如果您开发了有用的插件，欢迎贡献给社区：

1. 确保插件遵循最佳实践
2. 提供完整的文档和示例
3. 添加适当的测试
4. 提交Pull Request

## 许可证

插件系统遵循与UpgradeLens主项目相同的许可证。