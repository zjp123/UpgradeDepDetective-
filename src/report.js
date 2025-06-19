import fs from 'fs/promises';
import chalk from 'chalk';
import { pluginManager } from './plugin-manager.js';
import { HOOKS } from './plugin-interface.js';

/**
 * 生成兼容性报告
 * @param {Object} compatibilityResults - 兼容性分析结果
 * @param {string} outputFile - 输出文件路径
 * @returns {Promise<void>}
 */
export async function generateReport(compatibilityResults, outputFile) {
  const { compatible, incompatible, unknown, recommendations, upgradeAnalysis } = compatibilityResults;
  
  // 执行报告格式化钩子
  let reportData = {
    content: '',
    format: 'markdown',
    outputPath: outputFile,
    additionalReports: [],
    ...compatibilityResults
  };
  
  reportData = await pluginManager.executeHook(HOOKS.FORMAT_REPORT, reportData);
  
  // 控制台输出报告
  console.log(chalk.blue('\n📊 依赖兼容性分析报告'));
  console.log(chalk.blue('===================='));
  
  // 兼容的依赖
  console.log(chalk.green(`\n✅ 兼容的依赖对: ${compatible.length}`));
  if (compatible.length > 0) {
    compatible.forEach(item => {
      console.log(chalk.green(`  • ${item.pair}`));
    });
  }
  
  // 不兼容的依赖
  console.log(chalk.red(`\n❌ 不兼容的依赖对: ${incompatible.length}`));
  if (incompatible.length > 0) {
    incompatible.forEach(item => {
      console.log(chalk.red(`  • ${item.pair}`));
      console.log(chalk.yellow(`    原因: ${item.reason}`));
      
      if (item.recommendation) {
        console.log(chalk.blue('    推荐版本:'));
        for (const [dep, version] of Object.entries(item.recommendation)) {
          console.log(chalk.blue(`      - ${dep}: ${version}`));
        }
      }
    });
  }
  
  // 未知状态的依赖
  if (unknown.length > 0) {
    console.log(chalk.yellow(`\n⚠️ 未能确定兼容性的依赖: ${unknown.length}`));
    unknown.forEach(item => {
      console.log(chalk.yellow(`  • ${item.name}: ${item.reason}`));
    });
  }
  
  // 升级分析
  if (upgradeAnalysis) {
    console.log(chalk.blue('\n🔄 依赖升级分析'));
    console.log(chalk.blue('=============='));
    
    const upgradeable = [];
    const nonUpgradeable = [];
    
    for (const [dep, info] of Object.entries(upgradeAnalysis)) {
      if (info.canUpgrade) {
        upgradeable.push({
          name: dep,
          from: info.currentVersion,
          to: info.latestVersion
        });
      } else {
        nonUpgradeable.push({
          name: dep,
          from: info.currentVersion,
          to: info.latestVersion,
          issues: info.issues
        });
      }
    }
    
    // 可以升级的依赖
    console.log(chalk.green(`\n✅ 可以安全升级的依赖: ${upgradeable.length}`));
    if (upgradeable.length > 0) {
      upgradeable.forEach(item => {
        console.log(chalk.green(`  • ${item.name}: ${item.from} → ${item.to}`));
      });
    }
    
    // 不建议升级的依赖
    console.log(chalk.red(`\n⚠️ 升级可能导致问题的依赖: ${nonUpgradeable.length}`));
    if (nonUpgradeable.length > 0) {
      nonUpgradeable.forEach(item => {
        console.log(chalk.red(`  • ${item.name}: ${item.from} → ${item.to}`));
        console.log(chalk.yellow('    可能的问题:'));
        item.issues.forEach(issue => {
          console.log(chalk.yellow(`      - 与 ${issue.with} 不兼容: ${issue.reason}`));
        });
      });
    }
  }
  
  // 版本推荐
  if (recommendations && Object.keys(recommendations).length > 0) {
    console.log(chalk.blue('\n💡 版本兼容性建议'));
    console.log(chalk.blue('=============='));
    
    for (const [dep, recs] of Object.entries(recommendations)) {
      console.log(chalk.blue(`\n${dep} 的推荐版本:`));
      
      // 合并相同版本的推荐
      const versionMap = {};
      recs.forEach(rec => {
        if (!versionMap[rec.version]) {
          versionMap[rec.version] = [];
        }
        versionMap[rec.version].push(rec.with);
      });
      
      for (const [version, deps] of Object.entries(versionMap)) {
        console.log(chalk.green(`  • 版本 ${version} 兼容: ${deps.join(', ')}`));
      }
    }
  }
  
  // 显示插件添加的额外报告
  if (reportData.additionalReports && reportData.additionalReports.length > 0) {
    reportData.additionalReports.forEach(report => {
      console.log(report);
    });
  }
  
  // 如果指定了输出文件，将报告写入文件
  if (outputFile) {
    try {
      let reportContent = generateMarkdownReport(compatibilityResults);
      
      // 如果插件修改了报告内容，使用插件的内容
      if (reportData.content) {
        reportContent += reportData.content;
      }
      
      await fs.writeFile(outputFile, reportContent, 'utf-8');
      console.log(chalk.green(`\n📄 报告已保存到: ${outputFile}`));
    } catch (error) {
      console.error(chalk.red(`\n❌ 保存报告失败: ${error.message}`));
    }
  }
}

