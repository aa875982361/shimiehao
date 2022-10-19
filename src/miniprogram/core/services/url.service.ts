import { Injectable } from "@core/amini/core"
import { Observable } from "rxjs"

/** url参数 */
export interface IUrlParam {
  [name: string]: string | number | boolean | undefined,
}

/** url对象 */
export interface IUrlObj {
  origin: string,
  search?: string,
  hash?: string,
}

/**
 * url服务
 *
 * @export
 * @class UrlService
 * @extends {SuperService}
 */
@Injectable()
export class UrlService {
  constructor() { }

  /**
   * 设置参数
   * @param url string 原始链接
   * @param paramObj IUrlParam 链接参数对象
   * @param isEncode? boolean 是否进行编码（仅对传入的paramObj编码）
   * @return string
   * @example
   *  const url = "http://q.c?a=XXX"
   *  setParams(url, { b: "YYY" }) // http://q.c?a=XXX&b=YYY
   *  setParams(url, { a: "ZZZ" }) // http://q.c?a=ZZZ
   *  setParams(url, { a: "ZZZ", b: "YYY" }) // http://q.c?a=ZZZ&b=YYY
   *  setParams(url, { a: "" }) // http://q.c
   *  setParams(url, { a: undefined }) // http://q.c
   *  setParams(url, { a: "", b: "YYY" }) // http://q.c?b=YYY
   *  setParams(url, { cb: "http://baidu.com" }, true) // http://q.c?a=XXX&cb=http%3A%2F%2Fbaidu.com
   */
  public setParams(url: string, paramObj: IUrlParam, isEncode?: boolean): string {
    if (!url || !paramObj) { return url }
    const urlObj = this.str2UrlObj(url)
    let params = this.getParams(url)
    params = Object.assign(params, paramObj) // 排重
    let search = "?"
    Object.keys(params).forEach((key) => {
      if (!params) { return }
      let value = params[key]
      if (this.isEmpty(value)) { return }
      const needEncode = isEncode && paramObj.hasOwnProperty(key)
      value = needEncode ? encodeURIComponent(value || "") : value
      search += `${key}=${value}&`
    })
    if (search.length > 1) {
      search = search.slice(0, -1)
    } else {
      search = ""
    }
    return `${urlObj.origin}${search}${urlObj.hash}`
  }

  /**
   * 获取参数值/参数对象
   * @param url string 原始链接
   * @return string | IUrlParam
   * @example
   *  const url = "http://qjl.cn?a=XXX&b=YYY"
   *  getParams(url) // { a:"XXX", b:"YYY" }
   */
  public getParams(url: string): IUrlParam {
    if (!url || url.indexOf("?") < 0) { return {} }
    let search = this.getSearch(url)
    search = search.slice(1)
    const searchArr = search.split("&")
    const result: IUrlParam = {}
    searchArr.forEach((keyVal: string) => {
      const keyValArr = keyVal.split("=")
      result[keyValArr[0]] = keyValArr[1]
    })
    return result
  }

  /** 字符串转url对象 */
  public str2UrlObj(url: string): IUrlObj {
    return {
      origin: this.getOrigin(url),
      search: this.getSearch(url),
      hash: this.getHash(url),
    }
  }

  /** 获取原始链接 */
  public getOrigin(url: string): string {
    let searchMarkIndex = url.indexOf("?")
    searchMarkIndex = searchMarkIndex < 0 ? url.length : searchMarkIndex
    let hashMarkIndex = url.indexOf("#")
    hashMarkIndex = hashMarkIndex < 0 ? url.length : hashMarkIndex
    const index = Math.min(hashMarkIndex, searchMarkIndex)
    return index < url.length ? url.substring(0, index) : url
  }

  /** 获取请求路径 */
  public getPath(url: string): string {
    const origin = this.getOrigin(url)
    return origin.replace(/https?:\/\/(.*?)\//, "/")
  }

  /** 获取参数字符串 */
  public getSearch(url: string): string {
    const searchMarkIndex = url.indexOf("?")
    if (searchMarkIndex < 0) { return "" }
    let result = url.slice(searchMarkIndex - url.length)
    const hashMarkIndex = result.indexOf("#")
    if (hashMarkIndex > -1) {
      result = result.slice(0, hashMarkIndex)
    }
    return result
  }

  /** 获取hash */
  public getHash(url: string): string {
    const hashMarkIndex = url.indexOf("#")
    if (hashMarkIndex < 0) { return "" }
    return url.slice(hashMarkIndex)
  }

  private isEmpty(val: any): boolean {
    return [undefined, "", NaN].includes(val)
  }
}
