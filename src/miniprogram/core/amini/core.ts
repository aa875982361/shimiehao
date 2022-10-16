import "reflect-metadata"
// TODO: 由于循环引用，取消掉子类继承检查，如何解决
// import { SuperPage } from "@core/classes/SuperPage"
// import { SuperComponent } from "@core/classes/SuperComponent"

export const mixinInjectorSymbol = Symbol("mixinInjectorSymbol")

export type IClass = new (...args: any[]) => any

type AcceptClassFunction = (Clazz: IClass) => void

/**
 * 微信小程序每个页面的装饰器
 * @param options
 */
export const wxPage = (options?: any, customPage?: any): AcceptClassFunction => (PageClass: IClass): void => {
  removeFakeSetDataOnProto(PageClass)
  let page = new PageClass(...getDependenciesOfService(PageClass))
  page.constructorName = PageClass.name
  if (page.superService) {
    const superServiceInstance = getSuperServiceInstance(page.superService)
    Object.assign(page, superServiceInstance)
  }
  page = convertInstanceToRawObjectWithFakeMixinInject(page)
  /** 懒加载页面 service */
  page = lazyLoadService(page, "onLoad")
  if(typeof options === "function"){
    options(page)
  } else if(typeof customPage === "function"){
    customPage(page)
  }else{
    Page(page)
  }
}

/** 获取superService的实例 */
const getSuperServiceInstance = (superService: any):any => {
  if( !superService ) { return {} }
  const superServiceInstance: Record<string, any> = {}
  Object.keys(superService).forEach((key) => {
    const serviceClass = superService[key]
    superServiceInstance[key] = getInstanceByServiceOrCacheIfNotExist(serviceClass)
  })
  return superServiceInstance
}

/** 在 onLoad 里面懒加载需要的 Service */
// eslint-disable-next-line max-lines-per-function
const lazyLoadService = (pageConfig: any, initFunctionName: string): any => {
  // 懒加载的单例服务
  const lazyServices: Array<[string, any]> = []
  // 初始化监听函数列表
  Object.keys(pageConfig).forEach((key: any) => {
    try {
      const value = pageConfig[key]
      if (value[isService]) {
        /** 存储属性名和 Service 类，让页面以后可以重新获取 */
        lazyServices.push([key, value.constructor])
        delete pageConfig[key]
      }
    } catch (e) {
    }
  })
  const initFunction = pageConfig[initFunctionName]
  /** 劫持初始化函数，例如 onLoad、created */
  pageConfig[initFunctionName] = function(...args: any[]): void {
    /** 在夹持的初始化函数中重新注入 Service */
    lazyServices.forEach(([key, Service]) => {
      this[key] = getInstanceByServiceOrCacheIfNotExist(Service)
    })
    // 修改mixin的指向
    initMixins(pageConfig, this)
    // 重写setData 集合onload的setData对象
    const originSetData = this.setData
    const callbackList: any[] = []
    const setDataObj = {}
    let isNeedSetData = false
    this.setData = (obj: Record<string, any>, cb: any):void => {
      if(!obj || typeof obj !== "object"){
        return
      }
      isNeedSetData = true
      // 合并setData对象
      Object.assign(setDataObj, obj)
      // 将callback 加入回调列表
      if(cb && callbackList.indexOf(cb) === -1 && typeof cb === "function"){
        callbackList.push(cb)
      }
    }
    /** 调用原有的初始化函数，让业务不受影响 */
    if (typeof initFunction === "function") {
      initFunction.call(this, ...args)
    }
    // 真正运行setData
    if(isNeedSetData){
      originSetData.call(this, setDataObj, () => {
        // 运行回调列表
        callbackList.map((cb: () => void) => {
          cb()
        })
      })
    }
    this.setData = originSetData
  }
  return pageConfig
}

/**
 * 微信小程序每个组件的装饰器
 * 除了组件生命周期，所有方法都需要定义在 methods 里才能使用
 * @param options
 */
export const wxComponent = (options?: any): AcceptClassFunction => (ComponentClass: IClass): void => {
  removeFakeSetDataOnProto(ComponentClass)
  // checkInheritance(SuperComponent, ComponentClass)
  let component = new ComponentClass(...getDependenciesOfService(ComponentClass))
  component.constructorName = ComponentClass.name
  if (component.superService) {
    const superServiceInstance = getSuperServiceInstance(component.superService)
    Object.assign(component, superServiceInstance)
  }
  injectMethodsAndLifetimes(component)
  component = convertInstanceToRawObjectWithFakeMixinInject(component)
  component = lazyLoadServiceAndCustomProp(component)
  Component(component)
}

