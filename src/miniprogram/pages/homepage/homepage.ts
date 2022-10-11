import { myWx } from "../../utils/util";

Page({
  data: {
    list_F3uGuZJH: [null, null, null],
  },
  onShareAppMessage() {
    return {};
  },
  /**
   * 点击发布
   */
  handlePublish(){
    myWx.navigateTo({
      url: "/pages/publish/publish"
    })
  }
});