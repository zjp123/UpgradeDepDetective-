import semver from 'semver';
import chalk from 'chalk';
import { getPackageInfo } from './analyzer.js';

/**
 * 检查依赖兼容性
 * @param {Object} projectInfo - 项目信息
 * @param {boolean} deep - 是否深度分析
 * @returns {Promise<Object>} - 兼容性分析结果
 */
export async function checkCompatibility(projectInfo, deep = false) {
  const { dependencies, latestVersions } = projectInfo;
  const compatibilityResults = {
    compatible: [],
    incompatible: [],
    unknown: [],
    recommendations: {}
  };
  
  // 获取所有依赖的详细信息
  const dependencyDetails = {};
  for (const [dep, version] of Object.entries(dependencies)) {
    try {
      const packageInfo = await getPackageInfo(dep);
      dependencyDetails[dep] = packageInfo;
      process.stdout.write(chalk.green('.'));
    } catch (error) {
      process.stdout.write(chalk.red('x'));
      compatibilityResults.unknown.push({
        name: dep,
        reason: `无法获取包信息: ${error.message}`
      });
    }
  }
  
  console.log('\n');
  
  // 分析依赖之间的兼容性
  const dependencyPairs = [];
  const depNames = Object.keys(dependencies);
  
  // 生成所有依赖对
  for (let i = 0; i < depNames.length; i++) {
    for (let j = i + 1; j < depNames.length; j++) {
      dependencyPairs.push([depNames[i], depNames[j]]);
    }
  }
  
  // 检查每对依赖的兼容性
  for (const [dep1, dep2] of dependencyPairs) {
    const result = await checkPairCompatibility(
      dep1, dependencies[dep1], 
      dep2, dependencies[dep2],
      dependencyDetails,
      latestVersions
    );
    
    if (result.compatible) {
      compatibilityResults.compatible.push(result);
    } else {
      compatibilityResults.incompatible.push(result);
      
      // 添加推荐版本
      if (result.recommendation) {
        if (!compatibilityResults.recommendations[dep1]) {
          compatibilityResults.recommendations[dep1] = [];
        }
        if (!compatibilityResults.recommendations[dep2]) {
          compatibilityResults.recommendations[dep2] = [];
        }
        
        compatibilityResults.recommendations[dep1].push({
          with: dep2,
          version: result.recommendation[dep1]
        });
        
        compatibilityResults.recommendations[dep2].push({
          with: dep1,
          version: result.recommendation[dep2]
        });
      }
    }
  }
  
  // 检查升级到最新版本的兼容性
  if (latestVersions) {
    compatibilityResults.upgradeAnalysis = {};
    
    for (const [dep, versionInfo] of Object.entries(latestVersions)) {
      if (semver.gt(versionInfo.latest, versionInfo.current)) {
        const upgradeIssues = [];
        
        // 检查升级这个依赖是否会与其他依赖冲突
        for (const otherDep of Object.keys(dependencies)) {
          if (otherDep === dep) continue;
          
          const result = await checkVersionCompatibility(
            dep, versionInfo.latest,
            otherDep, dependencies[otherDep],
            dependencyDetails
          );
          
          if (!result.compatible) {
            upgradeIssues.push({
              with: otherDep,
              reason: result.reason
            });
          }
        }
        
        compatibilityResults.upgradeAnalysis[dep] = {
          currentVersion: versionInfo.current,
          latestVersion: versionInfo.latest,
          canUpgrade: upgradeIssues.length === 0,
          issues: upgradeIssues
        };
      }
    }
  }
  
  return compatibilityResults;
}

/**
 * 检查一对依赖的兼容性
 * @param {string} dep1 - 依赖1名称
 * @param {string} version1 - 依赖1版本
 * @param {string} dep2 - 依赖2名称
 * @param {string} version2 - 依赖2版本
 * @param {Object} dependencyDetails - 依赖详细信息
 * @param {Object} latestVersions - 最新版本信息
 * @returns {Promise<Object>} - 兼容性结果
 */
