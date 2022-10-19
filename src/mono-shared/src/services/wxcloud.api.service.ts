/** 小程序云函数服务模板，用于根据 云函数服务端代码 生成客户端调用函数 */
import { MonoRxCloudService, IMonoCloudOptions } from "./mono-rx-cloud.service"
import { Injectable } from "@core/amini/core"
import { Observable } from "rxjs"
import { ICloudResponse, IExampleRequest, IExampleResponse } from "../models/cloudFunction.interface"

@Injectable()
export class WxCloudApiService {
  constructor(
    protected rxCloudService: MonoRxCloudService,
  ) {}

  public example(data: IExampleRequest, options?: IMonoCloudOptions<IExampleResponse>): Observable<ICloudResponse<IExampleResponse>> {
    return this.rxCloudService.rxCloud("example", data, options)
  }

}
