---
title: NiFi Processor自定义开发：从零开始创建自己的第一个Processor
subtitle: 
date: 2024-07-08T11:35:50+08:00
slug: 247fe3e
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

# 什么是NiFi Processor？

Apache NiFi是一个数据流自动化同步工具，它本身提供了丰富的内置组件来处理数据集成，包括了各种数据源的读写，数据的拆分聚合，以及自定义脚本的处理。它们就是一个个processor，负责独立的子功能，多个processor连接在一起，构成复杂的processor group数据流任务。

# 为什么要自己开发？

Apache NiFi为了满足对于数据流处理的定制化需求，提供了 `ExecuteScript` 这样一个processor，能够支持自定义python、Groovy、lua、JS脚本，开发人员需要额外写一个脚本放到这个组件的 `Script Body` 中执行。

让我们来分析一下这么做有什么问题：
- 增强了耦合，不利于复用，太"专"了，类似的需求能不能抽象成模板？
- 很多时候已经有了处理的功能，比如一个模板映射的SDK、一个标签识别的SDK，还要转换为脚本，本末倒置。
- 不方便编辑和测试脚本，必须放入processor中，让整个任务流跑起来才能发现问题

所以