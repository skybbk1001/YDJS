const expected = "U2JCl3g2/+94Wzk8oT6uORrH12qR5vM6gsFOKmkCxcA=";
const errMsg = `⚠️ 书源安全警告
检测到非法篡改！本书源仅供免费分享，严禁二次售卖及商业用途
请前往更新：https://skybook.pages.dev   <br>`;

if (java.HMacBase64(a, 'HmacSHA256', "skybook") !== expected) {
  java.longToast(errMsg);
  throw new Error(errMsg);
}