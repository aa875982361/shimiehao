Component({
    properties: {
        item: {
            type: Object,
            value: {}
        },
        index: {
            type: Number,
            value: 0
        }
    },
    data: {
    },
    methods: {
        // 文本输入
        handleTextInput(e: WXEvent){
            const { index } = this.data
            // 原有值不变 通知外层值修改
            this.triggerEvent("changeVale", {
                index,
                value: e.detail.value
            })
        }
    },
  });