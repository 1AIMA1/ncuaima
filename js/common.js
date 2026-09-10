/* ============================================================
 *  园区后台管理系统 —— 公共脚本
 *  /js/common.js
 *  公共布局交互：菜单折叠、菜单高亮、页面跳转
 *  ============================================================ */

/**
 * 初始化公共布局
 *  - 绑定一级菜单点击：折叠/展开子菜单
 *  - 根据当前页面文件名，自动给对应菜单项添加 active
 *  - 二级菜单点击跳转到对应页面
 *
 * 每个 HTML 页面在 body 末尾引入本脚本即可自动执行。
 */
function initCommonLayout() {
    bindMenuToggle();        // 一级菜单折叠
    highlightCurrentMenu();  // 当前页菜单高亮
    bindSubmenuJump();       // 二级菜单跳转
}

/**
 * 一级菜单折叠/展开
 * 点击带子菜单的父项，切换 .expanded，CSS 控制子菜单显示隐藏。
 */
function bindMenuToggle() {
    var parentItems = document.querySelectorAll('.menu-item.has-sub');
    for (var i = 0; i < parentItems.length; i++) {
        parentItems[i].addEventListener('click', function () {
            this.classList.toggle('expanded');
        });
    }
}

/**
 * 根据当前页面文件名高亮菜单
 * 约定：data-key 与文件名（不含 .html）对应，
 *      如 index.html -> data-key="index"，monthCard.html -> data-key="monthCard"。
 */
function highlightCurrentMenu() {
    var currentPage = getCurrentPageName();
    if (!currentPage) return;

    // 一级菜单（data-key 与页面文件名相同）
    var topItems = document.querySelectorAll('.menu-item[data-key]');
    for (var i = 0; i < topItems.length; i++) {
        if (topItems[i].getAttribute('data-key') === currentPage) {
            topItems[i].classList.add('active');
            if (topItems[i].classList.contains('has-sub')) {
                topItems[i].classList.add('expanded');
            }
        }
    }

    // 二级菜单
    var subItems = document.querySelectorAll('.submenu-item[data-key]');
    for (var j = 0; j < subItems.length; j++) {
        if (subItems[j].getAttribute('data-key') === currentPage) {
            subItems[j].classList.add('active');
            // 自动展开所在的父级一级菜单
            var parentMenu = subItems[j].parentElement.previousElementSibling;
            if (parentMenu && parentMenu.classList.contains('menu-item')) {
                parentMenu.classList.add('expanded');
            }
        }
    }
}

/**
 * 二级菜单点击跳转
 */
function bindSubmenuJump() {
    var subItems = document.querySelectorAll('.submenu-item[data-href]');
    for (var i = 0; i < subItems.length; i++) {
        subItems[i].addEventListener('click', function () {
            var href = this.getAttribute('data-href');
            if (href) {
                window.location.href = href;
            }
        });
    }

    // 一级菜单（如工作台）也可点击跳转
    var topItems = document.querySelectorAll('.menu-item[data-href]');
    for (var k = 0; k < topItems.length; k++) {
        topItems[k].addEventListener('click', function () {
            var href = this.getAttribute('data-href');
            if (href) {
                window.location.href = href;
            }
        });
    }
}

/**
 * 获取当前页面的 key（去掉 .html 后缀）
 */
function getCurrentPageName() {
    var path = window.location.pathname;
    var file = path.substring(path.lastIndexOf('/') + 1);
    if (!file) return 'index';
    return file.replace(/\.html?$/i, '');
}

// DOM 就绪后自动初始化（兼容直接调用与延时调用）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommonLayout);
} else {
    initCommonLayout();
}
