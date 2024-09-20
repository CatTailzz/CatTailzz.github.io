---
title: JavaNIO
subtitle:
date: 2024-09-19T02:04:18+08:00
slug: 97dfdef
draft: true
tags:
  - draft
categories:
  - draft
# collections:
#   - draft

password:
message:
---
# NIO 三大组件

- Channel，负责数据读写的双通道
- Buffer，读写数据缓冲区
- Selector，事件驱动模型，用一个线程管理多个channel，监听就绪事件

## Buffer

### 基础结构

buffer 有几个重要属性，并且在不同模式下会切换

- capacity，即缓冲区的容量
- position，写模式下表示下一个写入位置，读模式下表示下一个读的位置
- limit，写模式下表示写入的限制位置，读模式下表示读取的限制位置

通过 flip() 来切换模式，另外这个 buffer 并不是循环的，想复用要么使用 clear() 清空，要么用具体实现类的 compact() 方法把剩余元素移动到开头，也可以 rewind() 单纯重置 position 为 0

关于挪动还有一点要说就是，挪动之前的数据位置，再挪动后不会置为 0 或空，而是保留原值，不过 limit 和 position 都变了，后续这个位置要么就是读不到，要么就是被覆写，倒也没问题。

![image.png](https://obsidian-img-1300316500.cos.ap-shanghai.myqcloud.com/cattail/obsidian/pic/202409192117728.png)

关于这里的 mark，是提供给用户的一个标记位，调用 mark() 方法会给 mark 赋值为当前的position，再调用 reset() 则会把 position 重新置为 mark

### 空间分配

Buffer 在空间分配时指定一个容量，这个容量不可变。在分配方式上，分为两种

![image.png](https://obsidian-img-1300316500.cos.ap-shanghai.myqcloud.com/cattail/obsidian/pic/202409192136652.png)

从名字能直观看出来，HeapByteBuffer 是 Java 堆内存分配，DirectByteBuffer 是直接内存分配。下面说说二者区别

- Heap 读写要慢点，因为多一次拷贝，这个是 IO 零拷贝相关的知识
- Heap 分配受 JVM 管理，可能被 GC，有好有坏，Direct 就需要自己管理，防止内存泄漏

# 网络编程

## 阻塞和非阻塞

- 阻塞模式下，调用一些 accept() 或者 read() 方法会导致线程停止运行，在单线程模式下更离谱，server 调用 accept() 卡住了，会导致这个线程里的 socket 也无法调用 read()，需要多线程支持。但即使上了多线程也有问题，一个线程一个连接，长久下去必然 OOM，还会上下文切换影响效率，上了线程池也是治标不治本。
- 非阻塞模式下，不会导致线程停止运行，而是快速返回 null 或者 0，但要想正常工作，必然要在代码层面做 while true 的处理，不断轮询，本质还是同步的，且浪费 CPU
- 多路复用，使用 Selector 实现对 Channel 可读写事件的监听，注意这里是网络IO下，而不是文件IO。只需要一个线程配合一个 Selector，就可以实现对多个 Channel 的监听。

## Selector

