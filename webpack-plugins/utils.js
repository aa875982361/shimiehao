const path = require("path")
const fs = require("fs")
const replaceExt = require("replace-ext")

const isWin = /^win/.test(require("os").platform())
const pluginReg = /plugin:/

/**
 * 删除入口文件后缀
 * @param {*} entry 
 * @returns 
 */
function deleteEntryExt(entry = ""){
  return entry.replace(/\.[jt]s$/, "")
}
/**
 * 寻找入口文件在全部页面列表的index
 * @param {*} entry 
 */
function findIndexEntryInAllPage(allPages, entry = ""){
  entry = deleteEntryExt(entry)
  const index = allPages.indexOf(entry)
  return index
}
/**
 * 全部页面路径是不是有这个入口路径
 */
function allPagesHasEntry(allPages, entry = ""){
  // 将这些文件路径都去掉.js .ts 
  const index = findIndexEntryInAllPage(allPages, entry)
  return index !== -1
}

function addEntryToAllPage(allPages, entry = ""){
  // 加入列表
  if(!allPagesHasEntry(allPages, entry)){
      allPages.push(deleteEntryExt(entry))
  }
}

function handlePath(filePath){
  return filePath.split(path.sep).join("/")
}

function _inflateEntries(allPages, entries = [], dirname, entry) {
    const configFile = /\.[jt]s$/.test(entry) ? replaceExt(entry, ".json") : (entry + ".json")
    // console.log("configFile", configFile);
    if(!fs.existsSync(configFile)){
        return
    }
    const content = fs.readFileSync(configFile, "utf8")
    const config = JSON.parse(content) || {}
    // console.log("config", config)
    // 记录下有json的js 因为有json 代表是页面 页面就在chunk的时候排除
    if(!allPagesHasEntry(allPages, entry)){
        addEntryToAllPage(allPages, entry)
    }
    const {pages, usingComponents, subpackages} = config
    let entryList = []
    // app.json
    if(pages){
        entryList = pages
    }
    // 页面或者组件
    else if(usingComponents){
        entryList = Object.keys(usingComponents)
    }
    // 处理分包
    if(subpackages && Array.isArray(subpackages)){
        subpackages.forEach((subpackage) => {
            const root = subpackage.root
            const pages = subpackage.pages || []
            if(Array.isArray(pages)){
                pages.forEach((page)=>{
                    entryList.push(root + "/" +page)
                })
            }
        })
    }
    /** 遍历找到的页面路径 */
    entryList.forEach((item) => {
        if(pluginReg.test(item)){
            return
        }
        inflateEntries(allPages, entries, dirname, item)
    })
}

function inflateEntries(allPages, entries, dirname, entry = "") {
    // console.log("dirname", dirname);
    if(typeof entry !== "string"){
        console.log("entries", entries, dirname, entry);
        return
    }
    // console.log("entry", entry);
    if(entry.indexOf("/") === 0){
        entry = path.resolve(dirname, "../dist", "."+entry)
    }else{
        entry = path.resolve(dirname, entry)
    }
    // console.log("entry", entry);
    // window 分割符处理
    if(isWin){
        entry = handlePath(entry)
    }
    if (entry !== null && !entries.includes(entry)) {
        entries.push(deleteEntryExt(entry))
        _inflateEntries(allPages, entries, path.dirname(entry), entry)
    }
}
/**
 * 获取小程序项目的全部页面列表
 * @param {*} miniRootPath 
 */
function getAllPage(miniRootPath = ""){
    const allPages = []
    const entries = []
    inflateEntries(allPages, entries, miniRootPath, "app.ts")
    // console.log("allPages", allPages, entries);
    return entries
}
/**
 * 获取小程序页面的入口映射map
 * @param {*} miniRootPath 
 * @returns 
 */
function getWebpackEntryObjByMiniprogramRoot(miniRootPath = ""){
    miniRootPath = handlePath(miniRootPath)
    const entries = getAllPage(miniRootPath)
    const entryMap = {}
    // 判断是js 还是ts
    const isJs = fs.existsSync(path.join(miniRootPath, "./app.js"))
    const extName = isJs ? "js" : "ts"
    // 遍历页面绝对路径列表
    entries.map((entryAbsPath) => {
        // 获取相对路径
        const entryRelativePath = handlePath(entryAbsPath).replace(miniRootPath+"/", "")
        entryMap[entryRelativePath] = `./${entryRelativePath}.${extName}`
    })
    console.log("entryMap", JSON.stringify(entryMap, null, 2));
    return entryMap
}
module.exports.getAllPage = getAllPage
module.exports.getWebpackEntryObjByMiniprogramRoot = getWebpackEntryObjByMiniprogramRoot

// getWebpackEntryObjByMiniprogramRoot(path.join(__dirname, "../src/miniprogram"))