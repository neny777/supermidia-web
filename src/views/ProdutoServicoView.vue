<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Form, Field, ErrorMessage } from 'vee-validate';
import '@/composables/custom-vee-validate';
import axiosInstance from '@/axiosInstance';
import { showModal } from '@/composables/modalUtils';
import { showToast } from '@/composables/toastUtils';
import {
    buildItemSchema,
    createServicoItem,
    metadataParametro,
    normalizeProdutoPayload,
    syncRequiredParametros,
} from '@/composables/produtoFormUtils';

const route = useRoute();
const router = useRouter();
const isEditMode = computed(() => route.params.itemIndex !== undefined);

const state = reactive({
    produto: null,
    servicos: [],
    calculos: [],
    item: createServicoItem(),
    isProcessing: false,
    formReady: false,
});

const originalSnapshot = ref(null);

const schema = computed(() => buildItemSchema('servico', state.calculos));
const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;
const parametroLabel = (codigo) => codigo.replaceAll('_', ' ');
const parametroMeta = (codigo) => metadataParametro[codigo] || { unidade: '', placeholder: '' };
const normalizeParametrosForSave = (values) => syncRequiredParametros(values.calculoId, state.calculos, values.parametros)
    .map((parametro) => ({
        codigo: parametro.codigo,
        valor: parametro.valor === '' || parametro.valor == null ? '' : Number(parametro.valor),
    }));

const snapshotItem = (item) => JSON.stringify({
    servicoId: item.servicoId || '',
    calculoId: item.calculoId || '',
    parametros: (item.parametros || []).map((parametro) => ({
        codigo: parametro.codigo,
        valor: parametro.valor === '' || parametro.valor == null ? '' : Number(parametro.valor),
    })),
});

const loadForm = async () => {
    try {
        state.formReady = false;
        state.isProcessing = true;
        const [produtoResponse, servicosResponse, calculosResponse] = await Promise.all([
            axiosInstance.get(`/produtos/${route.params.produtoId}`),
            axiosInstance.get('/servicos'),
            axiosInstance.get('/calculos'),
        ]);

        state.produto = produtoResponse.data;
        state.servicos = servicosResponse.data;
        state.calculos = calculosResponse.data;

        if (isEditMode.value) {
            const item = state.produto.servicosCalculo?.[Number(route.params.itemIndex)];
            if (!item) {
                showToast('erro', 'Serviço do produto não encontrado.');
                router.push({ name: 'produto', params: { produtoId: route.params.produtoId } });
                return;
            }
            state.item = {
                servicoId: item.servicoId,
                calculoId: item.calculoId,
                parametros: syncRequiredParametros(item.calculoId, state.calculos, item.parametros),
            };
        }

        originalSnapshot.value = snapshotItem(state.item);
        state.formReady = true;
    } catch {
        showToast('erro', 'Erro ao carregar serviço do produto.');
        router.push('/produtos');
    } finally {
        state.isProcessing = false;
    }
};

watch(
    () => [route.params.produtoId, route.params.itemIndex],
    () => {
        loadForm();
    },
    { immediate: true },
);

