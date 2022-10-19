/// <reference path="../typings/index.d.ts" />

import { wxApp } from "@core/amini/core"
import { CloudCacheService } from "@core/services/cloud-cache.service"
import { RxCloudService } from "@core/services/rx-cloud.service"
import { MonoRxCloudService } from "@mono-shared/services/mono-rx-cloud.service"

@wxApp()
class ShiMieHaoApp implements App.AppInstance  {
  constructor(
    private monoRxCloud: MonoRxCloudService,
    private rxCloud: RxCloudService,
    private cloudCacheService: CloudCacheService,
  ){
    
  }

  onLaunch(options?: App.ILaunchShowOption | undefined): void {
    // 展示本地存储能力
    // 初始化rx云函数api
    this.monoRxCloud.setCloudApi(this.rxCloud)

    // 初始化云环境
    wx.cloud.init()
    // 检查云函数的最新状态
    this.cloudCacheService.getCloudLatestUpdateTimes()
  }

}