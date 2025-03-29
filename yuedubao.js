const SOURCE_TIME = "1742387457506";
const RSA_PUBLIC_KEY = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCOTz9KHYYoG+hBG7R2lN98CDxW4D9WCT60hYxeTxvGrBGZzLL2euNj9pIaY27/+6WX1a7yGrDad6fUm1hgyt6unlV+p7axneBbaesvqAUnaVQqcot2+P5SQgKJsP7QZjZYhVPRsQgkeaCbb1OYfMc3RO8L4AHqTUK3LmTwUB7fCQIDAQAB";
const BASE_API_URL = "http://124.222.183.125";
const AES_KEY_PREFIX = "yuedubao";
const AES_KEY_SUFFIX = "y*y%h#123";
const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const memoCache = {};

const DEFAULT_HEADERS = (function() {
    return {
        version: "3.25.031915",
        androidId: String(Packages.java.util.UUID.randomUUID()).replace(/-/g, "").slice(0, 16),
        appToken: "",
        Host: "124.222.183.125",
        "Accept-Encoding": "gzip"
    };
})();

function b64d(text) {
    const { java } = this;
    if (!text) return "";
    if (Array.isArray(text))
        return text.filter(Boolean).map(function(x) {
            return java.base64Decode(String(x));
        }).join(", ");
    return java.base64Decode(String(text));
}

function generateRandomString(length) {
    if (length === undefined) {
        length = 16;
    }
    return Array.from({ length: length }, function() {
        return CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }).join('');
}

function getFinalKey(randomStr) {
    var cacheKey = "finalKey_" + randomStr;
    if (memoCache[cacheKey]) return memoCache[cacheKey];

    var java = this.java;
    var combined = AES_KEY_PREFIX + randomStr + AES_KEY_SUFFIX;
    var md5 = Packages.java.security.MessageDigest.getInstance("MD5");
    md5.update(new Packages.java.lang.String(combined).getBytes("UTF-8"));
    var hashBytes = md5.digest();
    java.log("test1");

    function bytesToHex(bytes) {
        var hexChars = [];
        for (var i = 0; i < bytes.length; i++) {
            var hex = (bytes[i] & 0xFF).toString(16);
            if (hex.length === 1) {
                hex = "0" + hex;
            }
            hexChars.push(hex);
        }
        return hexChars.join("");
    }
    var hexHash = bytesToHex(hashBytes);
    java.log("test2");

    var evenChars = hexHash.split("").filter(function(_, i) {
        return i % 2 === 0;
    }).join("").slice(4, 12);
    var oddChars = hexHash.split("").filter(function(_, i) {
        return i % 2 === 1;
    }).join("").slice(6, 14);
    var result = evenChars + oddChars;
    memoCache[cacheKey] = result;
    return result;
}

function rsaEncrypt(text, publicKey) {
    if (publicKey === undefined) {
        publicKey = RSA_PUBLIC_KEY;
    }
    var java = this.java;
    return java.createAsymmetricCrypto("RSA/ECB/PKCS1Padding")
        .setPublicKey(java.base64DecodeToByteArray(publicKey))
        .encryptBase64(text);
}

function aesEncrypt(aesKey, data) {
    var java = this.java;
    var encrypted = java.createSymmetricCrypto("AES/ECB/PKCS5Padding", aesKey, null)
        .encryptBase64(data);
    return String(encrypted)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function getLocalServerHeadersMap(appToken) {
    var headers = Object.assign({}, DEFAULT_HEADERS);
    headers.appToken = appToken || headers.appToken;
    return headers;
}

function processUrl(url, method, body) {
    var java = this.java;
    var cache = this.cache;
    var randomStr = generateRandomString();
    var aesKey = this.getFinalKey(randomStr);
    java.log("rsak--" + randomStr);
    java.log("aesk--" + aesKey);

    var normalizedUrl = url.replace(/http:\/\/\d+(?=\/)/, BASE_API_URL);
    var urlParts = normalizedUrl.split("?");
    var baseUrl = urlParts[0];
    var params = method === "POST" ? (body || "") : (urlParts[1] || "");
    var encryptedParams = this.aesEncrypt(aesKey, params);
    var timestamp = Packages.java.lang.System.currentTimeMillis().toString();
    var encryptedTime = this.aesEncrypt(aesKey, timestamp);
    var token = cache.get("ydbao");
    var headers = getLocalServerHeadersMap(token);
    headers.encryptKey = this.rsaEncrypt(randomStr);
    headers.encryptType = "v1";

    var config = { method: method, headers: headers };
    if (method === "POST") {
        config.body = encryptedParams.match(/.{1,76}/g).join("\n");
        return baseUrl + "?requestData=" + encryptedTime + "," + JSON.stringify(config);
    }
    return baseUrl + "?requestData=" + encryptedParams + "," + JSON.stringify(config);
}

function localServiceRequest(url, method, body) {
    var java = this.java;
    var requestUrl = this.processUrl(url, method, body);
    return java.ajax(requestUrl);
}

function localServiceAjax(url, method, body) {
    return this.localServiceRequest(url, method, body);
}

function localServiceAsync(url, method, body) {
    return this.localServiceRequest(url, method, body);
}

function ajaxAll(urls) {
    var java = this.java;
    var processedUrls = urls.map(function(url) {
        return url.indexOf(BASE_API_URL) === 0 ? this.processUrl(url, "GET") : url;
    }, this);
    return java.ajaxAll(processedUrls);
}