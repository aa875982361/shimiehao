/* eslint-disable max-lines */
import { catchError, map, switchMap } from "rxjs/operators"
import { Observable, of, throwError } from "rxjs"
import { rxwx } from "@core/amini/rxwx"
import { UrlService } from "./url.service"
import { Injectable } from "@core/amini/core"

export const navigateTime: { startTime: number } = { startTime: 0 }

export type FileNameExtensionType = "jpg" | "jpeg" | "gif" | "png" | "unknown" | string

export interface IWxPageRouteInfo {
  isSuc: boolean
  route: string
  params: string
  originOption: any
}

const DEFAULT_MAX_PAGE_STACK = 10

const MAX_PAGE_STACK_MAP = {
 
}

/** 用户屏幕像素 - 实际像素点 */
interface IScreenInfo {
  /** 宽度像素 */
  width: number
  /** 高度像素 */
  height: number
}

export interface IRoutingOption {
  type: TPageTransitionFunction
  url: string
  params: any
}

const NAVIGATE_TO_URL_LOCK_LIST: string[] = [
]

const NAVIGATE_LOCK_TIME = 2000

/** 微信小程序跳转类型 */
export type TPageTransitionFunction = "navigateTo" | "redirectTo" | "switchTab" | "reLaunch"


type UnitType = "万" |  "十万"

/**
 *
 * 小程序相关 业务无关的 工具函数
 * ！！注意：平台无关的工具，放到 mono
 *
 */
@Injectable()
export class UtilService {


  private app?: any

  private screenInfo?: IScreenInfo
  private prevRoutingOption?: IRoutingOption
  private navigateLockTimer?: any
  private isFromSinglePageCache?: boolean

  constructor(
    private urlService: UrlService,
  ) {}

  public getCanShare(): boolean {
    return !!this.getApp().globalData.canShare
  }

  public shareWhenNotBtn(e: WXEvent): void {
    // button[open-type="share"] 的 target == currentTarget, 取了 e.targe; handleShareWhenNotBtn 应统一用 e.currentTarget, 兼容处理
    e.target = e.currentTarget
    const currentPage = this.getPage()
    if (!currentPage) { return }
    (currentPage as any).shareWhenNoBtn(e)
  }

  public getApp(): any {
    if (this.app) { return this.app }
    this.app = getApp() as any
    return this.app
  }

  public getPx(rpx: number = 0): number {
    const systemInfo = this.getSystemInfo()
    const radio = systemInfo.screenWidth / 750
    return radio * rpx
  }


  public getRpx(px: number = 0): number {
    const systemInfo = this.getSystemInfo()
    const radio = systemInfo.screenWidth / 750
    return px / radio
  }

  /** 获取用户屏幕信息 - 像素点 */
  public getScreenInfo(): IScreenInfo {
    if (!this.screenInfo) {
      const systemInfo = this.getApp().globalData.systemInfo
      const { pixelRatio, screenWidth, screenHeight } = systemInfo
      const widthPixel = Math.round(screenWidth * pixelRatio)
      const heightPixel = Math.round(screenHeight * pixelRatio)
      this.screenInfo = {
        width: widthPixel,
        height: heightPixel,
      }
    }
    return this.screenInfo
  }

  public setClipboardData(data: string = ""): void {
    wx.setClipboardData({
      data,
      success: () => {
        wx.showToast({ icon: "none", title: "复制成功" })
      },
    })
  }

  /** 获取当前的页面栈 */
  /** 获取当前的页面栈 注意undefined情况 */
  public getPage(): Page.PageInstance | undefined {
    const pages = getCurrentPages()
    const last = pages.length - 1
    return pages[last]
  }

  public getPageFullPath(): string {
    const page = this.getPage()
    if (!page) { return "" }
    const { route = "", options = {} } = page
    if (!route) { return "" }
    return route + "?" + this.queryString(options)
  }

