
/**
 * 将导入的import less文件 修改为import "../ss/ss.wxss"
 * @param {*} source 
 * @returns 
 */
module.exports =  function changeImportLess(source) {

  return source.replace(/@import\s*\((.*?)\)\s+["'](.*?).less['"];/g, (all, $1, $2) => {
    console.log("match all", all);
    return `@import "${$2}.wxss";`
  });;
};