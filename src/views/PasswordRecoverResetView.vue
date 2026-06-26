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
const resetSchema = yup.object({
  password: yup.string().required('A senha é obrigatória').min(6, 'A senha deve ter no mínimo 6 caracteres'),
  confirmPassword: yup.string().oneOf([yup.ref('password')], 'As senhas não correspondem').required('A confirmação de senha é obrigatória'),
});
const submitPassword = async (values) => {
  isLoading.value = true;

  try {
    const payload = {
      email: email.value,
      newPassword: values.password,
    };
    const response = await axiosInstance.post('/password/update-password', payload);
    showToast("sucesso", "Senha redefinida com sucesso.");
    router.push({ name: 'login' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    showToast("erro", error.response?.data?.message || "Erro ao redefinir senha.");
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
          <h5 class="login-box-msg">Nova Senha</h5>
          <Form :validation-schema="resetSchema" @submit="submitPassword">
            <div class="input-group my-3">
              <div class="input-group-text"><span class="bi bi-lock"></span></div>
              <Field name="password" type="password" class="form-control" placeholder="Senha" />
            </div>
            <div>
              <ErrorMessage name="password" class="text-danger" />
            </div>
            <div class="input-group my-3">
              <div class="input-group-text">
                <span class="bi bi-lock"></span>
              </div>
              <Field name="confirmPassword" type="password" class="form-control" placeholder="Confirmar Senha" />

            </div>
            <ErrorMessage name="confirmPassword" class="text-danger" />
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
