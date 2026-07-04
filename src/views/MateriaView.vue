<script setup>
import { reactive, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Form, Field, ErrorMessage } from 'vee-validate';
import '@/composables/custom-vee-validate';
import * as yup from 'yup';
import axiosInstance from '@/axiosInstance';
import { showModal } from '@/composables/modalUtils';
import { showToast } from '@/composables/toastUtils';

const route = useRoute();
const router = useRouter();
const isEditMode = ref(!!route.params.materiaId);

const schema = yup.object({
    nome: yup.string().required('Informe o nome da matéria.').max(140, 'Máximo de 140 caracteres.'),
    grupo: yup.string().max(40, 'Máximo de 40 caracteres.'),
    unidade: yup.string().required('Selecione a unidade.'),
    preco: yup.number()
        .typeError('Informe um preço válido.')
        .required('Informe o preço.')
        .moreThan(0, 'O preço deve ser maior que zero.'),
});

const state = reactive({
    materia: {
        nome: '',
        grupo: '',
        unidade: '',
        preco: '',
    },
    grupos: [],
    isProcessing: false,
    isReady: false,
});

const unidades = ['UN', 'M', 'M2', 'M3'];

const hasChanges = (newValues) => JSON.stringify(newValues) !== JSON.stringify({
    ...state.materia,
    grupo: state.materia.grupo ? state.materia.grupo.toUpperCase() : null,
});

onMounted(async () => {
    try {
        const gruposResponse = await axiosInstance.get('/materias/grupos');
        state.grupos = gruposResponse.data;
    } catch {
        state.grupos = [];
    }

    if (!isEditMode.value) {
        state.isReady = true;
        return;
    }

    state.isProcessing = true;
    try {
        const response = await axiosInstance.get(`/materias/${route.params.materiaId}`);
        state.materia = {
            nome: response.data.nome,
            grupo: response.data.grupo ?? '',
            unidade: response.data.unidade,
            preco: response.data.preco,
        };
        state.isReady = true;
    } catch (error) {
        showToast("erro", "Erro ao carregar matéria.");
        router.push('/materias');
    } finally {
        state.isProcessing = false;
    }
});

const onSubmit = async (values, { resetForm }) => {
    const payload = {
        nome: values.nome,
        grupo: values.grupo ? values.grupo.toUpperCase() : null,
        unidade: values.unidade,
        preco: values.preco,
    };

    try {
        if (isEditMode.value) {
            if (!hasChanges(payload)) {
                showToast("info", "Não houve alterações na matéria.");
                return;
            }

            const modal = showModal("Editar matéria", "Confirma a edição da matéria?", async () => {
                try {
                    state.isProcessing = true;
                    await axiosInstance.put(`/materias/${route.params.materiaId}`, payload);
                    showToast("sucesso", "Matéria editada com sucesso!");
                    router.push('/materias');
                } catch (error) {
                    showToast("erro", "Erro ao salvar matéria.");
                } finally {
                    state.isProcessing = false;
                    modal.hide();
                }
            });
            return;
        }

        state.isProcessing = true;
        await axiosInstance.post('/materias', payload);
        showToast("sucesso", "Matéria criada com sucesso!");
        resetForm();
        router.push('/materias');
    } catch (error) {
        showToast("erro", "Erro ao salvar matéria.");
    } finally {
        state.isProcessing = false;
    }
};
</script>

<template>
    <main class="app-main">
        <div class="app-content-header">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-lg-6">
                        <h5 class="mb-0">Cadastro</h5>
                    </div>
                    <div class="col-lg-6">
                        <ol class="breadcrumb float-sm-end">
                            <li class="breadcrumb-item">Cadastros</li>
                            <li class="breadcrumb-item active" aria-current="page">Insumos</li>
                            <li class="breadcrumb-item active" aria-current="page">Matérias</li>
                            <li class="breadcrumb-item active" aria-current="page">Matéria</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>

        <div class="app-content">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <div class="card-title">
                                    <h5>{{ isEditMode ? 'Editar Matéria' : 'Nova Matéria' }}</h5>
                                </div>
                            </div>

                            <div class="position-relative">
                                <div v-if="state.isProcessing"
                                    class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75"
                                    style="z-index: 10;">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Processando...</span>
                                    </div>
                                </div>
                                <Form v-if="state.isReady" @submit="onSubmit" :validation-schema="schema" :initial-values="state.materia">
                                    <div class="card-body my-4">
                                        <div class="row g-3 p-3">
                                            <div class="col-lg-6">
                                                <div class="row p-2">
                                                    <label for="nome" class="col-form-label col-lg-3">Nome</label>
                                                    <div class="col-lg-9">
                                                        <Field id="nome" name="nome" type="text" class="form-control" />
                                                        <ErrorMessage name="nome" class="text-danger" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-lg-6">
                                                <div class="row p-2">
                                                    <label for="grupo" class="col-form-label col-lg-3">Grupo</label>
                                                    <div class="col-lg-9">
                                                        <Field id="grupo" name="grupo" type="text" class="form-control"
                                                            list="grupos-existentes" placeholder="Ex.: LONAS, ADESIVOS (opcional)" />
                                                        <datalist id="grupos-existentes">
                                                            <option v-for="grupo in state.grupos" :key="grupo" :value="grupo" />
                                                        </datalist>
                                                        <ErrorMessage name="grupo" class="text-danger" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-lg-6">
                                                <div class="row p-2">
                                                    <label for="unidade" class="col-form-label col-lg-3">Unidade</label>
                                                    <div class="col-lg-9">
                                                        <Field as="select" id="unidade" name="unidade" class="form-select">
                                                            <option value="">Selecione</option>
                                                            <option v-for="unidade in unidades" :key="unidade" :value="unidade">
                                                                {{ unidade }}
                                                            </option>
                                                        </Field>
                                                        <ErrorMessage name="unidade" class="text-danger" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-lg-6">
                                                <div class="row p-2">
                                                    <label for="preco" class="col-form-label col-lg-3">Preço</label>
                                                    <div class="col-lg-9">
                                                        <Field id="preco" name="preco" type="number" step="0.01" min="0.01"
                                                            class="form-control" />
                                                        <ErrorMessage name="preco" class="text-danger" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="card-footer text-center">
                                        <button type="submit" class="btn btn-primary button-medium m-2">
                                            <i class="bi bi-floppy"></i>&nbsp;&nbsp;&nbsp;Salvar
                                        </button>
                                        <button type="button" class="btn btn-primary button-medium m-2"
                                            @click="router.push('/materias')">
                                            <i class="bi bi-arrow-counterclockwise"></i>&nbsp;&nbsp;&nbsp;Voltar
                                        </button>
                                    </div>
                                </Form>
                                <div v-else class="card-body my-4" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>
