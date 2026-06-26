<script setup>
import logo from '@/assets/img/supermidia-logo-291x226.png';
</script>
<template>
  <div class="error-page bg-body-secondary">
    <div class="error-box">
      <div class="text-center m-3">
        <img :src="logo" alt="Logo Image" class="supermidia-logo">
        <span class="super">SUPER</span><span class="midia">MÍDIA</span>
      </div>
      <div class="card p-3">
        <div class="card-body text-center p-5">
          <h5 class="mt-3"><i class="bi bi-exclamation-diamond icon-error"></i>Erro de Conexão</h5>
          <p class="mt-3">Não foi possível estabelecer conexão com o servidor</p>
        </div>
        <!--
        <div class="card-footer text-center">
          <button type="button" class="btn btn-primary button-medium m-2"><i
              class="bi bi-arrow-counterclockwise"></i>&nbsp;&nbsp;&nbsp;Voltar</button>
        </div>
        -->
      </div>
    </div>
  </div>
</template>
