import { getInstanceByServiceOrCacheIfNotExist } from "@core/amini/core"
const SUPER_META_DATA = Symbol("SUPER_META_DATA")

const enum ERROR_CODE {
  REAL_USE_ERROR  = 1000000,
  SET_ERROR,
  ASSIGN_ERROR,
  REPLACE_ERROR,
  PUSH_ERROR,
  PATH_ERROR,
  SET_DATA_ERROR,
  CALLBACK_ERROR,
  INNER_CALLBACK_ERROR,
}

interface IPageOrComponentInstance {
  [SUPER_META_DATA]?: {
    throttleTimer: any,
    setDataObject: any,
    setDataCallbackList: AnyFunction[],
    innerCallbackList: AnyFunction[],
  }
  setData: AnyFunction
}


export const realUse = <RootData, Data = RootData>(
  pageOrComponentInstance: any, rootData: RootData, absolutePath: string = "",
): ISuperData<RootData, Data> => {
  try {
    const superData = new SuperData<RootData, Data>(pageOrComponentInstance, rootData, absolutePath)
    Object.setPrototypeOf(Object.getPrototypeOf(superData), superData.currentData as any)
    return superData as ISuperData<RootData, Data>
  } catch (error) {
    throw error
  }
}

export type ISuperData<RootData, Data = RootData> = SuperData<RootData, Data> & Data

export type ExcludeEmpty<T> = Exclude<T, undefined | null>

export class SuperData<RootData, Data> {

  public currentData!: Data
  private absolutePath!: string
  private rootData!: RootData
  private pageOrComponentInstance: IPageOrComponentInstance

  constructor(pageOrComponentInstance: any, rootData: RootData, absolutePath: string = "") {
    this.absolutePath = absolutePath
    this.rootData = rootData
    this.pageOrComponentInstance = pageOrComponentInstance
    this.initSuperDataInfosInPageOrComponentInstance()
    this.currentData = this.getByProps(rootData, absolutePath)
  }

  public use<Key extends keyof Data>(key: Key): ISuperData<RootData, ExcludeEmpty<Data[Key]>> {
    if (typeof key === "number") {
      return realUse(this.pageOrComponentInstance, this.rootData, `${this.absolutePath}[${key}]`)
    } else {
      return realUse(this.pageOrComponentInstance, this.rootData, `${this.absolutePath}.${String(key)}`)
    }
  }

  public usePath<ChildData>(path: string): ISuperData<RootData, ChildData> {
    return realUse(this.pageOrComponentInstance, this.rootData, `${this.absolutePath}.${path}`)
  }

  public set<Key extends keyof Data>(
    key: Key, value: Data[Key], cb?: () => any,
  ): ISuperData<RootData, ExcludeEmpty<Data>> {
    try {
      const superDataInfos = this.pageOrComponentInstance[SUPER_META_DATA]!
      if (cb) { superDataInfos.setDataCallbackList.push(cb) }
      const childAbsolutePath = this.absolutePath
        ? typeof key === "number"
          ? `${this.absolutePath}[${key}]`
          : `${this.absolutePath}.${String(key)}`
        : key
      superDataInfos.setDataObject[childAbsolutePath] = value
      this.execThrottledSetData()
      return this as any as ISuperData<RootData, ExcludeEmpty<Data>>
    } catch (error) {
      throw error
    }
  }

  public assign(setDataObject: Partial<Data>, cb?: AnyFunction): ISuperData<RootData, ExcludeEmpty<Data>> {
    try {
      const emptyKeys: string[] = []
      const superDataInfos = this.pageOrComponentInstance[SUPER_META_DATA]!
      if (cb) { superDataInfos.setDataCallbackList.push(cb) }
      for (const [key, value] of Object.entries(setDataObject)) {
        if (value === undefined) { emptyKeys.push(key) }
        const childAbsolutePath = `${this.absolutePath}.${key}`
        superDataInfos.setDataObject[childAbsolutePath] = value
      }
      this.execThrottledSetData()
      return this as any as ISuperData<RootData, ExcludeEmpty<Data>>
    } catch (error) {
      throw error
    }
  }

  public replace(newData: Partial<Data>, cb?: AnyFunction): ISuperData<RootData, ExcludeEmpty<Data>> {
    try {
      const superDataInfos = this.pageOrComponentInstance[SUPER_META_DATA]!
      if (cb) { superDataInfos.setDataCallbackList.push(cb) }
      superDataInfos.setDataObject[`${this.absolutePath}`] = newData
      superDataInfos.innerCallbackList.push(() => {
        this.currentData = this.getByProps(this.rootData, this.absolutePath)
        Object.setPrototypeOf(Object.getPrototypeOf(this), this.currentData as any)
      })
      this.execThrottledSetData()
      return this as any as ISuperData<RootData, ExcludeEmpty<Data>>
    } catch (error) {
      throw error
    }
  }