/**
 * Mixin类装饰器
 * 不作处理，仅把service参数加入metaData
 * @param options
 */
export const MixinClass = (options?: any): AcceptClassFunction => (MixinClz: IClass): void => { }

/** 组件生命周期 */
const compLifetimes = ["created", "attached", "ready", "moved", "detached", "error"]
/** 组件可监听的页面生命周期 */
const compPageLifetimes = ["show", "hide", "resize"]
/** 不能写入组件 methods 的，在 SuperComponent 或 SuperSetData 中定义的空函数 */
const fakeFunctions = ["triggerEvent", "setData"]

/**
 * 组件注册时将方法写入到对应的 methods lifetimes 对象，注意 lifetimes 和 pageLifetimes 只会获取一层（当前组件这一层）
 */
function injectMethodsAndLifetimes(component: any): void {
  const proto = Object.getPrototypeOf(component)
  component.methods = component.methods || {}
  component.lifetimes = component.lifetimes || {}
  component.pageLifetimes = component.pageLifetimes || {}
  Reflect.ownKeys(proto).forEach((key: any) => {
    if (key === "constructor") { return }
    if (compLifetimes.includes(key)) {
      component.lifetimes[key] = proto[key]
    } else if (compPageLifetimes.includes(key)) {
      component.pageLifetimes[key] = proto[key]
    }
  })
  component.methods.initFuncList = []
  injectMethods(component, component.methods)
  // 取出初始化方法列表
  const initFuncList = component.methods.initFuncList
  // 删除方法里面的初始化方法列表
  delete component.methods.initFuncList
  // 增加一个初始化监听函数的方法
  component.methods._initFunc = function(this: any): void{
    // 运行全部的初始化函数  如果没有 则不运行
    initFuncList.forEach((initFunc: () => void) => {
      if(typeof initFunc === "function"){
        initFunc.apply(this)
      }
    })
  }
}

/**
 * 获取组件继承的父级的 methods，需要排除一些空方法，防止页面的方法被覆盖掉
 */
function injectMethods(component: any, methods: any): any {
  const proto = Object.getPrototypeOf(component)
  const isRawObject = proto.constructor === Object
  if (isRawObject) { return }
  Reflect.ownKeys(proto).forEach((key: any) => {
    if (
      !compLifetimes.includes(key) && !compPageLifetimes.includes(key) && !fakeFunctions.includes(key)
      && key !== "constructor" && typeof proto[key] === "function" && !methods[key]
    ) {
      const originFunc = proto[key]
      methods[key] = originFunc
      // 判断是否需要注册
      const initFunc = originFunc?.init
      if(initFunc){
        // 检查是否加入过  上面 已经检查过了，这里不检查
        methods.initFuncList.push(initFunc)
      }
    }
  })
  injectMethods(proto, methods)
}

/** 组件官方属性 */
const compPropertyKeys: Array<keyof Component.ComponentInstance> = [
  "externalClasses",
  "behaviors",
  "relations",
  "data",
  "properties",
  "methods",
  "lifetimes",
  "pageLifetimes",
  "definitionFilter",
  "options",
  "setData",
  "observers",
]

/** 标记是否依赖注入的服务，用于判断属性是否需要被深复制 */
const isService = Symbol("is service")
export const isServiceClass = Symbol("is service class")

/**
 * 组件class 的非官方属性在小程序注册时都会被清除，为了使用依赖注入，要做适配，
 * 将自定义属性储存起来，created 的时候释放出来
 */
