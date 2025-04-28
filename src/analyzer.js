import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import chalk from 'chalk';

/**
 * 分析项目依赖
 * @param {string} projectPath - 项目路径
 * @returns {Promise<Object>} - 项目依赖信息
 */
export async function analyzeProject(projectPath) {
  try {
    // 读取package.json文件
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    
    // 提取依赖信息
    const dependencies = { ...packageJson.dependencies || {} };
    const devDependencies = { ...packageJson.devDependencies || {} };
    const peerDependencies = { ...packageJson.peerDependencies || {} };
    
    // 获取依赖的最新版本信息
    console.log(chalk.blue('正在获取依赖的最新版本信息...'));
    
    const allDependencies = { ...dependencies };
    const latestVersions = {};
    
    for (const [dep, version] of Object.entries(allDependencies)) {
      try {
        // 清理版本号中的特殊字符(^, ~, >=等)
        const cleanVersion = version.replace(/[^\d.]/g, '');
        
        // 从npm registry获取包信息
        const response = await axios.get(`https://registry.npmjs.org/${dep}`);
        const latestVersion = response.data['dist-tags'].latest;
        
        latestVersions[dep] = {
          current: cleanVersion,
          latest: latestVersion
        };
        
        process.stdout.write(chalk.green('.'));
      } catch (error) {
        process.stdout.write(chalk.red('x'));
        console.error(`\n无法获取 ${dep} 的信息: ${error.message}`);
      }
    }
    
    console.log('\n');
    
    return {
      name: packageJson.name,
      version: packageJson.version,
      dependencies,
      devDependencies,
      peerDependencies,
      latestVersions
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`在路径 ${projectPath} 中找不到package.json文件`);
    }
    throw new Error(`分析项目依赖时出错: ${error.message}`);
  }
}

/**
 * 获取依赖的详细信息
 * @param {string} packageName - 包名
 * @returns {Promise<Object>} - 包的详细信息
 */
export async function getPackageInfo(packageName) {
  try {
    const response = await axios.get(`https://registry.npmjs.org/${packageName}`);
    return response.data;
  } catch (error) {
    throw new Error(`获取包 ${packageName} 信息失败: ${error.message}`);
  }
}