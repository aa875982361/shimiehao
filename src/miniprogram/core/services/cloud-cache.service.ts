import { UtilService } from "@core/services/util.service"
import { rxwx } from "@core/amini/rxwx"
import { CloudResponseCode, ICloudCache, ICloudResponse } from "@mono-shared/models/cloudFunction.interface"
import { ICloudUseStorageOptions, IMonoCloudOptions } from "@mono-shared/services/mono-rx-cloud.service"
import { Injectable } from "@core/amini/core"
const { md5 } = require("../vendor/md5")

type LatestUpdateTimesType = {
  [name in string]: number
}

@Injectable()
export class CloudCacheService {

  public paramsMap = {}
  public cacheMap: { [key: string]: ICloudCache<any> | undefined } = {}
  public latestUpdateTimes: LatestUpdateTimesType = {}

  constructor(
    private utilService: UtilService,
  ) {}

  // eslint-disable-next-line sonarjs/cognitive-complexity
  public getCloudLatestUpdateTimes(): void {
    try {
      wx.cloud.callFunction({
        name: "getLatestUpdateTimes",
        success: (res: ICloud.CallFunctionResult) => {
          const latestUpdateTimes = (res.result as any)?.data
          if (!latestUpdateTimes) { return }
          this.latestUpdateTimes = latestUpdateTimes
          rxwx.getStorageInfo({}).subscribe((storageInfo) => {
            storageInfo.keys.forEach((key) => {
              if (!key.startsWith("cloud:")) { return }
              const cache: ICloudCache<any> = this.utilService.getLocalStorage(key)
              if (this.checkNeedRemove(cache, latestUpdateTimes)) { return this.removeCache(key) }
              if (!this.checkNeedRefresh(cache, latestUpdateTimes)) { return }
              this.refreshCache(cache)
            })
          })
        },
        fail: (err: any) => {
          // 上报
          throw err
        },
      })
    } catch (e) {}
  }

  public getValidCache(name: string, data: any, options: IMonoCloudOptions<any>): ICloudCache<any> | undefined {
    const storageKey = this.getStorageKey(name, data)
    if (!storageKey) { return }
    let cache: ICloudCache<any> | undefined =
      this.cacheMap[storageKey] || this.utilService.getLocalStorage(storageKey)
    if (!cache) { return }
    const currentTimeStamp = new Date().getTime()
    const { timeStamp, cloudUpdateTime } = cache
    if (!cloudUpdateTime) { return }
    const expireMilliseconds = options.useStorageOptions?.expireMilliseconds
    const isExpired = expireMilliseconds !== undefined && timeStamp + expireMilliseconds > currentTimeStamp
    if (isExpired) { cache = undefined }
    if (!this.cacheMap[storageKey]) { this.cacheMap[storageKey] = cache }
    return cache
  }

  public setCache(
    funcName: string,
    params: any,
    res: ICloud.CallFunctionResult,
    cacheOptions: Pick<ICloudUseStorageOptions, "expireMilliseconds">,
  ): void {
    const result = res.result as ICloudResponse<any>
    if (!result || result.code !== CloudResponseCode.SUCCESS || !this.latestUpdateTimes[funcName]) { return }
    const cache: ICloudCache<any> = {
      funcName,
      params,
      data: result.data,
      cloudUpdateTime: this.latestUpdateTimes[funcName],
      timeStamp: new Date().getTime(),
      expireMilliseconds: cacheOptions.expireMilliseconds,
    }
    const key = this.getStorageKey(funcName, params)
    if (!key) { return }
    this.cacheMap[key] = cache
    this.utilService.setLocalStorage(key, cache)
  }

  private getStorageKey(funcName: string, params: any): string {
    try {
      const md5edParams = md5(JSON.stringify(params))
      return `cloud:${funcName}:${md5edParams}`
    } catch (e) { return "" }
  }

  private checkNeedRefresh(cache: ICloudCache<any>, latestUpdateTimes: LatestUpdateTimesType): boolean {
    const latestUpdateTime = latestUpdateTimes[cache.funcName]
    const { cloudUpdateTime, expireMilliseconds, timeStamp } = cache
    const currentTimeStamp = new Date().getTime()
    return cloudUpdateTime !== latestUpdateTime
      || (expireMilliseconds !== undefined && timeStamp + expireMilliseconds > currentTimeStamp)
  }

  private checkNeedRemove(cache: ICloudCache<any>, latestUpdateTimes: LatestUpdateTimesType): boolean {
    return !latestUpdateTimes[cache.funcName]
  }

  private removeCache(key: string): void {
    this.utilService.removeStorage(key)
  }

  private refreshCache(cache: ICloudCache<any>): void {
    // App.OnLaunch 的时候刷新缓存，expireMilliseconds 取目前缓存中的值
    const { funcName, params, expireMilliseconds } = cache
    wx.cloud.callFunction({
      name: funcName,
      data: params,
      success: (res: ICloud.CallFunctionResult) => {
        this.setCache(funcName, params, res, {
          expireMilliseconds,
        })
      },
      fail: (err: any) => {
        throw err
      },
    })
  }


}
