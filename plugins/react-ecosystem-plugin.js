import { BasePlugin, HOOKS } from '../src/plugin-interface.js';
import chalk from 'chalk';
import semver from 'semver';

/**
 * React生态系统兼容性检查插件
 * 专门检查React相关依赖的兼容性问题
 */
class ReactEcosystemPlugin extends BasePlugin {
  constructor() {
    super('react-ecosystem-plugin', '1.0.0');
    this.description = 'React生态系统兼容性检查插件';
    this.author = 'UpgradeLens Team';
    
    // React生态系统包映射
    this.reactPackages = {
      'react': 'React核心库',
      'react-dom': 'React DOM渲染器',
      'react-router': 'React路由库(v5)',
      'react-router-dom': 'React路由库DOM绑定',
      '@types/react': 'React TypeScript类型定义',
      '@types/react-dom': 'React DOM TypeScript类型定义',
      'react-scripts': 'Create React App脚本',
      'next': 'Next.js框架',
      'gatsby': 'Gatsby静态站点生成器'
    };
    
    // 已知的兼容性规则
    this.compatibilityRules = [
      {
        name: 'React和React DOM版本必须匹配',
        check: (deps) => {
          if (deps.react && deps['react-dom']) {
            const reactVersion = this.cleanVersion(deps.react);
            const reactDomVersion = this.cleanVersion(deps['react-dom']);
            return semver.major(reactVersion) === semver.major(reactDomVersion);
          }
          return true;
        },
        message: 'React和React DOM的主版本号必须一致'
      },
      {
        name: 'React Router v6与React版本兼容性',
        check: (deps) => {
          if (deps.react && deps['react-router-dom']) {
            const reactVersion = this.cleanVersion(deps.react);
            const routerVersion = this.cleanVersion(deps['react-router-dom']);
            
            // React Router v6需要React 16.8+
            if (semver.gte(routerVersion, '6.0.0')) {
              return semver.gte(reactVersion, '16.8.0');
            }
          }
          return true;
        },
        message: 'React Router v6需要React 16.8或更高版本'
      },
      {
        name: 'TypeScript类型定义版本匹配',
        check: (deps) => {
          if (deps.react && deps['@types/react']) {
            const reactVersion = this.cleanVersion(deps.react);
            const typesVersion = this.cleanVersion(deps['@types/react']);
            
            // 类型定义的主版本应该与React主版本匹配
            return semver.major(reactVersion) === semver.major(typesVersion);
          }
          return true;
        },
        message: '@types/react的主版本应该与React主版本匹配'
      }
    ];
  }

  /**
   * 插件初始化
   */
  async init(pluginManager) {
    await super.init(pluginManager);
    
    console.log(chalk.blue(`🔌 初始化React生态系统插件`));
    
    // 注册钩子
    this.registerAnalysisHooks();
    this.registerCompatibilityHooks();
    this.registerReportHooks();
  }

  /**
   * 注册分析相关钩子
   */
  registerAnalysisHooks() {
    // 分析后钩子 - 检测React生态系统
    this.registerHook(HOOKS.AFTER_ANALYZE, async (data) => {
      const reactDeps = this.findReactDependencies(data.dependencies);
      
      if (Object.keys(reactDeps).length > 0) {
        console.log(chalk.cyan(`🔍 检测到React生态系统依赖: ${Object.keys(reactDeps).join(', ')}`));
        
        data.reactEcosystem = {
          detected: true,
          packages: reactDeps,
          analysis: this.analyzeReactEcosystem(reactDeps)
        };
      }
      
      return data;
    });

    // 包分析钩子 - 为React包添加额外信息
    this.registerHook(HOOKS.ANALYZE_PACKAGE, async (data) => {
      if (this.reactPackages[data.packageName]) {
        data.ecosystem = 'React';
        data.description = this.reactPackages[data.packageName];
        data.isReactPackage = true;
      }
      
      return data;
    });
  }

