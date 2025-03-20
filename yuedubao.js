const source_time = "1742387457506";

const RSA_PUBLIC_KEY = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCOTz9KHYYoG+hBG7R2lN98CDxW4D9WCT60hYxeTxvGrBGZzLL2euNj9pIaY27/+6WX1a7yGrDad6fUm1hgyt6unlV+p7axneBbaesvqAUnaVQqcot2+P5SQgKJsP7QZjZYhVPRsQgkeaCbb1OYfMc3RO8L4AHqTUK3LmTwUB7fCQIDAQAB";

const DEFAULT_HEADERS = (() => ({
    version: "3.25.031915",
    androidId: String(Packages.java.util.UUID.randomUUID()).replace(/-/g, "").slice(0, 16),
    appToken: "",
    Host: "124.222.183.125",
    "Accept-Encoding": "gzip"
}))();

function b64d(text) {
    const { java } = this;
    return text ? Array.isArray(text) 
        ? text.filter(Boolean).map(x => java.base64Decode(String(x))).join(", ") 
        : java.base64Decode(String(text)) 
    : "";
}

function generateRandomString(length) {
    var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    var result = "";
    length = length || 16;
    for (var i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function getFinalKey(randomStr) {
    let combined = `yuedubao${randomStr}y*y%h#123`;
    let md5 = java.security.MessageDigest.getInstance("MD5");
    md5.update(new java.lang.String(combined).getBytes("UTF-8"));
    let hashBytes = md5.digest();
    let hexHash = java.util.HexFormat.of().formatHex(hashBytes);

    let processHexChars = (hexStr, isEven) => 
        hexStr.split("").filter((_, i) => isEven ? (i % 2 === 0) : (i % 2 === 1)).join("");

    let evenChars = processHexChars(hexHash, true).slice(4, 12);
    let oddChars = processHexChars(hexHash, false).slice(6, 14);

    return evenChars + oddChars;
}

function rsaEncrypt(text, publicKey) {
    const { java } = this;
    publicKey = publicKey || RSA_PUBLIC_KEY;
    return java.createAsymmetricCrypto("RSA/ECB/PKCS1Padding")
        .setPublicKey(java.base64DecodeToByteArray(publicKey))
        .encryptBase64(text);
}

function aesEncrypt(aesKey, data) {
    const { java } = this;
    var encrypted = java.createSymmetricCrypto("AES/ECB/PKCS5Padding", aesKey, null)
        .encryptBase64(data);
    return String(encrypted)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function getLocalServerHeadersMap(appToken) {
    var headers = {};
    for (var key in DEFAULT_HEADERS) {
        headers[key] = DEFAULT_HEADERS[key];
    }
    headers.appToken = appToken;
    return headers;
}

function processUrl(url, method, body) {
    const { java, cache } = this;
    var randomStr = generateRandomString();
    var aesKey = getFinalKey(randomStr);
    java.log("rsak--"+randomStr)
    java.log("aesk--"+aesKey)

    var urlParts = url.replace(/http:\/\/\d+(?=\/)/, "http://124.222.183.125").split("?");
    var params = method === "POST" ? (body || "") : (urlParts[1] || "");
    var encryptedParams = this.aesEncrypt(aesKey, params);
    
    var timestamp = Packages.java.lang.System.currentTimeMillis().toString();
    var encryptedTime = this.aesEncrypt(aesKey, String(timestamp));
    
    var headers = getLocalServerHeadersMap(cache.get("ydbao"));
    headers.encryptKey = this.rsaEncrypt(randomStr);
    headers.encryptType = "v1";

    var config = {
        method: method,
        headers: headers
    };
    
    if (method === "POST") {
        config.body = encryptedParams.match(/.{1,76}/g).join("\n");
        return urlParts[0] + "?requestData=" + encryptedTime + "," + JSON.stringify(config);
    }
    return urlParts[0] + "?requestData=" + encryptedParams + "," + JSON.stringify(config);
}

function localServiceAjax(url, method, body) {
    const { java } = this;
    var requestUrl = this.processUrl(url, method, body);
    var response = java.ajax(requestUrl);
    java.log(response);
    return response;
}

function localServiceAsync(url, method, body) {
    const { java } = this;
    var requestUrl = this.processUrl(url, method, body);
    var response = java.ajax(requestUrl);
    java.log(response);
    return response;
}

function ajaxAll(urls) {
    const { java } = this;
    var processedUrls = [];
    for (var i = 0; i < urls.length; i++) {
        var url = urls[i];
        if (url.indexOf("http://124.222.183.125") === 0) {
            processedUrls.push(this.processUrl(url, "GET"));
        } else {
            processedUrls.push(url);
        }
    }
    return java.ajaxAll(processedUrls);
}
