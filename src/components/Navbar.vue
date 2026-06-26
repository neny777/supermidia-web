<script setup>
import { computed, onMounted, ref } from 'vue';
import { useTheme } from '@/composables/useTheme';
import { useRouter } from 'vue-router';
import axiosInstance from '@/axiosInstance';
import { showToast } from '@/composables/toastUtils';

const router = useRouter();
const { theme, setTheme } = useTheme();
const currentUser = ref(loadCachedUser());

const displayName = computed(() => formatDisplayName(currentUser.value?.name) || 'Usuário');
const displayEmail = computed(() => currentUser.value?.email || '');
const avatarUrl = computed(() => currentUser.value?.photoUrl || '');
const userInitials = computed(() => extractInitials(displayName.value));

onMounted(() => {
    refreshCurrentUser();
});

function toggleSidebar() {
    const isDesktop = window.innerWidth >= 992;
    if (isDesktop) {
        document.body.classList.toggle('sidebar-collapse');
        document.body.classList.remove('sidebar-open');
        return;
    }

    document.body.classList.toggle('sidebar-open');
}

async function logout() {
    try {
        // Envia o logout ao backend
        await axiosInstance.post('/authentication/logout');

        // Remove os tokens do armazenamento local
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');

        // Redireciona para a página de login
        router.push('/');
    } catch (error) {
        showToast('erro', 'Erro ao encerrar a sessão.');
    }
}

function loadCachedUser() {
    try {
        const cachedUser = localStorage.getItem('currentUser');
        return cachedUser ? JSON.parse(cachedUser) : null;
    } catch {
        return null;
    }
}

async function refreshCurrentUser() {
    try {
        const { data } = await axiosInstance.get('/usuarios/me');
        const profile = mapUserProfile(data);
        currentUser.value = profile;
        localStorage.setItem('currentUser', JSON.stringify(profile));
    } catch {
        // Mantém o cache local se a atualização falhar.
    }
}

function mapUserProfile(usuarioData) {
    return {
        name: usuarioData?.nome || '',
        email: usuarioData?.email || '',
        photoUrl: resolvePhotoUrl(usuarioData),
    };
}

function resolvePhotoUrl(usuarioData) {
    return usuarioData?.fotoUrl
        || usuarioData?.foto
        || usuarioData?.avatarUrl
        || usuarioData?.imagem
        || '';
}

function formatDisplayName(name) {
    if (!name) {
        return '';
    }

    const parts = name
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1));

    if (parts.length <= 2) {
        return parts.join(' ');
    }

    return parts
        .map((part, index) => {
            const isFirst = index === 0;
            const isLast = index === parts.length - 1;
            return isFirst || isLast ? part : `${part.charAt(0)}.`;
        })
        .join(' ');
}

