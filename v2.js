// 常量配置
const CONFIG = {
    VERSION: "3.25.042314",
    RSA_PUBLIC_KEY:
        "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCOTz9KHYYoG+hBG7R2lN98CDxW4D9WCT60hYxeTxvGrBGZzLL2euNj9pIaY27/+6WX1a7yGrDad6fUm1hgyt6unlV+p7axneBbaesvqAUnaVQqcot2+P5SQgKJsP7QZjZYhVPRsQgkeaCbb1OYfMc3RO8L4AHqTUK3LmTwUB7fCQIDAQAB",
    BASE_API_URL: "https://124.222.183.125",
    AES_KEY_PREFIX: "yuedubao",
    AES_KEY_SUFFIX: "y*y%h#123",
    DEFAULT_HEADERS: {
        "X-Client": "android",
        androidId: "",
        appToken: "",
        Host: "124.222.183.125",
        "Accept-Encoding": "gzip"
    },
    TEST_MODE: {
        enabled: false,
        timestamp: "1745512169193",
        androidId: "0cfb90799422b77d",
        randomStr: "oru1velg8kwjo1pw"
    }
};

// 工具类和加密模块
const Utils = {
    /**
     * Base64解码
     */
    b64d(text) {
        const { java } = this;
        if (!text) return "";
        if (Array.isArray(text)) {
            return text
                .filter(Boolean)
                .map(x => java.base64Decode(String(x)))
                .join(", ");
        }
        return java.base64Decode(String(text));
    },

    /**
     * 处理MD5字符串
     */
    processMD5(timestamp, md5Str) {
        // 计算 a2 值
        const char1 = timestamp.charAt(timestamp.length - 2);
        const char2 = timestamp.charAt(timestamp.length - 1);
        let v24 = char2.charCodeAt(0) + 10 * char1.charCodeAt(0) - 528;
        v24 = v24 & 0xffff;
        const mod = (v24 + ((v24 & 0xc000) >> 14)) & 0xfffc;
        const a2 = v24 - mod + 1;

        // 分割奇偶位
        const chars = md5Str.split("");
        const even = chars.filter((_, i) => i % 2 === 0).join(""); // 偶数位
        const odd = chars.filter((_, i) => i % 2 === 1).join(""); // 奇数位

        // 根据 a2 处理字符串
        let result;
        switch (a2) {
            case 1:
                result =
                    even.substring(0, 4) +
                    odd.substring(0, 4) +
                    even.substring(4, 8) +
                    odd.substring(4, 8) +
                    odd.substring(8, 12) +
                    even.substring(8, 12);
                break;
            case 2:
                result =
                    even.substring(2, 6) +
                    odd.substring(2, 6) +
                    even.substring(6, 10) +
                    odd.substring(6, 10) +
                    odd.substring(10, 14) +
                    even.substring(10, 14);
                break;
            case 3:
                result =
                    even.substring(1, 5) +
                    odd.substring(3, 7) +
                    even.substring(5, 9) +
                    odd.substring(7, 11) +
                    odd.substring(11, 15) +
                    even.substring(9, 13);
                break;
            case 4:
                result =
                    even.substring(3, 7) +
                    odd.substring(1, 5) +
                    even.substring(7, 11) +
                    odd.substring(5, 9) +
                    odd.substring(9, 13) +
                    even.substring(11, 15);
                break;
            default:
                return "";
        }

        return result.substring(0, 16);
    },

    /**
     * 生成指定长度的随机字符串
     */
    generateRandomString(length = 16) {
        const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
        return Array.from({ length }, () =>
            CHARS.charAt(Math.floor(Math.random() * CHARS.length))
        ).join("");
    },

    /**
     * 字节转十六进制
     */
    bytesToHex(bytes) {
        const hexChars = [];
        for (let i = 0; i < bytes.length; i++) {
            let hex = (bytes[i] & 0xff).toString(16);
            hexChars.push(hex.length === 1 ? "0" + hex : hex);
        }
        return hexChars.join("");
    },

    /**
     * 获取最终加密密钥
     */
    getFinalKey(timestamp, aid, randomStr) {
        const { java } = this;
        const combined = `${CONFIG.AES_KEY_PREFIX}${timestamp}${aid}${CONFIG.VERSION}${randomStr}${CONFIG.AES_KEY_SUFFIX}`;

        const md5 = Packages.java.security.MessageDigest.getInstance("MD5");
        md5.update(new Packages.java.lang.String(combined).getBytes("UTF-8"));
        const hashBytes = md5.digest();

        const hexHash = this.bytesToHex(hashBytes);
        return this.processMD5.call(this, String(timestamp), hexHash);
    },

    /**
     * RSA加密
     */
    rsaEncrypt(text, publicKey = CONFIG.RSA_PUBLIC_KEY) {
        const { java } = this;
        return java
            .createAsymmetricCrypto("RSA/ECB/PKCS1Padding")
            .setPublicKey(java.base64DecodeToByteArray(publicKey))
            .encryptBase64(text);
    },

    /**
     * AES加密
     */
    aesEncrypt(aesKey, data) {
        const { java } = this;
        const encrypted = java
            .createSymmetricCrypto("AES/ECB/PKCS5Padding", aesKey, null)
            .encryptBase64(data);
        return String(encrypted).replace(/\+/g, "-").replace(/\//g, "_");
    }
};

// 请求管理和HTTP客户端
const API = {
    /**
     * 获取设备信息
     */
    getDeviceInfo() {
        if (CONFIG.TEST_MODE.enabled) {
            return {
                timestamp: CONFIG.TEST_MODE.timestamp,
                androidId: CONFIG.TEST_MODE.androidId,
                randomStr: CONFIG.TEST_MODE.randomStr
            };
        }

        return {
            timestamp: Date.now().toString(),
            androidId: String(Packages.java.util.UUID.randomUUID())
                .replace(/-/g, "")
                .slice(0, 16),
            randomStr: Utils.generateRandomString()
        };
    },

    /**
     * 获取HTTP请求头
     */
    getRequestHeaders(appToken, deviceInfo) {
        return Object.assign({}, CONFIG.DEFAULT_HEADERS, {
            version: CONFIG.VERSION,
            appToken: appToken || "",
            nonce: deviceInfo.randomStr,
            encryptKey: Utils.rsaEncrypt.call(this, deviceInfo.randomStr),
            encryptType: "v2",
            timestamp: parseInt(deviceInfo.timestamp / 1000),
            androidId: deviceInfo.androidId
        });
    },

    /**
     * 处理URL和加密请求参数
     */
    processUrl(url, method, body) {
        const { java, cache } = this;
        const deviceInfo = this.getDeviceInfo();

        // 获取AES密钥
        const aesKey = Utils.getFinalKey.call(
            this,
            parseInt(deviceInfo.timestamp / 1000),
            deviceInfo.androidId,
            deviceInfo.randomStr
        );
        java.log("rsak--" + deviceInfo.randomStr);
        java.log("aesk--" + aesKey);

        // 处理URL
        const normalizedUrl = url.replace(
            /http:\/\/\d+(?=\/)/,
            CONFIG.BASE_API_URL
        );
        const urlParts = normalizedUrl.split("?");
        const baseUrl = urlParts[0];

        // 根据请求方法处理参数
        const params =
            method === "POST"
                ? body || ""
                : urlParts[1]
                ? urlParts[1] + "&t=" + deviceInfo.timestamp
                : "";

        const encryptedParams = Utils.aesEncrypt.call(this, aesKey, params);
        const encryptedTime = Utils.aesEncrypt.call(
            this,
            aesKey,
            "t=" + deviceInfo.timestamp
        );

        // 获取请求头
        const token = cache.get("ydbao");
        const headers = this.getRequestHeaders.call(this, token, deviceInfo);

        if (method === "POST") {
            let formattedBody = encryptedParams.match(/.{1,76}/g).join("\n");
            return {
                url: baseUrl + "?requestData=" + encryptedTime,
                headers: headers,
                body: formattedBody
            };
        }

        return {
            url: baseUrl + "?requestData=" + encryptedParams,
            headers: headers
        };
    },

    /**
     * 发送请求
     */
    sendRequest(url, method, body) {
        const { java } = this;
        const requestUrl = this.processUrl.call(this, url, method, body);
        const safeHeaders = {};

        for (let key in requestUrl.headers) {
            safeHeaders[key] = String(requestUrl.headers[key]);
        }

        if (requestUrl.body) {
            return java
                .post(
                    requestUrl.url.toString(),
                    requestUrl.body.toString(),
                    safeHeaders
                )
                .body();
        }

        return java.get(requestUrl.url.toString(), safeHeaders).body();
    },

    /**
     * 批量请求
     */
    ajaxAll(urls) {
        const processedUrls = urls.map(url => {
            if (
                /^https?:\/\/11\//.test(url) ||
                url.startsWith(CONFIG.BASE_API_URL)
            ) {
                const u = this.processUrl.call(this, url, "GET");
                const safeHeaders = {};

                for (let key in u.headers) {
                    safeHeaders[key] = String(u.headers[key]);
                }

                return `${u.url.toString()},{"headers":${JSON.stringify(
                    safeHeaders
                )}}`;
            }
            return url;
        }, this);

        return this.java.ajaxAll(processedUrls);
    }
};

// 导出所有功能到全局上下文
Object.assign(this, {
    b64d: Utils.b64d,
    processMD5: Utils.processMD5,
    bytesToHex: Utils.bytesToHex,
    generateRandomString: Utils.generateRandomString,
    getFinalKey: Utils.getFinalKey,
    rsaEncrypt: Utils.rsaEncrypt,
    aesEncrypt: Utils.aesEncrypt,
    getDeviceInfo: API.getDeviceInfo,
    getRequestHeaders: API.getRequestHeaders,
    processUrl: API.processUrl,
    localServiceRequest: API.sendRequest,
    localServiceAjax: API.sendRequest,
    localServiceAsync: API.sendRequest,
    ajaxAll: API.ajaxAll
});
