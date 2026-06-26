<script setup>
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import SimpleLayout from '@/layouts/SimpleLayout.vue';
const route = useRoute();
const layouts = {
  DefaultLayout,
  SimpleLayout,
};
const LayoutComponent = computed(() => layouts[route.meta.layout || 'DefaultLayout']);
</script>
<template>
   <component :is="LayoutComponent" />
</template>