async function checkPairCompatibility(dep1, version1, dep2, version2, dependencyDetails, latestVersions) {
  // 清理版本号
  const cleanVersion1 = version1.replace(/[^\d.]/g, '');
  const cleanVersion2 = version2.replace(/[^\d.]/g, '');
  
  // 基本结果对象
  const result = {
    pair: `${dep1}@${cleanVersion1} 和 ${dep2}@${cleanVersion2}`,
    compatible: true
  };
  
  // 检查peerDependencies
  const details1 = dependencyDetails[dep1];
  const details2 = dependencyDetails[dep2];
  
  if (!details1 || !details2) {
    result.compatible = false;
    result.reason = '无法获取完整的依赖信息';
    return result;
  }
  
  // 获取特定版本的信息
  const version1Info = details1.versions[cleanVersion1] || findClosestVersion(details1, cleanVersion1);
  const version2Info = details2.versions[cleanVersion2] || findClosestVersion(details2, cleanVersion2);
  
  if (!version1Info || !version2Info) {
    result.compatible = false;
    result.reason = '无法获取特定版本的依赖信息';
    return result;
  }
  
  // 检查peerDependencies兼容性
  const peerDeps1 = version1Info.peerDependencies || {};
  const peerDeps2 = version2Info.peerDependencies || {};
  
  // 检查dep1是否与dep2的peerDependencies兼容
  if (peerDeps2[dep1]) {
    const requirement = peerDeps2[dep1];
    if (!semver.satisfies(cleanVersion1, requirement)) {
      result.compatible = false;
      result.reason = `${dep2} 需要 ${dep1}@${requirement}，但当前版本是 ${cleanVersion1}`;
      
      // 尝试找到兼容的版本
      const compatibleVersion = findCompatibleVersion(details1, requirement);
      if (compatibleVersion) {
        result.recommendation = {
          [dep1]: compatibleVersion,
          [dep2]: cleanVersion2
        };
      }
      
      return result;
    }
  }
  
  // 检查dep2是否与dep1的peerDependencies兼容
  if (peerDeps1[dep2]) {
    const requirement = peerDeps1[dep2];
    if (!semver.satisfies(cleanVersion2, requirement)) {
      result.compatible = false;
      result.reason = `${dep1} 需要 ${dep2}@${requirement}，但当前版本是 ${cleanVersion2}`;
      
      // 尝试找到兼容的版本
      const compatibleVersion = findCompatibleVersion(details2, requirement);
      if (compatibleVersion) {
        result.recommendation = {
          [dep1]: cleanVersion1,
          [dep2]: compatibleVersion
        };
      }
      
      return result;
    }
  }
  
  // 检查已知的兼容性问题数据库
  const knownIssue = checkKnownCompatibilityIssues(dep1, cleanVersion1, dep2, cleanVersion2);
  if (knownIssue) {
    result.compatible = false;
    result.reason = knownIssue.reason;
    result.recommendation = knownIssue.recommendation;
    return result;
  }
  
  return result;
}

/**
 * 检查版本兼容性
 * @param {string} dep1 - 依赖1名称
 * @param {string} version1 - 依赖1版本
 * @param {string} dep2 - 依赖2名称
 * @param {string} version2 - 依赖2版本
 * @param {Object} dependencyDetails - 依赖详细信息
 * @returns {Object} - 兼容性结果
 */
function checkVersionCompatibility(dep1, version1, dep2, version2, dependencyDetails) {
  // 清理版本号
  const cleanVersion1 = version1.replace(/[^\d.]/g, '');
  const cleanVersion2 = version2.replace(/[^\d.]/g, '');
  
  const result = {
    compatible: true
  };
  
  // 获取依赖详情
  const details1 = dependencyDetails[dep1];
  const details2 = dependencyDetails[dep2];
  
  if (!details1 || !details2) {
    return result; // 无法判断，默认兼容
  }
  
  // 获取特定版本的信息
  const version1Info = details1.versions[cleanVersion1] || findClosestVersion(details1, cleanVersion1);
  const version2Info = details2.versions[cleanVersion2] || findClosestVersion(details2, cleanVersion2);
  
  if (!version1Info || !version2Info) {
    return result; // 无法判断，默认兼容
  }
  
  // 检查peerDependencies
  const peerDeps1 = version1Info.peerDependencies || {};
  const peerDeps2 = version2Info.peerDependencies || {};
  
  // 检查dep1是否与dep2的peerDependencies兼容
  if (peerDeps2[dep1]) {
    const requirement = peerDeps2[dep1];
    if (!semver.satisfies(cleanVersion1, requirement)) {
      result.compatible = false;
      result.reason = `${dep2} 需要 ${dep1}@${requirement}，但计划升级到 ${cleanVersion1}`;
      return result;
    }
  }
  
  // 检查dep2是否与dep1的peerDependencies兼容
  if (peerDeps1[dep2]) {
    const requirement = peerDeps1[dep2];
    if (!semver.satisfies(cleanVersion2, requirement)) {
      result.compatible = false;
      result.reason = `${dep1} 需要 ${dep2}@${requirement}，但当前版本是 ${cleanVersion2}`;
      return result;
    }
  }
  
  return result;
}

