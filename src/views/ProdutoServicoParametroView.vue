<script setup>
import { reactive, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Form, Field, ErrorMessage } from 'vee-validate';
import '@/composables/custom-vee-validate';
import * as yup from 'yup';
import axiosInstance from '@/axiosInstance';
import { showModal } from '@/composables/modalUtils';
import { showToast } from '@/composables/toastUtils';
import {
    codigosParametro,
    createParametro,
    metadataParametro,
    normalizeProdutoPayload,
    permiteZero,
} from '@/composables/produtoFormUtils';

const route = useRoute();
const router = useRouter();
const isEditMode = ref(route.params.parametroIndex !== undefined);

const state = reactive({
    produto: null,
    parametro: createParametro(),
    isProcessing: false,
    formReady: false,
});

const originalSnapshot = ref(null);

const schema = yup.object({
    codigo: yup.string().required('Selecione o parâmetro.'),
    valor: yup.number().typeError('Informe um valor válido.').required('Informe o valor.')
        .test('valor-valido', function (value) {
            const codigo = this.parent.codigo;
            if (value == null || value === '') {
                return true;
            }
            if (permiteZero(codigo)) {
                return value >= 0 || this.createError({ message: `O parâmetro ${codigo} não pode ser negativo.` });
            }
            return value > 0 || this.createError({ message: `O parâmetro ${codigo} precisa ser maior que zero.` });
        }),
});

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

const validarDuplicidade = (parametros, codigo, parametroIndexAtual) => {
    return parametros.some((parametro, index) => parametro.codigo === codigo && index !== parametroIndexAtual);
};

onMounted(async () => {
    try {
        state.isProcessing = true;
        const response = await axiosInstance.get(`/produtos/${route.params.produtoId}`);
        state.produto = response.data;

        const item = state.produto.servicosCalculo?.[Number(route.params.itemIndex)];
        if (!item) {
            showToast('erro', 'Serviço do produto não encontrado.');
            router.push({ name: 'produto', params: { produtoId: route.params.produtoId } });
            return;
        }

        if (isEditMode.value) {
            const parametro = item.parametros?.[Number(route.params.parametroIndex)];
            if (!parametro) {
                showToast('erro', 'Parâmetro não encontrado.');
                router.push({ name: 'produto-servico-editar', params: { produtoId: route.params.produtoId, itemIndex: route.params.itemIndex } });
                return;
            }
            state.parametro = { ...parametro };
        }

        originalSnapshot.value = JSON.stringify(state.parametro);
        state.formReady = true;
    } catch {
        showToast('erro', 'Erro ao carregar parâmetro.');
        router.push('/produtos');
    } finally {
        state.isProcessing = false;
    }
});

const onSubmit = async (values) => {
    try {
        if (isEditMode.value && JSON.stringify(values) === originalSnapshot.value) {
            showToast('info', 'Não houve alterações no parâmetro.');
            return;
        }

        const itemIndex = Number(route.params.itemIndex);
        const parametroIndexAtual = isEditMode.value ? Number(route.params.parametroIndex) : -1;
        const servicosCalculo = [...(state.produto.servicosCalculo || [])];
        const item = { ...servicosCalculo[itemIndex] };
        const parametros = [...(item.parametros || [])];

        if (validarDuplicidade(parametros, values.codigo, parametroIndexAtual)) {
            showToast('erro', `O parâmetro ${values.codigo} já foi informado para este serviço do produto.`);
            return;
        }

        if (isEditMode.value) {
            parametros[parametroIndexAtual] = values;
        } else {
            parametros.push(values);
        }

        item.parametros = parametros;
        servicosCalculo[itemIndex] = item;

        const salvar = async () => {
            state.isProcessing = true;
            await axiosInstance.put(`/produtos/${route.params.produtoId}`, normalizeProdutoPayload({
                ...state.produto,
                servicosCalculo,
            }));
            showToast('sucesso', isEditMode.value ? 'Parâmetro editado com sucesso!' : 'Parâmetro criado com sucesso!');
            router.push({ name: 'produto-servico-editar', params: { produtoId: route.params.produtoId, itemIndex: route.params.itemIndex } });
        };

        if (isEditMode.value) {
            const modal = showModal('Editar parâmetro', 'Confirma a edição deste parâmetro?', async () => {
                try {
                    await salvar();
                } catch (error) {
                    showToast('erro', getErrorMessage(error, 'Erro ao salvar parâmetro.'));
                } finally {
                    state.isProcessing = false;
                    modal.hide();
                }
            });
            return;
        }

        await salvar();
    } catch (error) {
        showToast('erro', getErrorMessage(error, 'Erro ao salvar parâmetro.'));
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
                            <li class="breadcrumb-item active">Produtos</li>
                            <li class="breadcrumb-item active">Produto</li>
                            <li class="breadcrumb-item active">Serviço</li>
                            <li class="breadcrumb-item active">Parâmetro</li>
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
                                    <h5>{{ isEditMode ? 'Editar Parâmetro' : 'Novo Parâmetro' }}</h5>
                                </div>
                            </div>
                            <div class="position-relative">
                                <div v-if="state.isProcessing" class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75" style="z-index: 10;">
                                    <div class="spinner-border text-primary" role="status"></div>
                                </div>

                                <Form v-if="state.formReady" @submit="onSubmit" :validation-schema="schema" :initial-values="state.parametro" v-slot="{ values }">
                                    <div class="card-body my-4">
                                        <div class="row g-3 p-3">
                                            <div class="col-lg-6">
                                                <div class="row p-2">
                                                    <label class="col-form-label col-lg-3">Parâmetro</label>
                                                    <div class="col-lg-9">
                                                        <Field name="codigo" as="select" class="form-select">
                                                            <option value="">Selecione</option>
                                                            <option v-for="codigo in codigosParametro" :key="codigo" :value="codigo">{{ codigo }}</option>
                                                        </Field>
                                                        <ErrorMessage name="codigo" class="text-danger d-block mt-1" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-lg-6">
                                                <div class="row p-2">
                                                    <label class="col-form-label col-lg-3">Valor</label>
                                                    <div class="col-lg-9">
                                                        <div :class="metadataParametro[values.codigo]?.unidade ? 'input-group' : ''">
                                                            <Field name="valor" type="number" step="0.0001" class="form-control"
                                                                :placeholder="metadataParametro[values.codigo]?.placeholder || 'Informe o valor'" />
                                                            <span v-if="metadataParametro[values.codigo]?.unidade" class="input-group-text">
                                                                {{ metadataParametro[values.codigo]?.unidade }}
                                                            </span>
                                                        </div>
                                                        <ErrorMessage name="valor" class="text-danger d-block mt-1" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="card-footer text-center">
                                        <button type="submit" class="btn btn-primary button-medium m-2">
                                            <i class="bi bi-floppy"></i>&nbsp;&nbsp;&nbsp;Salvar
                                        </button>
                                        <button type="button" class="btn btn-primary button-medium m-2" @click="router.push({ name: 'produto-servico-editar', params: { produtoId: route.params.produtoId, itemIndex: route.params.itemIndex } })">
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
