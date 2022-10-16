/* eslint-disable max-lines */
import { SuperSetData } from "./SuperSetData"

declare const global : any

/** 页面状态 */
export const enum PAGE_STATUS {
  /** 加载中，显示加载动画 */
  LOADING = "LOADING",
  /** 加载成功，显示正常页面 */
  SUCCESS = "SUCCESS",
  /** 加载失败，显示失败重试页面 */
  FAIL = "FAIL",
}

const ignoreSceneCodeArr = [
  /** 微信爬虫 */
  1129,
  /** 浮窗进入 */
  1131,
]

export interface IBasePageData {
  /** 图片资源路径 */
  resHost: string,  /** 上传图片路径 */
  uploadHost: string,
  /** navbar 高度 */
  navHeight: number
  /** 状态栏高度 */
  statusBarHeight: number
  /** 是否 iphonex */
  isIPhoneX: boolean
  /** 是否 ipad */
  isIPad: boolean,
  /** 系统 */
  system: "ios" | "android"
  /** 小程序名称 */
  appName: string
  /** 页面的状态 */
  pageStatus: PAGE_STATUS
  /** 页面状态码 （就是后端返回的httpCode） */
  pageStatusCode: number
  /** 自定义错误样式 */
  customFailPage: boolean
  /** 加载失败的提示语 */
  failMessage: string
  /** 是否显示 dataList 加载时 底部动画 */
  isDataListLoading: boolean
  /** 错误提示 */
  errorTips: string
  /** 错误页隐藏标题栏 */
  pageWrapperHideNavbar: boolean
}

interface MiniShareObj {
  sharePath: string,
  originPath?: string,
  originImg?: string,
  originTitle?: string,
}

/**
 * Page 基类
 */
export class SuperPage<T extends IAnyObject> extends SuperSetData<T | IBasePageData, T & IBasePageData> implements Page.PageInstance {

  // 微信page中的API 输入选择器 获取对应的组件实例（第一个）
  public selectComponent!: (selector: string) => any

  // 微信page中的API 输入选择器 获取对应的组件实例数组
  public selectAllComponents!: (selector: string) => any[]

  /** 用于判断页面是否隐藏 */
  public isHideInSuperPage: boolean = false
  /** 页面路径 */
  public url: string = ""
  /** 页面路径 */
  public route!: string
  /** 页面参数 */
  public options!: any
  /** 自定义的页面参数 */
  public customOptions!: any
  /** 页面实例唯一id */
  public instanceId!: string
  /** 页面构造函数名 */
  public constructorName!: string
  public onlyKey?: string

  /** 热点请求参数 */
  public sceneFlow?: string
  /**
   * 创建并返回一个 IntersectionObserver（交叉点观察者） 对象实例。
   * 在自定义组件或包含自定义组件的页面中，使用 this.createIntersectionObserver([options])
   * 需指定component，使用 wx.createIntersectionObserver(Object component, Object options)
   */
  public createIntersectionObserver!: (options?: wx.CreateIntersectionObserverOption) => wx.IntersectionObserver


  protected animate!: any

  constructor() {
    super()
  }

  // eslint-disable-next-line max-lines-per-function
  public onLoad(opt?: any): void {
  }

  public onReady(): void {}

  // eslint-disable-next-line sonarjs/cognitive-complexity,max-lines-per-function
  public onShow(): void {
  }

  public onHide(): void {
  }

  public onUnload(): void {
  }

}
