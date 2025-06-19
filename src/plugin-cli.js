import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { pluginManager } from './plugin-manager.js';

/**
 * 插件CLI管理器
 */
export class PluginCLI {
  constructor() {
    this.pluginsDir = path.join(process.cwd(), 'plugins');
    this.configPath = path.join(this.pluginsDir, 'plugin-config.json');
  }

  /**
   * 列出所有插件
   */
  async listPlugins() {
    console.log(chalk.blue('\n📦 插件列表:'));
    console.log(chalk.gray('=' .repeat(50)));

    try {
      await pluginManager.loadAllPlugins();
      const plugins = pluginManager.getAllPlugins();
      
      if (plugins.length === 0) {
        console.log(chalk.yellow('  暂无已安装的插件'));
        return;
      }

      plugins.forEach(plugin => {
        const status = plugin.enabled ? chalk.green('✓ 已启用') : chalk.red('✗ 已禁用');
        console.log(`  ${chalk.cyan(plugin.name)} ${chalk.gray(`v${plugin.version}`)} - ${status}`);
        if (plugin.description) {
          console.log(`    ${chalk.gray(plugin.description)}`);
        }
        if (plugin.author) {
          console.log(`    ${chalk.gray('作者:')} ${plugin.author}`);
        }
        console.log();
      });
    } catch (error) {
      console.error(chalk.red('❌ 加载插件失败:'), error.message);
    }
  }

  /**
   * 启用插件
   * @param {string} pluginName - 插件名称
   */
  async enablePlugin(pluginName) {
    try {
      const config = this.loadConfig();
      
      if (!config.plugins[pluginName]) {
        console.error(chalk.red(`❌ 插件 '${pluginName}' 不存在`));
        return;
      }

      config.plugins[pluginName].enabled = true;
      this.saveConfig(config);
      
      console.log(chalk.green(`✅ 插件 '${pluginName}' 已启用`));
    } catch (error) {
      console.error(chalk.red('❌ 启用插件失败:'), error.message);
    }
  }

  /**
   * 禁用插件
   * @param {string} pluginName - 插件名称
   */
  async disablePlugin(pluginName) {
    try {
      const config = this.loadConfig();
      
      if (!config.plugins[pluginName]) {
        console.error(chalk.red(`❌ 插件 '${pluginName}' 不存在`));
        return;
      }

      config.plugins[pluginName].enabled = false;
      this.saveConfig(config);
      
      console.log(chalk.yellow(`⚠️  插件 '${pluginName}' 已禁用`));
    } catch (error) {
      console.error(chalk.red('❌ 禁用插件失败:'), error.message);
    }
  }

