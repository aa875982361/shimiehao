import { Observable, Observer, of, OperatorFunction, throwError } from "rxjs"
import { IMonoCloudOptions } from "@mono-shared/services/mono-rx-cloud.service"
import { catchError } from "rxjs/operators"
import { CloudResponseCode, ICloudErrorRes, ICloudResponse } from "@mono-shared/models/cloudFunction.interface"
import { CloudCacheService } from "@core/services/cloud-cache.service"
import { Injectable } from "@core/amini/core"

/**
 * 云函数 => rxCloud
 *
 * @export
 * @class WxCloudService
 * @extends {SuperService}
 */
@Injectable()
export class RxCloudService {
  constructor(
    private cloudCacheService: CloudCacheService,
  ) { }

  public rxCloud<T>(name: string, data: any, options: IMonoCloudOptions<T>): Observable<ICloudResponse<T>> {
    return Observable.create((observer: Observer<ICloudResponse<T>>) => {
      if (options.useStorageOptions?.isUseCache) {
        const cache = this.cloudCacheService.getValidCache(name, data, options)
        if (cache) {
          observer.next({ code: CloudResponseCode.SUCCESS, data: cache.data })
          observer.complete()
          return
        }
      }
      try {
        wx.cloud.callFunction({
          name,
          data,
          success: (res: ICloud.CallFunctionResult) => {
            const result = res.result as ICloudResponse<T>
            if (!options.cloudErrorReportOptions?.isEmptyNotCheck && !result) {
              observer.error({ code: CloudResponseCode.EMPTY_RESULT, msg: "云函数返回值为空" })
              return
            }
            if (result.code !== CloudResponseCode.SUCCESS) {
              observer.error(result)
              return
            }
            observer.next(result)
            observer.complete()
            if (options.useStorageOptions?.isUseCache) {
              this.cloudCacheService.setCache(name, data, res, options.useStorageOptions)
            }
          },
          fail: (err: IAPIError) => {
            observer.error({
              msg: err.errMsg,
              error: err,
              // code: err.code || CloudResponseCode.API_FAIL,
              // TODO: code?
              code: CloudResponseCode.API_FAIL,
            })
            observer.complete()
          },
        })
      } catch (error) {
        observer.error({
          error,
          code: CloudResponseCode.API_ERROR,
        })
        observer.complete()
      }
    }).pipe(
      this.cloudCatchError(name, data, options),
    )
  }

  private cloudCatchError<T>(
    name: string,
    params: any,
    options: IMonoCloudOptions<T>,
  ): OperatorFunction<ICloudResponse<T>, ICloudResponse<T>> {
    return catchError((err: ICloudErrorRes) => {
      const { code, error } = err
      err.isSkipReport = true
      return options.defaultData ? of({
        code: CloudResponseCode.SUCCESS,
        data: options.defaultData,
      }) : throwError(err)
    })
  }

}