export function lazyLoadServiceAndCustomProp(obj: Component.ComponentInstance): Component.ComponentInstance {
  // 非依赖注入的对象都需要使用深复制，避免同一个组件的多个实例共享属性
  // 简单类型属性 key: 1
  const simpleProp: Record<string, any> = {}
  // 对象类型属性 key: {}
  const objectPropKeys: Array<[string, object]> = []
  // 服务单例属性
  const servicePropKeyAndConstructor: Array<[string, any]> = []
  // mixin key 配合createMixinObject 使用
  const mixinProps: string[] = (obj as any).__mixin_props__ || []
  Object.keys(obj).forEach((key: any) => {
    const value = (obj as any)[key]
    // 组件原有属性 空值 值是函数 则跳过 不处理
    // eslint-disable-next-line max-len
    if (compPropertyKeys.includes(key) || typeof value === "function") { return }
    // 如果是基本类型 或者是依赖注入的单例
    if (!value || typeof value !== "object") {
      // 基本类型直接复制 都是可以浅复制的
      simpleProp[key] = value
    } else if(value[isService]){
      // 如果是服务单例，会存在于组件自定义属性的暂存对象中，因为闭包，自定义属性暂存对象不会被销毁，服务单例也不会被销毁 谨慎使用
      /** 存储属性名和 Service 类，让页面以后可以重新获取 */
      servicePropKeyAndConstructor.push([key, value.constructor])
    } else {
      // 其他自定义属性要有独立的引用
      // 注意：如果 组件初始化有自身循环引用的对象，就会 爆栈报错。
      objectPropKeys.push([key, value])
    }
    // 减少初始化对象的属性
    delete (obj as any)[key]
  })
  const originCreated = obj.created
  // 组件会创建不同的实例，而这些实例是没有自定义属性的，所以每次都要赋值给 this
  const newCreated = function(this: Component.ComponentInstance): void {
    /** 浅复制简单属性 */
    Object.assign(this, simpleProp)
    /** 在劫持的初始化函数上 深复制object属性值 */
    objectPropKeys.map(([key, value]) => {
      (this as any)[key] = deepClone<any>(value)
    })
    /** 在夹持的初始化函数中重新注入 Service */
    servicePropKeyAndConstructor.map(([key, Service]) => {
      (this as any)[key] = getInstanceByServiceOrCacheIfNotExist(Service)
    })
    // 初始化mixin
    initMixins(obj, this, mixinProps)
    if (typeof originCreated === "function") { originCreated.call(this) }
    // 给 this 赋值 created 无效
    /** 运行初始化监听函数 */
    const _initFunc = (this as any)._initFunc || this.methods?._initFunc
    if(typeof _initFunc === "function"){
      // 运行
      _initFunc.call(this)
    }
  }
  obj.lifetimes = Object.assign(obj.lifetimes || {}, { created: newCreated })
  obj.created = newCreated
  return obj
}

/** 微信小程序定义 Behavior 装饰器 */
export const wxBehavior = (options?: any): AcceptClassFunction => (BehaviorClass: IClass): any => {
  removeFakeSetDataOnProto(BehaviorClass)
  const behavior = new BehaviorClass(...getDependenciesOfService(BehaviorClass))
  return Behavior(convertInstanceToRawObjectWithFakeMixinInject(behavior))
}

/**
 * 微信小程序主启动接口的装饰器
 */
export const wxApp = (options?: any): AcceptClassFunction => (AppClass: IClass): void => {
  removeFakeSetDataOnProto(AppClass)
  const app = new AppClass(...getDependenciesOfService(AppClass))
  const plainObject = convertInstanceToRawObjectWithFakeMixinInject(app)
  // 不生成App，只返回配置对象，交给后面编译
  if (options && options.plainObject) {
    return plainObject
  }
  App(plainObject)
}

/**
 * 删除用来提示的，没什么卵用的 setData
 * @param Class 类
 */
const removeFakeSetDataOnProto = (Class: IClass): void => {
  // FIXME: 遍历原型链 删除 setData
  delete Object.getPrototypeOf(Class.prototype).setData
}

/** 检查类是否继承自指定的父类 */
const checkInheritance = (parent: IClass, child: IClass): void => {
  // mixin 检查特殊字段
  const childExtendedClassesSet: Set<any> = child.prototype.__extendedClasses__ || new Set()
  const isInherited = parent.isPrototypeOf(child) || childExtendedClassesSet.has(parent)
  if (!isInherited) {
    throw new Error(`"${child.name}" 必须继承自 "${parent.name}"`)
  }
}

/**
 * 初始化mixin 别名，配合 createMixinObject使用
 * @param configObj 组件或页面配置
 * @param instanceObj 组件或页面实例
 */
