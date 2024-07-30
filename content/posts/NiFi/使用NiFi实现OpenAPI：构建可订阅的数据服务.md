---
title: 使用NiFi实现OpenAPI：构建可订阅的数据服务
subtitle: 
date: 2024-07-31T03:36:48+08:00
slug: 2eb3078
draft: false
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

### 基础信息设置

对于请求处理程序，我们只需要确定监听的端口，以及支持的 HTTP 方法，比如是否支持 GET、POST 等，还有 Allowed Paths 就是请求路径，比如 /user，这里我们可以填 * 也可以不填，理由在后文会提到。

![image.png](https://obsidian-img-1300316500.cos.ap-shanghai.myqcloud.com/cattail/obsidian/pic/202407310447615.png)

### URL 分发问题

这里要注意的是，我们的多个 Open API 可能监听同一个端口，但 NiFi 不允许多个 `HandleHTTPRequest` 监听同一个端口，这意味着我们的 Open API 需要共用同一个 `HandleHTTPRequest` 处理器，并且我们需要自己处理不同 URL 的分发。

这里我们使用到了 `RouteOnAttribute` 处理器，他可以根据传递过来的 url 参数来 match 不同的规则，我们只需要做好从 url 参数到路由结果的规则定义，这里的路由就类似于普通 processor 默认的 success 和 failed 两种情况，可以连接其他的 processor 来处理成功 / 失败的后续处理方式，我们可以根据 url 添加类似于 toUser 或 toRole 等新的规则，实现更灵活的路由。

![image.png](https://obsidian-img-1300316500.cos.ap-shanghai.myqcloud.com/cattail/obsidian/pic/202407241804294.png)
 
### 参数设置以及接口文档

一个完整的 Open API 应该包含接口文档，详细描述请求方式，请求地址，入参出参以及样例等信息。传统模式下先约定接口规范，再形成接口文档，或者偷懒一点用 swagger 等生成。在 NiFi 的 `HandleHTTPRequest` 中，设置请求参数不是问题，对于不同的请求都有各种类型参数的传入支持，也可以更灵活的将参数设置为自定义的属性。

但对于接口文档的生成或编写，的确没有太好的现成办法，但我们想到了一个稍微轻便一点的方案，在尽量减少手动书写的前提下，把接口文档用类似于 swagger 的形式呈现出来。我们规定所有的 Open API 都要添加一个 `updateAttribute` 处理器，它本身不对处理流产生任何影响，只是用于约定接口文档的字段。不过由于 `HandleHTTPRequest` 是共用一个的，很多接口信息相当于是在调用的那一刻才动态生成的，所以也就无法提前得知，因此所有的接口文档信息都要写进各自的 `updateAttribute` 的字段中。

为了展示和整合接口信息，我们为 NiFi SDK 新增了对于 Open API 的支持，我们约定接口文档的数据模型：

```Java
@Data
public class ApiDocument {
    private String method;
    private String url;
    private String description;
    private List<Parameter> requestParameters;
    private List<Parameter> responseParameters;
    private String requestExample;
    private String responseExample;

    @Data
    public static class Parameter {
        private String name;
        private String type;
        private String description;
        private boolean required;

    }
}
```

我们目前是通过流程组名的 `-openapi` 后缀来定位到 Open API 类型的流程组，以及通过 `-config` 来定位接口文档相关处理器的，具体逻辑如下

```Java
// 获取所有openapi的config processor
public JsonNode getOpenApiProcessGroups(String parentGroupId) throws Exception {
	List<ApiDocument> apiDocuments = new ArrayList<>();
	getProcessGroupsRecursive(parentGroupId, apiDocuments);

	ApiDocumentUtils apiDocumentUtils = new ApiDocumentUtils();
	List<JsonNode> documents = new ArrayList<>();
	for (ApiDocument apiDocument : apiDocuments) {
		documents.add(apiDocumentUtils.toJson(apiDocument));
	}
	return new ObjectMapper().createArrayNode().addAll(documents);
}

private void getProcessGroupsRecursive(String parentGroupId, List<ApiDocument> apiDocuments) throws Exception {
	String url = getNifiUrl() + PROCESS_GROUPS_ENDPOINT + parentGroupId;
	HttpGet get = new HttpGet(url);

	executeRequest(get, rootNode -> {
		rootNode.get("processGroupFlow").get("flow").get("processGroups").forEach(processGroup -> {
			String groupName = processGroup.get("component").get("name").asText();
			if (groupName.endsWith("-openapi")) {
				// Recursively get child process groups
				String childGroupId = processGroup.get("component").get("id").asText();
				try {
					getProcessGroupsRecursive(childGroupId, apiDocuments);
				} catch (Exception e) {
					throw new RuntimeException(e);
				}
				// Get processors with names ending with -config
				try {
					getProcessors(childGroupId).forEach(processor -> {
						String processorName = processor.get("component").get("name").asText();
						if (processorName.endsWith("-config")) {
							ApiDocumentUtils apiDocumentUtils = new ApiDocumentUtils();
							ApiDocument apiDocument = null;
							try {
								apiDocument = apiDocumentUtils.parseConfigProcessor(processor);
							} catch (JsonProcessingException e) {
								throw new RuntimeException(e);
							}
							apiDocuments.add(apiDocument);
						}
					});
				} catch (Exception e) {
					throw new RuntimeException(e);
				}
			}
		});
		return null;
	});
}
```

在获取到所有的 Open API 接口信息后，就可以交给前端来展示了，可以做到类似于 swagger 的自动化的效果。如果说 swagger 是把写文档的动作变成了写代码，那我们则是把写文档的动作变成了写 NiFi Processor 属性。

## HandleHTTPResponse

响应处理则更简单，只需要在之前的流程中处理好数据的展示，在此处只设置一个状态码即可，大部分情况下都是成功状态码200，如果有一些其他复杂需求，则需要在中间过程中做好路由，各自连接到不同状态码的 `HandleHTTPResponse` 处理器。

以下是一个普通的案例，只需要查库并做一些格式转换，然后响应，只做了成功的结果。

![image.png](https://obsidian-img-1300316500.cos.ap-shanghai.myqcloud.com/cattail/obsidian/pic/202407241804994.png)

## 调用方式

当 Open API 的流准备就绪后，我们就可以调用它，通过 `https://<ip>:<port>/url` 的路径，并设置需要的请求头和参数即可。这里写的时候发现 postman 的 history 没有保留历史数据信息的 body，没内网一时也访问不到，但其他信息还是在的，还是展示一下吧

![image.png](https://obsidian-img-1300316500.cos.ap-shanghai.myqcloud.com/cattail/obsidian/pic/202407310555262.png)

# 总结

我们已经确立了在 Apache NiFi 上开发 Open API 的基础策略，目的是将主要的数据处理和数据订阅功能迁移至 NiFi 平台。这一转变有助于减少对主系统的依赖，避免了因小幅度修改开放接口而需重新部署整个系统的问题。目前，我们展示的案例较为基础，并未涵盖生产环境中可能遇到的复杂情况。对于更深入的实施细节和高级应用，建议参考本系列的其他以及后续文章~~（其实我也懒得写实施细节🐶）~~。