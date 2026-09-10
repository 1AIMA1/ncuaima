/* ============================================================
 *  增加月卡页（addMonthCard.html）脚本 —— 新增 / 编辑复用
 *  /js/addMonthCard.js
 *  职责：读取 URL ?id 区分新增/编辑模式；表单回填；表单校验；
 *        自动计算剩余天数 remainDay；确定后组装对象经 DataStore
 *        新增或更新并持久化，成功后跳回月卡管理列表页。
 *  ============================================================ */

(function () {
    'use strict';

    var editId = null; // null = 新增模式；有值 = 编辑模式

    /* ===== DOM 缓存 ===== */
    var fOwner = document.getElementById('ownerName');
    var fPhone = document.getElementById('phone');
    var fCarNo = document.getElementById('carNumber');
    var fBrand = document.getElementById('carBrand');
    var fStart = document.getElementById('startDate');
    var fEnd = document.getElementById('endDate');
    var fPay = document.getElementById('payAmount');
    var fRemain = document.getElementById('remainDay');
    var errBox = document.getElementById('formErr');
    var pageTitle = document.getElementById('pageTitle');

    /* ============================================================
     * 一、URL 参数解析（编辑模式）
     * ============================================================ */

    /** 读取 URL query 中名为 name 的参数值，不存在返回 null。 */
    function getQueryParam(name) {
        var params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    /** 解析 URL id：存在则为编辑模式 */
    function resolveMode() {
        var idStr = getQueryParam('id');
        if (idStr) {
            editId = Number(idStr);
            pageTitle.textContent = '编辑月卡';
        } else {
            pageTitle.textContent = '新增月卡';
        }
    }

    /* ============================================================
     * 二、表单回填（编辑模式）
     * ============================================================ */

    function fillForm(item) {
        fOwner.value = item.ownerName || '';
        fPhone.value = item.phone || '';
        fCarNo.value = item.carNumber || '';
        fBrand.value = item.carBrand || '';
        fStart.value = item.startDate || '';
        fEnd.value = item.endDate || '';
        fPay.value = item.payAmount;
        fRemain.value = item.remainDay;
    }

    /* ============================================================
     * 三、剩余天数实时预览
     * ============================================================ */

    function previewRemain() {
        if (fStart.value && fEnd.value) {
            fRemain.value = DataStore.calcRemainDay(fStart.value, fEnd.value) + ' 天';
        } else {
            fRemain.value = '';
        }
    }

    /* ============================================================
     * 四、确定提交
     * ============================================================ */

    function submit() {
        var owner = fOwner.value.trim();
        var phone = fPhone.value.trim();
        var carNo = fCarNo.value.trim();
        var brand = fBrand.value.trim();
        var start = fStart.value;
        var end = fEnd.value;
        var pay = fPay.value;

        // 统一校验（规则在 DataStore.validateCard）
        var msg = DataStore.validateCard(owner, phone, carNo, start, end, pay);
        if (msg) { errBox.textContent = msg; return; }
        errBox.textContent = '';

        // 自动计算剩余天数、状态
        var remainDay = DataStore.calcRemainDay(start, end);

        var card = {
            ownerName: owner,
            phone: phone,
            carNumber: carNo,
            carBrand: brand,
            startDate: start,
            endDate: end,
            payAmount: Number(pay),
            remainDay: remainDay
            // status 由 DataStore.add/update 依据 endDate 自动判定
        };

        if (editId === null) {
            // 新增模式：DataStore.add 内部生成唯一 id 并 push
            DataStore.add(card);
        } else {
            // 编辑模式：按 id 替换对应记录
            DataStore.update(editId, card);
        }

        // 保存成功跳回月卡管理列表
        window.location.href = 'monthCard.html';
    }

    /* ============================================================
     * 五、重置
     * ============================================================ */

    function resetForm() {
        fOwner.value = '';
        fPhone.value = '';
        fCarNo.value = '';
        fBrand.value = '';
        fStart.value = '';
        fEnd.value = '';
        fPay.value = '';
        fRemain.value = '';
        errBox.textContent = '';   // 同时清除校验错误提示
    }

    /* ============================================================
     * 六、事件绑定与初始化
     * ============================================================ */

    function init() {
        DataStore.init();   // 确保数据源就绪

        // 返回按钮跳回列表
        document.getElementById('btn-back').addEventListener('click', function () {
            window.location.href = 'monthCard.html';
        });
        // 确定按钮
        document.getElementById('btn-submit').addEventListener('click', submit);
        // 重置按钮
        document.getElementById('btn-reset').addEventListener('click', resetForm);

        // 日期变化时预览剩余天数
        fStart.addEventListener('change', previewRemain);
        fEnd.addEventListener('change', previewRemain);

        // 依据 URL id 判定模式并回填
        resolveMode();
        if (editId !== null) {
            var item = DataStore.findById(editId);
            if (item) {
                fillForm(item);
            } else {
                errBox.textContent = '未找到该月卡记录，当前按新增处理';
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
