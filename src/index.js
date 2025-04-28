#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { analyzeProject } from './analyzer.js';
import { checkCompatibility } from './compatibility.js';
import { generateReport } from './report.js';
import { version } from '../package.json';

const program = new Command();

program
  .name('upgrade-lens')
  .description('前端项目依赖版本兼容性检测工具')
  .version(version)
  .option('-p, --path <path>', '指定项目路径', process.cwd())
  .option('-d, --deep', '深度分析依赖关系', false)
  .option('-i, --interactive', '交互式分析模式', false)
  .option('-o, --output <file>', '输出报告到文件')
  .action(async (options) => {
    console.log(chalk.blue('==================================='));
    console.log(chalk.blue('🔍 UpgradeLens - 依赖兼容性检测工具'));
    console.log(chalk.blue('==================================='));
    
    try {
      // 分析项目依赖
      console.log(chalk.yellow('\n📦 正在分析项目依赖...'))
      const projectInfo = await analyzeProject(options.path);
      
      // 交互式模式
      if (options.interactive) {
        const answers = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'dependencies',
            message: '选择要检查兼容性的依赖:',
            choices: Object.keys(projectInfo.dependencies).map(dep => ({
              name: `${dep} (${projectInfo.dependencies[dep]})`,
              value: dep
            }))
          }
        ]);
        
        if (answers.dependencies.length === 0) {
          console.log(chalk.yellow('未选择任何依赖，分析已取消'));
          return;
        }
        
        // 过滤选中的依赖
        const filteredDeps = {};
        answers.dependencies.forEach(dep => {
          filteredDeps[dep] = projectInfo.dependencies[dep];
        });
        projectInfo.dependencies = filteredDeps;
      }
      
      // 检查兼容性
      console.log(chalk.yellow('\n🔍 正在检查依赖兼容性...'))
      const compatibilityResults = await checkCompatibility(projectInfo, options.deep);
      
      // 生成报告
      console.log(chalk.yellow('\n📊 正在生成兼容性报告...'))
      await generateReport(compatibilityResults, options.output);
      
      console.log(chalk.green('\n✅ 分析完成!'));
    } catch (error) {
      console.error(chalk.red('\n❌ 分析过程中出错:'), error.message);
      process.exit(1);
    }
  });

program.parse();