import { readFile, readdirSync, readFileSync, ensureFileSync, writeFileSync, remove, stat } from "fs-extra"
import { Observable, Observer, throwError } from "rxjs"
import { map, tap } from "rxjs/operators"
export { wxCloudApiService }
/** TODO: 探索正则外的方法，如tsc, AST, 支持更多语句
 * 1. 多个函数export
 * 2. 文件内类型 如 index.ts 中的 interface
*/

const PRJ_ROOT_DIR = `${__dirname}/..`
const MONO_DIR = `${PRJ_ROOT_DIR}/src/mono-shared/src`
const MINI_DIR = `${PRJ_ROOT_DIR}/src/miniprogram`
const CLOUD_ROOT_DIR = `${PRJ_ROOT_DIR}/src/cloudFunctionProject`
const CLOUD_DIST_DIR = `${CLOUD_ROOT_DIR}/cloudfunctions`
const CLOUD_TEMPLATE_PATH = `${CLOUD_ROOT_DIR}/wxcloud.api.service.ts.template`
const OUTPUT_PATH = `${MONO_DIR}/services/wxcloud.api.service.ts`
// ChenDi TODO: 黑白名单改用 代码所在位置的内容 或 统一配置文件 配置
const cloudDistBlackList: string[] = []

/** build */
const wxCloudApiService = (): Observable<string> => {
  /** 读取template, 不存在则报错 */
  const cloudServiceTemplate = readFileSync(CLOUD_TEMPLATE_PATH)
  /** 读取云函数打包结果目录 cloudDistDir, 不存在则报错 */
  return getCloudDistContents().pipe(
    map((distContentsMap) => {
      const functionInfoArr: IServiceFunctionInfo[] = []
      let idx = 0
      for (const key in distContentsMap) {
        if (distContentsMap.hasOwnProperty(key)) {
          functionInfoArr[idx] = makeServiceFunctionInfo(distContentsMap[key], key)
          idx++
        }
      }
      // console.log("functionInfoArr", functionInfoArr)
      if (!functionInfoArr?.length)  { throwError("未能获取到云函数类型信息") }
      const importObj: { [dir: string]: string[] } = {}
      functionInfoArr
        .forEach(({ importDirList, importElementsList }) => {
          for (let i = 0; i < importElementsList.length; i++) {
            const importDir = importDirList[i]
            const importElements = importElementsList[i]
            const dir = importDir.trim().replace("@mono-shared", "..")
            const elements = importElements.split(",")
              .filter((el) => !!el).map((el) => el.trim())
            importObj[dir] = uniqueArray((importObj[dir] || []).concat(elements))
          }
        })
      let allImportStatements = ""
      for (const dir in importObj) {
        if (importObj.hasOwnProperty(dir)) {
          const elements = importObj[dir]
          allImportStatements += `import { ${elements.join(", ")} } from ${dir}\n`
        }
      }
      const methods = functionInfoArr
        .map(({ name, paramsType, resultType }) => {
          const defaultType = (resultType.match(/ICloudResponse<(.*?)>/) || [])[1] || resultType
          // eslint-disable-next-line max-len
          return `
  public ${name}(data: ${paramsType}, options?: IMonoCloudOptions<${defaultType}>): Observable<${resultType}> {
    return this.rxCloudService.rxCloud("${name}", data, options)
  }`
        })
        .join("\n")
      // console.log("get methods result", allImportStatements)
      return { allImportStatements, methods }
    }),
    map(({ allImportStatements, methods }) => cloudServiceTemplate.toString()
        .replace("/** @slot importStatements */", allImportStatements)
        .replace("/** @slot methods */", methods),
    ),
    tap((serviceContent) => {
      // console.log("serviceContent", serviceContent)
      ensureFileSync(OUTPUT_PATH)
      writeFileSync(OUTPUT_PATH, serviceContent)
    }),
  )
}
/** build end */

