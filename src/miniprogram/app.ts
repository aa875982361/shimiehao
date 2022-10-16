/// <reference path="../typings/index.d.ts" />
// app.ts
App({
  globalData: {},
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
    // 初始化云环境
    wx.cloud.init()
  },
})