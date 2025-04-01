const comment = source.bookSourceComment;
const validHmac = "0L6dvwRP/3oyf27wu2ZgmFEGYNlQeg+mfON8m3hvQpo=";
if (String(java.HMacBase64(comment, 'HmacSHA256', "skybook")) !== validHmac) {
  const errorMsg = `⚠️书源安全警告
检测到非法篡改！本书源仅供免费分享严禁二次售卖及商业用途
请前往更新：https://skybook.pages.dev<br>`;
  java.longToast(errorMsg);
  throw new Error(errorMsg);
}
