// ob.js
import JSConfuser from "js-confuser";
import { readFileSync, writeFileSync } from "fs";

// 1. 直接把配置对象声明为普通常量，不要再用 module.exports
const options = {
  target: 'node',
  calculator: true,
  compact: true,
  hexadecimalNumbers: true,
  deadCode: 0.05,
  dispatcher: 0.25,
  duplicateLiteralsRemoval: 0.5,
  identifierGenerator: 'randomized',
  minify: true,
  movedDeclarations: true,
  objectExtraction: true,
  renameVariables: true,
  renameGlobals: false,
  stringConcealing: true,
  astScrambler: true,
  renameLabels: true,
  preserveFunctionLength: true,
  stringEncoding: true,
};
// 2. 读入源文件
const sourceCode = readFileSync("input.js", "utf8");

// 3. 用 async/await 包裹调用
async function run() {
  try {
    const result = await JSConfuser.obfuscate(sourceCode, options);
    // 4. 输出到 output.js
    writeFileSync("output.js", result.code);
    console.log("✅ obfuscation complete, see output.js");
  } catch (err) {
    console.error("❌ error during obfuscation:", err);
  }
}

run();