import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chalk from 'chalk';
import { PluginUtils } from './plugin-interface.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 插件管理器
 * 负责插件的加载、注册和执行
 */
export class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
    this.pluginDir = path.resolve(__dirname, '../plugins');
    this.config = null;
    this.globalConfig = {
      pluginTimeout: 5000,
      enablePluginLogging: true,
      failOnPluginError: false
    };
  }

  /**
   * 注册钩子
   * @param {string} hookName - 钩子名称
   * @param {Function} callback - 回调函数
   */
  registerHook(hookName, callback) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName).push(callback);
  }

  /**
   * 执行钩子
   * @param {string} hookName - 钩子名称
   * @param {*} data - 传递给钩子的数据
   * @returns {Promise<*>} - 处理后的数据
   */
  async executeHook(hookName, data) {
    const callbacks = this.hooks.get(hookName) || [];
    let result = data;

    for (const callback of callbacks) {
      try {
        result = await this.withTimeout(
          callback(result),
          this.globalConfig.pluginTimeout,
          `钩子 ${hookName} 执行超时`
        );
      } catch (error) {
        console.error(chalk.red(`插件钩子 ${hookName} 执行失败:`, error.message));
        if (this.globalConfig.failOnPluginError) {
          throw error;
        }
      }
    }

    return result;
  }

  /**
   * 带超时的Promise执行
   * @param {Promise} promise - 要执行的Promise
   * @param {number} timeout - 超时时间(毫秒)
   * @param {string} errorMessage - 超时错误消息
   * @returns {Promise} - 执行结果
   */
  async withTimeout(promise, timeout, errorMessage) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(errorMessage)), timeout);
      })
    ]);
  }

  /**
   * 加载单个插件
   * @param {string} pluginPath - 插件文件路径
   * @returns {Promise<Object|null>} - 插件实例或null
   */
  async loadPlugin(pluginPath) {
    try {
      // 检查插件是否启用
      const pluginName = path.basename(pluginPath, '.js');
      if (!this.isPluginEnabled(pluginName)) {
        if (this.globalConfig.enableLogging) {
          console.log(chalk.yellow(`⚠️  插件 ${pluginName} 已禁用，跳过加载`));
        }
        return null;
      }

      // 将Windows绝对路径转换为file:// URL
      let importPath = pluginPath;
      if (path.isAbsolute(pluginPath) && process.platform === 'win32') {
        importPath = `file:///${pluginPath.replace(/\\/g, '/')}`;
      }

      // 动态导入插件
      const pluginModule = await import(importPath);
      let PluginClass = pluginModule.default;
      
      // 如果没有default导出，尝试查找类导出
      if (!PluginClass) {
        const exports = Object.keys(pluginModule);
        for (const exportName of exports) {
          if (typeof pluginModule[exportName] === 'function' && 
              pluginModule[exportName].prototype && 
              pluginModule[exportName].prototype.constructor === pluginModule[exportName]) {
            PluginClass = pluginModule[exportName];
            break;
          }
        }
      }
      
      if (!PluginClass || typeof PluginClass !== 'function') {
        throw new Error('插件文件必须导出一个类');
      }

      // 创建插件实例
      const plugin = new PluginClass();
      
      // 验证插件结构
      if (!PluginUtils.validatePlugin(plugin)) {
        throw new Error('插件结构无效');
      }

      // 设置插件配置
      const pluginConfig = this.getPluginConfig(pluginName);
      if (pluginConfig && typeof plugin.setConfig === 'function') {
        plugin.setConfig(pluginConfig);
      }

      // 初始化插件（带超时）
      if (typeof plugin.initialize === 'function') {
        await this.withTimeout(
          plugin.initialize(),
          this.globalConfig.timeout,
          `插件 ${plugin.name} 初始化超时`
        );
      }

      // 注册插件
      this.plugins.set(plugin.name, plugin);
      
      if (this.globalConfig.enableLogging) {
        console.log(chalk.green(`✅ 插件 ${plugin.name} 加载成功`));
      }
      
      return plugin;
    } catch (error) {
      const pluginName = path.basename(pluginPath, '.js');
      console.error(chalk.red(`❌ 加载插件失败 ${pluginPath}:`), error.message);
      
      if (this.globalConfig.failOnPluginError) {
        throw error;
      }
      
      return null;
    }
  }

  /**
   * 加载插件配置
   */
  async loadConfig() {
    try {
      const configPath = path.join(this.pluginDir, 'plugin-config.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configContent);
      
      // 合并全局配置
      if (this.config.globalConfig) {
        this.globalConfig = { ...this.globalConfig, ...this.config.globalConfig };
      }
      
      if (this.globalConfig.enablePluginLogging) {
        console.log(chalk.blue('📋 插件配置加载成功'));
      }
    } catch (error) {
      if (this.globalConfig.enablePluginLogging) {
        console.log(chalk.yellow('⚠️ 未找到插件配置文件，使用默认配置'));
      }
      this.config = { plugins: {} };
    }
  }

  /**
   * 检查插件是否启用
   * @param {string} pluginName - 插件名称
   * @returns {boolean} - 是否启用
   */
  isPluginEnabled(pluginName) {
    if (!this.config || !this.config.plugins) {
      return true; // 默认启用
    }
    
    const pluginConfig = this.config.plugins[pluginName];
    return pluginConfig ? pluginConfig.enabled !== false : true;
  }

  /**
   * 获取插件配置
   * @param {string} pluginName - 插件名称
   * @returns {Object} - 插件配置
   */
  getPluginConfig(pluginName) {
    if (!this.config || !this.config.plugins) {
      return {};
    }
    
    const pluginConfig = this.config.plugins[pluginName];
    return pluginConfig ? pluginConfig.config || {} : {};
  }

  /**
   * 加载所有插件
   */
  async loadAllPlugins() {
    try {
      // 检查插件目录是否存在
      await fs.access(this.pluginDir);
    } catch (error) {
      // 插件目录不存在，创建它
      await fs.mkdir(this.pluginDir, { recursive: true });
      console.log(chalk.yellow(`📁 创建插件目录: ${this.pluginDir}`));
      return;
    }

    // 加载配置
    await this.loadConfig();

    try {
      const files = await fs.readdir(this.pluginDir);
      const pluginFiles = files.filter(file => file.endsWith('.js') && file !== 'plugin-config.js');

      if (pluginFiles.length === 0) {
        console.log(chalk.yellow('📦 未找到任何插件'));
        return;
      }

      if (this.globalConfig.enablePluginLogging) {
        console.log(chalk.blue(`🔌 开始加载 ${pluginFiles.length} 个插件...`));
      }

      for (const file of pluginFiles) {
        const pluginPath = path.join(this.pluginDir, file);
        try {
          await this.loadPlugin(pluginPath);
        } catch (error) {
          if (this.globalConfig.failOnPluginError) {
            throw error;
          } else {
            console.error(chalk.red(`跳过插件 ${file}: ${error.message}`));
          }
        }
      }

      if (this.globalConfig.enablePluginLogging) {
        console.log(chalk.green(`✅ 插件加载完成，共加载 ${this.plugins.size} 个插件`));
      }
    } catch (error) {
      console.error(chalk.red('加载插件时出错:', error.message));
      if (this.globalConfig.failOnPluginError) {
        throw error;
      }
    }
  }

  /**
   * 获取插件
   * @param {string} name - 插件名称
   * @returns {Object|null} - 插件实例
   */
  getPlugin(name) {
    return this.plugins.get(name) || null;
  }

  /**
   * 获取所有插件
   * @returns {Array} - 插件列表
   */
  getAllPlugins() {
    return Array.from(this.plugins.values());
  }

  /**
   * 卸载插件
   * @param {string} name - 插件名称
   */
  async unloadPlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`插件 ${name} 不存在`);
    }

    // 如果插件有清理方法，调用它
    if (typeof plugin.cleanup === 'function') {
      try {
        await plugin.cleanup();
      } catch (error) {
        console.error(chalk.red(`插件 ${name} 清理失败:`, error.message));
      }
    }

    this.plugins.delete(name);
    console.log(chalk.yellow(`🗑️ 插件 ${name} 已卸载`));
  }
}

// 导出单例实例
export const pluginManager = new PluginManager();