  /**
   * 配置插件
   * @param {string} pluginName - 插件名称
   */
  async configurePlugin(pluginName) {
    try {
      const config = this.loadConfig();
      
      if (!config.plugins[pluginName]) {
        console.error(chalk.red(`❌ 插件 '${pluginName}' 不存在`));
        return;
      }

      const pluginConfig = config.plugins[pluginName];
      console.log(chalk.blue(`\n🔧 配置插件: ${pluginName}`));
      console.log(chalk.gray('当前配置:'));
      console.log(JSON.stringify(pluginConfig, null, 2));

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: '选择操作:',
          choices: [
            { name: '修改配置', value: 'edit' },
            { name: '重置配置', value: 'reset' },
            { name: '取消', value: 'cancel' }
          ]
        }
      ]);

      if (action === 'cancel') {
        return;
      }

      if (action === 'reset') {
        config.plugins[pluginName] = {
          enabled: true,
          config: {}
        };
        this.saveConfig(config);
        console.log(chalk.green('✅ 插件配置已重置'));
        return;
      }

      if (action === 'edit') {
        const { configJson } = await inquirer.prompt([
          {
            type: 'editor',
            name: 'configJson',
            message: '编辑插件配置 (JSON格式):',
            default: JSON.stringify(pluginConfig.config || {}, null, 2)
          }
        ]);

        try {
          const newConfig = JSON.parse(configJson);
          config.plugins[pluginName].config = newConfig;
          this.saveConfig(config);
          console.log(chalk.green('✅ 插件配置已更新'));
        } catch (parseError) {
          console.error(chalk.red('❌ 配置格式错误:'), parseError.message);
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ 配置插件失败:'), error.message);
    }
  }

  /**
   * 创建新插件模板
   * @param {string} pluginName - 插件名称
   */
  async createPlugin(pluginName) {
    try {
      const pluginPath = path.join(this.pluginsDir, `${pluginName}.js`);
      
      if (fs.existsSync(pluginPath)) {
        console.error(chalk.red(`❌ 插件 '${pluginName}' 已存在`));
        return;
      }

      const { description, author } = await inquirer.prompt([
        {
          type: 'input',
          name: 'description',
          message: '插件描述:',
          default: `${pluginName} 插件`
        },
        {
          type: 'input',
          name: 'author',
          message: '作者:',
          default: 'Unknown'
        }
      ]);

      const template = this.generatePluginTemplate(pluginName, description, author);
      
      // 确保插件目录存在
      if (!fs.existsSync(this.pluginsDir)) {
        fs.mkdirSync(this.pluginsDir, { recursive: true });
      }

      fs.writeFileSync(pluginPath, template, 'utf8');
      
      // 更新配置文件
      const config = this.loadConfig();
      config.plugins[pluginName] = {
        enabled: true,
        config: {}
      };
      this.saveConfig(config);

      console.log(chalk.green(`✅ 插件 '${pluginName}' 创建成功`));
      console.log(chalk.gray(`   文件位置: ${pluginPath}`));
    } catch (error) {
      console.error(chalk.red('❌ 创建插件失败:'), error.message);
    }
  }

  /**
   * 删除插件
   * @param {string} pluginName - 插件名称
   */
  async removePlugin(pluginName) {
    try {
      const pluginPath = path.join(this.pluginsDir, `${pluginName}.js`);
      
      if (!fs.existsSync(pluginPath)) {
        console.error(chalk.red(`❌ 插件 '${pluginName}' 不存在`));
        return;
      }

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `确定要删除插件 '${pluginName}' 吗？`,
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.yellow('操作已取消'));
        return;
      }

      fs.unlinkSync(pluginPath);
      
      // 从配置文件中移除
      const config = this.loadConfig();
      delete config.plugins[pluginName];
      this.saveConfig(config);

      console.log(chalk.green(`✅ 插件 '${pluginName}' 已删除`));
    } catch (error) {
      console.error(chalk.red('❌ 删除插件失败:'), error.message);
    }
  }

  /**
   * 加载配置文件
   * @returns {Object} - 配置对象
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configContent = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(configContent);
      }
    } catch (error) {
      console.warn(chalk.yellow('⚠️  配置文件加载失败，使用默认配置'));
    }

    return {
      global: {
        timeout: 5000,
        enableLogging: true,
        failOnPluginError: false
      },
      plugins: {}
    };
  }

  /**
   * 保存配置文件
   * @param {Object} config - 配置对象
   */
  saveConfig(config) {
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
    }
    
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
  }

  /**
   * 生成插件模板
   * @param {string} name - 插件名称
   * @param {string} description - 插件描述
   * @param {string} author - 作者
   * @returns {string} - 插件模板代码
   */
  generatePluginTemplate(name, description, author) {
    const className = name.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('') + 'Plugin';

    return `import { BasePlugin, HOOKS } from '../src/plugin-interface.js';

/**
 * ${description}
 */
export class ${className} extends BasePlugin {
  constructor() {
    super('${name}', '1.0.0');
    this.description = '${description}';
    this.author = '${author}';
  }

  /**
   * 初始化插件
   */
  async initialize() {
    console.log(\`插件 \${this.name} 初始化完成\`);
    
    // 注册钩子
    this.registerHook(HOOKS.BEFORE_ANALYZE, this.beforeAnalyze.bind(this));
    this.registerHook(HOOKS.AFTER_ANALYZE, this.afterAnalyze.bind(this));
    this.registerHook(HOOKS.BEFORE_COMPATIBILITY_CHECK, this.beforeCompatibilityCheck.bind(this));
    this.registerHook(HOOKS.AFTER_COMPATIBILITY_CHECK, this.afterCompatibilityCheck.bind(this));
    this.registerHook(HOOKS.BEFORE_REPORT_GENERATION, this.beforeReportGeneration.bind(this));
    this.registerHook(HOOKS.AFTER_REPORT_GENERATION, this.afterReportGeneration.bind(this));
  }

  /**
   * 项目分析前钩子
   * @param {Object} data - 钩子数据
   */
  async beforeAnalyze(data) {
    // 在项目分析前执行的逻辑
    console.log(\`\${this.name}: 开始项目分析\`);
  }

  /**
   * 项目分析后钩子
   * @param {Object} data - 钩子数据
   */
  async afterAnalyze(data) {
    // 在项目分析后执行的逻辑
    console.log(\`\${this.name}: 项目分析完成，发现 \${Object.keys(data.dependencies || {}).length} 个依赖\`);
  }

  /**
   * 兼容性检查前钩子
   * @param {Object} data - 钩子数据
   */
  async beforeCompatibilityCheck(data) {
    // 在兼容性检查前执行的逻辑
    console.log(\`\${this.name}: 开始兼容性检查\`);
  }

  /**
   * 兼容性检查后钩子
   * @param {Object} data - 钩子数据
   */
  async afterCompatibilityCheck(data) {
    // 在兼容性检查后执行的逻辑
    const { compatible = [], incompatible = [], unknown = [] } = data.result || {};
    console.log(\`\${this.name}: 兼容性检查完成 - 兼容: \${compatible.length}, 不兼容: \${incompatible.length}, 未知: \${unknown.length}\`);
  }

  /**
   * 报告生成前钩子
   * @param {Object} data - 钩子数据
   */
  async beforeReportGeneration(data) {
    // 在报告生成前执行的逻辑
    console.log(\`\${this.name}: 开始生成报告\`);
  }

  /**
   * 报告生成后钩子
   * @param {Object} data - 钩子数据
   */
  async afterReportGeneration(data) {
    // 在报告生成后执行的逻辑
    console.log(\`\${this.name}: 报告生成完成\`);
  }

  /**
   * 清理插件资源
   */
  async cleanup() {
    console.log(\`插件 \${this.name} 清理完成\`);
  }
}

export default ${className};
`;
  }
}

export const pluginCLI = new PluginCLI();