function getCloudDistDir(): Observable<string[]> {
  return new Observable((observer: Observer<string[]>) => {
    const paths = readdirSync(CLOUD_DIST_DIR)
      .filter((dirName: string) => !cloudDistBlackList.includes(dirName))
    const dirPaths: string[] = []
    let resolvedItems = 0
    paths.forEach((path: string) => {
      stat(`${CLOUD_DIST_DIR}/${path}`)
        .then((fileInfo: { isDirectory: () => any }) => {
          if (fileInfo.isDirectory()) {
            dirPaths.push(path)
          }
        })
        .catch((err: any) => {
          observer.error(err)
        })
        .finally(() => {
          resolvedItems++
          if (resolvedItems === paths.length) {
            if (!dirPaths?.length)  { observer.error("未能获取到需要处理的云函数目录") }
            // console.log("getCloudDistDir result " + paths.length, paths, dirPaths)
            observer.next(dirPaths)
            observer.complete()
          }
        })
    })
  })
}

/** 获取 cloudDistDir 下的有效函数的 index.d.ts */
function getCloudDistContents(): Observable<AnyObject> {
  return new Observable((observer: Observer<AnyObject>): void => {
    getCloudDistDir().subscribe((cloudDistDirs) => {
      const distContentsResult: AnyObject = {}
      let resolvedItems = 0
      // console.log("getCloudDistContents start", cloudDistDirs)
      cloudDistDirs.forEach((distChildDir) => {
        const dTsPath = `${CLOUD_DIST_DIR}/${distChildDir}/index.d.ts`
        readFile(dTsPath)
          .then((cloudDefTsContent: { toString: () => any }) => {
            distContentsResult[distChildDir] = cloudDefTsContent.toString()
            // console.log("remove distChildDir" + distChildDir, cloudDistDirs.length, resolvedItems + 1)
            return remove(dTsPath)
          })
          .catch((err: any) => {
            observer.error(err)
          })
          .finally(() => {
            // console.log("resolved distChildDir", cloudDistDirs.length, resolvedItems + 1)
            resolvedItems++
            if (resolvedItems === cloudDistDirs.length) {
              // console.log("getCloudDistContents result", Object.keys(distContentsResult))
              if (!Object.keys(distContentsResult)?.length)  { observer.error("未能获取到需要处理的云函数.d.ts文件") }
              observer.next(distContentsResult)
              observer.complete()
            }
          })
      })
    })
  })
}

interface IServiceFunctionInfo {
  importElementsList: string[]
  importDirList: string[]
  name: string
  paramsType: string
  resultType: string
}

/** 匹配出所有单行 import 语句，只支持 import { a,b,c } from path, 不支持 import * as 等 */
const importStatementReg = /import.*".*"/g
/** 匹配出 a,b,c 和 path */
const importStatementsFragsReg = /import {(.+)}.*(".*")/
/** 云函数必须 export { main }, 处理 main 就满足需求 */
const typesReg = /const main: \(.*: (.*)\) => ([^;]+)/

function makeServiceFunctionInfo(distContent: string, name: string): IServiceFunctionInfo {
  const importStatements = distContent.match(importStatementReg)
  const importElementsList: string[] = []
  const importDirList: string[] = []
  importStatements?.forEach((statementElement) => {
    const [, importElements, importDir] = statementElement.match(importStatementsFragsReg) || []
    // console.log("contentFragments", statementElement.match(importStatementsFragsReg))
    // console.log("importElements", importElements)
    // console.log("statementElement", statementElement)
    importElementsList.push(importElements)
    importDirList.push(importDir)
  })
  const [, paramsType = "any", resultType = "any"] = distContent.match(typesReg) || []
  return {
    importElementsList,
    importDirList,
    name,
    paramsType,
    resultType: resultType.indexOf("Promise<") !== -1 ?
      resultType.replace("Promise<", "").replace(">", "") : resultType,
  }
}

function uniqueArray<T>(array: T[], uniqueKey?: keyof T): T[] {
  const set = new Set()
  const newArray: T[] = []
  array.forEach((item) => {
    const key = uniqueKey ? item[uniqueKey] : typeof item + JSON.stringify(item)
    if (set.has(key)) { return }
    set.add(key)
    newArray.push(item)
  })
  return newArray
}