  /** 获取前一页的页面栈 注意undefined情况 */
  public getPrevPage(): Page.PageInstance | undefined {
    const pages = getCurrentPages()
    const last = pages.length - 2
    return last >= 0 ? pages[last] : undefined
  }

  /**
   * 从全局对象中获取缓存数据，获取后删除
   * @param { string} key
   * @param {boolean} [keep=false] 是否保留缓存数据
   */
  public getGlobalData(key: string, keep: boolean = true): any {
    const app = this.getApp()
    const ret = app.globalData[key]
    if (!keep) {
      delete app.globalData[key]
    }
    return ret
  }

  /**
   * 缓存数据到全局对象，同名冲突时error提示
   * @returns {boolean} 是否正常设值（没有覆盖同名属性）
   */
  public setGlobalData(key: string, value: any, hideTips: boolean = false): boolean {
    const app = this.getApp()
    const noOverride = app.globalData[key] === undefined
    if (!hideTips) { console.log("覆盖了同名的全局缓存数据:" + key, "如果确认无影响，第三个参数传 true") }
    app.globalData[key] = value
    return noOverride
  }

  /**
   * 统一方法获取Uid
   * @returns {number} 是否正常设值（没有覆盖同名属性）
   */
  public getUid(): number {
    return wx.getStorageSync("plus_uid")
  }

  /**
   * 统一方法获取Uid
   * @returns {string} 是否正常设值（没有覆盖同名属性）
   */
  public getToken(): string {
    return wx.getStorageSync("token")
  }

  /**
   * 统一方法判断是否为iOS系统
   * @returns {boolean} 是否为iOS系统
   */
  public isIOS(): boolean {
    const app = this.getApp()
    return app.globalData.system === "ios"
  }

  /** 是否根据背景色判断是否启用深色文字 */
  public checkDarkTextMode(rgb: number[]): boolean {
    return rgb[0] * 0.299 + rgb[1] * 0.578 + rgb[2] * 0.114 >= 210
  }

  /**
   * 根据 type 跳转页面
   * @param {TPageTransitionFunction} type 4种类型
   * @param {string} url 地址
   * @param {IParams} params 参数 对象格式
   */
  public goTo(type: TPageTransitionFunction, url: string, params?: any): Promise<any> {
    return this.makePageTransitionFunction(type, url, params)
  }

  /**
   * 传参格式使用navigateTo
   * @param {string} url 地址
   * @param {IParams} params 参数 对象格式
   */
  public navigateTo(url: string, params?: any): Promise<any> {
    return this.makePageTransitionFunction("navigateTo", url, params)
  }

  /**
   * 传参格式使用 redirectTo
   * @param {string} url 地址
   * @param {IParams} params 参数 对象格式
   */
  public redirectTo(url: string, params?: any): Promise<any> {
    return this.makePageTransitionFunction("redirectTo", url, params)
  }

  public getLocalStorage(key: string): any {
    return wx.getStorageSync(key)
  }

  public setLocalStorage(key: string, value: any): any {
    wx.setStorage({ key, data: value })
  }

  public removeStorage(key: string): void {
    wx.removeStorage({ key })
  }

  /**
   * 传参格式使用 switchTab
   * @param {string} url 地址
   * @param {IParams} params 参数 对象格式
   */
  public switchTab(url: string, params?: any): Promise<any> {
    return this.makePageTransitionFunction("switchTab", url, params)
  }

  /**
   * 传参格式使用 reLaunch
   * @param {string} url 地址
   * @param {IParams} params 参数 对象格式
   */
  public reLaunch(url: string, params?: any): Promise<any> {
    return this.makePageTransitionFunction("reLaunch", url, params)
  }

  /**
   * 后退
   *
   * @param {number} [delta=1]
   * @returns {Promise<any>}
   */
  public navigateBack(delta: number = 1): Promise<any> {
    return new Promise((resolve, reject): void => {
      wx.navigateBack({ delta, success: resolve, fail: reject })
    })
  }

  public showSuccessMessage(message: string): void {
    wx.showToast({
      title: message,
      icon: "success",
      duration: 2000,
    })
  }

