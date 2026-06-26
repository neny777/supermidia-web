<script setup>
import ToastManager from '@/components/ToastManager.vue';
import Footer from '@/components/Footer.vue';
import { RouterView } from 'vue-router';
</script>
<template>
    <router-view />
    <ToastManager />
    <Footer></Footer>
</template>