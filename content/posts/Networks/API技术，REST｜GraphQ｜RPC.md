---
title: API技术，REST｜GraphQ｜RPC
subtitle: 
date: 2024-08-19T20:02:19+08:00
slug: 1c1a10b
draft: true
tags:
  - 计算机网络
categories:
  - 计算机网络
password: 
message:
---
# 什么是API？

API，全称为 application programming interface，意思是应用程序接口，负责多个软件之间的调用、交互。

现在的 API 往往是前后端的资源交换渠道，API 的设计和架构往往关系到双方的工作量和代码是否优雅

# REST

REpresentational State Transfer，资源的表示性状态传输

## 6个约束

- 客户端和服务端
- 统一接口
- 无状态
- 缓存
- 分层系统
- 代码按需加载

## 缺陷

- 获取不足和过度获取，比如有的功能实现依赖于多个 API 的搭配，有的功能却无法充分利用 API 返回的全部资源。
- 随着系统复杂度加深，调用链路逐渐增长，总 RT 增加，排错困难。
- 很难应对需求变更，频频打补丁。
- 十分依赖文档编写。

# GraphQL

## 缺陷

- 需要有安全措施


