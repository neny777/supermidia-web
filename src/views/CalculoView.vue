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
const isEditMode = ref(!!route.params.calculoId);

const tiposCalculo = [
    'AREA_BASE',
    'AREA_COM_FATOR',
    'AREA_COM_ACRESCIMOS_E_FATOR',
    'PERIMETRO_BASE',
    'PERIMETRO_COM_ESPACAMENTO',
    'UNIDADE_FIXA',
    'SELECAO_POR_MEDIDA',
    'QUANTIDADE_INFORMADA',
    'METRO_LINEAR_INFORMADO',
];

const basesOperacionais = [
    'AREA',
    'PERIMETRO',
    'LARGURA_SIMPLES',
    'LARGURA_DUPLA',
    'ALTURA_SIMPLES',
    'ALTURA_DUPLA',
    'QUANTIDADE_INFORMADA',
    'METRO_LINEAR_INFORMADO',
];

const schema = yup.object({
    nome: yup.string().required('Informe o nome do cálculo.').max(140, 'Máximo de 140 caracteres.'),
    tipoCalculo: yup.string().required('Selecione o tipo de cálculo.'),
    baseOperacional: yup.string().required('Selecione a base operacional.'),
});

const state = reactive({
    calculo: {
        nome: '',
        tipoCalculo: '',
        baseOperacional: '',
        permiteOverrideParametro: false,
        permiteOverrideResultado: false,
    },
    isProcessing: false,
    formReady: false,
});

const originalCalculoSnapshot = ref(null);

const normalizePayload = (values) => ({
    nome: values.nome ?? '',
    tipoCalculo: values.tipoCalculo ?? '',
    baseOperacional: values.baseOperacional ?? '',
    permiteOverrideParametro: Boolean(values.permiteOverrideParametro),
    permiteOverrideResultado: Boolean(values.permiteOverrideResultado),
});

const hasChanges = (newValues) => JSON.stringify(normalizePayload(newValues)) !== JSON.stringify(originalCalculoSnapshot.value);

onMounted(async () => {
    if (!isEditMode.value) {
        state.formReady = true;
        return;
    }

    try {
        state.isProcessing = true;
        const response = await axiosInstance.get(`/calculos/${route.params.calculoId}`);
        state.calculo = {
            nome: response.data.nome,
            tipoCalculo: response.data.tipoCalculo,
            baseOperacional: response.data.baseOperacional,
            permiteOverrideParametro: response.data.permiteOverrideParametro,
            permiteOverrideResultado: response.data.permiteOverrideResultado,
        };
        originalCalculoSnapshot.value = normalizePayload(state.calculo);
        state.formReady = true;
    } catch (error) {
        showToast("erro", "Erro ao carregar cálculo.");
        router.push('/calculos');
    } finally {
        state.isProcessing = false;
    }
});

const onSubmit = async (values, { resetForm }) => {
    const payload = normalizePayload(values);

    try {
        if (isEditMode.value) {
            if (!hasChanges(payload)) {
                showToast("info", "Não houve alterações no cálculo.");
                return;
            }

            const modal = showModal("Editar cálculo", "Confirma a edição do cálculo?", async () => {
                try {
                    state.isProcessing = true;
                    await axiosInstance.put(`/calculos/${route.params.calculoId}`, payload);
                    showToast("sucesso", "Cálculo editado com sucesso!");
                    router.push('/calculos');
                } catch (error) {
                    if (!error?.response) {
                        showToast("erro", "Erro ao salvar cálculo.");
                    }
                } finally {
                    state.isProcessing = false;
                    modal.hide();
                }
            });
            return;
        }

        state.isProcessing = true;
        await axiosInstance.post('/calculos', payload);
        showToast("sucesso", "Cálculo criado com sucesso!");
        resetForm();
        router.push('/calculos');
    } catch (error) {
        if (!error?.response) {
            showToast("erro", "Erro ao salvar cálculo.");
        }
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
                            <li class="breadcrumb-item active" aria-current="page">Produtos</li>
                            <li class="breadcrumb-item active" aria-current="page">Cálculos</li>
                            <li class="breadcrumb-item active" aria-current="page">Cálculo</li>
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
                                    <h5>{{ isEditMode ? 'Editar Cálculo' : 'Novo Cálculo' }}</h5>
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
                                <Form v-if="state.formReady" @submit="onSubmit" :validation-schema="schema" :initial-values="state.calculo">
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
                                                    <label for="tipoCalculo" class="col-form-label col-lg-3">Tipo</label>
                                                    <div class="col-lg-9">
                                                        <Field as="select" id="tipoCalculo" name="tipoCalculo" class="form-select">
                                                            <option value="">Selecione</option>
                                                            <option v-for="tipo in tiposCalculo" :key="tipo" :value="tipo">
                                                                {{ tipo }}
                                                            </option>
                                                        </Field>
                                                        <ErrorMessage name="tipoCalculo" class="text-danger" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="col-lg-6">
                                                <div class="row p-2">
                                                    <label for="baseOperacional" class="col-form-label col-lg-3">Base</label>
                                                    <div class="col-lg-9">
                                                        <Field as="select" id="baseOperacional" name="baseOperacional" class="form-select">
                                                            <option value="">Selecione</option>
                                                            <option v-for="base in basesOperacionais" :key="base" :value="base">
                                                                {{ base }}
                                                            </option>
                                                        </Field>
                                                        <ErrorMessage name="baseOperacional" class="text-danger" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="col-lg-6">
                                                <div class="row p-2">
                                                    <div class="col-lg-6">
                                                        <div class="form-check mt-2">
                                                            <Field id="permiteOverrideParametro" name="permiteOverrideParametro"
                                                                type="checkbox" :value="true" :unchecked-value="false"
                                                                class="form-check-input" />
                                                            <label class="form-check-label ms-2" for="permiteOverrideParametro">
                                                                Override parâmetro
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div class="col-lg-6">
                                                        <div class="form-check mt-2">
                                                            <Field id="permiteOverrideResultado" name="permiteOverrideResultado"
                                                                type="checkbox" :value="true" :unchecked-value="false"
                                                                class="form-check-input" />
                                                            <label class="form-check-label ms-2" for="permiteOverrideResultado">
                                                                Override resultado
                                                            </label>
                                                        </div>
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
                                            @click="router.push('/calculos')">
                                            <i class="bi bi-arrow-counterclockwise"></i>&nbsp;&nbsp;&nbsp;Voltar
                                        </button>
                                    </div>
                                </Form>
                                <div v-else class="p-4"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>
