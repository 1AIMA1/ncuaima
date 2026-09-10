/* ============================================================
 *  园区后台管理系统 —— 全局数据源与持久化层
 *  /js/dataStore.js
 *  ============================================================
 *  职责：
 *   1. 全局唯一权威「月卡数据源」定义（defaultMonthCards）
 *   2. localStorage 持久化：读取 / 序列化 / 反序列化 / 容错初始化
 *   3. 提供统一的增删改查 API（CRUD），供 index / monthCard /
 *      addMonthCard 三个页面共享调用，保证多页面数据一致、联动更新
 *   4. 纯数据逻辑：唯一 id 生成、剩余天数计算、状态判定、
 *      状态与金额格式化工具
 *
 *  使用方式：每个 HTML 页面在业务脚本前引入本文件即可
 *      <script src="js/dataStore.js"></script>
 *  所有能力统一挂载到 window.DataStore，页面通过 DataStore.xxx() 调用。
 *  ============================================================ */

(function () {
    'use strict';

    /* ========== 1. 常量定义 ========== */

    /** localStorage 存储 key（全局统一，三页共享） */
    var STORAGE_KEY = 'monthCardData';

    /** 状态常量：0 可用 / 1 已过期 */
    var STATUS_AVAILABLE = 0;
    var STATUS_EXPIRED = 1;

    /* ========== 2. 默认模拟月卡数据（唯一权威数据源） ========== */
    var defaultMonthCards = [
        {
            id: 1700000000001,
            ownerName: '张伟',
            phone: '13800138001',
            carNumber: '赣A12345',
            carBrand: '丰田凯美瑞',
            remainDay: 28,
            status: STATUS_AVAILABLE,
            startDate: '2026-08-10',
            endDate: '2027-08-10',
            payAmount: 1200
        },
        {
            id: 1700000000002,
            ownerName: '李娜',
            phone: '13800138002',
            carNumber: '赣A23456',
            carBrand: '本田雅阁',
            remainDay: 15,
            status: STATUS_AVAILABLE,
            startDate: '2026-09-01',
            endDate: '2027-09-01',
            payAmount: 1200
        },
        {
            id: 1700000000003,
            ownerName: '王强',
            phone: '13800138003',
            carNumber: '赣A34567',
            carBrand: '大众帕萨特',
            remainDay: 7,
            status: STATUS_AVAILABLE,
            startDate: '2026-09-05',
            endDate: '2027-09-05',
            payAmount: 1500
        },
        {
            id: 1700000000004,
            ownerName: '刘洋',
            phone: '13800138004',
            carNumber: '赣A45678',
            carBrand: '日产天籁',
            remainDay: 22,
            status: STATUS_AVAILABLE,
            startDate: '2026-08-20',
            endDate: '2027-08-20',
            payAmount: 1200
        },
        {
            id: 1700000000005,
            ownerName: '陈静',
            phone: '13800138005',
            carNumber: '赣A56789',
            carBrand: '奥迪A4L',
            remainDay: 10,
            status: STATUS_AVAILABLE,
            startDate: '2026-09-03',
            endDate: '2027-09-03',
            payAmount: 1800
        }
    ];

    /* ========== 3. 持久化核心 ========== */

    /**
     * 读取 localStorage 原始字符串并反序列化为数组。
     *  - 数据不存在 / 非法 JSON / 非数组 时返回 null，由初始化逻辑决定如何处理。
     * @returns {Array|null}
     */
    function readRaw() {
        var raw;
        try {
            raw = localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            raw = null;
        }
        if (!raw) return null;
        try {
            var arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * 初始化数据源：
     *  - 本地已有合法数据则保留；
     *  - 无数据或数据损坏时，写入默认模拟月卡数据，保证首次打开即可用。
     */
    function init() {
        if (readRaw() === null) {
            persist(defaultMonthCards);
        }
    }

    /**
     * 将数组序列化后写入 localStorage（持久化保存）。
     * @param {Array} arr 月卡数据数组
     */
    function persist(arr) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
        } catch (e) {
            // 存储失败（如超出配额）时静默处理，业务层可据此提示用户
        }
    }

    /* ========== 4. 查询 / 增删改 API（供各页面调用） ========== */

    /**
     * 获取全部月卡数据（浅拷贝数组，避免调用方误改内部缓存）。
     * @returns {Array}
     */
    function getAll() {
        var arr = readRaw();
        // 安全兜底：即便未显式调用 init，返回前也保证有数据
        if (arr === null) {
            arr = defaultMonthCards.slice();
            persist(arr);
        }
        return arr.slice();
    }

    /**
     * 根据 id 精确查询单条月卡。
     * @param {number|string} id
     * @returns {Object|null}
     */
    function findById(id) {
        var list = getAll();
        for (var i = 0; i < list.length; i++) {
            // 用 == 兼容 number 与 string 型 id
            if (list[i].id == id) return list[i];
        }
        return null;
    }

    /**
     * 新增一条月卡并持久化。
     * @param {Object} card 月卡对象（不含 id，内部自动生成唯一 id）
     * @returns {Object} 写入后的完整月卡对象
     */
    function add(card) {
        var list = getAll();
        var newCard = card || {};
        newCard.id = nextId(list);          // 生成唯一 id
        newCard.status = calcStatus(newCard); // 依据结束日期自动刷新状态
        list.push(newCard);
        persist(list);
        return newCard;
    }

    /**
     * 根据 id 更新整条月卡并持久化。
     * @param {number|string} id
     * @param {Object} card 更新后的月卡数据
     * @returns {boolean} 是否更新成功（找不到该 id 返回 false）
     */
    function update(id, card) {
        var list = getAll();
        for (var i = 0; i < list.length; i++) {
            if (list[i].id == id) {
                var updated = card || {};
                updated.id = list[i].id;      // 保留原 id，防止被覆盖
                updated.status = calcStatus(updated); // 刷新状态
                list[i] = updated;
                persist(list);
                return true;
            }
        }
        return false;
    }

    /**
     * 根据 id 删除单条月卡并持久化。
     * @param {number|string} id
     * @returns {boolean} 是否删除成功
     */
    function remove(id) {
        var list = getAll();
        var target = -1;
        for (var i = 0; i < list.length; i++) {
            if (list[i].id == id) {
                target = i;
                break;
            }
        }
        if (target < 0) return false;
        list.splice(target, 1);
        persist(list);
        return true;
    }

    /**
     * 根据 id 数组批量删除并持久化。
     * @param {Array} ids 待删除的 id 列表
     * @returns {number} 实际删除的条数
     */
    function batchRemove(ids) {
        if (!ids || !ids.length) return 0;
        var list = getAll();
        var removeSet = {};
        for (var i = 0; i < ids.length; i++) {
            removeSet[ids[i]] = true;
        }
        var kept = list.filter(function (item) {
            return !removeSet.hasOwnProperty(item.id);
        });
        var removed = list.length - kept.length;
        if (removed > 0) persist(kept);
        return removed;
    }

    /* ========== 5. 纯数据逻辑工具 ========== */

    /**
     * 生成唯一 id：取当前时间戳与数组内已有最大 id 中较大者 + 1，
     * 保证在新增多条记录时 id 不会重复。
     * @param {Array} list 现有数据数组
     * @returns {number}
     */
    function nextId(list) {
        var max = 0;
        for (var i = 0; i < list.length; i++) {
            var v = Number(list[i].id);
            if (!isNaN(v) && v > max) max = v;
        }
        return Math.max(Date.now(), max + 1);
    }

    /**
     * 计算结束日期与开始日期之间的剩余有效天数。
     * @param {string} startDate 'YYYY-MM-DD'
     * @param {string} endDate   'YYYY-MM-DD'
     * @returns {number} 剩余天数（不足一天向上取整，至少为 0）
     */
    function calcRemainDay(startDate, endDate) {
        var start = parseDate(startDate);
        var end = parseDate(endDate);
        if (start === null || end === null) return 0;
        var diff = end - start;
        var days = Math.ceil(diff / (24 * 60 * 60 * 1000));
        return days > 0 ? days : 0;
    }

    /**
     * 依据结束日期与当前时间自动判定状态：
     *  结束日期晚于今天 -> 可用(0)；否则 -> 已过期(1)。
     * 兼容已存储 status 但日期变动需要重算的场景。
     * @param {Object} card 月卡对象（需含 startDate/endDate）
     * @returns {number} 0 可用 / 1 已过期
     */
    function calcStatus(card) {
        if (!card) return STATUS_AVAILABLE;
        var end = parseDate(card.endDate);
        if (end === null) return STATUS_AVAILABLE;
        var today = startOfToday();
        return end < today ? STATUS_EXPIRED : STATUS_AVAILABLE;
    }

    /**
     * 解析 'YYYY-MM-DD' 字符串为本地 0 点的 Date。
     * @returns {Date|null}
     */
    function parseDate(str) {
        if (!str) return null;
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str).trim());
        if (!m) return null;
        var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return isNaN(d.getTime()) ? null : d;
    }

    /**
     * 返回今天 0 点对应的 Date。
     */
    function startOfToday() {
        var now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    /* ========== 6. 展示格式化工具（渲染通用） ========== */

    /** 状态码转中文 */
    var statusTextMap = {};
    statusTextMap[STATUS_AVAILABLE] = '可用';
    statusTextMap[STATUS_EXPIRED] = '已过期';

    /**
     * 状态格式化：0 -> "可用"，1 -> "已过期"。
     * @param {number} status
     * @returns {string}
     */
    function formatStatus(status) {
        return statusTextMap[status] !== undefined
            ? statusTextMap[status]
            : '未知';
    }

    /**
     * 金额千分位格式化（56233 -> "56,233"）。
     * @param {number} num
     * @returns {string}
     */
    function formatMoney(num) {
        if (typeof num !== 'number' || isNaN(num)) {
            num = 0;
        }
        var str = Math.floor(num).toString();
        return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /* ========== 7. 表单校验规则（新增/编辑/续费共用） ========== */

    /** 手机号正则：1 开头的 11 位数字 */
    var PHONE_REG = /^1\d{10}$/;

    /** 国内车牌正则：省份汉字 + 大写字母 + 5~6 位字母数字（兼容新能源车牌） */
    var PLATE_REG = /^[\u4e00-\u9fa5][A-Z][A-Z0-9]{5,6}$/;

    /**
     * 表单整体校验，任一不合法返回提示文字，全部合法返回空串 ''。
     * @param {string} owner   车主姓名
     * @param {string} phone   手机号
     * @param {string} carNo   车牌号
     * @param {string} start   开始日期 YYYY-MM-DD
     * @param {string} end     结束日期 YYYY-MM-DD
     * @param {*}      pay     缴费金额（数字或字符串）
     * @returns {string}
     */
    function validateCard(owner, phone, carNo, start, end, pay) {
        if (!owner) return '请填写车主姓名';
        if (!phone) return '请填写手机号';
        if (!PHONE_REG.test(phone)) return '手机号格式不正确，应为 1 开头的 11 位数字';
        if (!carNo) return '请填写车牌号';
        if (!PLATE_REG.test(carNo)) return '车牌号格式不正确，示例：赣A12345';
        if (!start) return '请选择开始日期';
        if (!end) return '请选择结束日期';
        if (end < start) return '结束日期不能早于开始日期';
        var payNum = Number(pay);
        if (pay === '' || isNaN(payNum)) return '请填写正确的缴费金额';
        if (payNum <= 0) return '缴费金额必须为正数';
        return '';
    }

    /* ========== 8. 挂载到全局 ========== */

    var DataStore = {
        STORAGE_KEY: STORAGE_KEY,
        STATUS_AVAILABLE: STATUS_AVAILABLE,
        STATUS_EXPIRED: STATUS_EXPIRED,
        defaultMonthCards: defaultMonthCards,
        init: init,
        getAll: getAll,
        findById: findById,
        add: add,
        update: update,
        remove: remove,
        batchRemove: batchRemove,
        nextId: nextId,
        calcRemainDay: calcRemainDay,
        calcStatus: calcStatus,
        formatStatus: formatStatus,
        formatMoney: formatMoney,
        validateCard: validateCard
    };

    // 暴露到 window，供各页面全局使用
    window.DataStore = DataStore;

})();