/**
 * 查找最接近的版本信息
 * @param {Object} packageDetails - 包详细信息
 * @param {string} version - 目标版本
 * @returns {Object|null} - 版本信息
 */
function findClosestVersion(packageDetails, version) {
  if (!packageDetails || !packageDetails.versions) {
    return null;
  }
  
  const versions = Object.keys(packageDetails.versions);
  let closestVersion = null;
  let minDiff = Infinity;
  
  for (const v of versions) {
    try {
      if (semver.valid(v) && semver.valid(version)) {
        const diff = Math.abs(semver.compare(v, version));
        if (diff < minDiff) {
          minDiff = diff;
          closestVersion = v;
        }
      }
    } catch (e) {
      // 忽略无效的版本号
    }
  }
  
  return closestVersion ? packageDetails.versions[closestVersion] : null;
}

/**
 * 查找兼容的版本
 * @param {Object} packageDetails - 包详细信息
 * @param {string} requirement - 版本要求
 * @returns {string|null} - 兼容版本
 */
function findCompatibleVersion(packageDetails, requirement) {
  if (!packageDetails || !packageDetails.versions) {
    return null;
  }
  
  const versions = Object.keys(packageDetails.versions);
  let compatibleVersions = [];
  
  for (const v of versions) {
    try {
      if (semver.valid(v) && semver.satisfies(v, requirement)) {
        compatibleVersions.push(v);
      }
    } catch (e) {
      // 忽略无效的版本号
    }
  }
  
  // 返回最高的兼容版本
  return compatibleVersions.length > 0 ? 
    compatibleVersions.sort(semver.compare).pop() : null;
}

/**
 * 检查已知的兼容性问题
 * @param {string} dep1 - 依赖1名称
 * @param {string} version1 - 依赖1版本
 * @param {string} dep2 - 依赖2名称
 * @param {string} version2 - 依赖2版本
 * @returns {Object|null} - 兼容性问题
 */
function checkKnownCompatibilityIssues(dep1, version1, dep2, version2) {
  // 这里可以维护一个已知兼容性问题的数据库
  // 示例数据结构
  const knownIssues = [
    {
      packages: ['react', 'react-dom'],
      condition: (v1, v2) => {
        // 检查react和react-dom版本是否匹配
        return semver.major(v1) !== semver.major(v2) || 
               semver.minor(v1) !== semver.minor(v2);
      },
      reason: 'React和React DOM的版本必须完全匹配',
      getRecommendation: (v1, v2) => {
        // 推荐使用较新的版本
        const newer = semver.gt(v1, v2) ? v1 : v2;
        return {
          'react': newer,
          'react-dom': newer
        };
      }
    },
    {
      packages: ['eslint', 'eslint-plugin-react'],
      condition: (eslintVersion, pluginVersion) => {
        if (semver.gte(eslintVersion, '8.0.0') && semver.lt(pluginVersion, '7.28.0')) {
          return true;
        }
        return false;
      },
      reason: 'ESLint 8.x 需要 eslint-plugin-react 7.28.0 或更高版本',
      getRecommendation: (eslintVersion, pluginVersion) => {
        if (semver.gte(eslintVersion, '8.0.0')) {
          return {
            'eslint': eslintVersion,
            'eslint-plugin-react': '7.28.0'
          };
        } else {
          return {
            'eslint': eslintVersion,
            'eslint-plugin-react': pluginVersion
          };
        }
      }
    }
    // 可以添加更多已知的兼容性问题
  ];
  
  // 检查是否匹配任何已知问题
  for (const issue of knownIssues) {
    const [pkg1, pkg2] = issue.packages;
    
    if ((dep1 === pkg1 && dep2 === pkg2) || (dep1 === pkg2 && dep2 === pkg1)) {
      const v1 = dep1 === pkg1 ? version1 : version2;
      const v2 = dep1 === pkg1 ? version2 : version1;
      
      if (issue.condition(v1, v2)) {
        const recommendation = issue.getRecommendation(v1, v2);
        return {
          reason: issue.reason,
          recommendation: {
            [dep1]: dep1 === pkg1 ? recommendation[pkg1] : recommendation[pkg2],
            [dep2]: dep2 === pkg1 ? recommendation[pkg1] : recommendation[pkg2]
          }
        };
      }
    }
  }
  
  return null;
}