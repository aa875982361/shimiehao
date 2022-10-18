import { wxComponent } from "@core/amini/core"
import { getComponentData, SuperComponent } from "@core/classes/SuperComponent"
import { formatDate } from "../../../utils/util"

interface IImgConfig {
    type: string,
    url: string,
}

interface IItem {
    type: string,
    value: string,
    status?: string
}

interface IProperties {
    item: IItem,
    index: number
  }

/** 组件内部 data */
interface ICustomData extends IProperties {
    imgUrlList: IImgConfig[]
}
  
const properties = {
    item: {
        type: Object,
        value: {}
    },
    index: {
        type: Number,
        value: 0
    }
}
  
type IData = getComponentData<ICustomData, typeof properties>


@wxComponent()
export class RichTextItem extends SuperComponent<IData> implements Component.ComponentInstance<IData> {
    public properties = properties
    public data = {
        imgUrlList: [],
    } as any as IData
    public attached(){
        const { item } = this.data
        console.log("RichTextItem attached", this);
        
        // 判断是不是图片类型 以及有数据
        if(item.type === "singleTmg" && item.value){
            // 如果是列表的话
            this.setData({
                imgUrlList: [{
                    type: "image",
                    url: item.value,
                }]
            })
        }
    }
    // 文本输入
    public handleTextInput(e: WXEvent): void{
        
        // 原有值不变 通知外层值修改
        this.noticeChange(e.detail.value)
    }
    public noticeChange(value: string): void {
        const { index } = this.data
        this.triggerEvent("changeVale", {
            index,
            value,
        })
    }
    /** 选择完图片的回调 */
    public afterRead(event: WXEvent) {
        const { file } = event.detail;
        console.log("event", event)

        const fileName = file.url.substring(file.url.lastIndexOf('.') + 1)
        const timeStamp = new Date()
        const randomTime = (Math.random() * 10000) >> 0
        const cloudPath = `up/${formatDate(timeStamp)}/${(+timeStamp).toString(36)}/${randomTime.toString(36)}.${fileName}`
        console.log("cloudPath", cloudPath);
        
        wx.cloud.uploadFile({
            cloudPath, // 上传至云端的路径
            filePath: file.url, // 小程序临时文件路径
            success: (res) => {
                // 返回文件 ID
                console.log("fileID", res)
                this.noticeChange(res.fileID)
                this.setData({
                    imgUrlList: [{
                        ...file,
                        url: res.fileID,
                    }]
                })
            },
            fail: (err) => {
                console.error("上传图片失败", err)
            }
        })
    }
    handleAdd(event: WXEvent){
        const { type } = event.target.dataset
        const { index } = this.data
        console.log("type", type)
        this.triggerEvent("addItem", {
            index,
            type,
            value: "",
        })
    }
}
