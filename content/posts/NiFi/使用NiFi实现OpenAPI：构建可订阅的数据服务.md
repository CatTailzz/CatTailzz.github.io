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

