<script setup>
import Navbar from '@/components/Navbar.vue';
import Sidebar from '@/components/Sidebar.vue';
import ConfirmationModal from '@/components/ConfirmationModal.vue';
import ToastManager from '@/components/ToastManager.vue';
import Footer from '@/components/Footer.vue';
import { RouterView } from 'vue-router';
</script>
<template>
    <div class="app-wrapper">
        <!--begin::Header-->
        <Navbar />
        <Sidebar />
        <!-- key por fullPath: força remontagem quando só os params mudam (evita telas "presas") -->
        <RouterView :key="$route.fullPath" />
        <ConfirmationModal />
        <ToastManager />
        <Footer></Footer>
    </div>
    <!--end::App Wrapper-->
</template>
