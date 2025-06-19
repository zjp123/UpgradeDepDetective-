import { BasePlugin, HOOKS } from '../src/plugin-interface.js';
import chalk from 'chalk';

/**
 * 示例插件
 * 演示如何创建和使用插件
 */
class ExamplePlugin extends BasePlugin {
  constructor() {
    super('example-plugin', '1.0.0');
    this.description = '示例插件，展示插件系统的基本用法';
    this.author = 'UpgradeLens Team';
  }

  /**
   * 插件初始化
   * @param {PluginManager} pluginManager 
   */
  async init(pluginManager) {
    await super.init(pluginManager);
    
    console.log(chalk.blue(`🔌 初始化插件: ${this.name}`));
    
    // 注册各种钩子
    this.registerAnalysisHooks();
    this.registerCompatibilityHooks();
    this.registerReportHooks();
  }

  /**
   * 注册项目分析相关钩子
   */
  registerAnalysisHooks() {
    // 分析前钩子
    this.registerHook(HOOKS.BEFORE_ANALYZE, async (data) => {
      console.log(chalk.cyan(`📋 [${this.name}] 开始分析项目: ${data.projectPath}`));
      return data;
    });

    // 分析后钩子
    this.registerHook(HOOKS.AFTER_ANALYZE, async (data) => {
      console.log(chalk.cyan(`📋 [${this.name}] 项目分析完成，发现 ${Object.keys(data.dependencies).length} 个依赖`));
      
      // 添加自定义分析结果
      data.customAnalysis = {
        totalDependencies: Object.keys(data.dependencies).length,
        hasReact: 'react' in data.dependencies,
        hasVue: 'vue' in data.dependencies,
        hasAngular: '@angular/core' in data.dependencies
      };
      
      return data;
    });

    // 包分析钩子
    this.registerHook(HOOKS.ANALYZE_PACKAGE, async (data) => {
      // 为特定包添加额外信息
      if (data.packageName === 'react') {
        data.framework = 'React';
        data.ecosystem = 'React生态系统';
      } else if (data.packageName === 'vue') {
        data.framework = 'Vue';
        data.ecosystem = 'Vue生态系统';
      }
      
      return data;
    });
  }

  /**
   * 注册兼容性检查相关钩子
   */
  registerCompatibilityHooks() {
    // 兼容性检查前钩子
    this.registerHook(HOOKS.BEFORE_COMPATIBILITY_CHECK, async (data) => {
      console.log(chalk.yellow(`🔍 [${this.name}] 开始兼容性检查`));
      return data;
    });

    // 兼容性检查后钩子
    this.registerHook(HOOKS.AFTER_COMPATIBILITY_CHECK, async (data) => {
      console.log(chalk.yellow(`🔍 [${this.name}] 兼容性检查完成`));
      console.log(chalk.green(`  ✅ 兼容的依赖对: ${data.compatible.length}`));
      console.log(chalk.red(`  ❌ 不兼容的依赖对: ${data.incompatible.length}`));
      
      return data;
    });

    // 依赖对兼容性检查钩子
    this.registerHook(HOOKS.CHECK_PAIR_COMPATIBILITY, async (data) => {
      // 添加自定义兼容性规则
      const { dep1, dep2, version1, version2 } = data;
      
      // 示例：React 和 Vue 不应该同时使用
      if ((dep1 === 'react' && dep2 === 'vue') || (dep1 === 'vue' && dep2 === 'react')) {
        data.compatible = false;
        data.reason = '不建议在同一个项目中同时使用 React 和 Vue';
        data.severity = 'warning';
      }
      
      return data;
    });

    // 自定义检查钩子
    this.registerHook(HOOKS.CUSTOM_CHECK, async (data) => {
      const customChecks = [];
      
      // 检查是否有过时的依赖
      for (const [dep, versionInfo] of Object.entries(data.latestVersions)) {
        if (versionInfo.current && versionInfo.latest) {
          const currentMajor = parseInt(versionInfo.current.split('.')[0]);
          const latestMajor = parseInt(versionInfo.latest.split('.')[0]);
          
          if (latestMajor - currentMajor >= 2) {
            customChecks.push({
              type: 'outdated',
              dependency: dep,
              current: versionInfo.current,
              latest: versionInfo.latest,
              message: `${dep} 版本过于陈旧，建议升级`
            });
          }
        }
      }
      
      data.customChecks = customChecks;
      return data;
    });
  }

  /**
   * 注册报告生成相关钩子
   */
  registerReportHooks() {
    // 报告生成前钩子
    this.registerHook(HOOKS.BEFORE_REPORT_GENERATION, async (data) => {
      console.log(chalk.magenta(`📊 [${this.name}] 开始生成报告`));
      return data;
    });

    // 报告格式化钩子
    this.registerHook(HOOKS.FORMAT_REPORT, async (data) => {
      // 添加自定义报告部分
      if (data.customAnalysis) {
        const customSection = `
## 🔌 插件分析结果

`;
        let content = customSection;
        
        content += `- **总依赖数量**: ${data.customAnalysis.totalDependencies}\n`;
        
        if (data.customAnalysis.hasReact) {
          content += `- **框架**: 使用 React 框架\n`;
        }
        if (data.customAnalysis.hasVue) {
          content += `- **框架**: 使用 Vue 框架\n`;
        }
        if (data.customAnalysis.hasAngular) {
          content += `- **框架**: 使用 Angular 框架\n`;
        }
        
        // 添加自定义检查结果
        if (data.customChecks && data.customChecks.length > 0) {
          content += `\n### 📋 自定义检查结果\n\n`;
          data.customChecks.forEach(check => {
            content += `- **${check.dependency}**: ${check.message}\n`;
          });
        }
        
        data.content += content;
      }
      
      return data;
    });

    // 报告生成后钩子
    this.registerHook(HOOKS.AFTER_REPORT_GENERATION, async (data) => {
      console.log(chalk.magenta(`📊 [${this.name}] 报告生成完成`));
      return data;
    });
  }

  /**
   * 插件清理
   */
  async cleanup() {
    console.log(chalk.gray(`🧹 清理插件: ${this.name}`));
  }
}

// 导出插件实例
export default new ExamplePlugin();