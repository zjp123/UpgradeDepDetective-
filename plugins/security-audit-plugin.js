import { BasePlugin, HOOKS } from '../src/plugin-interface.js';
import chalk from 'chalk';

/**
 * 安全审计插件 - 检测已知安全漏洞的依赖版本
 */
export class SecurityAuditPlugin extends BasePlugin {
  constructor() {
    super('security-audit-plugin', '1.0.0');
    this.description = '检测依赖包的安全漏洞和过时版本';
    this.author = 'UpgradeLens Team';
    
    // 已知有安全问题的包版本（示例数据）
    this.vulnerablePackages = {
      'lodash': {
        '< 4.17.12': {
          severity: 'high',
          cve: 'CVE-2019-10744',
          description: 'Prototype Pollution vulnerability'
        },
        '< 4.17.21': {
          severity: 'medium',
          cve: 'CVE-2021-23337',
          description: 'Command Injection vulnerability'
        }
      },
      'axios': {
        '< 0.21.1': {
          severity: 'medium',
          cve: 'CVE-2020-28168',
          description: 'Server-Side Request Forgery (SSRF)'
        }
      },
      'express': {
        '< 4.17.1': {
          severity: 'medium',
          cve: 'CVE-2019-5413',
          description: 'Open Redirect vulnerability'
        }
      },
      'react-dom': {
        '< 16.13.1': {
          severity: 'medium',
          cve: 'CVE-2020-15169',
          description: 'XSS vulnerability in development mode'
        }
      },
      'minimist': {
        '< 1.2.2': {
          severity: 'medium',
          cve: 'CVE-2020-7598',
          description: 'Prototype Pollution vulnerability'
        }
      }
    };
    
    this.securityIssues = [];
    this.outdatedPackages = [];
  }

  /**
   * 初始化插件
   */
  async initialize() {
    if (this.getConfigValue('enableLogging', true)) {
      console.log(chalk.blue(`🔒 ${this.name} 初始化完成`));
    }
    
    // 注册钩子
    this.registerHook(HOOKS.ANALYZE_PACKAGE, this.analyzePackageSecurity.bind(this));
    this.registerHook(HOOKS.CUSTOM_CHECK, this.performSecurityAudit.bind(this));
    this.registerHook(HOOKS.FORMAT_REPORT, this.addSecurityReport.bind(this));
  }

  /**
   * 分析单个包的安全性
   * @param {Object} data - 包数据
   */
  async analyzePackageSecurity(data) {
    const { packageName, packageInfo } = data;
    
    if (!packageInfo || !packageInfo.currentVersion) {
      return;
    }

    const currentVersion = packageInfo.currentVersion;
    const vulnerabilities = this.vulnerablePackages[packageName];
    
    if (vulnerabilities) {
      for (const [versionRange, vulnerability] of Object.entries(vulnerabilities)) {
        if (this.isVersionVulnerable(currentVersion, versionRange)) {
          this.securityIssues.push({
            package: packageName,
            currentVersion,
            vulnerability,
            versionRange
          });
        }
      }
    }

    // 检查是否为过时版本（超过2年未更新）
    if (packageInfo.latestVersion && packageInfo.publishedDate) {
      const publishDate = new Date(packageInfo.publishedDate);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      if (publishDate < twoYearsAgo && currentVersion !== packageInfo.latestVersion) {
        this.outdatedPackages.push({
          package: packageName,
          currentVersion,
          latestVersion: packageInfo.latestVersion,
          publishedDate: packageInfo.publishedDate
        });
      }
    }
  }

  /**
   * 执行安全审计
   * @param {Object} data - 审计数据
   */
  async performSecurityAudit(data) {
    const { dependencies } = data;
    
    if (this.getConfigValue('enableLogging', true)) {
      console.log(chalk.blue('🔍 执行安全审计...'));
    }

    // 统计安全问题
    const highSeverityCount = this.securityIssues.filter(issue => 
      issue.vulnerability.severity === 'high'
    ).length;
    
    const mediumSeverityCount = this.securityIssues.filter(issue => 
      issue.vulnerability.severity === 'medium'
    ).length;

    // 添加安全审计结果到数据中
    data.securityAudit = {
      totalIssues: this.securityIssues.length,
      highSeverity: highSeverityCount,
      mediumSeverity: mediumSeverityCount,
      outdatedPackages: this.outdatedPackages.length,
      issues: this.securityIssues,
      outdated: this.outdatedPackages
    };

    if (this.getConfigValue('enableLogging', true)) {
      if (this.securityIssues.length > 0) {
        console.log(chalk.red(`⚠️  发现 ${this.securityIssues.length} 个安全问题`));
      } else {
        console.log(chalk.green('✅ 未发现已知安全问题'));
      }
    }
  }

