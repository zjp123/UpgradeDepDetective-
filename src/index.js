#!/usr/bin/env node

import { Command } from 'commander'; // 命令行解析
import chalk from 'chalk'; // 打印彩色日志
import inquirer from 'inquirer'; // 交互式命令行
import { analyzeProject } from './analyzer.js';
import { checkCompatibility } from './compatibility.js';
import { generateReport } from './report.js';
import { pluginManager } from './plugin-manager.js';
import { HOOKS } from './plugin-interface.js';
import { pluginCLI } from './plugin-cli.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取package.json
const packageJson = JSON.parse(fs.readFileSync(resolve(__dirname, '../package.json'), 'utf8'));
const { version } = packageJson;

const program = new Command();

program
  .name('upgrade-lens')
  .description('前端项目依赖版本兼容性检测工具')
  .version(version);

// 插件管理命令
const pluginCommand = program
  .command('plugin')
  .description('插件管理');

pluginCommand
  .command('list')
  .description('列出所有插件')
  .action(async () => {
    await pluginCLI.listPlugins();
  });

pluginCommand
  .command('enable <name>')
  .description('启用插件')
  .action(async (name) => {
    await pluginCLI.enablePlugin(name);
  });

pluginCommand
  .command('disable <name>')
  .description('禁用插件')
  .action(async (name) => {
    await pluginCLI.disablePlugin(name);
  });

pluginCommand
  .command('config <name>')
  .description('配置插件')
  .action(async (name) => {
    await pluginCLI.configurePlugin(name);
  });

pluginCommand
  .command('create <name>')
  .description('创建新插件')
  .action(async (name) => {
    await pluginCLI.createPlugin(name);
  });

pluginCommand
  .command('remove <name>')
  .description('删除插件')
  .action(async (name) => {
    await pluginCLI.removePlugin(name);
  });

program
  .option('-p, --path <path>', '指定项目路径', process.cwd())
  .option('-d, --deep', '深度分析依赖关系', false)
  .option('-i, --interactive', '交互式分析模式', false)
  .option('-o, --output <file>', '输出报告到文件')
  .action(async (options) => {
    console.log(chalk.blue('==================================='));
    console.log(chalk.blue('🔍 UpgradeLens - 依赖兼容性检测工具'));
    console.log(chalk.blue('==================================='));
    
    try {
      // 加载插件
      console.log(chalk.blue('\n🔌 正在加载插件...'));
      await pluginManager.loadAllPlugins();
      
      // 分析项目依赖
      console.log(chalk.yellow('\n📦 正在分析项目依赖...'))
      
      // 执行分析前钩子
      let projectData = { projectPath: options.path };
      projectData = await pluginManager.executeHook(HOOKS.BEFORE_ANALYZE, projectData);
      
      const projectInfo = await analyzeProject(options.path);
      
      // 执行分析后钩子
      const enhancedProjectInfo = await pluginManager.executeHook(HOOKS.AFTER_ANALYZE, projectInfo);
      
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
          filteredDeps[dep] = enhancedProjectInfo.dependencies[dep];
        });
        enhancedProjectInfo.dependencies = filteredDeps;
      }
      
      // 检查兼容性
      console.log(chalk.yellow('\n🔍 正在检查依赖兼容性...'))
      
      // 执行兼容性检查前钩子
      let checkData = { ...enhancedProjectInfo, deep: options.deep };
      checkData = await pluginManager.executeHook(HOOKS.BEFORE_COMPATIBILITY_CHECK, checkData);
      
      const compatibilityResults = await checkCompatibility(enhancedProjectInfo, options.deep);
      
      // 执行兼容性检查后钩子
      const enhancedResults = await pluginManager.executeHook(HOOKS.AFTER_COMPATIBILITY_CHECK, compatibilityResults);
      
      // 生成报告
      console.log(chalk.yellow('\n📊 正在生成兼容性报告...'))
      
      // 执行报告生成前钩子
      let reportData = { ...enhancedResults, outputPath: options.output };
      reportData = await pluginManager.executeHook(HOOKS.BEFORE_REPORT_GENERATION, reportData);
      
      await generateReport(reportData, options.output);
      
      // 执行报告生成后钩子
      await pluginManager.executeHook(HOOKS.AFTER_REPORT_GENERATION, reportData);
      
      console.log(chalk.green('\n✅ 分析完成!'));
    } catch (error) {
      console.error(chalk.red('\n❌ 分析过程中出错:'), error.message);
      process.exit(1);
    }
  });

program.parse();