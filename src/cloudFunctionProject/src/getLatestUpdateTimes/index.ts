import * as cloud from "wx-server-sdk"
import { CloudResponseCode, ICloudResponse, ICloudUpdateTimes } from "@mono-shared/models/cloudFunction.interface"

export { main }

cloud.init({
  /**
   * 在设置 env 时指定 cloud.DYNAMIC_CURRENT_ENV 常量 (需 SDK v1.1.0 或以上)
   * 这样云函数内发起数据库请求、存储请求或调用其他云函数的时候，默认请求的云环境就是云函数当前所在的环境
   * 由于我们正式号测试号都只开了一个环境，这里写死就好
   */
  env: (cloud as any).DYNAMIC_CURRENT_ENV,
})
const db = cloud.database()

const main = async (): Promise<ICloudResponse<ICloudUpdateTimes>> => {
  const queryResult = await db.collection("latestUpdateTimes").limit(1000).get()
  const latestUpdateTimes: ICloudUpdateTimes = {}
  ;(queryResult.data)?.forEach((item) => {
    const name = item.name || item._id
    if (!name) { return }
    latestUpdateTimes[name] = new Date(item.updateTime).getTime()
  })
  return {
    code: CloudResponseCode.SUCCESS,
    data: latestUpdateTimes,
  }
}
