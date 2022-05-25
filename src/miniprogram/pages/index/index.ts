// index.ts

import { STORAGE_KEY } from "../../global"

// 获取应用实例
const app = getApp<IAppOption>()


Page({
  data: {
    motto: '',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    canIUseGetUserProfile: false,
    canIUseOpenData: false && wx.canIUse('open-data.type.userAvatarUrl') && wx.canIUse('open-data.type.userNickName'), // 如需尝试获取用户信息可改为false
    canSelectList: [] as string[], // 可选列表
    selectIndex: -1, // 选中的index
  },
  // 帮我选一个按钮
  handleSelect(){
    const {canSelectList = []} = this.data
    const length = canSelectList.length
    const randomIndex = (Math.random() * length) >> 0
    const randomTime = 500 + (Math.random() * 2000) >> 0
    this.setData({
      selectIndex: -1,
    })
    wx.showLoading({
      title: "容我掐指一算"
    })
    setTimeout(() => {
      wx.hideLoading()
      
      wx.showModal({
        content: `大吉大利，今天吃${canSelectList[randomIndex]}`,
        confirmText: "就它了",
        cancelText: "下次",
        success: () => {
          // 记录当天的选择
          this.recordSelectResult(canSelectList[randomIndex])
          this.setData({
            selectIndex: randomIndex
          })
        }
      })
    }, randomTime)
  },
  /**
   * 记录当天选择的内容
   * @param selectValue
   */
  recordSelectResult(selectValue: string): void{
    // 当天选择的内容
    const history: object[] = wx.getStorageSync(STORAGE_KEY.SELECT_HISTORY_KEY) || []
    history.unshift({
      selectValue,
      time: +new Date()
    })
    wx.setStorage({
      key: STORAGE_KEY.SELECT_HISTORY_KEY,
      data: history
    })
  },
  // 到历史页面
  handleHistory() {
    wx.navigateTo({
      url: '../logs/logs',
    })
  },
  onLoad() {
    // @ts-ignore
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
    // 读取缓存数据
    let cacheCanSelectList: string[] = wx.getStorageSync(STORAGE_KEY.CAN_SELECT_LIST) || []
    if(cacheCanSelectList.length === 0){
      cacheCanSelectList = ["猪脚饭", "烧腊", "汤粉", "都城", "饭堂", "好山好水", "螺蛳粉"]
      wx.setStorage({
        key: STORAGE_KEY.CAN_SELECT_LIST,
        data: cacheCanSelectList
      })
    }
    // 默认值
    this.setData({
      canSelectList: cacheCanSelectList,
    })
  },
  getUserProfile() {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
  getUserInfo(e: any) {
    // 不推荐使用getUserInfo获取用户信息，预计自2021年4月13日起，getUserInfo将不再弹出弹窗，并直接返回匿名的用户个人信息
    console.log(e)
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  }
})
