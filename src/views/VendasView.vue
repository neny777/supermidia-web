<script setup>
import { reactive, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import axiosInstance from '@/axiosInstance';
import { showToast } from '@/composables/toastUtils';

const props = defineProps({
    status: { type: String, required: true },
});

const router = useRouter();
const state = reactive({
    vendas: [],
    clientesById: {},
    isProcessing: false,
});

const isOrcamento = computed(() => props.status === 'ORCAMENTO');
const titulo = computed(() => (isOrcamento.value ? 'Orçamentos' : 'Ordens de Serviço'));

const formatBRL = (valor) =>
    valor == null ? '-' : Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatData = (valor) => (valor ? new Date(valor).toLocaleDateString('pt-BR') : '-');
const nomeCliente = (id) => state.clientesById[id] || '-';

const fetchVendas = async () => {
    try {
        state.isProcessing = true;
        const [vendasResponse, clientesResponse] = await Promise.all([
            axiosInstance.get('/vendas', { params: { status: props.status } }),
            axiosInstance.get('/clientes'),
        ]);
        state.vendas = vendasResponse.data;
        state.clientesById = Object.fromEntries((clientesResponse.data || []).map((c) => [c.id, c.nome]));
    } catch (error) {
        showToast('erro', `Erro ao carregar ${titulo.value.toLowerCase()}.`);
    } finally {
        state.isProcessing = false;
    }
};

onMounted(fetchVendas);
// As duas telas usam o mesmo componente; recarrega ao trocar de status.
watch(() => props.status, fetchVendas);
</script>

<template>
    <main class="app-main">
        <div class="app-content-header">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-sm-6">
                        <h5 class="mb-0">Vendas</h5>
                    </div>
                    <div class="col-sm-6">
                        <ol class="breadcrumb float-sm-end">
                            <li class="breadcrumb-item">Vendas</li>
                            <li class="breadcrumb-item active" aria-current="page">{{ titulo }}</li>
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
                                    <h5>{{ titulo }}</h5>
                                </div>
                                <button type="button" class="btn btn-primary button-medium float-end"
                                    @click="router.push({ name: 'venda', query: isOrcamento ? {} : { tipo: 'os' } })">
                                    <i class="bi bi-plus"></i>&nbsp;&nbsp;&nbsp;{{ isOrcamento ? 'Novo Orçamento' : 'Nova Ordem de Serviço' }}
                                </button>
                            </div>
                            <div class="card-body position-relative">
                                <div v-if="state.isProcessing"
                                    class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75"
                                    style="z-index: 10;">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Processando...</span>
                                    </div>
                                </div>

                                <div v-if="!state.vendas.length" class="text-muted p-2">
                                    Nenhum registro encontrado.
                                </div>
                                <div v-else class="table-responsive p-2">
                                    <table class="table table-bordered table-striped mb-0">
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Cliente</th>
                                                <th class="text-end">Total</th>
                                                <th v-if="isOrcamento" class="text-center">Situação</th>
                                                <th class="text-center" style="width: 120px;">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="venda in state.vendas" :key="venda.id">
                                                <td>{{ formatData(venda.dataCriacao) }}</td>
                                                <td>{{ nomeCliente(venda.clienteId) }}</td>
                                                <td class="text-end">{{ formatBRL(venda.total) }}</td>
                                                <td v-if="isOrcamento" class="text-center">
                                                    <span v-if="venda.vencido" class="badge text-bg-warning">Vencido</span>
                                                    <span v-else class="badge text-bg-success">Vigente</span>
                                                </td>
                                                <td class="text-center">
                                                    <button class="btn btn-primary btn-sm"
                                                        @click="router.push({ name: 'venda', params: { vendaId: venda.id } })">
                                                        <i class="bi bi-box-arrow-up-right"></i>&nbsp; Abrir
                                                    </button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="card-footer text-center">
                                <button type="button" class="btn btn-primary button-medium m-2"
                                    @click="router.push('/home')">
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
