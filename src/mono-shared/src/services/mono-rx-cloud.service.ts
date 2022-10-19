import { Injectable } from "@core/amini/core"
import { Observable } from "rxjs"
import { ICloudResponse } from "../models/cloudFunction.interface"

export interface IMonoRxCloudService {
  rxCloud<T = any>(name: string, data: any, options: IMonoCloudOptions<T>): Observable<ICloudResponse<T>>
}

export interface IMonoCloudOptions<T> {
  /** 缓存相关 Options */
  useStorageOptions?: ICloudUseStorageOptions
  /** 报错配置 Options */
  cloudErrorReportOptions?: ICloudErrorReportOptions
  /** 默认值[云函数调用失败或返回空时会读取] */
  defaultData?: T
  /** 如果PC不需要openId 传true 默认需要openId*/
  isPcWithoutOpenId?: boolean
}

/** 缓存功能配置项，如需使用缓存功能可以直接配置 storageKey */
export interface ICloudUseStorageOptions {
  isUseCache?: boolean
  /** 过期时间毫秒数，不填则不过期 */
  expireMilliseconds?: number,
}

/** 报错配置项，默认均为false */
export interface ICloudErrorReportOptions {
  /** 若不需要判空则填true，默认会处理判空 */
  isEmptyNotCheck?: boolean
  /** 是否需要将所有错误上报 */
  isNeedReportAllError?: boolean
  /** 是否只需要空值错误上报 */
  isOnlyReportEmptyError?: boolean
}

export interface IResultFromStorage<T> {
  data: T
  timeStamp: number
  version: number
}

/**
 * 描述你的服务
 *
 * @export
 * @class MonoRxCloudService
 * @extends {SuperService}
 */
@Injectable()
export class MonoRxCloudService {
  private cloudApi?: IMonoRxCloudService
  constructor(
  ) { }

  /** 初始化云函数的调用api */
  public setCloudApi(cloudApi: IMonoRxCloudService): void {
    this.cloudApi = cloudApi
  }

  public rxCloud<T>(name: string, data: any, options: IMonoCloudOptions<T> = {}): Observable<ICloudResponse<T>> {
    if (!this.cloudApi) { throw new Error("MonoRxCloudService 没有初始化 setCloudApi") }
    return this.cloudApi.rxCloud(name, data, options)
  }
}
