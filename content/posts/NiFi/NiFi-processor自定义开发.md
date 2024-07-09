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

所以，如果只是做简单的任务和快速验证，那么可以选择 `ExecuteScript` 处理器，但如果任务复杂、开发周期长、对性能有更高的要求，都推荐自定义开发Processor，事实上，当自己的需求无法被 NiFi 现有 Processor 满足时，都需要自定义一个。

# 创建 NiFi Processor 的基本步骤

## 了解文件结构

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

它就是NiFi官方提供的扩展方式，提供了一个小demo，其中 `nifi-nifi-example-nar` 下只有一个pom文件：

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<!--
  Licensed to the Apache Software Foundation (ASF) under one or more
  contributor license agreements. See the NOTICE file distributed with
  this work for additional information regarding copyright ownership.
  The ASF licenses this file to You under the Apache License, Version 2.0
  (the "License"); you may not use this file except in compliance with
  the License. You may obtain a copy of the License at
  http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.apache.nifi</groupId>
        <artifactId>nifi-example-bundle</artifactId>
        <version>1.23.2</version>
    </parent>

    <artifactId>nifi-nifi-example-nar</artifactId>
    <packaging>nar</packaging>
    <properties>
        <maven.javadoc.skip>true</maven.javadoc.skip>
        <source.skip>true</source.skip>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.apache.nifi</groupId>
            <artifactId>nifi-nifi-example-processors</artifactId>
        </dependency>
    </dependencies>
</project>

```

他所做的就是把主要功能部分的 `nifi-nifi-example-processors` 的 jar 包打包为 nar 包。

`nifi-nifi-example-processors` 是主要部分，我们需要编写自定义的 Processor ，并让他继承 `AbstractProcessor` ，重写其中的方法，并在 resources 的 META-INF 下声明实现类的全路径，有点类似 spring-boot-starter的开发方式。

我们要做的就是：
1. 在 nifi-nifi-example-processors 的 src 下开发自定义的组件
2. 在 nifi-nifi-example-processors 的 resources 下声明自定义组件的全路径
3. 打包为nar包（NiFi自定义的）
4. 部署nar包到nifi环境的lib下

## 


