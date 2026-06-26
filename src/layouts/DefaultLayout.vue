<script setup>
import Navbar from '@/components/Navbar.vue';
import Sidebar from '@/components/Sidebar.vue';
import ConfirmationModal from '@/components/ConfirmationModal.vue';
import ToastManager from '@/components/ToastManager.vue';
import Footer from '@/components/Footer.vue';
import { RouterView } from 'vue-router';
</script>
<template>
  <div class="app-wrapper"> <!--begin::Header-->    
    <Navbar />
    <Sidebar />
    <RouterView />
    <ConfirmationModal />
    <ToastManager />
    <Footer></Footer>
  </div> <!--end::App Wrapper-->
</template>