const onSubmit = async (values) => {
    try {
        const parametros = normalizeParametrosForSave(values);
        const comparableValues = snapshotItem({
            ...values,
            parametros,
        });

        if (isEditMode.value && comparableValues === originalSnapshot.value) {
            showToast('info', 'Não houve alterações no serviço do produto.');
            return;
        }

        const salvar = async () => {
            state.isProcessing = true;
            const servicosCalculo = [...(state.produto.servicosCalculo || [])];
            if (isEditMode.value) {
                servicosCalculo[Number(route.params.itemIndex)] = {
                    ...servicosCalculo[Number(route.params.itemIndex)],
                    servicoId: values.servicoId,
                    calculoId: values.calculoId,
                    parametros,
                };
            } else {
                servicosCalculo.push({
                    servicoId: values.servicoId,
                    calculoId: values.calculoId,
                    parametros,
                });
            }

            const response = await axiosInstance.put(`/produtos/${route.params.produtoId}`, normalizeProdutoPayload({
                ...state.produto,
                servicosCalculo,
            }));

            showToast('sucesso', isEditMode.value ? 'Serviço do produto editado com sucesso!' : 'Serviço do produto criado com sucesso!');
            if (isEditMode.value) {
                router.push({ name: 'produto-servico-editar', params: { produtoId: route.params.produtoId, itemIndex: route.params.itemIndex } });
                state.produto = response.data;
                state.item = {
                    ...response.data.servicosCalculo[Number(route.params.itemIndex)],
                    parametros: syncRequiredParametros(
                        response.data.servicosCalculo[Number(route.params.itemIndex)].calculoId,
                        state.calculos,
                        response.data.servicosCalculo[Number(route.params.itemIndex)].parametros,
                    ),
                };
                originalSnapshot.value = snapshotItem(state.item);
                return;
            }

            const novoIndex = response.data.servicosCalculo.length - 1;
            router.push({ name: 'produto-servico-editar', params: { produtoId: route.params.produtoId, itemIndex: novoIndex } });
        };

        if (isEditMode.value) {
            const modal = showModal('Editar serviço do produto', 'Confirma a edição deste serviço do produto?', async () => {
                try {
                    await salvar();
                } catch (error) {
                    showToast('erro', getErrorMessage(error, 'Erro ao salvar serviço do produto.'));
                } finally {
                    state.isProcessing = false;
                    modal.hide();
                }
            });
            return;
        }

        await salvar();
    } catch (error) {
        showToast('erro', getErrorMessage(error, 'Erro ao salvar serviço do produto.'));
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
                            <li class="breadcrumb-item active" aria-current="page">Produto</li>
                            <li class="breadcrumb-item active" aria-current="page">Serviço</li>
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
                                    <h5>{{ isEditMode ? 'Editar Serviço do Produto' : 'Novo Serviço do Produto' }}</h5>
                                </div>
                            </div>

                            <div class="position-relative">
                                <div v-if="state.isProcessing" class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75" style="z-index: 10;">
                                    <div class="spinner-border text-primary" role="status"></div>
                                </div>

                                <Form v-if="state.formReady" @submit="onSubmit" :validation-schema="schema" :initial-values="state.item" v-slot="{ values, setFieldValue }">
                                    <div class="card-body my-4">
                                        <div class="row g-3 p-3">
                                            <div class="col-lg-6">
                                                <div class="row p-2">
                                                    <label class="col-form-label col-lg-3">Serviço</label>
                                                    <div class="col-lg-9">
                                                        <Field name="servicoId" as="select" class="form-select">
                                                            <option value="">Selecione</option>
                                                            <option v-for="servico in state.servicos" :key="servico.id" :value="servico.id">
                                                                {{ servico.nome }}
                                                            </option>
                                                        </Field>
                                                        <ErrorMessage name="servicoId" class="text-danger d-block mt-1" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="col-lg-6">
                                                <div class="row p-2">
                                                    <label class="col-form-label col-lg-3">Cálculo</label>
                                                    <div class="col-lg-9">
                                                        <Field name="calculoId" v-slot="{ field }">
                                                            <select
                                                                v-bind="field"
                                                                class="form-select"
                                                                @change="(event) => {
                                                                    field.onChange(event);
                                                                    setFieldValue('parametros', syncRequiredParametros(event.target.value, state.calculos, values.parametros));
                                                                }"
                                                            >
                                                                <option value="">Selecione</option>
                                                                <option v-for="calculo in state.calculos" :key="calculo.id" :value="calculo.id">
                                                                    {{ calculo.nome }}
                                                                </option>
                                                            </select>
                                                        </Field>
                                                        <ErrorMessage name="calculoId" class="text-danger d-block mt-1" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="col-12 mt-3">
                                                <div class="row p-2">
                                                    <div class="col-12">
                                                        <h6 class="mb-3">Parâmetros</h6>
                                                        <div v-if="!values.calculoId" class="text-muted">
                                                            Selecione o cálculo para informar os parâmetros obrigatórios.
                                                        </div>
                                                        <div v-else-if="!values.parametros?.length" class="text-muted">
                                                            Este cálculo não exige parâmetros.
                                                        </div>
                                                        <div v-else class="row g-3">
                                                            <div v-for="(parametro, parametroIndex) in values.parametros" :key="parametro.codigo" class="col-lg-6">
                                                                <div class="row p-2">
                                                                    <label class="col-form-label col-lg-4">{{ parametroLabel(parametro.codigo) }}</label>
                                                                    <div class="col-lg-8">
                                                                        <div class="input-group">
                                                                            <Field :name="`parametros[${parametroIndex}].valor`" type="number" step="0.01" class="form-control"
                                                                                :placeholder="parametroMeta(parametro.codigo).placeholder" />
                                                                            <span v-if="parametroMeta(parametro.codigo).unidade" class="input-group-text">
                                                                                {{ parametroMeta(parametro.codigo).unidade }}
                                                                            </span>
                                                                        </div>
                                                                        <Field :name="`parametros[${parametroIndex}].codigo`" type="hidden" :value="parametro.codigo" />
                                                                        <ErrorMessage :name="`parametros[${parametroIndex}].valor`" class="text-danger d-block mt-1" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <ErrorMessage name="parametros" class="text-danger d-block mt-2" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="card-footer text-center">
                                        <button type="submit" class="btn btn-primary button-medium m-2">
                                            <i class="bi bi-floppy"></i>&nbsp;&nbsp;&nbsp;Salvar
                                        </button>
                                        <button type="button" class="btn btn-primary button-medium m-2" @click="router.push({ name: 'produto', params: { produtoId: route.params.produtoId } })">
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
