// 常量定义
const SOURCE_TIME = "1742387457506";
const RSA_PUBLIC_KEY = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCOTz9KHYYoG+hBG7R2lN98CDxW4D9WCT60hYxeTxvGrBGZzLL2euNj9pIaY27/+6WX1a7yGrDad6fUm1hgyt6unlV+p7axneBbaesvqAUnaVQqcot2+P5SQgKJsP7QZjZYhVPRsQgkeaCbb1OYfMc3RO8L4AHqTUK3LmTwUB7fCQIDAQAB";
const BASE_API_URL = "http://124.222.183.125";
const AES_KEY_PREFIX = "yuedubao";
const AES_KEY_SUFFIX = "y*y%h#123";
const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

// 缓存对象
const memoCache = {};

// 默认请求头 - 使用立即执行函数只计算一次
const DEFAULT_HEADERS = (() => {
    return {
        version: "3.25.031915",
        androidId: String(Packages.java.util.UUID.randomUUID()).replace(/-/g, "").slice(0, 16),
        appToken: "",
        Host: "124.222.183.125",
        "Accept-Encoding": "gzip"
    };
})();

// Base64解码
function b64d(text) {
    const { java } = this;
    if (!text) return "";
    if (Array.isArray(text)) {
        return text.filter(Boolean).map(x => java.base64Decode(String(x))).join(", ");
    }
    return java.base64Decode(String(text));
}

// 生成随机字符串
function generateRandomString(length) {
    if (length === undefined) length = 16;
    return Array.from({ length }, () => 
        CHARS.charAt(Math.floor(Math.random() * CHARS.length))
    ).join('');
}

// 获取最终密钥 - 使用记忆化缓存
function getFinalKey(randomStr) {
    let cacheKey = `finalKey_${randomStr}`;
    if (memoCache[cacheKey]) return memoCache[cacheKey];
    
    const { java } = this;
    let combined = `${AES_KEY_PREFIX}${randomStr}${AES_KEY_SUFFIX}`;
    let md5 = Packages.java.security.MessageDigest.getInstance("MD5");
    md5.update(new Packages.java.lang.String(combined).getBytes("UTF-8"));
    let hashBytes = md5.digest();
    java.log("test1")
    let hexHash = Packages.java.util.HexFormat.of().formatHex(hashBytes);
    java.log("test2")

    // 处理十六进制字符串
    const evenChars = hexHash.split("").filter((_, i) => i % 2 === 0).join("").slice(4, 12);
    const oddChars = hexHash.split("").filter((_, i) => i % 2 === 1).join("").slice(6, 14);

    const result = evenChars + oddChars;
    memoCache[cacheKey] = result;
    return result;
}

// RSA加密
function rsaEncrypt(text, publicKey) {
    if (publicKey === undefined) publicKey = RSA_PUBLIC_KEY;
    const { java } = this;
    return java.createAsymmetricCrypto("RSA/ECB/PKCS1Padding")
        .setPublicKey(java.base64DecodeToByteArray(publicKey))
        .encryptBase64(text);
}

// AES加密
function aesEncrypt(aesKey, data) {
    const { java } = this;
    const encrypted = java.createSymmetricCrypto("AES/ECB/PKCS5Padding", aesKey, null)
        .encryptBase64(data);
    return String(encrypted)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

// 获取请求头
function getLocalServerHeadersMap(appToken) {
    const headers = Object.assign({}, DEFAULT_HEADERS);
    headers.appToken = appToken || headers.appToken;
    return headers;
}

// 处理URL并准备请求
function processUrl(url, method, body) {
    const { java, cache } = this;
    const randomStr = generateRandomString();
    const aesKey = getFinalKey(randomStr);
    
    // 记录日志
    java.log("rsak--" + randomStr);
    java.log("aesk--" + aesKey);

    // 处理URL
    const normalizedUrl = url.replace(/http:\/\/\d+(?=\/)/, BASE_API_URL);
    const urlParts = normalizedUrl.split("?");
    const baseUrl = urlParts[0];
    
    // 处理参数
    const params = method === "POST" ? (body || "") : (urlParts[1] || "");
    const encryptedParams = this.aesEncrypt(aesKey, params);

    // 处理时间戳和token
    const timestamp = Packages.java.lang.System.currentTimeMillis().toString();
    const encryptedTime = this.aesEncrypt(aesKey, timestamp);
    const token = cache.get("ydbao");
    
    // 准备请求头
    const headers = getLocalServerHeadersMap(token);
    headers.encryptKey = this.rsaEncrypt(randomStr);
    headers.encryptType = "v1";

    // 创建请求配置
    const config = { method, headers };
    
    // 针对POST请求设置请求体
    if (method === "POST") {
        config.body = encryptedParams.match(/.{1,76}/g).join("\n");
        return `${baseUrl}?requestData=${encryptedTime},${JSON.stringify(config)}`;
    }
    
    // GET请求
    return `${baseUrl}?requestData=${encryptedParams},${JSON.stringify(config)}`;
}

// 统一的HTTP请求函数
function localServiceRequest(url, method, body) {
    const { java } = this;
    const requestUrl = this.processUrl(url, method, body);
    const response = java.ajax(requestUrl);
    return response;
}

// 向后兼容的函数
function localServiceAjax(url, method, body) {
    return this.localServiceRequest(url, method, body);
}

function localServiceAsync(url, method, body) {
    return this.localServiceRequest(url, method, body);
}

// 批量请求
function ajaxAll(urls) {
    const { java } = this;
    const processedUrls = urls.map(url => {
        return url.indexOf(BASE_API_URL) === 0
            ? this.processUrl(url, "GET")
            : url;
    });
    return java.ajaxAll(processedUrls);
}
