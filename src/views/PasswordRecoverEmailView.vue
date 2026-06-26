<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Form, Field, ErrorMessage } from 'vee-validate';
import * as yup from 'yup';
import logo from '@/assets/img/supermidia-logo-291x226.png';
import { showToast } from '@/composables/toastUtils';
import axiosInstance from '@/axiosInstance.js';
const router = useRouter();
const errorMessage = ref('');
const isLoading = ref(false);
const emailSchema = yup.object({
  email: yup.string().email('Formato de email inválido').required('O email é obrigatório'),
});
const submitEmail = async (values) => {
  isLoading.value = true;  
  try {
    const response = await axiosInstance.post('/password/send-reset-code', values);
    showToast("sucesso", "Código de recuperação enviado para o e-mail informado.");
    router.push({ name: 'recover-password-code', query: { email: values.email } });
  } catch (error) {
    console.error("Erro ao submenter email:", error); // Log de erro
    showToast("erro", error.response?.data?.message || "Ocorreu um erro ao tentar enviar o email.");
  } finally {
    isLoading.value = false;
  }
};
</script>
<template>
  <div class="login-page bg-body-secondary">
    <div class="login-box">
      <div class="text-center m-3">
        <img :src="logo" alt="Logo Image" class="supermidia-logo">
        <span class="super">SUPER</span><span class="midia">MÍDIA</span>
      </div>
      <div class="card p-3">
        <div class="card-body login-card-body">
          <h5 class="login-box-msg">Usuário</h5>
          <div v-if="isLoading" class="text-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden"> Processando...</span>
            </div>
          </div>
          <div v-else>
            <Form :validation-schema="emailSchema" @submit="submitEmail">
              <div class="input-group my-3">
                <div class="input-group-text"><span class="bi bi-envelope"></span></div>
                <Field name="email" type="email" class="form-control" placeholder="Email" />
              </div>
              <div>
                <ErrorMessage name="email" class="text-danger" />
              </div>
              <div class="d-grid mt-5 gap-2">
                <button type="submit" class="btn btn-primary">Enviar</button>
              </div>
            </Form>
          </div>
          <p v-if="errorMessage" class="text-danger mt-2">{{ errorMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