/**
 * 生成Markdown格式的报告
 * @param {Object} results - 兼容性分析结果
 * @returns {string} - Markdown格式的报告内容
 */
function generateMarkdownReport(results) {
  const { compatible, incompatible, unknown, recommendations, upgradeAnalysis } = results;
  
  let markdown = '# 依赖兼容性分析报告\n\n';
  markdown += `生成时间: ${new Date().toLocaleString()}\n\n`;
  
  // 兼容的依赖
  markdown += `## ✅ 兼容的依赖对 (${compatible.length})\n\n`;
  if (compatible.length > 0) {
    compatible.forEach(item => {
      markdown += `- ${item.pair}\n`;
    });
  } else {
    markdown += '无兼容的依赖对\n';
  }
  markdown += '\n';
  
  // 不兼容的依赖
  markdown += `## ❌ 不兼容的依赖对 (${incompatible.length})\n\n`;
  if (incompatible.length > 0) {
    incompatible.forEach(item => {
      markdown += `### ${item.pair}\n`;
      markdown += `- **原因**: ${item.reason}\n`;
      
      if (item.recommendation) {
        markdown += '- **推荐版本**:\n';
        for (const [dep, version] of Object.entries(item.recommendation)) {
          markdown += `  - ${dep}: ${version}\n`;
        }
      }
      markdown += '\n';
    });
  } else {
    markdown += '无不兼容的依赖对\n\n';
  }
  
  // 未知状态的依赖
  if (unknown.length > 0) {
    markdown += `## ⚠️ 未能确定兼容性的依赖 (${unknown.length})\n\n`;
    unknown.forEach(item => {
      markdown += `- **${item.name}**: ${item.reason}\n`;
    });
    markdown += '\n';
  }
  
  // 升级分析
  if (upgradeAnalysis) {
    markdown += '## 🔄 依赖升级分析\n\n';
    
    const upgradeable = [];
    const nonUpgradeable = [];
    
    for (const [dep, info] of Object.entries(upgradeAnalysis)) {
      if (info.canUpgrade) {
        upgradeable.push({
          name: dep,
          from: info.currentVersion,
          to: info.latestVersion
        });
      } else {
        nonUpgradeable.push({
          name: dep,
          from: info.currentVersion,
          to: info.latestVersion,
          issues: info.issues
        });
      }
    }
    
    // 可以升级的依赖
    markdown += `### ✅ 可以安全升级的依赖 (${upgradeable.length})\n\n`;
    if (upgradeable.length > 0) {
      upgradeable.forEach(item => {
        markdown += `- **${item.name}**: ${item.from} → ${item.to}\n`;
      });
    } else {
      markdown += '无可安全升级的依赖\n';
    }
    markdown += '\n';
    
    // 不建议升级的依赖
    markdown += `### ⚠️ 升级可能导致问题的依赖 (${nonUpgradeable.length})\n\n`;
    if (nonUpgradeable.length > 0) {
      nonUpgradeable.forEach(item => {
        markdown += `#### ${item.name}: ${item.from} → ${item.to}\n`;
        markdown += '可能的问题:\n';
        item.issues.forEach(issue => {
          markdown += `- 与 **${issue.with}** 不兼容: ${issue.reason}\n`;
        });
        markdown += '\n';
      });
    } else {
      markdown += '无升级问题的依赖\n\n';
    }
  }
  
  // 版本推荐
  if (recommendations && Object.keys(recommendations).length > 0) {
    markdown += '## 💡 版本兼容性建议\n\n';
    
    for (const [dep, recs] of Object.entries(recommendations)) {
      markdown += `### ${dep} 的推荐版本\n\n`;
      
      // 合并相同版本的推荐
      const versionMap = {};
      recs.forEach(rec => {
        if (!versionMap[rec.version]) {
          versionMap[rec.version] = [];
        }
        versionMap[rec.version].push(rec.with);
      });
      
      for (const [version, deps] of Object.entries(versionMap)) {
        markdown += `- 版本 **${version}** 兼容: ${deps.join(', ')}\n`;
      }
      markdown += '\n';
    }
  }
  
  return markdown;
}