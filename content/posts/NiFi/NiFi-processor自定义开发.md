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

Apache NiFi 是一个数据流自动化同步工具，它本身提供了丰富的内置组件来处理数据集成，包括了各种数据源的读写，数据的拆分聚合，以及自定义脚本的处理。它们就是一个个 processor ，负责独立的子功能，多个 processor 连接在一起，构成复杂的 processor group 数据流任务。

# 为什么要自己开发？

其实， Apache NiFi 为了满足对于数据流处理的定制化需求，提供了 `ExecuteScript` 这样一个内置的processor，能够支持自定义 python、Groovy、lua、JS 脚本，但开发人员需要额外写一个脚本放到这个组件的 `Script Body` 中执行。

![image.png](https://obsidian-img-1300316500.cos.ap-shanghai.myqcloud.com/cattail/obsidian/pic/202407081526572.png)


让我们来分析一下这么做有什么问题：
- 增强了耦合，不利于复用，维护性差，太"专"了，类似的需求能不能抽象成模板？
- 很多时候，是算法组的成员先实现了数据处理的功能，比如一个模板映射的 SDK 、一个标签识别的 SDK ，这时候还要转换为脚本，本末倒置。
- 性能较低，脚本是解释执行的，相比编译后的 Java 代码性能较差
- 测试不方便，必须放入 processor 中并且让整个数据流跑起来，才能发现问题

所以，如果只是做简单的任务和快速验证，那么可以选择 `ExecuteScript` 处理器，但如果任务复杂、开发周期长、对性能有更高的要求，都推荐自定义开发Processor

# 创建 NiFi Processor 的基本步骤

我们下载 NiFi 的源码，可以看到 `/nifi-external` 下有一个 `nifi-example-bundle` 的包，这是他内部的结构树

``` shell
.
├── nifi-nifi-example-nar
│   └── pom.xml
├── nifi-nifi-example-processors
│   ├── nifi-nifi-example-processors.iml
│   ├── pom.xml
│   └── src
│       └── main
│           ├── java
│           │   └── org
│           │       └── apache
│           │           └── nifi
│           │               └── processors
│           │                   ├── JsonProcessor.java
│           │                   └── WriteResourceToStream.java
│           └── resources
│               ├── META-INF
│               │   └── services
│               │       └── org.apache.nifi.processor.Processor
│               └── file.txt
└── pom.xml
```

它就是NiFi官方提供的扩展方式，提供了一个小demo，我们要做的就是：
1. 在 nifi-nifi-example-processors 的 src 下开发自定义的组件
2. 打包为nar包（NiFi自定义的）
3. 部署到nifi环境的lib包下

## 结构介绍（不想看跳过）

