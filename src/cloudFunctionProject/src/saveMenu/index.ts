import { ICloudResponse, IExampleResponse, CloudResponseCode, ISaveMenuParam, ISaveMenuRes } from "@mono-shared/models/cloudFunction.interface"
import * as cloud from "wx-server-sdk"


cloud.init({
  /**
   * 在设置 env 时指定 cloud.DYNAMIC_CURRENT_ENV 常量 (需 SDK v1.1.0 或以上)
   * 这样云函数内发起数据库请求、存储请求或调用其他云函数的时候，默认请求的云环境就是云函数当前所在的环境
   * 由于我们正式号测试号都只开了一个环境，这里写死就好
   */
  env: (cloud as any).DYNAMIC_CURRENT_ENV,
})

const menuCollectionName = "menus"

const db = cloud.database()
const _ = db.command

const main = async (params: ISaveMenuParam)
  : Promise<ICloudResponse<ISaveMenuRes>> => {
  const wxContext = cloud.getWXContext()
  // 获取身份数据
  const openId = wxContext.OPENID
  // 获取标题和富文本列表
  const { title, richTextList } = params
  console.log("title richTextList", title, richTextList)
  // 生成一个活动id
  // 日期
  const date = new Date()
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  // 随机id 固定长度
  const randomNumber = 10000 + (Math.random() * 10000 >> 0)
  // 组合id
  const menuId = `${year}${month}${day}${+date}${randomNumber}`
  // 保存菜谱的数据
  const saveMenuData = {
    // 唯一id
    menuId,
    // 创建者用户的id
    openId,
    // 标题
    title,
    // 富文本列表
    richTextList,
    // 创建时间
    createdTime: date
  }
  // 存储菜谱
  try {
    const { _id } = await db.collection(menuCollectionName).add({
      // data 字段表示需新增的 JSON 数据
      data: saveMenuData
    })
    return {
      code: CloudResponseCode.SUCCESS,
      data: {
        _id,
        menuId,
      },
    }
  } catch (error) {
    return {
      code: CloudResponseCode.API_FAIL,
      msg: "创建菜单失败"
    }
  }
}

export { main }

function addMenu2Db(data): Promise<any>{
  return db.collection('todos').add({
    // data 字段表示需新增的 JSON 数据
    data,
  })
}