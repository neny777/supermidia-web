<script setup>
import { useToasts } from '@/composables/toastUtils'

const { toasts, removeToast } = useToasts()
</script>

<template>
  <div class="toast-container position-absolute 
              top-0 start-50 
              translate-middle-x p-3">
    <div v-for="toast in toasts" :key="toast.id" 
         class="toast show" role="alert" aria-live="assertive"
         aria-atomic="true" :class="{
           'toast-success': toast.type === 'sucesso',
           'toast-danger': toast.type === 'erro',
           'toast-info': toast.type === 'info',
         }">
      <div class="toast-header">
        <strong class="me-auto">{{ toast.type.toUpperCase() }}</strong>
        <button type="button" class="btn-close" @click="removeToast(toast.id)" aria-label="Close"></button>
      </div>
      <div class="toast-body">{{ toast.message }}</div>
    </div>
  </div>
</template>