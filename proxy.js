var API_URL = "https://143.244.204.138";
var CACHE_TIMEOUT_SEC = 21600;
var MAX_RETRIES = 10;
var LOCK_TIMEOUT_SEC = 60;
var WAIT_MAX_MS = 10;

/**
 * 编码函数
 */
function cpo(nu) {
    const { source, java } = this;
    return java.base64Encode(nu || source.getKey(), 3);
}

/**
 * 获取随机服务器ID
 */
function getServerId() {
    return String(Math.floor(Math.random() * 100) + 150);
}

/**
 * 从API获取主机信息
 */
function getHost() {
    var source = this.source,
        java = this.java,
        cache = this.cache;

    try {
        // 获取初始CSRF令牌
        var home = java.ajax(API_URL);
        var csrf = org.jsoup.Jsoup.parse(home)
            .select("input[name='csrf']")
            .attr("value");
        if (!csrf) {
            throw new Error("无法获取初始CSRF令牌");
        }

        // 提交请求获取第二个CSRF令牌
        var body = `url=${encodeURIComponent(source.key)}&csrf=${csrf}`;
        var ser = java.post(`${API_URL}/servers`, body, {}).body();

        var csrfMatch = ser.match(/data-csrf="&quot;(.+)&quot;"/);
        if (!csrfMatch || !csrfMatch[1]) {
            throw new Error("无法获取第二个CSRF令牌");
        }

        var csrf2 = csrfMatch[1];
        java.log(`获取到CSRF令牌: ${csrf2}`);

        // 尝试连接服务器
        var url = `${API_URL}/requests?fso=`;

        for (var i = 0; i < MAX_RETRIES; i++) {
            try {
                var sid = getServerId();
                java.log(`测试服务器: ${sid}`);

                var requestBody =
                    `url=${encodeURIComponent(source.key)}&` +
                    `proxyServerId=${sid}&` +
                    `csrf=${csrf2}&` +
                    `demo=0&` +
                    `frontOrigin=${encodeURIComponent(API_URL)}`;

                var response = java.post(url, requestBody, {
                    cookie: "__cpcPopShown=1"
                });
                var locationHeader = response.header("location");

                if (locationHeader) {
                    var u = java.toURL(locationHeader);
                    var host = `https://${u.host}`;
                    var cook = `__cpc=${u.searchParams.get("s")}`;
                    var time = Date.now().toString();

                    // 保存到缓存
                    cache.put("croxy ck", cook);
                    cache.put("croxy time", time, CACHE_TIMEOUT_SEC);
                    cache.put("croxy host", host);
                    return host;
                }
            } catch (e) {
                java.log(
                    `服务器 ${sid} 连接失败 (${i + 1}/${MAX_RETRIES}): ${
                        e.message
                    }`
                );

                if (i === MAX_RETRIES - 1) {
                    throw new Error("达到最大重试次数，无法获取服务器信息");
                }
            }
        }

        throw new Error("未能找到可用的服务器");
    } catch (e) {
        java.log(`获取主机信息失败: ${e.message}`);
        throw new Error(`接口获取错误: ${e.message}`);
    }
}

/**
 * 检查IP并获取可用主机
 */
function creatRequest(urlPath, params, method="GET", body) {
    const ctx = this;
    const { source, java, cache } = ctx;

    // 检查缓存是否有效
    function isValidCache() {
        var time = cache.get("croxy time");
        if (!time) return false;

        var timeDiff = Date.now() - parseInt(time, 10);
        return cache.get("croxy host") && timeDiff <= CACHE_TIMEOUT_SEC * 1000;
    }

    function fu() {
        let headers = (() => {
            let ua = java.getWebViewUA();
            //let ref = source.key + "/";
            let cookie = cache.get("croxy ck");

            var headers = {
                "User-Agent": ua,
                cookie: cookie
            };
            return headers;
        })();
        let option = {
            headers: headers,
            method: method
        };
        if (body && body != "" ) option.body = body;
        params = params ? params+"&" : "?";
        return `${cache.get(
            "croxy host"
        )}${urlPath}${params}__cpo=${ctx.cpo()},${JSON.stringify(option)}`;
    }

    // 如果缓存有效，直接返回
    if (isValidCache()) {
        return fu();
    }

    // 随机延迟，避免并发问题
    Packages.java.lang.Thread.sleep(Math.floor(Math.random() * 800));

    // 如果没有锁，则尝试更新缓存
    if (!cache.get("cxylock")) {
        try {
            cache.put("cxylock", 1, LOCK_TIMEOUT_SEC);
            ctx.getHost();
        } catch (error) {
            java.log(`更新代理信息出错: ${error.message}`);
        } finally {
            cache.delete("cxylock");
        }
    } else {
        // 如果有锁，等待其他线程更新完成
        var waitTime = 0;
        var INTERVAL = 100;

        while (cache.get("cxylock") && waitTime < WAIT_MAX_MS) {
            Packages.java.lang.Thread.sleep(INTERVAL);
            waitTime += INTERVAL;

            if (isValidCache()) {
                return String(cache.get("croxy host"));
            }
        }

        if (waitTime/1000 >= WAIT_MAX_MS && cache.get("cxylock")) {
            java.log("等待缓存更新超时");
        }
    }

    return fu();
}