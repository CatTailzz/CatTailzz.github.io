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

所以，为了降低使用门槛，现在的需求是借助 `NiFi` 提供的 `REST API` 实现一个类似 `Client` 的 `SDK` ，集成到公司的中台，需要实现以下功能：
- 自动启动和停止流程组
- 组件健康状态检测
- 日志记录
- 定时任务实现数据订阅
- 迁移公司内部 `OPEN API` 

# NiFi API

在另一片文章我们提到，`NiFi` 允许开发者通过自定义处理器来实现所有缺失的功能：
[[NiFi-processor自定义开发]] 。而现在我们将利用 `NiFi REST API` 来实现对流程组的精细化控制，它提供了大量的控制方式：

![image.png](https://obsidian-img-1300316500.cos.ap-shanghai.myqcloud.com/cattail/obsidian/pic/202407162344987.png)

他们的本质都是 `URL` ，可以实现权限、处理器和流操作、中间队列、诊断等多种操作，并且 `NiFi` 本身提供了一种特殊的处理器 `InvokeHTTP` 用于处理 http 请求，后面我们会使用它来迁移公司以前的 `OPEN API` ，事实上结合这个处理器可以构建更强大灵活的自动化框架，不过本篇中暂时用不到，我们先从最简单的权限校验和流程组启停开始。


# 权限校验

> [!NOTE] 观前提示
> 以下内容并未搬抄目前的最佳实践，如果实现方式上有丑陋或令人困惑的地方，欢迎与我讨论

首先，`NiFi REST API` 的访问时需要登陆令牌的，可以通过 `[POST] /access/token` 获取，携带上用户名/密码，如果成功则会返回令牌。其他所有的请求都需要在请求头携带这个令牌，具体格式为 `Authorization=Bearer:[令牌]` ，另外需要注意的是，这些API的前缀url为 `https://<nifi-server-ip>:<port>/nifi-api` 。

所以我们在封装 SDK 时，要把这个令牌当作 `session` 去维护和检查，这里我并没有用 AOP 或者拦截器的方式实现，而是在封装http请求的工具方法时顺带检查了一下，我使用  `HttpClient` 来管理连接，并把所有的公共方法抽象到一个 `AbstractNifiClient` 类中。

下面先介绍一下获取令牌的逻辑，相对其他请求会特殊一些

```Java
private void login() throws Exception {
	HttpPost post = new HttpPost(nifiUrl + LOGIN_ENDPOINT);

	StringEntity entity = new StringEntity("username=" + username + "&password=" + password);
	entity.setContentType("application/x-www-form-urlencoded");
	post.setEntity(entity);
	post.setHeader("Host", customHost);

	logRequestHeaders(post);

	CloseableHttpClient httpClient = createHttpClient();


	try (CloseableHttpResponse response = httpClient.execute(post)) {
		int statusCode = response.getStatusLine().getStatusCode();
		if (statusCode != 200 && statusCode != 201) {
			throw new RuntimeException("Failed to login. HTTP Status Code: " + statusCode);
		}
		String responseString = EntityUtils.toString(response.getEntity());
		this.accessToken = responseString.trim();
		this.tokenExpiryTime = System.currentTimeMillis() + 3600 * 1000 * 6; // 假设 token 有效期为 1 小时
	} catch (Exception e) {
		logger.error("Failed to login", e);
		throw new RuntimeException("Failed to login", e);
	} finally {
		httpClient.close();
	}
}
```

我们可以看到使用了 `httpClient` 的常规使用方式，在获取到令牌后，对于其他的请求可以进一步封装请求和响应，简化代码：

``` Java
private CloseableHttpClient createHttpClient() throws Exception {
	SSLContext sslContext;
	try {
		sslContext = SSLContextBuilder.create()
				.loadTrustMaterial((chain, authType) -> true)
				.build();
	} catch (Exception e) {
		throw new KeyManagementException("Failed to create SSL context", e);
	}

	SSLConnectionSocketFactory sslSocketFactory = new SSLConnectionSocketFactory(
			sslContext,
			NoopHostnameVerifier.INSTANCE);

	return HttpClients.custom()
			.setSSLSocketFactory(sslSocketFactory)
			.build();
}

protected <T> T executeRequest(HttpUriRequest request, JsonResponseHandler<T> handler) throws Exception {
	try {
		ensureLoggedIn();
		request.setHeader("Authorization", "Bearer " + accessToken);
		request.setHeader("Host", customHost);

		logRequestHeaders(request);

		CloseableHttpClient httpClient = createHttpClient();
		try (CloseableHttpResponse response = httpClient.execute(request)) {
			int statusCode = response.getStatusLine().getStatusCode();
			if (statusCode == 403) {
				// 重新登录并重试请求
				login();
				request.setHeader("Authorization", "Bearer " + accessToken);
				request.setHeader("Host", customHost);
				try (CloseableHttpResponse retryResponse = httpClient.execute(request)) {
					return handleResponse(retryResponse, handler);
				}
			} else {
				return handleResponse(response, handler);
			}
		} finally {
			httpClient.close();
		}
	} catch (Exception e) {
		e.printStackTrace();
		throw new RuntimeException("Exception occurred during request execution", e);
	}
}

private <T> T handleResponse(CloseableHttpResponse response, JsonResponseHandler<T> handler) throws IOException {
	int statusCode = response.getStatusLine().getStatusCode();
	if (statusCode != 200) {
		throw new RuntimeException("Failed to execute request. HTTP Status Code: " + statusCode + " Reason: " + response.getStatusLine().getReasonPhrase());
	}
	String responseString = EntityUtils.toString(response.getEntity());
	ObjectMapper mapper = new ObjectMapper();
	JsonNode rootNode = mapper.readTree(responseString);
	return handler.handle(rootNode);
}
```


> [!DANGER] 重要坑点
> 这里关于连接的管理，很多人会想到连接复用，而不是每次调用请求都生成一个httpclient实例。我一开始也这么做了，结果在一个【登陆请求】-【获取状态】-【修改状态】的第三步出现了403 
