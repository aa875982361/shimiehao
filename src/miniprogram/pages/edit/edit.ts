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
    (this as any).setData({
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
   * 处理删除
   */
  handleDelete(event: any){
    console.log("event", event);
    wx.showModal({
      title: "确认删除么？",
      content: "删除后无法恢复",
      success: (res) => {
        // 不是点击确定 都不处理
        if(!res.confirm){
          return
        }
        // 需要删除的菜单名
        const menuName = event?.currentTarget?.dataset?.name || ""
        const {canSelectList = []} = this.data
        const menuIndex = canSelectList.indexOf(menuName)
        if(menuIndex === -1){
          return
        }
        const newList = canSelectList.slice()
        newList.splice(menuIndex, 1);
        (this as any).setData({
          canSelectList: newList
        });
        (this as any).saveCanSelectList()
      }
    })
  },
  /**
   * 处理输入的菜单名
   * @param event 
   */
  handleInput(event: any){
    console.log("event", event?.detail?.value);
    const value25 = event?.detail?.value;
    (this as any).setData({
      addMenuName: value25
    })
  },
  /**
   * 点击增加
   */
  handleAdd(): void{
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
    canSelectList.push(addMenuName);
    (this as any).setData({
      canSelectList,
      addMenuName: "",
    });
    (this as any).saveCanSelectList()
  },
  saveCanSelectList(){
    const { canSelectList = [] } = this.data
    wx.setStorage({
      key: STORAGE_KEY.CAN_SELECT_LIST,
      data: canSelectList
    })
  }
})