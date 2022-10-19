import { Observable, Observer } from "rxjs"
import { UtilService } from "@core/services/util.service"
import { getInstanceByServiceOrCacheIfNotExist } from "./core"

/** 转换指定的微信api 为 rxjs */

const noConvertApiList = ["getUpdateManager", "nextTick"]
const whiteErrorMsgList = [
  // "navigateToMiniProgram:fail cancel",
  "chooseAddress:fail auth deny",
  "chooseAddress:cancel",
  "showActionSheet:fail cancel",
  "showActionSheet:fail",
  "requestPayment:fail cancel",
  "makePhoneCall:fail cancel",
  "hideLoading:fail:toast can't be found",
  "scanCode:fail cancel",
  "openChannelsLive:fail cancel",
]
/** 映射 wx api 到 rxwx */

type wxType = typeof wx
type wxKeys = keyof Omit<wxType, "cloud" | "env">
type wxApiOptions<T extends wxKeys> = Parameters<wxType[T]>[0]

// eslint-disable-next-line max-len
type wxApiSuccessParams<T extends wxKeys> = wxApiOptions<T> extends {
  success?: (params: infer S) => void,
  fail?: (params: infer F) => void,
  complete?: (params: infer C) => void,
} | undefined ? S : never
// eslint-disable-next-line max-len
export type rxwx = {[x in wxKeys]: (params: wxApiOptions<x>) => Observable<wxApiSuccessParams<x>>} & IRxwxCustomApi

// 判断是不是企业微信
export const isQyWx = !!wx.qy?.login

interface IRxwxCustomApi {
  /** 已经转换 */
  hasInit: boolean
  /** 禁止转换的 wx api */
  noConvert(...keys: Array<keyof wx.Wx>): void
  /** 转换api */
  init(): void
}

const notReportFunctions = new Set([
  "request",
  "getStorageInfo",
])

let utilService: any

const blackWxKeyList = ["lanDebug"]

export const rxwx = {
  hasInit: false,
  noConvert(...keys: Array<keyof wx.Wx>): void {
    keys.forEach((key) => {
      rxwx[key] = wx[key]
      noConvertApiList.push(key)
    })
  },
  init(): void {
    if (this.hasInit) {
      console.error("rxwx 已经初始化")
      return
    }
    this.hasInit = true
    utilService = getInstanceByServiceOrCacheIfNotExist<UtilService>(UtilService)
    // 转换 wx api 到 Observable
    Reflect.ownKeys(wx).forEach((key: any): void => {
      let typeofWxApi: string
      /** 排除微信不能访问的API */
      if(blackWxKeyList.includes(key)){
        // 黑名单的属性不劫持 在单页模式下有些属性有问题
        return
      }
      try {
        typeofWxApi = typeof wx[key]
      } catch (error) {
        return
      }
      switch (typeofWxApi) {
      case "object":
        if(!wx[key]){
          // 有可能拿到的值是 null
          return
        }
        rxwx[key] = Object.assign({}, wx[key])
        break
      case "function":
        // eslint-disable-next-line no-case-declarations
        const noCovert = /.*Sync$/.test(key) ||
          /^(create|on).+/.test(key) ||
          noConvertApiList.indexOf(key) > -1
        if (noCovert)  {
          // rxwx[key] = wx[key]
        } else {
          rxwx[key] = cbFunc2Obs(key)
        }
        break
      default:
        rxwx[key] = wx[key]
      }
    })
  },
} as rxwx

// showToast 的 success 不是 toast 隐藏后触发，而是调用成功后就触发，需要另外修改
rxwx.noConvert("showToast")
rxwx.showToast = function showToast(opt: wx.ShowToastOption): Observable<wx.GeneralCallbackResult> {
  return Observable.create((observer: Observer<wx.GeneralCallbackResult>) => {
    wx.showToast(opt)
    report("showToast", opt)
    setTimeout(() => {
      observer.next({ errMsg: "" })
      observer.complete()
    }, opt.duration || 1500)
  })
}

type obsFunc = (opt: any) => Observable<any>

const report = (key: string, payloads: any, type: "" | "Success" | "Fail" = ""): void => {
  try {
    if (notReportFunctions.has(key)) { return }
    utilService.getApp().getReportEvent().customEventReport({
      functionName: `${key}${type}`,
      methodParams: payloads,
    })
  } catch (e) {}
}

/** callback func 转换为流 */
const cbFunc2Obs = (key: string): obsFunc => {
  return (opt: any): Observable<any> =>
  Observable.create((observer: Observer<any>) => {
    report(key, opt)
    opt.success = (res: any): void => {
      report(key, res, "Success")
      observer.next(res)
      observer.complete()
    }
    opt.fail = (err: any): void => {
      report(key, err, "Fail")
      if (!whiteErrorMsgList.includes(err.errMsg)) {
        observer.error(err)
      }
      observer.complete()
    }
    wx[key].call(wx, opt)
  })
}

