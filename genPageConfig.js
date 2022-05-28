const fs = require("fs")
const path = require("path")

// 读取文件夹下的列表
let res = fs.readdirSync(path.join(__dirname, "./dist/pages/"))
res = res.filter(str => str.indexOf("-v2") === -1 && str !== "base.wxml")
res = res.map(compName => {
    // 判断页面配置是否存在 才确定是一个页面
    const pageJsPath = `./dist/pages/${compName}/${compName}.js`
    if(!fs.existsSync(pageJsPath)){
        return
    }
    return {
        pageJsPath
    }
}).filter(item => !!item)
const config = {
    "distPagePath": "./dist-page",
    "needGenPageList": res
}
console.log("config", config);
fs.writeFileSync("./gen-page-config.json", JSON.stringify(config, null, 2))
