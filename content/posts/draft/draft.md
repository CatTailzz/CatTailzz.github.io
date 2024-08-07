---
title: Draft
subtitle: 
date: 2024-07-11T15:39:54+08:00
slug: c32e2d9
draft: true
tags:
  - draft
categories:
  - draft
password: 
message:
---
- 告警内容和风险内容分别是什么？
	- 即平台生成的告警，业务内容可以先不去关注
- 在平台已有代码上开发吗？
	- 不是，开发一个SDK
- 轻运营是否意味着对原功能做一些阉割
	- 是的，比如短信就没法做按钮操作，复杂的功能都需要改造一下
- 接口免登功能的remote-code要根据userId + 告警id一起生成，因为一个user会收到多个告警
	- 都可以
- 前提是用户在remote场景或者手机下，网络可以访问系统并发送请求，只是免去了登陆
	- 前提当然满足，用户需要登陆VPN
- 告警模板是指什么，是邮件里插入的的html模板吗，包含了数据展示、处理操作和请求发送
	- 关注一下能不能回调，请求发送完的处理要求有反馈
- 样例数据的增删改查api和原告警内容的增删改查api是什么关系
	- 尽可能复用

需要实现哪些？

SDK要求把目前的告警发送相关的内容全都集成进去，大致可以拆分一下

首先SDK是数据库无关的，通常不能依赖外部的


# 功能拆解

## 模版**

- 前端提供一个简易的编辑器，用于编辑 html 模板，后端需要实现一个渲染接口，用于模板的预览
- 模板考虑使用 Thymeleaf 的模板引擎，实现防 XSS
- 要求有回调或主动操作方法，便于用户在移动端轻办公

## 集成移动端**

- 集成到邮件、短信、钉钉、飞书等移动端，考虑使用设计模式，优雅实现

## 订阅配置

- 传入模板、订阅主题、订阅用户和订阅方式，当出现告警信息时，会按照模板向该用户推送告警数据

## 移动端配置

- 配置用户支持的移动端

## 免登陆方案**

- 用户需要免登陆，而是被动的在告警推送时，同时生成一个remote-code，包含了用户id和告警id，这个remote-code需要支持：1. 可对称加密 2. 有效期24小时，存在redis中
- AOP校验逻辑，针对请求，根据用户id和告警id生成code，检查redis中是否命中
	- 若命中，则根据userid生成session访问，并从redis中删除code
	- 若不存在，则跳转到登陆页面

![image.png](https://obsidian-img-1300316500.cos.ap-shanghai.myqcloud.com/cattail/obsidian/pic/202407170952175.png)