  /**
   * 删除数组中的指定的项 全等
   * @param array 目标数组
   * @param deleteItem 要删除的值
   * @param props 属性名，可选，存在时，判断是否为对象数组，若是，取对象数组中 item[props] === deleteItem 的itemIndex，否则返回false
   */
  public deleteElementInArray<T>(array: T[], deleteItem: any, props?: string): void {
    const index = array.findIndex((item: T) => {
      if (!props) {
        return item === deleteItem
      } else {
        if (item && typeof item === "object") {
          return item[props] === deleteItem
        } else {
          return false
        }
      }
    })
    if (index < 0) { return }
    array.splice(index, 1)
  }

  /**
   * 是否在目标版本号之上
   * 根据 https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html 微调
   *
   * @param {string} targetVersion 目标版本号
   * @returns {boolean}
   * @memberof UtilService
   */
  public compareVersion(targetVersion: string): boolean {
    const targetVersionArr = targetVersion.split(".")
    const systemInfo = this.getSystemInfo()
    if (!systemInfo) { return true }
    const currentVersion = systemInfo.SDKVersion
    if (!currentVersion) { return true }
    const currentVersionArr = currentVersion.split(".")
    const len = Math.max(targetVersionArr.length, currentVersionArr.length)

    while (targetVersionArr.length < len) {
      targetVersionArr.push("0")
    }
    while (currentVersionArr.length < len) {
      currentVersionArr.push("0")
    }

    /** 比较每一位版本号 */
    for (let i = 0; i < len; i++) {
      const num1 = parseInt(targetVersionArr[i], 10)
      const num2 = parseInt(currentVersionArr[i], 10)

      if (num1 > num2) {
        return false
      } else if (num1 < num2) {
        return true
      }
    }

    return true
  }

  /**
   * 获取字符串实际长度
   * @param str 传入的字符串
   * @param fontSize 汉字字体大小
   * @param otherFontSize 除汉字和数字1外其他字符的fontSize，默认为汉字大小的一半
   * @param digitalOneSize 数字1的fontSize，默认为汉字大小的1/4
   */
  public getStringLength(
    str: string, fontSize: number, otherFontSize: number = 0, digitalOneSize: number = 0,
  ): number {
    const strLength = str.length
    // 找出汉字的数量
    const chinese = str.match(/[\u4E00-\u9FA5]+/g) || []
    const chineseNum = chinese.join("").length
    // 找出数字1的数量，因为1的宽度和其他数字不一样
    const digitalOne = str.match(/1+/g) || []
    const digitalOneNum = digitalOne.join("").length
    /** 汉字长度 */
    const chineseLength = chineseNum * fontSize
    /** 数字1长度 */
    const digitalOneLength = digitalOneNum * (digitalOneSize || (fontSize / 4))
    /** 其他字符长度 */
    const otherLength = (strLength - chineseNum - digitalOneNum) * (otherFontSize || (fontSize / 2))
    return (chineseLength + digitalOneLength + otherLength)
  }

  public isWxImg(imgUrl: string): boolean {
    return imgUrl ? imgUrl.indexOf("://") !== -1 : false
  }

  /**
   * 更改数组中的对象
   * @param array 目标数组
   * @param replaceItem 被替换的值
   * @param substitute 替换 or 添加的值
   * @param operateType 操作类型
   */
  public operateElementInArray<T>(
    array: T[],
    replacedItem: T,
    substitute: T,
    operateType: "replace" | "isPlusFront" | "isPlusAfter",
  ): void {
    const index = array.findIndex((item) => {
      return item === replacedItem
    })
    if (index < 0) { return }
    if (operateType === "replace") {
      array.splice(index, 1, substitute)
    } else if (operateType === "isPlusFront") {
      array.splice(index - array.length, 0, substitute)
    } else if (operateType === "isPlusAfter") {
      const originIndex = index - array.length + 1
      const startIndex = originIndex === 0 ? array.length : originIndex
      array.splice(startIndex, 0, substitute)
    } else {}
  }