  /**
   * 注册兼容性检查钩子
   */
  registerCompatibilityHooks() {
    // 依赖对兼容性检查
    this.registerHook(HOOKS.CHECK_PAIR_COMPATIBILITY, async (data) => {
      const { dep1, dep2, version1, version2 } = data;
      
      // 检查React和React DOM的兼容性
      if ((dep1 === 'react' && dep2 === 'react-dom') || 
          (dep1 === 'react-dom' && dep2 === 'react')) {
        const reactVersion = dep1 === 'react' ? version1 : version2;
        const reactDomVersion = dep1 === 'react-dom' ? version1 : version2;
        
        const cleanReactVersion = this.cleanVersion(reactVersion);
        const cleanReactDomVersion = this.cleanVersion(reactDomVersion);
        
        if (semver.major(cleanReactVersion) !== semver.major(cleanReactDomVersion)) {
          data.compatible = false;
          data.reason = `React (${cleanReactVersion}) 和 React DOM (${cleanReactDomVersion}) 主版本不匹配`;
          data.severity = 'error';
        }
      }
      
      // 检查React Router兼容性
      if ((dep1 === 'react' && dep2 === 'react-router-dom') ||
          (dep1 === 'react-router-dom' && dep2 === 'react')) {
        const reactVersion = dep1 === 'react' ? version1 : version2;
        const routerVersion = dep1 === 'react-router-dom' ? version1 : version2;
        
        const cleanReactVersion = this.cleanVersion(reactVersion);
        const cleanRouterVersion = this.cleanVersion(routerVersion);
        
        // React Router v6需要React 16.8+
        if (semver.gte(cleanRouterVersion, '6.0.0') && semver.lt(cleanReactVersion, '16.8.0')) {
          data.compatible = false;
          data.reason = `React Router v6 (${cleanRouterVersion}) 需要 React 16.8+，当前React版本为 ${cleanReactVersion}`;
          data.severity = 'error';
        }
      }
      
      return data;
    });

    // 自定义检查
    this.registerHook(HOOKS.CUSTOM_CHECK, async (data) => {
      if (!data.reactChecks) {
        data.reactChecks = [];
      }
      
      // 执行React生态系统兼容性规则检查
      for (const rule of this.compatibilityRules) {
        if (!rule.check(data.dependencies)) {
          data.reactChecks.push({
            type: 'react-compatibility',
            rule: rule.name,
            message: rule.message,
            severity: 'error'
          });
        }
      }
      
      // 检查是否有过时的React版本
      if (data.dependencies.react && data.latestVersions.react) {
        const currentVersion = this.cleanVersion(data.dependencies.react);
        const latestVersion = data.latestVersions.react.latest;
        
        if (semver.major(latestVersion) > semver.major(currentVersion)) {
          data.reactChecks.push({
            type: 'react-outdated',
            message: `React版本 ${currentVersion} 已过时，最新版本为 ${latestVersion}`,
            severity: 'warning',
            current: currentVersion,
            latest: latestVersion
          });
        }
      }
      
      return data;
    });
  }

  /**
   * 注册报告生成钩子
   */
  registerReportHooks() {
    this.registerHook(HOOKS.FORMAT_REPORT, async (data) => {
      let reactSection = '';
      
      // 添加React生态系统分析部分
      if (data.reactEcosystem && data.reactEcosystem.detected) {
        reactSection += `\n## ⚛️ React生态系统分析\n\n`;
        
        reactSection += `### 检测到的React包\n\n`;
        for (const [pkg, version] of Object.entries(data.reactEcosystem.packages)) {
          const description = this.reactPackages[pkg] || '未知React包';
          reactSection += `- **${pkg}** (${version}): ${description}\n`;
        }
        
        if (data.reactEcosystem.analysis) {
          reactSection += `\n### React生态系统健康度\n\n`;
          const analysis = data.reactEcosystem.analysis;
          
          if (analysis.hasReactDom) {
            reactSection += `✅ React DOM已正确配置\n`;
          } else {
            reactSection += `⚠️ 未检测到React DOM，可能影响渲染功能\n`;
          }
          
          if (analysis.hasRouter) {
            reactSection += `✅ 检测到React Router，支持路由功能\n`;
          }
          
          if (analysis.hasTypeScript) {
            reactSection += `✅ 检测到TypeScript类型定义\n`;
          }
        }
      }
      
      // 添加React特定检查结果
      if (data.reactChecks && data.reactChecks.length > 0) {
        reactSection += `\n### ⚛️ React兼容性检查结果\n\n`;
        
        data.reactChecks.forEach(check => {
          const icon = check.severity === 'error' ? '❌' : '⚠️';
          reactSection += `${icon} **${check.rule || check.type}**: ${check.message}\n`;
        });
      }
      
      if (reactSection) {
        data.content = (data.content || '') + reactSection;
      }
      
      return data;
    });
  }

  /**
   * 查找React相关依赖
   */
  findReactDependencies(dependencies) {
    const reactDeps = {};
    
    for (const [dep, version] of Object.entries(dependencies)) {
      if (this.reactPackages[dep]) {
        reactDeps[dep] = version;
      }
    }
    
    return reactDeps;
  }

  /**
   * 分析React生态系统
   */
  analyzeReactEcosystem(reactDeps) {
    return {
      hasReactDom: 'react-dom' in reactDeps,
      hasRouter: 'react-router' in reactDeps || 'react-router-dom' in reactDeps,
      hasTypeScript: '@types/react' in reactDeps,
      hasNextJs: 'next' in reactDeps,
      hasGatsby: 'gatsby' in reactDeps,
      hasCRA: 'react-scripts' in reactDeps
    };
  }

  /**
   * 清理版本号
   */
  cleanVersion(version) {
    return version.replace(/[^\d.]/g, '');
  }
}

// 导出插件类
export default ReactEcosystemPlugin;
export { ReactEcosystemPlugin };