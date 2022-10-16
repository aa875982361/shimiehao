import { ExcludeEmpty, ISuperData, realUse } from "@core/classes/SuperData"
import { Observable } from "rxjs"

export type getter<D, T> = (data: D) => T
export type ComputedDef<IDATA, ICOMPUTED> = {
  [T in keyof ICOMPUTED]: getter<IDATA, ICOMPUTED[T]>
}
/**
 *  封装 wx setData
 *  注意：不要直接继承， page component 使用对应的基类
 */
export class SuperSetData<T extends IAnyObject, Z = T> implements Page.PageInstance<T> {

  public data!: T

  public readonly setData!: (obj: Partial<T>, cb?: () => void) => void

  public computedDepsMap?: any
  public computedWatchers?: any
  public computed?: object

  private setDataTimer: any
  private setDataObject: object = {}
  private setDataCallbackList: AnyFunction[] = []

  constructor() {
    /** 底层使用service，直接捞取，防止报错 */
  }

  /** 页面中使用，toggle data 中的某个布尔值 */
  public handleToggleBoolean(e: WXEvent): void {
    const { toggleKey, toggleValue } = e.currentTarget.dataset
    this.toggleBoolean(toggleKey, toggleValue)
  }

  /**
   * toggle data 中的某个布尔值，现在仅支持第一层属性，后续可以拓展
   * @param propKey {string} 属性的 key，如果要支持 path，请以后自行改造
   * @param isTrue {boolean} 改成 true 还是 false，如果不传，则改成现在的反向
   */
  public toggleBoolean(propKey: string | keyof Z, isTrue?: boolean): void {
    const currentValue = (this.data as any)[propKey]
    const nextValue = typeof isTrue === "boolean" ? isTrue : !currentValue
    this.setData({
      [propKey]: nextValue,
    } as any)
  }

  public rxSetData(setDataObj: Partial<T>, isAsync: boolean = false): Observable<void> {
    return new Observable<void>((subscriber) => {
      if (!isAsync) {
        this.setData(setDataObj, () => {
          subscriber.next()
          subscriber.complete()
        })
      } else {
        this.setData(setDataObj)
        subscriber.next()
        subscriber.complete()
      }
    })
  }

  /** 创建一个基于 data 的 SuperData 对象 */
  public use(): ISuperData<Z>
  /** 创建一个基于 data.key 的 SuperData 对象 */
  public use<K extends keyof Z>(key?: K): ISuperData<Z, ExcludeEmpty<Z[K]>>
  public use<K extends keyof Z>(key?: K): ISuperData<Z, ExcludeEmpty<Z[K]>> {
    return realUse<ISuperData<Z, ExcludeEmpty<Z[K]>>>(this, this.data as any, key as any)
  }

  public usePath<U>(rootPath: string = ""): ISuperData<Z, U> {
    return realUse<ISuperData<Z, U>>(this, this.data as any, rootPath)
  }

  /**
   * @deprecated 【因性能和代码规范问题，不再支持，推荐使用 use】
   *
   * 注意如果某个对象不存在与 Data，那么
   * 对某个对象的某个属性进行改变,并与视图同步
   * 类似于 vue.js 中的 this.$set
   *
   * @param {U} target 要设置的对象
   * @param {K} key 属性名
   * @param {U[K]} value  属性值
   * @memberof SuperSetData
   */
  // eslint-disable-next-line max-len
  public setValue<U extends object, K extends keyof U>(
    target: U,
    key: K,
    value: U[K],
    callback?: AnyFunction,
  ): void {
    if (target === undefined || key === undefined) {
      console.error("target 和 key 不可为 undefined")
      return
    }
    // 要判断是否是undefined，不能用!value判断
    if (value === undefined || target[key] === value) {
      return
    }

    let fullPathWithKey = ""
    let targetPathArr: string[] = []
    /** 直接设置 Data */
    if (target === this.data as any) {
      fullPathWithKey = key as string
    } else {
      targetPathArr = getValueFullPaths(this.data, target)
      if (!targetPathArr.length) {
        console.error("setValue target 不存在于 this.data 中")
        return
      }
      const targetPathsStr = paths2str(targetPathArr)
      fullPathWithKey = resolvePaths(targetPathsStr, key as string | number)
    }
    if (callback) { this.setDataCallbackList.push(callback) }
    (this.setDataObject as any)[fullPathWithKey] = value
    // 先赋值保证同步流程，后渲染
    // 此处要将路径展开赋值
    let parent: any = this.data
    targetPathArr.forEach((path: string) => {
      parent = parent[path]
    })
    parent[key] = value
    // throttle
    if (this.setDataTimer) { return }
    this.setDataTimer = setTimeout(() => {
      this.processSetData()
      this.setDataTimer = null
    }, 100)
  }

  /** 真正渲染 */
  private processSetData(): void {
    const cbList = this.setDataCallbackList.slice()
    const data = Object.assign({}, this.setDataObject)
    this.setDataObject = {}
    this.setDataCallbackList = []
    this.setData(data as any, () => {
      cbList.forEach((cb) => cb())
    })
  }
}

/**
 * 获取对象某属性值的完整属性名路径, TODO: 尾递归
 *
 * @private
 * @param {(T | object)} parent
 * @param {*} target
 * @param {string[]} [paths=[]]
 * @returns {string[]}
 * @memberof SuperSetData
 */
export const getValueFullPaths = (parent: any, target: any, paths: string[] = []): string[] => {
  const keys = Object.keys(parent)
  let findResult: string[] = []
  keys.some((key: string): boolean => {
    const currentValue = parent[key]
    if (currentValue && currentValue === target) {
      paths.push(key)
      findResult = paths
      return true
    } else if (currentValue && typeof currentValue === "object") {
      findResult = getValueFullPaths(currentValue as object, target, paths.concat([key]))
      return findResult.length > 0
    }
    return false
  })
  return findResult
}

/**
 * 将以数组组成的 path 转换为 this.setData 能接收的字符串拼接形式
 *
 * @private
 * @param {string[]} paths
 * @returns {string}
 * @memberof SuperSetData
 */
export const paths2str = (paths: string[]): string => {
  let result = ""
  paths.forEach((key: string): void => {
    result = resolvePaths(result, key)
  })
  return result
}

/**
 * 以 this.setData 的形式拼接路径
 *
 * @private
 * @param {string} path
 * @param {(string | number)} key
 * @returns {string}
 * @memberof SuperSetData
 */
export const resolvePaths = (path: string = "", key: string | number): string => {
  let result = path
  key = String(key)
  if (/^\d*$/.test(key)) {
    result += `[${key}]`
  } else if (result === "") {
    result = key
  } else {
    result += `.${key}`
  }
  return result
}
