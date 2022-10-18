import { wxComponent } from "@core/amini/core"
import { getComponentData, SuperComponent } from "@core/classes/SuperComponent"

interface IImgConfig {
    type: string,
    url: string,
}

interface IRichText {
    type: string,
    value: string,
    key?: string
}

interface IProperties {
    list: IRichText[]
}

/** 组件内部 data */
interface ICustomData extends IProperties {
    lastKeyNum: number
}
  
const properties = {
    list: {
        type: Array,
        value: [],
    }
}
  
type IData = getComponentData<ICustomData, typeof properties>


@wxComponent()
export class RichTextItem extends SuperComponent<IData> implements Component.ComponentInstance<IData> {
    public properties = properties
    public lastKeyNum = 1
    public data = {
    } as any as IData
    public attached(){
        this.initListKey()
    }
    // 初始化列表的key
    public initListKey(){
        const list = this.data.list?.slice() || []
        list.forEach((item, index) => {
            if(item.key){
                return
            }
            item.key = "i" + index
        })
        this.setData({
            list
        })
    }
    // 增加一个节点
    handleAddItem(event: WXEvent){
        const {index, type, value} = event.detail
        console.log("handleAddItem", event);
        const newList = this.data.list.slice()

        newList.splice(index+1, 0, {
            type,
            value,
            key: "a" + this.lastKeyNum++,
        })
        this.setData({
            list: newList,
        })
    }
    // 修改其中的一个值
    changeItemValue(event:WXEvent): void{
        const { index, value } = event.detail
        const newList = this.data.list.slice()
        newList[index] = {
            ...(newList[index] || {}),
            value,
        }
        this.setData({
            list: newList,
        })
        this.triggerEvent("changeRichTextList", {
            list: newList,
        })

    }
}