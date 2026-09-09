/* ============================================================
 *  月卡管理列表页（monthCard.html）脚本
 *  /js/monthCard.js
 *  职责：查询筛选、前端分页、表格渲染、查看/续费/编辑弹窗、
 *        单条删除、批量删除、跳转新增。数据均经 DataStore 持久化。
 *  ============================================================ */

(function () {
    'use strict';

    /* ===== 分页状态 ===== */
    var currentPage = 1;   // 当前页码
    var pageSize = 5;      // 每页条数
    var editMode = '';     // 'edit' | 'renew'，编辑弹窗当前模式
    var editId = null;     // 编辑/续费弹窗绑定的记录 id

    /* ===== DOM 缓存 ===== */
    var fOwner = document.getElementById('f-ownerName');
    var fCar = document.getElementById('f-carNumber');
    var fStatus = document.getElementById('f-status');
    var tbody = document.getElementById('tbody');
    var checkAll = document.getElementById('check-all');
    var emptyTip = document.getElementById('emptyTip');
    var pagination = document.getElementById('pagination');

    /* ============================================================
     * 一、数据读取与筛选
     * ============================================================ */

    /** 获取全部月卡并做条件过滤，返回过滤后的数组（复制，不动原数据）。 */
    function getFiltered() {
        var kwName = (fOwner.value || '').trim();
        var kwCar = (fCar.value || '').trim();
        var st = fStatus.value; // '' | '0' | '1'

        var all = DataStore.getAll();
        return all.filter(function (item) {
            var okName = true;
            var okCar = true;
            var okStatus = true;
            if (kwName && (item.ownerName || '').indexOf(kwName) < 0) okName = false;
            if (kwCar && (item.carNumber || '').indexOf(kwCar) < 0) okCar = false;
            if (st !== '' && Number(item.status) !== Number(st)) okStatus = false;
            return okName && okCar && okStatus;
        });
    }

    /* ============================================================
     * 二、表格渲染
     * ============================================================ */

    /** 状态标签 HTML */
    function statusTag(item) {
        var s = Number(item.status);
        if (s === DataStore.STATUS_EXPIRED) {
            return '<span class="tag tag-bad">' + DataStore.formatStatus(s) + '</span>';
        }
        return '<span class="tag tag-ok">' + DataStore.formatStatus(s) + '</span>';
    }

    /** 渲染某一行（操作按钮使用 data 属性 + 事件委托） */
    function rowHtml(item, index, seq) {
        return '' +
            '<tr>' +
            '  <td><input type="checkbox" class="row-check" data-id="' + item.id + '"></td>' +
            '  <td>' + seq + '</td>' +
            '  <td>' + esc(item.ownerName) + '</td>' +
            '  <td>' + esc(item.phone) + '</td>' +
            '  <td>' + esc(item.carNumber) + '</td>' +
            '  <td>' + esc(item.carBrand) + '</td>' +
            '  <td>' + item.remainDay + '</td>' +
            '  <td>' + statusTag(item) + '</td>' +
            '  <td>' + item.startDate + '</td>' +
            '  <td>' + item.endDate + '</td>' +
            '  <td>' + item.payAmount + '</td>' +
            '  <td>' +
            '    <button class="link-btn" data-act="view" data-id="' + item.id + '">查看</button>' +
            '    <button class="link-btn" data-act="renew" data-id="' + item.id + '">续费</button>' +
            '    <button class="link-btn" data-act="edit" data-id="' + item.id + '">编辑</button>' +
            '    <button class="link-btn link-danger" data-act="del" data-id="' + item.id + '">删除</button>' +
            '  </td>' +
            '</tr>';
    }

    /** HTML 转义，防止输入内容破坏结构 */
    function esc(v) {
        if (v === undefined || v === null) return '';
        return String(v)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /** 渲染表格主体 + 分页信息 + 空态 */
    function renderTable() {
        var filtered = getFiltered();

        // 页码越界保护
        var total = filtered.length;
        var pageCount = Math.max(1, Math.ceil(total / pageSize));
        if (currentPage > pageCount) currentPage = pageCount;

        var start = (currentPage - 1) * pageSize;
        var pageData = filtered.slice(start, start + pageSize);

        // 序号：全局（第几页内相对序号即可，跨页不重复）用 (currentPage-1)*pageSize+i+1
        var html = '';
        for (var i = 0; i < pageData.length; i++) {
            var seq = start + i + 1;
            html += rowHtml(pageData[i], i, seq);
        }
        tbody.innerHTML = html;

        // 空态 / 表格与分页
        var hasData = pageData.length > 0;
        if (total === 0) {
            emptyTip.style.display = 'block';
        } else {
            emptyTip.style.display = 'none';
        }

        renderPager(total, pageCount);
    }

    /* ============================================================
     * 三、分页渲染
     * ============================================================ */

    function renderPager(total, pageCount) {
        document.getElementById('page-total').textContent = total;
        document.getElementById('page-current').textContent = currentPage;
        document.getElementById('page-count').textContent = pageCount;

        var prev = document.getElementById('btn-prev');
        var next = document.getElementById('btn-next');
        prev.disabled = currentPage <= 1;
        next.disabled = currentPage >= pageCount;
    }

    /* ============================================================
     * 四、新增 / 删除
     * ============================================================ */

    /** 新增跳转到 addMonthCard（不带 id = 新增模式） */
    function goAdd() {
        window.location.href = 'addMonthCard.html';
    }

    /** 单条删除：浏览器确认弹窗 */
    function removeOne(id) {
        var item = DataStore.findById(id);
        var name = item ? item.ownerName : '';
        if (window.confirm('确定删除车主「' + name + '」的月卡记录吗？删除后不可恢复。')) {
            DataStore.remove(id);
            renderTable();
        }
    }

    /** 批量删除：收集勾选 id */
    function batchDelete() {
        var checked = getCheckedIds();
        if (checked.length === 0) {
            window.alert('请先勾选要删除的月卡记录');
            return;
        }
        if (window.confirm('确定删除选中的 ' + checked.length + ' 条月卡记录吗？删除后不可恢复。')) {
            DataStore.batchRemove(checked);
            renderTable();
        }
    }

    /** 获取所有勾选行的 id 数组 */
    function getCheckedIds() {
        var boxes = tbody.querySelectorAll('.row-check:checked');
        var ids = [];
        for (var i = 0; i < boxes.length; i++) {
            ids.push(Number(boxes[i].getAttribute('data-id')));
        }
        return ids;
    }

    /* ============================================================
     * 五、查看弹窗（只读）
     * ============================================================ */

    function openView(id) {
        var item = DataStore.findById(id);
        if (!item) return;
        setText('v-ownerName', item.ownerName);
        setText('v-phone', item.phone);
        setText('v-carNumber', item.carNumber);
        setText('v-carBrand', item.carBrand);
        setText('v-remainDay', item.remainDay + ' 天');
        setText('v-status', DataStore.formatStatus(Number(item.status)));
        setText('v-startDate', item.startDate);
        setText('v-endDate', item.endDate);
        setText('v-payAmount', item.payAmount + ' 元');
        document.getElementById('viewModal').style.display = 'flex';
    }

    function setText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    /* ============================================================
     * 六、编辑 / 续费弹窗（共用表单）
     * ============================================================ */

    /** 打开编辑或续费弹窗。mode: 'edit' 全字段可改；'renew' 车辆信息只读。 */
    function openEditModal(id, mode) {
        var item = DataStore.findById(id);
        if (!item) return;

        editMode = mode;
        editId = id;

        // 标题
        var title = mode === 'renew' ? '续费月卡' : '编辑月卡';
        document.getElementById('editTitle').textContent = title;

        // 车辆信息字段（续费模式只读）
        var readonly = mode === 'renew';
        setReadonly('m-ownerName', readonly);
        setReadonly('m-phone', readonly);
        setReadonly('m-carNumber', readonly);
        setReadonly('m-carBrand', readonly);

        // 回显
        document.getElementById('m-ownerName').value = item.ownerName || '';
        document.getElementById('m-phone').value = item.phone || '';
        document.getElementById('m-carNumber').value = item.carNumber || '';
        document.getElementById('m-carBrand').value = item.carBrand || '';
        document.getElementById('m-startDate').value = item.startDate || '';
        document.getElementById('m-endDate').value = item.endDate || '';
        document.getElementById('m-payAmount').value = item.payAmount;
        document.getElementById('m-remainDay').value = item.remainDay;
        document.getElementById('editErr').textContent = '';

        document.getElementById('editModal').style.display = 'flex';
    }

    function setReadonly(id, ro) {
        var el = document.getElementById(id);
        el.disabled = ro;
    }

    /** 关闭指定弹窗 */
    function closeModal(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    /** 保存编辑/续费 */
    function saveEdit() {
        var owner = document.getElementById('m-ownerName').value.trim();
        var phone = document.getElementById('m-phone').value.trim();
        var carNo = document.getElementById('m-carNumber').value.trim();
        var brand = document.getElementById('m-carBrand').value.trim();
        var start = document.getElementById('m-startDate').value;
        var end = document.getElementById('m-endDate').value;
        var pay = document.getElementById('m-payAmount').value;
        var errBox = document.getElementById('editErr');

        // 基础必填校验（规则统一由 DataStore.validateCard 提供）
        var msg = DataStore.validateCard(owner, phone, carNo, start, end, pay);
        if (msg) { errBox.textContent = msg; return; }
        errBox.textContent = '';

        var remainDay = DataStore.calcRemainDay(start, end);

        var obj = {
            ownerName: owner,
            phone: phone,
            carNumber: carNo,
            carBrand: brand,
            startDate: start,
            endDate: end,
            payAmount: Number(pay),
            remainDay: remainDay
            // status 由 DataStore.update 依据 endDate 自动重算
        };

        if (DataStore.update(editId, obj)) {
            closeModal('editModal');
            renderTable();
        } else {
            errBox.textContent = '保存失败：未找到对应记录';
        }
    }

    /* ============================================================
     * 八、事件绑定
     * ============================================================ */

    /** 绑定查询 / 重置 / 新增 / 批量删除 / 分页 */
    function bindStatic() {
        document.getElementById('btn-search').addEventListener('click', function () {
            currentPage = 1;
            renderTable();
        });
        document.getElementById('btn-reset').addEventListener('click', function () {
            fOwner.value = '';
            fCar.value = '';
            fStatus.value = '';
            currentPage = 1;
            renderTable();
        });
        document.getElementById('btn-add').addEventListener('click', goAdd);
        document.getElementById('btn-batchDel').addEventListener('click', batchDelete);

        document.getElementById('btn-prev').addEventListener('click', function () {
            if (currentPage > 1) { currentPage--; renderTable(); }
        });
        document.getElementById('btn-next').addEventListener('click', function () {
            var filtered = getFiltered();
            var pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
            if (currentPage < pageCount) { currentPage++; renderTable(); }
        });
        document.getElementById('page-size').addEventListener('change', function () {
            pageSize = Number(this.value);
            currentPage = 1;
            renderTable();
        });

        // 表头全选
        checkAll.addEventListener('change', function () {
            var checked = checkAll.checked;
            var boxes = tbody.querySelectorAll('.row-check');
            for (var i = 0; i < boxes.length; i++) boxes[i].checked = checked;
        });
    }

    /** 表格操作：事件委托（查看 / 续费 / 编辑 / 删除） */
    function bindRowActions() {
        tbody.addEventListener('change', function (e) {
            // 行内多选联动表头全选状态
            var boxes = tbody.querySelectorAll('.row-check');
            var all = boxes.length > 0;
            for (var i = 0; i < boxes.length; i++) {
                if (!boxes[i].checked) { all = false; break; }
            }
            checkAll.checked = all;
        });

        tbody.addEventListener('click', function (e) {
            var target = e.target;
            if (!target || target.tagName !== 'BUTTON') return;
            var act = target.getAttribute('data-act');
            var id = Number(target.getAttribute('data-id'));
            if (act === 'view') openView(id);
            else if (act === 'renew') openEditModal(id, 'renew');
            else if (act === 'edit') openEditModal(id, 'edit');
            else if (act === 'del') removeOne(id);
        });
    }

    /** 弹窗关闭：点 X、关闭按钮、取消按钮、点遮罩空白 */
    function bindModalClose() {
        // 所有带 data-close 的元素点击关闭对应弹窗
        var closers = document.querySelectorAll('[data-close]');
        for (var i = 0; i < closers.length; i++) {
            closers[i].addEventListener('click', function () {
                closeModal(this.getAttribute('data-close'));
            });
        }
        // 点遮罩空白区关闭（事件目标为遮罩本身时）
        var masks = document.querySelectorAll('.modal-mask');
        for (var j = 0; j < masks.length; j++) {
            masks[j].addEventListener('click', function (e) {
                if (e.target === this) this.style.display = 'none';
            });
        }
    }

    /** 保存编辑/续费 */
    function bindSave() {
        document.getElementById('btn-saveEdit').addEventListener('click', saveEdit);
    }

    /** 初始化 */
    function init() {
        DataStore.init();        // 保证数据源就绪
        bindStatic();
        bindRowActions();
        bindModalClose();
        bindSave();
        renderTable();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
