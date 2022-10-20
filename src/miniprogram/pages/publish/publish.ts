import { wxPage } from "@core/amini/core"
import { SuperPage, IBasePageData } from "@core/classes/SuperPage"
import { WxCloudApiService } from "@mono-shared/services/wxcloud.api.service"
import { IRichText } from "../../components/rich-text-list/rich-text-list"

/** onload 参数, 所有都是string */
interface ILoadParams {
  groupId?: string
}

/** 页面数据 */
interface IData extends IBasePageData {
  // 富文本列表
  richTextList: IRichText[],
  title: string
}

type LoadParams = Record<keyof ILoadParams, string>

/**
 * ___describe___
 *
 * @class PurePagerWrapper
 * @extends {SuperSetData<IPageDate>}
 * @implements {PageOpts}
 */
@wxPage()
class PurePagerWrapper extends SuperPage<IData> implements Page.PageInstance<IData> {
  constructor(
    private wxCloudApiService: WxCloudApiService,
  ) {
    super()
  }
  public data = {
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
  } as IData

  /** DELETE: 注意，onLoad onShow onReady onHide onUnload 都要在第一行调用 super.onXX */

  public onLoad(options: LoadParams): void {
    super.onLoad(options)
  }

  public onShow(): void {
    super.onShow()
  }

  /**
   * 处理标题值输入的值变化
   * @param event 
   */
   public handleTitleInput(event:WXEvent): void {
    const value = event.detail.value;
    (this as any).setData({
      title: value
    })
  }
  /**
   * 处理富文本组件的值变化
   * @param event 
   */
  public handleRichTextListChange(event:WXEvent): void{
    console.log("publish handleRichTextListChange", event);
    const { list = [] } = event.detail;
    (this as any).setData({
      richTextList: list
    })
    
  }

  /**
   * 点击发布按钮
   * @param event 
   */
  public handlePublish(event: WXEvent): void {
    console.log("handlePublish", event, "11");
    
    const {title, richTextList} = this.data
    this.wxCloudApiService.saveMenu({
      title,
      richTextList
    }).subscribe(res => {
      console.log("res", res);
      
    })
  }

}