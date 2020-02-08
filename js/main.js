const OPTIONS_KEYS = ['nameUS', 'title', 'usPath']
const CODE_TYPE_MAP = {
    trigger: '触发器',
    integer: '整数',
    boolean: '布尔型',
    real: '实数',
    player: '玩家',
    unit: '单位',
    handle: '触发器',
    sound: '音频'
}
const ICON_MAP = {
    '转换': 'change',
    '鼠标': 'mouse',
    '键盘': 'keyboard',
    '窗口': 'window'
}

let api = {
    // 获取总条数
    getTotal () {
        return window.War3Api.length
    },
    // 复制数据
    copy (data) {
        return JSON.parse(JSON.stringify(data))
    },
    // 模拟查询数据
    getWar3ApiData ({ pageSize = 20, pageNum = 1, keyword = '' }) {
        pageSize = pageSize || 20 // 保证每页不为 0
        return new Promise(resolve => {
            let start = (pageNum - 1) * pageSize
            let end = pageNum * pageSize
            let data = window.War3Api
            if (keyword.trim()) {
                data = data.filter(item => {
                    return OPTIONS_KEYS.some(key => {
                        return item[key] && item[key].includes(keyword)
                    })
                })
            }
            let list = this.copy(data.slice(start, end))
            let result = {
                total: data.length,
                pageSize,
                pageNum,
                maxPageNum: Math.ceil(data.length / pageSize),
                list
            }
            resolve(result)
        })
    }
}

let Main = {
    data () {
        return {
            keyword: '',
            search: '',
            total: window.War3Api,
            list: [],
            starList: [], // ['DzF2I']
            isFocus: false,
            page: {
                pageSize: 20, // 每页条数
                pageNum: 1, // 第 n 页
                total: 0,
                maxPageNum: 0
            }
        }
    },
    filters: {
        code (item) {
        },
    },
    computed: {
        noMore () {
            let { pageNum, maxPageNum } = this.page
            return pageNum >= maxPageNum
        }
    },
    mounted () {
        this.init()
    },
    methods: {
        // 初始化
        init () {
            this.initData()
            this.loadStarData()
        },
        // 初始化数据，发送一次请求
        initData () {
            this.getData().then(data => {
                this.list = data.list
                this.page.total = data.total
                this.page.maxPageNum = data.maxPageNum
            })
        },
        // 获取数据
        getData () {
            return new Promise(resovle => {
                let params = {
                    ...this.page,
                    keyword: this.keyword
                }
                api.getWar3ApiData(params).then(data => {
                    resovle(data)
                })
            })
        },
        loadMoreData () {
            let { page, list, getData } = this
            page.pageNum += 1
            getData().then(data => {
                list.push(...data.list)
                page.maxPageNum = data.maxPageNum
                page.total = data.total
            })
        },
        handleFocus () {
            this.isFocus = true
        },
        handleBlur () {
            this.isFocus = false
        },
        // 联想输入
        querySearch (keyword, cb) {
            let params = {
                pageNum: 1,
                PageSize: 10,
                keyword
            }
            api.getWar3ApiData(params).then(data => {
                let list = data.list.map(item => {
                    return {
                        value: (item.title || '') + ' ' + (item.nameUS || ''),
                        title: item.title,
                        nameUS: item.nameUS
                    }
                })
                cb(list)
            })
        },
        handleSelect (item) {
            if (item && item.nameUS) {
                this.keyword = item.nameUS
            }
            this.handleSearch()
        },
        handleSearch () {
            this.page.pageNum = 1
            this.initData()
        },
        getCode (item) {
            let colorArgs = '' // 参数带类型
            let simpleArgs = '' // 参数无类型
            let jassResult = '' // jass 返回值
            let luaResult = '' // lua 返回值
            if (item.args && item.args !== 'nothing') {
                let list = item.args.split(', ')
                colorArgs = list.map(key => {
                    let options = key.trim().split(' ')
                    return `<span class="arg-label">${options[0]}<span class="arg-tooltip">${CODE_TYPE_MAP[options[0]] || options[0]}</span></span> <span class="arg-value">${options[1]}</span>`
                }).join(', ')
                simpleArgs= list.map(item => item.trim().split(' ')[1]).join(', ')
            }
            if (item.returns != 'nothing') {
                jassResult = `<p><span class="function-prefix">local</span> <span class="function-type">${item.returns}</span> ${(item.returns || '').slice(0, 1)} = <span class="function-name">${item.nameUS}</span><span>(</span><span>${simpleArgs}</span><span>)</span></p>`
                luaResult = `<p><span class="function-prefix">local</span> ${(item.returns || '').slice(0, 1)} = <span class="function-name">${item.nameUS}</span><span>(</span><span>${simpleArgs}</span><span>)</span></p>`
            }
            let code = `
            <p class="memo">// jass</p>
            <p><span class="function-prefix">call</span> <span class="function-name">${item.nameUS}</span><span>(</span><span>${colorArgs}</span><span>)</span></p>
            <p><span class="function-prefix">call</span> <span class="function-name">${item.nameUS}</span><span>(</span><span>${simpleArgs}</span><span>)</span></p>
            ${jassResult}
            <br />
            <p class="memo">// lua</p>
            <p><span class="function-name">${item.nameUS}</span><span>(</span><span>${colorArgs}</span><span>)</span></p>
            <p><span class="function-name">${item.nameUS}</span><span>(</span><span>${simpleArgs}</span><span>)</span></p>
            ${luaResult}
            `
            return code
        },
        // 获取图标
        getIcon (item) {
            if (!item.title) {
                return ''
            }
            for(let key in ICON_MAP) {
                if (item.title.includes(key)) {
                    return `icon-${ICON_MAP[key]}`
                }
            }
            return ''
        },
        // 是否已收藏
        isStar (item) {
            return this.starList.includes(item.nameUS)
        },
        // 收藏 & 取消收藏
        handleStar (item) {
            let { starList } = this
            let key = item.nameUS
            if (!starList.includes(key)) {
                starList.push(key)
            } else {
                let i = starList.findIndex(s => s === key)
                if (i >= 0) {
                    starList.splice(i, 1)
                }
            }
            this.saveStarData()
        },
        // 加载收藏
        loadStarData () {
            let data = localStorage.getItem('STAR_DATA')
            if (data && data.length) {
                this.starList = JSON.parse(data)
            }
        },
        // 保存收藏
        saveStarData () {
            localStorage.setItem('STAR_DATA', JSON.stringify(this.starList))
        }
    }
}

var Ctor = Vue.extend(Main)
new Ctor().$mount('#app')