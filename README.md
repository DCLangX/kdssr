# KDLink SSR

这是一个基于 [ssr](https://github.com/zhangyuang/ssr) 框架二次开发的精简版本，专注于提供 Vue3 + Pinia + Vite + NestJS 的 SSR 解决方案，相关文档会在近期提供。

## 主要特性

- 🎯 **专注单框架**：移除了多框架支持，专注于 Vue3 技术栈，减少冗余代码和依赖
- 📦 **精简架构**：采用 pnpm 管理的 monorepo 方案，将 SSR 相关代码整合到单一包中
- 🚀 **全 ESM 支持**：NestJS 和 Vue3 均采用全 ESM 方案
- ⚙️ **灵活配置**：将 vite.config.ts 和 client-entry.ts 暴露至应用目录，提供更大的配置自由度
- 📊 **优化打包**：还原 Vite 默认分包方案，优化脚本注入功能，减小打包产物体积

## 改进内容

1. 框架瘦身
   - 移除多框架支持，专注 Vue3 技术栈
   - 更新所有依赖至较新版本
   - 移除冗余依赖

2. 架构优化
   - 简化 monorepo 结构
   - 优化代码包架构，减少循环依赖影响
   - 便于项目调试和维护

3. 配置增强
   - 释放配置文件到应用目录
   - 支持更灵活的插件配置
   - 便于修改路由导航守卫

## 已知问题

1. **文件路径限制**
   - NestJS 在 ESM 模式下需使用相对路径引用，别名（alias）引用可能存在问题

2. **开发模式双重行为**
   - 开发环境需启动两个 Vite 服务器
     - 一个用于纯客户端构建，代理静态文件
     - 一个用于服务端首屏渲染
   - 可能导致的问题：
     - 端口监听重复
     - 文件改动监听重复
     - 页面元素水和错误
   - 生产环境不受影响

> 注：开发模式下的双重行为源于框架设计中需要服务端和客户端分开打包的特性，目前没有想到很好的优化方案。