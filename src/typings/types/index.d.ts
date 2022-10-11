/// <reference path="./wx/index.d.ts" />

/*! *****************************************************************************
Copyright (c) 2018 Tencent, Inc. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
***************************************************************************** */

interface WXTarget {
    id: string;
    dataset: any;
    offsetLeft: number;
    offsetTop: number;
  }
  
  interface WXTouch {
    identifier?: number
    pageX?: number
    pageY?: number
    clientX?: number
    clientY?: number
  }
  
  interface WXCanvasTouch {
    x?: number
    y?: number
    identifier?: number
  }
  
  /** 微信绑定事件的回调 */
  interface WXEvent<DetailType = any> {
    mark?: any;
    detail: DetailType;
    currentTarget: WXTarget;
    target: WXTarget;
    type?: string;
    timeStamp?: number;
    touches?: WXTouch[] | WXCanvasTouch[];
    changedTouches?: WXTouch[] | WXCanvasTouch[];
  }
  
  interface IPageScrollOption {
    /** 页面在垂直方向已滚动的距离（单位px） */
    scrollTop: number
  }
  
  type IAnyObject = Record<string, any>
  interface BoundingClientRectCallbackResult {
      /** 节点的 ID */
      id: string;
      /** 节点的 dataset */
      dataset: IAnyObject;
      /** 节点的左边界坐标 */
      left: number;
      /** 节点的右边界坐标 */
      right: number;
      /** 节点的上边界坐标 */
      top: number;
      /** 节点的下边界坐标 */
      bottom: number;
      /** 节点的宽度 */
      width: number;
      /** 节点的高度 */
      height: number;
    }
  