  /**
   * 添加安全报告
   * @param {Object} data - 报告数据
   */
  async addSecurityReport(data) {
    if (!data.securityAudit) {
      return;
    }

    const { securityAudit } = data;
    let securityReport = '\n' + chalk.red.bold('🔒 安全审计报告') + '\n';
    securityReport += chalk.gray('='.repeat(50)) + '\n';

    // 安全问题统计
    if (securityAudit.totalIssues > 0) {
      securityReport += chalk.red(`❌ 发现 ${securityAudit.totalIssues} 个安全问题:\n`);
      securityReport += `   - 高危: ${securityAudit.highSeverity} 个\n`;
      securityReport += `   - 中危: ${securityAudit.mediumSeverity} 个\n\n`;

      // 详细安全问题列表
      securityReport += chalk.yellow('详细安全问题:\n');
      securityAudit.issues.forEach(issue => {
        const severityColor = issue.vulnerability.severity === 'high' ? chalk.red : chalk.yellow;
        securityReport += `  ${severityColor('●')} ${chalk.cyan(issue.package)} ${chalk.gray(`v${issue.currentVersion}`)}\n`;
        securityReport += `    ${severityColor(issue.vulnerability.severity.toUpperCase())} - ${issue.vulnerability.cve}\n`;
        securityReport += `    ${issue.vulnerability.description}\n`;
        securityReport += `    影响版本: ${issue.versionRange}\n\n`;
      });
    } else {
      securityReport += chalk.green('✅ 未发现已知安全漏洞\n\n');
    }

    // 过时包报告
    if (securityAudit.outdatedPackages > 0) {
      securityReport += chalk.yellow(`⚠️  发现 ${securityAudit.outdatedPackages} 个过时依赖:\n`);
      securityAudit.outdated.forEach(pkg => {
        securityReport += `  ${chalk.yellow('●')} ${chalk.cyan(pkg.package)} ${chalk.gray(`v${pkg.currentVersion} → v${pkg.latestVersion}`)}\n`;
        securityReport += `    最后更新: ${pkg.publishedDate}\n`;
      });
      securityReport += '\n';
    }

    // 安全建议
    securityReport += chalk.blue('🛡️  安全建议:\n');
    if (securityAudit.totalIssues > 0) {
      securityReport += '  1. 立即升级存在安全漏洞的依赖包\n';
      securityReport += '  2. 定期运行安全审计检查\n';
      securityReport += '  3. 关注安全公告和CVE数据库\n';
    }
    if (securityAudit.outdatedPackages > 0) {
      securityReport += '  4. 考虑升级长期未更新的依赖包\n';
      securityReport += '  5. 评估过时依赖的维护状态\n';
    }
    if (securityAudit.totalIssues === 0 && securityAudit.outdatedPackages === 0) {
      securityReport += '  1. 继续保持依赖包的及时更新\n';
      securityReport += '  2. 定期进行安全审计\n';
    }

    // 将安全报告添加到主报告中
    if (!data.additionalReports) {
      data.additionalReports = [];
    }
    data.additionalReports.push(securityReport);
  }

  /**
   * 检查版本是否存在漏洞
   * @param {string} currentVersion - 当前版本
   * @param {string} versionRange - 漏洞影响的版本范围
   * @returns {boolean} - 是否存在漏洞
   */
  isVersionVulnerable(currentVersion, versionRange) {
    // 简化的版本比较逻辑
    // 实际应用中应使用 semver 库进行精确比较
    try {
      if (versionRange.startsWith('< ')) {
        const targetVersion = versionRange.substring(2);
        return this.compareVersions(currentVersion, targetVersion) < 0;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 简单的版本比较
   * @param {string} version1 - 版本1
   * @param {string} version2 - 版本2
   * @returns {number} - 比较结果 (-1, 0, 1)
   */
  compareVersions(version1, version2) {
    const v1Parts = version1.replace(/[^\d.]/g, '').split('.').map(Number);
    const v2Parts = version2.replace(/[^\d.]/g, '').split('.').map(Number);
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }
    
    return 0;
  }

  /**
   * 清理插件资源
   */
  async cleanup() {
    this.securityIssues = [];
    this.outdatedPackages = [];
    
    if (this.getConfigValue('enableLogging', true)) {
      console.log(chalk.blue(`🔒 ${this.name} 清理完成`));
    }
  }
}

export default SecurityAuditPlugin;