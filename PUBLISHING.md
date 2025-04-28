# npm发布指南

本文档提供了将UpgradeLens发布到npm的步骤指南。

## 准备工作

1. 确保你有一个npm账号。如果没有，请在[npm官网](https://www.npmjs.com/)注册。

2. 在本地登录npm账号：
   ```bash
   npm login
   ```
   按提示输入用户名、密码和邮箱。

3. 确保package.json文件中的信息正确：
   - `name`: 包名称，确保在npm上是唯一的
   - `version`: 版本号，遵循语义化版本规范
   - `description`: 包的简短描述
   - `author`: 作者信息
   - `license`: 许可证类型
   - `repository`: 代码仓库地址
   - `bin`: 命令行工具入口点

## 发布前测试

1. 在本地测试包的功能：
   ```bash
   npm test
   ```

2. 使用npm link在本地全局安装并测试命令行工具：
   ```bash
   npm link
   upgrade-lens --help
   ```

3. 检查哪些文件会被发布到npm：
   ```bash
   npm pack
   ```
   这会创建一个.tgz文件，你可以解压查看其中的内容，确保只包含必要的文件。

## 发布到npm

1. 首次发布：
   ```bash
   npm publish
   ```

2. 更新版本并发布：
   ```bash
   # 更新补丁版本 (1.0.0 -> 1.0.1)
   npm version patch
   
   # 更新次要版本 (1.0.0 -> 1.1.0)
   npm version minor
   
   # 更新主要版本 (1.0.0 -> 2.0.0)
   npm version major
   
   # 发布更新后的版本
   npm publish
   ```

## 发布后验证

1. 检查包是否成功发布：
   ```bash
   npm view upgrade-lens
   ```

2. 全局安装并测试：
   ```bash
   npm install -g upgrade-lens
   upgrade-lens --version
   ```

## 维护提示

1. 使用`npm deprecate`标记废弃的版本：
   ```bash
   npm deprecate upgrade-lens@"<1.0.0" "版本1.0.0之前的版本已不再维护"
   ```

2. 使用`npm unpublish`删除有问题的版本（仅限发布后24小时内）：
   ```bash
   npm unpublish upgrade-lens@1.0.0
   ```

3. 添加维护者：
   ```bash
   npm owner add <用户名> upgrade-lens
   ```

## 注意事项

- 发布前请确保代码质量和测试覆盖率
- 遵循语义化版本规范
- 更新README.md文档，确保使用说明清晰
- 确保.npmignore文件正确配置，避免发布不必要的文件
- 如果有使用nrm 请切换到npm 镜像源