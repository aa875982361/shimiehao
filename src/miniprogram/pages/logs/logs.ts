// logs.ts
// const util = require('../../utils/util.js')
import { STORAGE_KEY } from '../../global';
import { formatDate } from '../../utils/util'

interface HistoryItem {
  selectValue: string,
  time: number | string
}

Page({
  data: {
    logs: [],
  },
  onLoad() {
    const logs = (wx.getStorageSync(STORAGE_KEY.SELECT_HISTORY_KEY) || []).map((historyItem: HistoryItem) => {
      return {
        date: formatDate(new Date(historyItem.time)),
        timeStamp: historyItem.time,
        value: historyItem.selectValue
      }
    })
    console.log("logs", logs);
    
    this.setData({
      logs,
    })
  },
})
