---
title: NiFiSDK开发流程
subtitle: 
date: 2024-07-08T14:12:18+08:00
slug: fc45476
tags:
  - NiFi
categories:
  - NiFI
collections:
  - NiFi
password: 
message: 
draft: false
---
# 需求

公司中台需要新增数据同步能力，经过调研选择了 `Apache NiFi` ，它可以高效方便地实现数据订阅、数据流处理等功能。它的一大优点就是所有的操作都可以在提供的 UI 界面上完成，但这样总归是有一些使用门槛的。

所以，为了降低使用门槛，现在的需求是借助 `NiFi` 提供的 `REST API` ，集成到公司的中台，需要实现以下功能：
- 自动启动和停止流程组
- 组件健康状态检测
- 日志记录
- 定时任务实现数据订阅
- 迁移公司内部 `OPEN API` 

# NiFi API

在另一片文章我们提到，`NiFi` 允许开发者通过自定义处理器来实现所有缺失的功能：
[[NiFi-processor自定义开发]] 。而现在我们将利用 `NiFi REST API` 来实现对流程组的精细化控制，它提供了大量的控制方式：

![image.png](https://obsidian-img-1300316500.cos.ap-shanghai.myqcloud.com/cattail/obsidian/pic/202407162344987.png)


