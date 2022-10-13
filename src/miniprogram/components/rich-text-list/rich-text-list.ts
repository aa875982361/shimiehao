Component({
    properties: {
        list: {
            type: Array,
            value: []
        }
    },
    data: {
    },
    methods: {
        // 增加一个节点
        handleAddItem(event: WXEvent){
            const {index, type, value} = event.detail
            console.log("handleAddItem", event);
            const newList = this.data.list.slice()

            newList.splice(index+1, 0, {
                type,
                value,
            })
            this.setData({
                list: newList,
            })
        }
    },
  });