  /**
   * 延迟上报，防止阻塞主流程
   *
   * @param {string} error
   * @memberof UtilService
   */
  public delayReportError(error: string): void {
    setTimeout(() => {
      throw new Error(error)
    }, 0)
  }

  public fixSpritBeforeHttp(url: string): string {
    return url.replace(/^[^h]{1,}http/, "http")
  }
  /** 去掉多斜杠 */
  public fixPath(url: string): string {
    return url.replace(/\/{2,}/g, "/")
  }

  public checkMediaType(url: string, type: string): any {
    const typeRegEx = {} as {
      isSVG: RegExp,
      isGIF: RegExp,
      isPNG: RegExp,
    }
    typeRegEx.isSVG = /\.svg/i
    typeRegEx.isGIF = /\.gif/i
    typeRegEx.isPNG = /\.png/i
    return typeRegEx["is" + type.toLocaleUpperCase()].test(url)
  }

  /** 首字母大写 */
  public upperFirstLetter(str: string): string {
    if (!str) { return "" }
    return str.replace(/( |^)[a-z]/, (char: any) => char.toUpperCase())
  }

  /** 拼接url参数 */
  public setUrlParams(url: string, params: object): string {
    if (!params) { return url }
    const paramsStr = this.queryString(params)
    let resultUrl = url
    if (resultUrl.includes("?")) {
      resultUrl += `&${paramsStr}`
    } else {
      resultUrl += `?${paramsStr}`
    }
    return resultUrl
  }
  /** 拼接data */
  public queryString(params: object, isKeepEmptyString: boolean = false): string {
    const arr = []
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        const nullStrArr = isKeepEmptyString ? [null, undefined] : [null, undefined, ""]
        if (!nullStrArr.includes(value)) {
          arr.push(`${key}=${value}`)
        }
      }
    }
    return arr.join("&")
  }

  /** 部分安卓手机调用 chooseImage API 后（原图+编辑），得到的图片后缀是 unknown，手动存一个 jpg 格式的 */
  public fixImageWithUnknownExtension(tempFilePath: string = ""): string {
    const extension = this.getFilenameExtension(tempFilePath)
    if (extension && extension !== "unknown") { return tempFilePath }
    const randomPath = `/temp${new Date().getTime()}`
    const fs = wx.getFileSystemManager()
    const newPath = `${(wx as any).env.USER_DATA_PATH}${randomPath}.jpg`
    return fs.saveFileSync(tempFilePath, newPath)
  }

  /** 获取文件后缀名 */
  public getFilenameExtension(file: string = ""): FileNameExtensionType {
    const dotIndex = file.lastIndexOf(".")
    return dotIndex === -1 ? "" : file.slice(dotIndex + 1).toLowerCase()
  }

  public parseOptionsValue2Boolean(value?: string): boolean {
    return value && value === "true" || value === "1"
  }

  public getSystemInfo(): wx.SystemInfo {
    const app = this.getApp()
    let systemInfo = app.globalData.systemInfo
    if (!systemInfo) { systemInfo = wx.getSystemInfoSync() }
    return systemInfo
  }

  /** 判断是否能使用 wx.cloud.CDN，目前最低是 2.12.0 */
  public canIUseWXCloudCDN(): boolean {
    return this.compareVersion("2.12.0")
  }

  public getCurrentPageRouteInfo(): IWxPageRouteInfo {
    const pages = getCurrentPages()    // 获取加载的页面
    const routeInfo: IWxPageRouteInfo = {
      isSuc: false,
      route: "",
      params: "",
      originOption: undefined,
    }
    if (!pages) { return routeInfo}
    const currentPage = pages[pages.length - 1]    // 获取当前页面的对象
    const url = currentPage && currentPage.route || ""
    if (!url) { return routeInfo }
    routeInfo.route = url
    const options = currentPage.options   // 如果要获取url中所带的参数可以查看options
    routeInfo.originOption = options
    const queryString = this.queryString(options, true)
    routeInfo.params = queryString
    routeInfo.isSuc = true
    return routeInfo
  }

  public generateInstanceId(): string {
    return String(Math.round(Math.random() * 100000))
  }

  /** 获取对象字符串用于路径参数 */
  public encryptObjectStrForPath(obj?: object): string {
    if (typeof obj !== "object") { return "" }
    try {
      return encodeURIComponent(JSON.stringify(obj))
    } catch (error) {
      return ""
    }
  }

  /** 解密为原有对象 */
  public parseObjectStrForPath<T extends object>(str: string): T | undefined {
    if (!str) { return }
    try {
      return JSON.parse(decodeURIComponent(str))
    } catch (error) {
      return
    }
  }

  /**
   * 1. 仅传入value时候，是进行toFixed字符串转换
   * 2. 需要进行中文单位转换时候，需要传入unit，这时候如果没传conversionLowerLimit，则conversionLowerLimit设置为unitObj对应的数字
   * @param value 需要转换的值
   * @param digitNum 小数点后保留几位
   * @param unit 需要转换的单位
   * @param conversionLowerLimit 数额达到多少才进行中文单位转换
   * @returns {string} 转换后展示文本
   */
  public numericConversionUnit(
    value: number, digitNum: number=2, unit?: UnitType, conversionLowerLimit?: number,
    ): string {
    type IUnitObjType = Record<UnitType, number>
    const unitObj: IUnitObjType = {
      "万": 10000,
      "十万": 100000,
    }
    if (!unit) {
      // 没传单位或者传错单位，转成字符串返回
      return value.toFixed(digitNum)
    }
    conversionLowerLimit = conversionLowerLimit === undefined ? unitObj[unit] : conversionLowerLimit
    if (value < conversionLowerLimit) {
      return value.toFixed(digitNum)
    } else {
      const num = (value / unitObj[unit]).toFixed(digitNum)
      return `${num}${unit}`
    }
  }

  /** 判断数组A是否包含数组B */
  public checkArrayIsContained(listA: any[], listB: any[]): boolean {
    if (!listA || !listB || !listA.length || !listB.length || listA.length < listB.length) { return false }
    return listB.every((item) => listA.includes(item))
  }

  /** 转换省市区为地址详情字符串 */
  private compactAddrFragsToFullAddrStr(
    province: string = "",
    city: string = "",
    district: string = "",
    detail: string = "",
  ): string {
    let addressInfo = province === city ? city : `${province}${city}`
    addressInfo += district.replace(city, "")
    addressInfo += detail.replace(district, "")
    return addressInfo
  }

  /**
   * 统一使用Promise封装 4种微信的跳转
   * @param {TPageTransitionFunction} type 4种类型
   * @param {string} url 地址
   * @param {IParams} params 参数 对象格式
   */
  private makePageTransitionFunction(
    type: TPageTransitionFunction,
    url: string,
    params: any,
  ): Promise<any> {
    return rxwx[`${type}`]({
      url,
      fail: (error: any) => {
        throw error
      },
    }).toPromise()
  }

  /** 检查是否爆栈 */
  private checkIsPageStackOverflow(type: TPageTransitionFunction, url: string): boolean {
    if (type !== "navigateTo") { return false }
    const currentPageStackSize = getCurrentPages()?.length
    return currentPageStackSize >= (MAX_PAGE_STACK_MAP[url] || DEFAULT_MAX_PAGE_STACK)
  }

  /** 一定时间后清除 prevRoutingOption */
  private clearPrevRoutingOptionAfterLockTime(): void {
    if (this.navigateLockTimer) {
      clearTimeout(this.navigateLockTimer)
    }
    this.navigateLockTimer = setTimeout(() => {
      this.prevRoutingOption = undefined
      this.navigateLockTimer = undefined
    }, NAVIGATE_LOCK_TIME)
  }
}
