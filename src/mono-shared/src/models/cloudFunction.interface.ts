/********************* 通用 ***********************/
export const enum CloudResponseCode {
    SUCCESS = 200,
    /** 请求缺少必要参数 */
    BAD_REQUEST = 400,
    /** 云函数FAIL */
    API_FAIL = -1,
    /** 云函数调用失败 */
    API_ERROR = -2,
    /** 云函数 返回空值 */
    EMPTY_RESULT = -3,
  }


export interface ICloudResponse<T> {
    msg?: string
    code: CloudResponseCode
    data?: T
    /** 如果需要用到缓存机制，则需要返回版本号 */
    version?: number
}

export interface ICloudCache<T> {
    funcName: string
    data: T
    params: any
    cloudUpdateTime: number
    timeStamp: number
    expireMilliseconds?: number
}

export interface ICloudUpdateTimes {
    [name: string]: number
  }
  

export interface ICloudErrorRes extends ICloudResponse<any> {
    error?: Error
    isSkipReport?: boolean
  }

export interface IExampleRequest {
    requestData: string
}

export interface IExampleResponse {
    responseData: string
}

/** 保存菜单 */

export interface IRichText {
    type: string,
    value: string,
}

export interface ISaveMenuParam {
    title: string,
    richTextList: IRichText[]
}

export interface ISaveMenuRes {
    menuId: string,
    _id: string | number,
}