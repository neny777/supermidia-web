<script setup>
import logo from '@/assets/img/supermidia-logo-291x226.png';
import { ref, onMounted, computed } from 'vue';

// Configuração do menu
const menuConfig = [
    {
        name: "Cadastros",
        icon: "bi bi-pencil-square",
        children: [
            {
                name: "Pessoas",
                icon: "bi bi-people",
                children: [
                    { name: "Clientes", path: "/clientes", permission: "clientes", icon: "bi bi-people" },
                    { name: "Fornecedores", path: "/fornecedores", permission: "fornecedores", icon: "bi bi-people" },
                    { name: "Parceiros", path: "/parceiros", permission: "parceiros", icon: "bi bi-people" },
                    { name: "Colaboradores", path: "/colaboradores", permission: "colaboradores", icon: "bi bi-people" },
                    { name: "Usuários", path: "/usuarios", permission: "usuarios", icon: "bi bi-people" },
                ],
            },
            {
                name: "Insumos",
                icon: "bi bi-columns-gap",
                children: [
                    { name: "Matérias", path: "/materias", permission: "materias", icon: "bi bi-box2" },
                    { name: "Serviços", path: "/servicos", permission: "servicos", icon: "bi bi-tools" },
                ]
            },
            {
                name: "Produtos",
                icon: "bi bi-box-seam",
                children: [
                    { name: "Produtos Base", path: "/produtos", permission: "produtos", icon: "bi bi-box2-heart" },
                    { name: "Cálculos", path: "/calculos", permission: "produtos", icon: "bi bi-calculator" },
                ]
            },
        ],
    },
];

// Função recursiva para filtrar menus
const filterMenu = (menu, permissions) => {
    return menu
        .map((item) => {
            if (item.children) {
                // Filtra as children recursivamente
                const filteredChildren = filterMenu(item.children, permissions);
                // Retorna o item se ele tiver children visíveis ou se ele mesmo tiver permissão
                if (filteredChildren.length > 0 || permissions.includes(item.permission)) {
                    return { ...item, children: filteredChildren };
                }
                return null;
            }
            // Retorna o item se o usuário tiver a permissão
            return permissions.includes(item.permission) ? item : null;
        })
        .filter((item) => item !== null);
};
// Menus filtrados
const filteredMenu = computed(() => {
    const result = filterMenu(menuConfig, userPermissions.value);
    return result;
});
// Variável reativa para armazenar permissões
const userPermissions = ref([]);
const openMenus = ref(new Set());
const openSubMenus = ref(new Set());

function toggleMenu(menuName) {
    if (openMenus.value.has(menuName)) {
        openMenus.value.delete(menuName);
    } else {
        openMenus.value.add(menuName);
    }
}

function isMenuOpen(menuName) {
    return openMenus.value.has(menuName);
}

function subMenuKey(menuName, subMenuName) {
    return `${menuName}::${subMenuName}`;
}

function toggleSubMenu(menuName, subMenuName) {
    const key = subMenuKey(menuName, subMenuName);
    if (openSubMenus.value.has(key)) {
        openSubMenus.value.delete(key);
    } else {
        openSubMenus.value.add(key);
    }
}

function isSubMenuOpen(menuName, subMenuName) {
    return openSubMenus.value.has(subMenuKey(menuName, subMenuName));
}

// Recupera as permissões ao carregar o componente
onMounted(() => {
    const storedPermissions = localStorage.getItem('permissions');
    if (storedPermissions) {
        const rawPermissions = JSON.parse(storedPermissions);
        userPermissions.value = (rawPermissions || [])
            .map((permission) => String(permission).replace(/^ROLE_/i, '').toLowerCase());
    }
});
</script>
<template>
    <!--begin::Sidebar-->
    <aside class="app-sidebar bg-body"> <!--begin::Sidebar Brand-->
        <div class="sidebar-brand"> <!--begin::Brand Link-->
            <RouterLink to="/home" class="text-decoration-none text-reset">
                <!--begin::Brand Image--> <img :src="logo" alt="SuperMídia Logo" class="supermidia-logo-bar">
                <!--end::Brand Image--> <!--begin::Brand Text--> <span class="super-bar">SUPER</span><span
                    class="midia-bar">MÍDIA</span>
                <!--end::Brand Text-->
            </RouterLink> <!--end::Brand Link-->
        </div> <!--end::Sidebar Brand--> <!--begin::Sidebar Wrapper-->
        <div class="sidebar-wrapper">
            <nav class="mt-2"> <!--begin::Sidebar Menu-->
                <ul class="nav sidebar-menu flex-column" data-lte-toggle="treeview" role="menu" data-accordion="false">
                    <li class="nav-header text-center">
                        <h5>MENU</h5>
                    </li>
                    <!-- Renderizar menus dinamicamente -->
                    <li v-for="menu in filteredMenu" :key="menu.name" class="nav-item"
                        :class="{ 'menu-open': isMenuOpen(menu.name) }">
                        <!-- Menu principal -->
                        <a v-if="!menu.children || menu.children.length === 0" href="#" class="nav-link">
                            <i :class="menu.icon"></i>
                            <p>{{ menu.name }}</p>
                        </a>
                        <!-- Menu principal com submenus -->
                        <a v-else href="#" class="nav-link" @click.prevent="toggleMenu(menu.name)">
                            <i :class="menu.icon"></i>
                            <p>
                                {{ menu.name }}
                                <i class="nav-arrow bi bi-chevron-right"></i>
                            </p>
                        </a>
                        <!-- Submenus -->
                        <ul v-if="menu.children && menu.children.length > 0" class="nav nav-treeview ms-3"
                            :style="{ display: isMenuOpen(menu.name) ? 'block' : 'none' }">
                            <li v-for="submenu in menu.children" :key="submenu.name" class="nav-item"
                                :class="{ 'menu-open': isSubMenuOpen(menu.name, submenu.name) }">
                                <!-- Submenu sem filhos -->
                                <RouterLink v-if="submenu.path" :to="submenu.path" class="nav-link">
                                    <i :class="submenu.icon"></i>
                                    <p>{{ submenu.name }}</p>
                                </RouterLink>
                                <!-- Submenu com filhos -->
                                <a v-else href="#" class="nav-link" @click.prevent="toggleSubMenu(menu.name, submenu.name)">
                                    <i :class="submenu.icon"></i>
                                    <p>
                                        {{ submenu.name }}
                                        <i class="nav-arrow bi bi-chevron-right"></i>
                                    </p>
                                </a>
                                <ul v-if="submenu.children && submenu.children.length > 0"
                                    class="nav nav-treeview ms-3"
                                    :style="{ display: isSubMenuOpen(menu.name, submenu.name) ? 'block' : 'none' }">
                                    <li v-for="child in submenu.children" :key="child.name" class="nav-item">
                                        <RouterLink :to="child.path" class="nav-link">
                                            <i :class="child.icon"></i>
                                            <p>{{ child.name }}</p>
                                        </RouterLink>
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    </li>
                </ul> <!--end::Sidebar Menu-->
            </nav>
        </div> <!--end::Sidebar Wrapper-->
    </aside> <!--end::Sidebar-->
</template>