function extractInitials(name) {
    const parts = (name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length === 0) {
        return 'US';
    }

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
</script>
<template>
    <nav class="app-header navbar navbar-expand bg-body"> <!--begin::Container-->
        <!--<nav class="app-header navbar navbar-expand bg-white"> begin::Container-->
        <div class="container-fluid"> <!--begin::Start Navbar Links-->
            <ul class="navbar-nav">
                <li class="nav-item"> <a class="nav-link" data-lte-toggle="sidebar" href="#" role="button" @click.prevent="toggleSidebar"> <i
                            class="bi bi-list"></i> </a> </li>
                <li class="nav-item d-none d-md-block">
                    <RouterLink to="/home" class="nav-link">Home</RouterLink>
                </li>
            </ul> <!--end::Start Navbar Links--> <!--begin::End Navbar Links-->
            <ul class="navbar-nav ms-auto"><!--begin::Notifications Dropdown Menu-->
                <li class="nav-item dropdown">
                    <a class="nav-link" data-bs-toggle="dropdown" href="#">
                        <i class="bi bi-bell-fill"></i>
                        <span class="navbar-badge badge text-bg-warning">15</span>
                    </a>
                    <div class="dropdown-menu dropdown-menu-lg dropdown-menu-end">
                        <span class="dropdown-item dropdown-header">15 Notifications</span>
                        <div class="dropdown-divider"></div>
                        <a href="#" class="dropdown-item">
                            <i class="bi bi-envelope-fill me-2"></i> 4 new messages
                            <span class="float-end text-secondary fs-7">3 mins</span>
                        </a>
                        <div class="dropdown-divider"></div>
                        <a href="#" class="dropdown-item">
                            <i class="bi bi-people-fill me-2"></i> 8 friend requests
                            <span class="float-end text-secondary fs-7">12 hours</span>
                        </a>
                        <div class="dropdown-divider"></div>
                        <a href="#" class="dropdown-item">
                            <i class="bi bi-file-earmark-fill me-2"></i> 3 new reports
                            <span class="float-end text-secondary fs-7">2 days</span>
                        </a>
                        <div class="dropdown-divider"></div>
                        <a href="#" class="dropdown-item dropdown-footer"> See All Notifications </a>
                    </div>
                </li>
                <!--end::Notifications Dropdown Menu--><!--begin::Fullscreen Toggle-->
                <li class="nav-item"> <a class="nav-link" href="#" data-lte-toggle="fullscreen"> <i
                            data-lte-icon="maximize" class="bi bi-arrows-fullscreen"></i> <i data-lte-icon="minimize"
                            class="bi bi-fullscreen-exit" style="display: none;"></i> </a>
                </li> <!--end::Fullscreen Toggle-->
                <!--begin::Color Mode Menu Dropdown-->
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item dropdown">
                        <button
                            class="btn btn-link nav-link py-2 px-0 px-lg-2 dropdown-toggle d-flex align-items-center"
                            id="bd-theme" type="button" aria-expanded="false" data-bs-toggle="dropdown"
                            data-bs-display="static">
                            <span class="theme-icon-active">
                                <i
                                    :class="theme === 'light' ? 'bi bi-sun' : theme === 'dark' ? 'bi bi-moon' : 'bi bi-circle-half'"></i>
                            </span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="bd-theme-text">
                            <li>
                                <button type="button" class="dropdown-item d-flex align-items-center"
                                    :class="{ active: theme === 'light' }" @click="setTheme('light')">
                                    <i class="bi bi-sun me-2"></i>
                                    Light
                                </button>
                            </li>
                            <li>
                                <button type="button" class="dropdown-item d-flex align-items-center"
                                    :class="{ active: theme === 'dark' }" @click="setTheme('dark')">
                                    <i class="bi bi-moon me-2"></i>
                                    Dark
                                </button>
                            </li>
                            <li>
                                <button type="button" class="dropdown-item d-flex align-items-center"
                                    :class="{ active: theme === 'auto' }" @click="setTheme('auto')">
                                    <i class="bi bi-circle-half me-2"></i>
                                    Auto
                                </button>
                            </li>
                        </ul>
                    </li>
                </ul>

                <li class="nav-item"> <a class="nav-link" href="#" @click="logout"><i class="bi bi-door-closed-fill"></i></a>
                </li>
                <!--end::Color Mode Menu Dropdown--><!--begin::User Menu Dropdown-->
                <li class="nav-item dropdown user-menu"> <a href="#" class="nav-link dropdown-toggle"
                        data-bs-toggle="dropdown">
                        <img v-if="avatarUrl" :src="avatarUrl" class="user-image rounded-circle shadow"
                            alt="Foto do colaborador">
                        <div v-else class="user-image user-initials rounded-circle shadow">
                            {{ userInitials }}
                        </div>
                        <span class="d-none d-md-inline">{{ displayName }}</span>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-lg dropdown-menu-end"> <!--begin::User Image-->
                        <li class="user-header text-bg-primary">
                            <img v-if="avatarUrl" :src="avatarUrl" class="rounded-circle shadow"
                                alt="Foto do colaborador">
                            <div v-else class="user-header-initials rounded-circle shadow">
                                {{ userInitials }}
                            </div>
                            <p>
                                {{ displayName }}
                                <small>{{ displayEmail }}</small>
                            </p>
                        </li> <!--end::User Image--> <!--begin::Menu Body-->
                        <li class="user-footer">
                            <a href="#" class="btn btn-default btn-flat float-end" @click.prevent="logout">Sair</a>
                        </li>
                        <!--end::Menu Footer-->
                    </ul>
                </li> <!--end::User Menu Dropdown-->
            </ul> <!--end::End Navbar Links-->
        </div> <!--end::Container-->
    </nav> <!--end::Header--> <!--begin::Sidebar-->
</template>
<style scoped>
.user-initials,
.user-header-initials {
    align-items: center;
    background-color: #0d6efd;
    color: #fff;
    display: inline-flex;
    font-weight: 600;
    justify-content: center;
    text-transform: uppercase;
}

.user-initials {
    font-size: 0.75rem;
}

.user-header-initials {
    font-size: 1.25rem;
    height: 90px;
    margin: 0 auto 0.5rem;
    width: 90px;
}
</style>