const initMixins = (configObj: any, instanceObj: any, _mixinProps?: string[]): void => {
  // 获取配置对象使用到的mixin keys 组件的keys 是不会存在配置对象上的，因为component(obj) 方法 只会接受必要属性，
  // 所以在懒加载的时候我们会去掉 组件配置对象上的多余属性，所以要先保存，后面再传入 具体请看lazyLoadServiceAndCustomProp
  const mixinProps: string[] = _mixinProps || configObj.__mixin_props__ || []
  // 将使用到的mixinkey的值 指向页面或组件实例
  mixinProps.forEach((k: string) => instanceObj[k] = instanceObj)
}

const convertInstanceToRawObjectWithFakeMixinInject = (instance: any): any => {
  const mixinProps: string[] = []
  const obj = convertInstanceToRawObject(instance, mixinProps)
  obj.__mixin_props__ = mixinProps
  return obj
}

/**
 * 把一个某个类的实例对象的属性和原型上的属性抽离出来合成一个对象
 * 但是把 constructor 去掉，因为微信小程序不知道什么原理，有 constructor 属性就会报错！
 *
 * 这里可以把多继承最后的结果进行合并
 */
export const convertInstanceToRawObject = (instance: any, mixinProps: string[]): any => {
  /** 获取原型链 */
  const proto = Object.getPrototypeOf(instance)

  /** 如果是原生对象，那么不需要再追溯 */
  const isRawObject = proto.constructor === Object
  if (isRawObject) { return makeOwnKeysObject(instance, mixinProps) }

  /** 把所有的原型链上的数据，按照原型链追溯以后的结果合并在一起放到一个对象当中 */
  return {
    ...convertInstanceToRawObject(proto, mixinProps),
    ...makeOwnKeysObject(instance, mixinProps),
  }
}

/**
 * 把一个实例的非原型上的数据合并到一个新的对象当中
 */
const makeOwnKeysObject = (instance: any, mixinProps: string[] = []): any => [...Reflect.ownKeys(instance)]
  .reduce((obj: any, key: any) => {
    if (key === "constructor") { return obj }
    const val = instance[key]
    if (val === mixinInjectorSymbol) {
      mixinProps.push(key)
    }
    obj[key] = val
    return obj
  }, {})

/******************** 依赖注入基础框架 *********************/

/**
 * 用来保存所有的 Service 单例
 * WeakMap 可以保证实例引用在完全使用完毕以后销毁，防止内存泄漏
 */
const servicesSingletonMap = new WeakMap()

/**
 * 模仿 Angular 的依赖注入函数，可以装饰类
 * 暂时不用做什么事情，毕竟是懒加载
 * @param options
 */
export const Injectable = (options?: any): AcceptClassFunction => (Service: IClass): void => {
  /** Lazy load without instantiating */
  // TODO: 也需要插入依赖，这样父类也可以有依赖
  (Service as any)[isServiceClass] = true
}

/** 获取类构造器参数的类型数组 */
export const getParamTypes = (clz: IClass): any => {
  return (Reflect as any).getMetadata("design:paramtypes", clz)
}
/**
 * 获取某个 Service 所依赖的其他 Service 实例
 * @param Service 需要处理的 Service
 */
export const getDependenciesOfService = (Service: IClass): any[] => {
  const dependentServices = getParamTypes(Service)
  // console.log("dependentServices", Service, dependentServices)

  const hasDeps = dependentServices && dependentServices.length
  if (!hasDeps) { return [] }
  /** 获取所依赖的 Service 的单例 */
  return dependentServices.map(getInstanceByServiceOrCacheIfNotExist)
}

/**
 * 通过 Service 类获取它的实例，如果在缓存当中没有，那么就实例化一个并且存储到缓存当中
 */
export const getInstanceByServiceOrCacheIfNotExist = <T>(Service: IClass): T => {
  let serviceInstance = servicesSingletonMap.get(Service)
  if (!serviceInstance) {
    /** 获取这个实例的依赖并且进行实例化 */
    const dependentServices = getDependenciesOfService(Service)
    serviceInstance = new Service(...dependentServices)
    /** 标记该对象为依赖注入的服务 */
    serviceInstance[isService] = true
    /** 设置到缓存当中 */
    servicesSingletonMap.set(Service, serviceInstance)
  }
  return serviceInstance
}

// FIXME: 解决循环引用
/** 深复制 */
function deepClone<T>(obj: T): T {
  if (!obj || typeof obj !== "object") { return obj }
  return JSON.parse(JSON.stringify(obj))
}