import { STORAGE_KEY } from "../../global"

// pages/edit/edit.ts
Page({

  /**
   * 页面的初始数据
   */
  data: {
    canSelectList: [] as string[], // 可选列表
    addMenuName: "",
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
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

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },
  /**
   * 处理删除
   */
  handleDelete(event: any){
    console.log("event", event);
    // 需要删除的菜单名
    const menuName = event?.currentTarget?.dataset?.name || ""
    const {canSelectList = []} = this.data
    const menuIndex = canSelectList.indexOf(menuName)
    if(menuIndex === -1){
      return
    }
    const newList = canSelectList.slice()
    newList.splice(menuIndex, 1)
    this.setData({
      canSelectList: newList
    })
    this.saveCanSelectList()
  },
  /**
   * 处理输入的菜单名
   * @param event 
   */
  handleInput(event: any){
    console.log("event", event?.detail?.value);
    const value = event?.detail?.value
    this.setData({
      addMenuName: value
    })
  },
  /**
   * 点击增加
   */
  handleAdd(){
    const { addMenuName = "", canSelectList = [] } = this.data
    // 检查是否存在
    const index = canSelectList.indexOf(addMenuName)
    if(index >=0 ){
      wx.showToast({
        icon: "error",
        title: "存在相同的菜单名"
      })
      return
    }
    canSelectList.push(addMenuName)
    this.setData({
      canSelectList,
      addMenuName: "",
    })
    this.saveCanSelectList()
  },
  saveCanSelectList(){
    const { canSelectList = [] } = this.data
    wx.setStorage({
      key: STORAGE_KEY.CAN_SELECT_LIST,
      data: canSelectList
    })
  }
})