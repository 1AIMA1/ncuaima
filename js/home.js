/* ============================================================
 *  工作台首页（index.html）脚本
 *  /js/home.js
 *  职责：调用全局数据层 DataStore 完成数据初始化，
 *        渲染 4 张统计卡片。
 *  数据源与持久化统一由 js/dataStore.js 提供，本页不重复定义。
 *  ============================================================ */

(function () {
    'use strict';

    /* ===== 固定统计值（模拟） ===== */
    var FIXED_STATS = {
        totalRevenue: 56233,    // 年度累计收费（元）
        enterpriseCount: 6,     // 入驻企业总数（个）
        deviceCount: 48         // 一体杆总数（台）
    };

    /**
     * 渲染首页 4 张统计卡片
     *  - 年度累计收费、入驻企业总数、一体杆总数：使用模拟固定值
     *  - 月卡车辆总数：调用 DataStore.getAll().length 动态获取
     *  - 金额字段千分位格式化（复用 DataStore.formatMoney）
     */
    function renderHomeStat() {
        // 月卡车辆总数：从全局数据源实时读取，随增删自动联动
        var monthCardArr = DataStore.getAll();
        var carCount = monthCardArr.length;

        // 渲染：年度累计收费（元）
        setStatValue('stat-totalRevenue', DataStore.formatMoney(FIXED_STATS.totalRevenue));
        // 渲染：入驻企业总数（个）
        setStatValue('stat-enterpriseCount', FIXED_STATS.enterpriseCount);
        // 渲染：月卡车辆总数（辆）
        setStatValue('stat-carCount', carCount);
        // 渲染：一体杆总数（台）
        setStatValue('stat-deviceCount', FIXED_STATS.deviceCount);
    }

    /**
     * 写入统计值到对应 DOM 节点
     */
    function setStatValue(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    /**
     * 入口：DOM 就绪后自动执行
     */
    function init() {
        DataStore.init();    // 1. 初始化全局数据源（无数据时写入默认月卡）
        renderHomeStat();    // 2. 渲染统计卡片
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
