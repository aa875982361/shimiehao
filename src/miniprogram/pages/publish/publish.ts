Page({
  data: {
    // 富文本列表
    richTextList: [
      {
        type: "text",
        value: "啊实打实多"
      },
      {
        type: "singleImg",
        value: "",
      }
    ],
    title: ""
  },
  /**
   * 处理标题值输入的值变化
   * @param event 
   */
  handleTitleInput(event:WXEvent): void {
    const value = event.detail.value;
    (this as any).setData({
      title: value
    })
  },
  /**
   * 处理富文本组件的值变化
   * @param event 
   */
  handleRichTextListChange(event:WXEvent): void{
    console.log("publish handleRichTextListChange", event);
    const { list = [] } = event.detail;
    (this as any).setData({
      richTextList: list
    })
    
  },
  onShareAppMessage() {
    return {};
  },
});