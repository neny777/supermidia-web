<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Form, Field, ErrorMessage } from 'vee-validate';
import * as yup from 'yup';
import logo from '@/assets/img/supermidia-logo-291x226.png';
import { jwtDecode } from 'jwt-decode';
import axiosInstance from '@/axiosInstance.js';
const router = useRouter();
const errorMessage = ref('');
// Validação do formulário
const loginSchema = yup.object({
    email: yup.string().email('Formato de email inválido').required('O email é obrigatório'),
    password: yup.string().required('A senha é obrigatória'),
});
const login = async (values) => {
    try {
        const response = await axiosInstance.post('/authentication/login', values);
        const token = response.data.token;
        // Decodifica e salva o token e as permissões no localStorage
        if (token) {
            const decodedToken = jwtDecode(token);
            localStorage.setItem('token', token);
            localStorage.setItem('permissions', JSON.stringify(decodedToken.permissions));
            localStorage.removeItem('currentUser');
        }
        // Redireciona para a página home
        router.push({ name: 'home' }).then(() => {
            // Recarrega a página
            window.location.reload();
        });
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'Usuário e senha inválidos.';
    }
};
</script>
<template>
    <div class="login-page bg-body-secondary">
        <div class="login-box">
            <div class="text-center m-3">
                <img :src="logo" alt="Logo Image" class="supermidia-logo" />
                <span class="super">SUPER</span><span class="midia">MÍDIA</span>
            </div>
            <div class="card p-3">
                <div class="card-body login-card-body">
                    <h5 class="login-box-msg">Login</h5>
                    <Form :validation-schema="loginSchema" @submit="login">
                        <div class="input-group my-3">
                            <div class="input-group-text"><span class="bi bi-envelope"></span></div>
                            <Field name="email" type="email" class="form-control" placeholder="Email" />
                        </div>
                        <div>
                            <ErrorMessage name="email" class="text-danger" />
                        </div>
                        <div class="input-group my-3">
                            <div class="input-group-text"><span class="bi bi-lock-fill"></span></div>
                            <Field name="password" type="password" class="form-control" placeholder="Senha" />
                        </div>
                        <div>
                            <ErrorMessage name="password" class="text-danger" />
                        </div>
                        <p v-if="errorMessage" class="text-danger text-center mt-2">{{ errorMessage }}</p>
                        <div class="d-grid mt-5 gap-2">
                            <button type="submit" class="btn btn-primary">Login</button>
                        </div>
                    </Form>
                </div>
            </div>
        </div>
        <RouterLink to="/recover-password">
            <p class="mt-3">Redefinir senha</p>
        </RouterLink>
    </div>
</template>
