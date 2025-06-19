/**
 * 插件接口定义
 * 所有插件都应该实现这个接口
 */

/**
 * 插件钩子类型定义
 */
export const HOOKS = {
  // 项目分析阶段
  BEFORE_ANALYZE: 'before-analyze',
  AFTER_ANALYZE: 'after-analyze',
  ANALYZE_PACKAGE: 'analyze-package',
  
  // 兼容性检查阶段
  BEFORE_COMPATIBILITY_CHECK: 'before-compatibility-check',
  AFTER_COMPATIBILITY_CHECK: 'after-compatibility-check',
  CHECK_PAIR_COMPATIBILITY: 'check-pair-compatibility',
  
  // 报告生成阶段
  BEFORE_REPORT_GENERATION: 'before-report-generation',
  AFTER_REPORT_GENERATION: 'after-report-generation',
  FORMAT_REPORT: 'format-report',
  
  // 版本推荐阶段
  RECOMMEND_VERSION: 'recommend-version',
  FILTER_RECOMMENDATIONS: 'filter-recommendations',
  
  // 自定义检查
  CUSTOM_CHECK: 'custom-check',
  
  // 数据处理
  TRANSFORM_DATA: 'transform-data',
  VALIDATE_DATA: 'validate-data'
};

/**
 * 插件基类
 * 提供插件的基本结构和默认实现
 */
export class BasePlugin {
  constructor(name, version = '1.0.0') {
    this.name = name;
    this.version = version;
    this.description = '';
    this.author = '';
    this.enabled = true;
    this.config = {};
  }

  /**
   * 插件初始化方法
   * @param {PluginManager} pluginManager - 插件管理器实例
   */
  async init(pluginManager) {
    this.pluginManager = pluginManager;
    // 子类应该重写此方法来注册钩子
  }

  /**
   * 插件清理方法
   * 在插件卸载时调用
   */
  async cleanup() {
    // 子类可以重写此方法来执行清理操作
  }

  /**
   * 注册钩子的便捷方法
   * @param {string} hookName - 钩子名称
   * @param {Function} callback - 回调函数
   */
  registerHook(hookName, callback) {
    if (this.pluginManager) {
      this.pluginManager.registerHook(hookName, callback.bind(this));
    }
  }

  /**
   * 设置插件配置
   * @param {Object} config - 插件配置
   */
  setConfig(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取插件配置
   * @returns {Object} - 插件配置
   */
  getConfig() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: this.author,
      enabled: this.enabled,
      config: this.config
    };
  }

  /**
   * 获取配置项值
   * @param {string} key - 配置项键名
   * @param {*} defaultValue - 默认值
   * @returns {*} - 配置项值
   */
  getConfigValue(key, defaultValue = null) {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  /**
   * 启用插件
   */
  enable() {
    this.enabled = true;
  }

  /**
   * 禁用插件
   */
  disable() {
    this.enabled = false;
  }
}

/**
 * 插件工具函数
 */
export const PluginUtils = {
  /**
   * 验证插件结构
   * @param {Object} plugin - 插件对象
   * @returns {boolean} - 是否有效
   */
  validatePlugin(plugin) {
    if (!plugin || typeof plugin !== 'object') {
      return false;
    }

    // 检查必需的属性
    if (!plugin.name || typeof plugin.name !== 'string') {
      return false;
    }

    if (!plugin.init || typeof plugin.init !== 'function') {
      return false;
    }

    return true;
  },

  /**
   * 创建插件错误
   * @param {string} message - 错误消息
   * @param {string} pluginName - 插件名称
   * @returns {Error} - 插件错误
   */
  createPluginError(message, pluginName) {
    const error = new Error(`[Plugin: ${pluginName}] ${message}`);
    error.isPluginError = true;
    error.pluginName = pluginName;
    return error;
  },

  /**
   * 安全执行插件方法
   * @param {Function} fn - 要执行的函数
   * @param {string} pluginName - 插件名称
   * @param {*} defaultValue - 默认返回值
   * @returns {Promise<*>} - 执行结果
   */
  async safeExecute(fn, pluginName, defaultValue = null) {
    try {
      return await fn();
    } catch (error) {
      console.error(`插件 ${pluginName} 执行失败:`, error.message);
      return defaultValue;
    }
  }
};

/**
 * 插件事件数据结构定义
 */
export const PluginEventData = {
  /**
   * 项目分析数据
   */
  ProjectAnalysis: {
    projectPath: '',
    packageJson: {},
    dependencies: {},
    devDependencies: {},
    peerDependencies: {},
    latestVersions: {}
  },

  /**
   * 兼容性检查数据
   */
  CompatibilityCheck: {
    compatible: [],
    incompatible: [],
    unknown: [],
    recommendations: {}
  },

  /**
   * 报告数据
   */
  ReportData: {
    title: '',
    content: '',
    format: 'markdown', // 'markdown', 'json', 'html'
    outputPath: ''
  }
};