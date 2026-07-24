<script setup>
import { reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axiosInstance from '@/axiosInstance';
import { showToast } from '@/composables/toastUtils';

const router = useRouter();

const state = reactive({
    form: {
        validadeOrcamentoDias: '',
        edicaoHoras: '',
        pisoMargemPercentual: '', // exibido em %, gravado como fração
        fatorVarejo: '',
        formaPagamentoPadrao: '',
        condicaoPagamentoPadrao: '',
        formasSugeridas: '',
        condicoesSugeridas: '',
        formaEntregaPadrao: '',
        prazoEntregaPadrao: '',
    },
    isProcessing: false,
    isReady: false,
});

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

// Tradução do fator para linguagem de loja: 1,3846 ≈ varejo 38,46% acima do atacado.
const acrescimoVarejo = computed(() => {
    const fator = Number(state.form.fatorVarejo);
    if (!fator || fator < 1) return null;
    return ((fator - 1) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
});

onMounted(async () => {
    try {
        state.isProcessing = true;
        const response = await axiosInstance.get('/configuracoes');
        state.form.validadeOrcamentoDias = response.data.validadeOrcamentoDias;
        state.form.edicaoHoras = response.data.edicaoHoras;
        state.form.pisoMargemPercentual = Number((response.data.pisoMargem * 100).toFixed(2));
        state.form.fatorVarejo = response.data.fatorVarejo;
        state.form.formaPagamentoPadrao = response.data.formaPagamentoPadrao || '';
        state.form.condicaoPagamentoPadrao = response.data.condicaoPagamentoPadrao || '';
        state.form.formasSugeridas = response.data.formasSugeridas || '';
        state.form.condicoesSugeridas = response.data.condicoesSugeridas || '';
        state.form.formaEntregaPadrao = response.data.formaEntregaPadrao || '';
        state.form.prazoEntregaPadrao = response.data.prazoEntregaPadrao || '';
        state.isReady = true;
    } catch (error) {
        showToast('erro', getErrorMessage(error, 'Erro ao carregar as configurações.'));
    } finally {
        state.isProcessing = false;
    }
});

const salvar = async () => {
    try {
        state.isProcessing = true;
        await axiosInstance.put('/configuracoes', {
            validadeOrcamentoDias: Number(state.form.validadeOrcamentoDias),
            edicaoHoras: Number(state.form.edicaoHoras),
            pisoMargem: Number(state.form.pisoMargemPercentual) / 100,
            fatorVarejo: Number(state.form.fatorVarejo),
            formaPagamentoPadrao: state.form.formaPagamentoPadrao,
            condicaoPagamentoPadrao: state.form.condicaoPagamentoPadrao,
            formasSugeridas: state.form.formasSugeridas,
            condicoesSugeridas: state.form.condicoesSugeridas,
            formaEntregaPadrao: state.form.formaEntregaPadrao,
            prazoEntregaPadrao: state.form.prazoEntregaPadrao,
        });
        showToast('sucesso', 'Configurações salvas — já valem para os próximos cálculos.');
        router.push('/home');
    } catch (error) {
        showToast('erro', getErrorMessage(error, 'Erro ao salvar as configurações.'));
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
                    <div class="col-sm-6">
                        <h5 class="mb-0">Sistema</h5>
                    </div>
                    <div class="col-sm-6">
                        <ol class="breadcrumb float-sm-end">
                            <li class="breadcrumb-item">Sistema</li>
                            <li class="breadcrumb-item active" aria-current="page">Configurações</li>
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
                                    <h5>Configurações do Sistema</h5>
                                </div>
                            </div>
                            <div class="card-body my-3 position-relative">
                                <div
                                    v-if="state.isProcessing"
                                    class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75"
                                    style="z-index: 10"
                                >
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Processando...</span>
                                    </div>
                                </div>

                                <div v-if="state.isReady" class="row g-4 p-2">
                                    <div class="col-lg-6">
                                        <label class="form-label"><strong>Validade do orçamento (dias)</strong></label>
                                        <input
                                            v-model="state.form.validadeOrcamentoDias"
                                            type="number"
                                            min="1"
                                            max="365"
                                            step="1"
                                            class="form-control"
                                        />
                                        <div class="form-text">
                                            Depois desse prazo o orçamento fica vencido: só é possível recalcular
                                            (preços atuais) ou cancelar.
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <label class="form-label"><strong>Janela de edição (horas)</strong></label>
                                        <input
                                            v-model="state.form.edicaoHoras"
                                            type="number"
                                            min="0"
                                            max="720"
                                            step="1"
                                            class="form-control"
                                        />
                                        <div class="form-text">
                                            Tempo após a criação em que orçamentos e ordens de serviço podem ser
                                            editados ou excluídos. Zero desliga a edição.
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <label class="form-label"><strong>Piso de margem (%)</strong></label>
                                        <input
                                            v-model="state.form.pisoMargemPercentual"
                                            type="number"
                                            min="0"
                                            max="95"
                                            step="0.01"
                                            class="form-control"
                                        />
                                        <div class="form-text">
                                            Margem mínima do preço de atacado. Também é a margem usada quando o produto
                                            não tem material próprio.
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <label class="form-label"><strong>Fator de varejo</strong></label>
                                        <input
                                            v-model="state.form.fatorVarejo"
                                            type="number"
                                            min="1"
                                            max="10"
                                            step="0.0001"
                                            class="form-control"
                                        />
                                        <div class="form-text">
                                            Varejo = atacado × fator.
                                            <template v-if="acrescimoVarejo">
                                                Com o valor atual, o varejo fica
                                                <strong>{{ acrescimoVarejo }}%</strong> acima do atacado.</template
                                            >
                                        </div>
                                    </div>
                                    <div class="col-12">
                                        <h6 class="border-bottom pb-1 mb-0">Padrões da venda</h6>
                                        <div class="form-text">
                                            Pré-preenchem o formulário de orçamento/OS — o vendedor só altera quando o
                                            combinado for diferente.
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <label class="form-label"><strong>Forma de pagamento padrão</strong></label>
                                        <input
                                            v-model="state.form.formaPagamentoPadrao"
                                            type="text"
                                            maxlength="120"
                                            class="form-control"
                                        />
                                    </div>
                                    <div class="col-lg-6">
                                        <label class="form-label"><strong>Condição de pagamento padrão</strong></label>
                                        <input
                                            v-model="state.form.condicaoPagamentoPadrao"
                                            type="text"
                                            maxlength="120"
                                            class="form-control"
                                        />
                                    </div>
                                    <div class="col-lg-6">
                                        <label class="form-label"><strong>Formas de pagamento</strong></label>
                                        <textarea
                                            v-model="state.form.formasSugeridas"
                                            maxlength="500"
                                            rows="3"
                                            class="form-control"
                                        ></textarea>
                                        <div class="form-text">
                                            Uma por linha — opções do dropdown Forma na venda (PIX, dinheiro,
                                            cartão...).
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <label class="form-label"><strong>Condições sugeridas</strong></label>
                                        <textarea
                                            v-model="state.form.condicoesSugeridas"
                                            maxlength="500"
                                            rows="3"
                                            class="form-control"
                                        ></textarea>
                                        <div class="form-text">
                                            Uma por linha — opções do dropdown Condição na venda.
                                        </div>
                                    </div>
                                    <div class="col-lg-3">
                                        <label class="form-label"><strong>Forma de entrega padrão</strong></label>
                                        <input
                                            v-model="state.form.formaEntregaPadrao"
                                            type="text"
                                            maxlength="120"
                                            class="form-control"
                                        />
                                    </div>
                                    <div class="col-lg-3">
                                        <label class="form-label"><strong>Prazo de entrega padrão</strong></label>
                                        <input
                                            v-model="state.form.prazoEntregaPadrao"
                                            type="text"
                                            maxlength="60"
                                            class="form-control"
                                        />
                                    </div>
                                    <div class="col-12">
                                        <div class="alert alert-info mb-0" role="alert">
                                            <i class="bi bi-info-circle"></i>
                                            As mudanças valem imediatamente para os <strong>próximos</strong> cálculos e
                                            verificações. Vendas já criadas não são recalculadas — os preços delas
                                            continuam congelados.
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="card-footer text-center">
                                <button
                                    type="button"
                                    class="btn btn-primary button-medium m-2"
                                    :disabled="state.isProcessing || !state.isReady"
                                    @click="salvar"
                                >
                                    <i class="bi bi-floppy"></i>&nbsp;&nbsp;&nbsp;Salvar
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-primary button-medium m-2"
                                    @click="router.push('/home')"
                                >
                                    <i class="bi bi-arrow-counterclockwise"></i>&nbsp;&nbsp;&nbsp;Voltar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>
