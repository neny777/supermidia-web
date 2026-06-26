<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Form, Field, ErrorMessage } from 'vee-validate';
import * as yup from 'yup';
import logo from '@/assets/img/supermidia-logo-291x226.png';
import { showToast } from '@/composables/toastUtils';
import axiosInstance from '@/axiosInstance.js';
const router = useRouter();
const errorMessage = ref('');
const isLoading = ref(false);
const email = ref(router.currentRoute.value.query.email);
const codeSchema = yup.object({
  code: yup.string().required('O código é obrigatório'),
});
const submitCode = async (values) => {
  isLoading.value = true;  
  try {
    // Envia o código e o email no corpo da requisição
    const response = await axiosInstance.post('/password/validate-reset-code', {
      code: values.code,
      email: email.value,
    });
    showToast("sucesso", "Código de recuperação válidado com sucesso.");
    router.push({ name: 'recover-password-reset', query: { email: email.value } });
  } catch (error) {
    console.error("Erro ao submenter código de validação: ", error); // Log de erro
    showToast("erro", error.response?.data?.message || "Código de recuperação inválido.");
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
          <h5 class="login-box-msg">Código</h5>
          <Form :validation-schema="codeSchema" @submit="submitCode">
            <div class="input-group my-3">
              <div class="input-group-text"><i class="bi bi-upc-scan"></i></div>
              <Field name="code" type="text" class="form-control" placeholder="Código" />              
            </div>
            <div>
              <ErrorMessage name="code" class="text-danger" />
            </div>
            <div class="d-grid mt-5 gap-2">
              <button type="submit" class="btn btn-primary">Enviar</button>
            </div>
          </Form>
          <p v-if="errorMessage" class="text-danger mt-2">{{ errorMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