  // TODO: 这个 PUSH 方法不会触发 class 的更新，谨慎使用，日后再聊
  public push<Key extends keyof Data>(value: Data[Key], cb?: AnyFunction): ISuperData<RootData, ExcludeEmpty<Data>> {
    if (!(this.currentData instanceof Array)) {
      throw new Error("push 方法只支持数组")
    }
    try {
      const superDataInfos = this.pageOrComponentInstance[SUPER_META_DATA]!
      if (cb) { superDataInfos.setDataCallbackList.push(cb) }
      const length = this.currentData.length
      const childAbsolutePath = `${this.absolutePath}[${length}]`
      superDataInfos.setDataObject[childAbsolutePath] = value
      this.execThrottledSetData()
      return this as any as ISuperData<RootData, ExcludeEmpty<Data>>
    } catch (error) {
      throw error
    }
  }

    // TODO: 暂时不完善，先放置，以后有需求再优化
    // eslint-disable-next-line max-len
    // superData.find = <K>(condition: string | ((item: any, index: number) => boolean)): ISuperData<K> | undefined => {
    //   if (typeof condition === "string") {
    //     const finalKeys: string[] = []
    //     let finalPath: string = ""
    //     const parsedCondition = condition.split(/\.|(\[.*?\])/).filter((item) => item)
    //     for (const key of parsedCondition) {
    //       if (!key.includes("[")) {
    //         finalKeys.push(key)
    //         finalPath += `.${key}`
    //       } else if (!/<|>|=/.test(key)) {
    //         finalKeys.push(key.replace(/[|]/g, ""))
    //         finalPath += `${key}`
    //       } else {
    //         const currentObj = finalKeys.reduce((result, current) => {
    //           return result[current]
    //         }, data)
    // eslint-disable-next-line max-len
    //         let findRule = key.replace(/\[|\]/g, "").split(/(<|>|=)/).filter((item) => item).map((item) => item.trim())
    //         if (findRule.length === 4) {
    //           findRule = [findRule[0], findRule[1] + findRule[2], findRule[3]]
    //         }
    //         console.log(findRule)
    //         if (currentObj instanceof Array) {
    //           const resIndex = currentObj.findIndex((item: any, index: number) => {
    //             if (findRule[1] === ">") {
    //               return item[findRule[0]] > findRule[2]
    //             } else if (findRule[1] === ">=") {
    //               return item[findRule[0]] >= findRule[2]
    //             } else if (findRule[1] === "=") {
    //               return item[findRule[0]] === findRule[2]
    //             } else if (findRule[1] === "<=") {
    //               return item[findRule[0]] <= findRule[2]
    //             } else {
    //               return item[findRule[0]] < findRule[2]
    //             }
    //           })
    //           console.log(resIndex)
    //           if (resIndex === -1) { return undefined }
    //           finalKeys.push(`${resIndex}`)
    //           finalPath += `[${resIndex}]`
    //         } else {
    //           throw new Error("暂时不支持该种数据类型的 find 方法")
    //         }
    //       }
    //     }
    //     return this.use(`${absolutePath}${finalPath}`)
    //   } else {
    //     if (data instanceof Array) {
    //       const resIndex = data.findIndex((item: any, index: number) => condition(item, index))
    //       return resIndex !== -1 ? this.use(`${absolutePath}[${resIndex}]`) : undefined
    //     } else {
    //       throw new Error("暂时不支持该种数据类型的 find 方法")
    //     }
    //   }
    // }

  public getByProps(obj: any, path: string): any {
    const keys = path.split(/\.|\[|\]/).filter((item) => item)
    try {
      return keys.reduce((result, current) => {
        if (!result[current]) {
          throw new Error(`数据的路径 ${path} 错误，属性 ${current} 不存在`)
        }
        return result[current]
      }, obj)
    } catch (e) {
      throw e
    }
  }

  private execThrottledSetData(): void {
    const superDataInfos = this.pageOrComponentInstance[SUPER_META_DATA]!
    if (superDataInfos.throttleTimer) { return }
    superDataInfos.throttleTimer = setTimeout(() => {
      try {
        this.execSetData()
      } catch (error) {
        throw error
      }
      superDataInfos.throttleTimer = null
    })
  }

  private execSetData(): void {
    const superDataInfos = this.pageOrComponentInstance[SUPER_META_DATA]!
    const { setDataObject, setDataCallbackList, innerCallbackList } = superDataInfos
    if (!setDataObject || typeof setDataObject !== "object" || !Object.keys(setDataObject).length) { return }
    const cbList = (setDataCallbackList || []).slice()
    const innerCbList = (innerCallbackList || []).slice()
    const data = Object.assign({}, setDataObject)
    superDataInfos.setDataObject = {}
    superDataInfos.setDataCallbackList = []
    superDataInfos.innerCallbackList = []
    this.pageOrComponentInstance.setData(data, () => {
      try {
        cbList.forEach((cb: AnyFunction) => cb())
      } catch (error) {
        throw error
      }
    })
    try {
      innerCbList.forEach((cb: AnyFunction) => cb())
    } catch (error) {
      throw error
    }
  }

  private initSuperDataInfosInPageOrComponentInstance(): void {
    if (this.pageOrComponentInstance[SUPER_META_DATA]) { return }
    this.pageOrComponentInstance[SUPER_META_DATA] = {
      throttleTimer: null,
      setDataCallbackList: [],
      innerCallbackList: [],
      setDataObject: {},
    }
  }
}
