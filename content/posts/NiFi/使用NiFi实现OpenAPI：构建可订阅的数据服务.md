---
title: 使用NiFi实现OpenAPI：构建可订阅的数据服务
subtitle: 
date: 2024-07-31T03:36:48+08:00
slug: 2eb3078
draft: true
tags:
  - NiFi
categories:
  - NiFI
password: 
message:
---
# 需求

RESTful API 是不同应用程序间实现通信的一种常见方式，使用 HTTP 请求来操作数据。它作为一种开放接口，有很大概率要随着需求而频繁变更，却又在大部分时候和应用程序高耦合，导致了开发时的臃肿。

在这些开放接口中，有一类是和数据订阅相关的，在系列文章中我们介绍过 NiFi 可以很好的处理数据流，那么 NiFi 能不能将处理的结果作为 Open API 调用的结果公开呢，答案是肯定的。

我们最终要实现的，就是将数据订阅类 Open API 的实现从繁重的系统中解耦出来，并制定开发规范，最终提升开发效率。

# 实现思路

NiFi 有两个非常适合处理 HTTP 请求的处理器：`HandleHTTPRequest` 和 `HandleHTTPResponse` ，前者用于监听特定端口的 HTTP 请求，后者用于产生响应结果，我们可以在二者中间补充数据处理逻辑。

## HandleHTTPRequest

