<script setup>
import { reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axiosInstance from '@/axiosInstance';
import { showModal } from '@/composables/modalUtils';
import { showToast } from '@/composables/toastUtils';

const route = useRoute();
const router = useRouter();
const isDetail = computed(() => !!route.params.vendaId);

const state = reactive({
    clientes: [],
    produtos: [],
    venda: null,
    form: {
        clienteId: '',
        itens: [novoItem()],
    },
    isProcessing: false,
    isReady: false,
});

function novoItem() {
    return { produtoId: '', altura: '', largura: '', quantidade: '' };
}

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;
const formatBRL = (valor) =>
    valor == null ? '-' : Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatData = (valor) => (valor ? new Date(valor).toLocaleDateString('pt-BR') : '-');
const nomeCliente = (id) => state.clientes.find((c) => c.id === id)?.nome || '-';

const statusLabel = computed(() => {
    switch (state.venda?.status) {
        case 'ORCAMENTO': return 'Orçamento';
        case 'ORDEM_SERVICO': return 'Ordem de Serviço';
        case 'CANCELADO': return 'Cancelado';
        default: return '-';
    }
});
const statusBadgeClass = computed(() => {
    switch (state.venda?.status) {
        case 'ORCAMENTO': return 'text-bg-primary';
        case 'ORDEM_SERVICO': return 'text-bg-success';
        case 'CANCELADO': return 'text-bg-secondary';
        default: return 'text-bg-light';
    }
});

const adicionarItem = () => state.form.itens.push(novoItem());
const removerItem = (index) => {
    state.form.itens.splice(index, 1);
    if (!state.form.itens.length) {
        state.form.itens.push(novoItem());
    }
};

const salvar = async () => {
    if (!state.form.clienteId) {
        showToast('erro', 'Selecione o cliente.');
        return;
    }
    const itensInvalidos = state.form.itens.some(
        (i) => !i.produtoId || !(Number(i.altura) > 0) || !(Number(i.largura) > 0) || !(Number(i.quantidade) > 0)
    );
    if (itensInvalidos) {
        showToast('erro', 'Preencha produto, altura, largura e quantidade (maiores que zero) em todos os itens.');
        return;
    }

    const payload = {
        clienteId: state.form.clienteId,
        itens: state.form.itens.map((i) => ({
            produtoId: i.produtoId,
            altura: Number(i.altura),
            largura: Number(i.largura),
            quantidade: Number(i.quantidade),
        })),
    };

    try {
        state.isProcessing = true;
        const response = await axiosInstance.post('/vendas', payload);
        showToast('sucesso', 'Orçamento criado com sucesso!');
        router.push({ name: 'venda', params: { vendaId: response.data.id } });
    } catch (error) {
        showToast('erro', getErrorMessage(error, 'Erro ao criar orçamento.'));
    } finally {
        state.isProcessing = false;
    }
};

const executarAcao = (titulo, mensagem, acao, sucesso) => {
    const modal = showModal(titulo, mensagem, async () => {
        try {
            state.isProcessing = true;
            const response = await axiosInstance.post(`/vendas/${route.params.vendaId}/${acao}`);
            state.venda = response.data;
            showToast('sucesso', sucesso);
        } catch (error) {
            showToast('erro', getErrorMessage(error, 'Não foi possível concluir a ação.'));
        } finally {
            state.isProcessing = false;
            modal.hide();
        }
    });
};

const converter = () =>
    executarAcao('Converter em Ordem de Serviço', 'Confirma converter este orçamento em ordem de serviço?',
        'ordem-servico', 'Convertido em ordem de serviço!');
const recalcular = () =>
    executarAcao('Recalcular orçamento',
        'Reprocessar com os preços atuais? O preço final de cada item será redefinido e a validade reiniciada.',
        'recalcular', 'Orçamento recalculado!');
const cancelar = () =>
    executarAcao('Cancelar venda', 'Confirma o cancelamento desta venda?', 'cancelar', 'Venda cancelada!');

onMounted(async () => {
    try {
        state.isProcessing = true;
        const [clientesResponse, produtosResponse] = await Promise.all([
            axiosInstance.get('/clientes'),
            axiosInstance.get('/produtos'),
        ]);
        state.clientes = clientesResponse.data;
        state.produtos = produtosResponse.data;

        if (isDetail.value) {
            const response = await axiosInstance.get(`/vendas/${route.params.vendaId}`);
            state.venda = response.data;
        }
        state.isReady = true;
    } catch (error) {
        showToast('erro', 'Erro ao carregar a venda.');
        router.push('/orcamentos');
    } finally {
        state.isProcessing = false;
    }
});
</script>

<template>
    <main class="app-main">
        <div class="app-content-header">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-lg-6">
                        <h5 class="mb-0">Vendas</h5>
                    </div>
                    <div class="col-lg-6">
                        <ol class="breadcrumb float-sm-end">
                            <li class="breadcrumb-item">Vendas</li>
                            <li class="breadcrumb-item active" aria-current="page">
                                {{ isDetail ? 'Detalhe' : 'Novo Orçamento' }}
                            </li>
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
                            <div class="position-relative">
                                <div v-if="state.isProcessing"
                                    class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75"
                                    style="z-index: 10;">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Processando...</span>
                                    </div>
                                </div>

                                <!-- ===================== CRIAÇÃO ===================== -->
                                <template v-if="state.isReady && !isDetail">
                                    <div class="card-header">
                                        <div class="card-title">
                                            <h5>Novo Orçamento</h5>
                                        </div>
                                    </div>
                                    <div class="card-body my-3">
                                        <div class="row g-3 p-2">
                                            <div class="col-lg-6">
                                                <label for="cliente" class="form-label"><strong>Cliente</strong></label>
                                                <select id="cliente" v-model="state.form.clienteId" class="form-select">
                                                    <option value="">Selecione</option>
                                                    <option v-for="cliente in state.clientes" :key="cliente.id"
                                                        :value="cliente.id">{{ cliente.nome }}</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div class="row p-2 mt-2 align-items-center">
                                            <div class="col-6"><h6 class="mb-0">Itens</h6></div>
                                            <div class="col-6 text-end">
                                                <button type="button" class="btn btn-primary button-medium"
                                                    @click="adicionarItem">
                                                    <i class="bi bi-plus"></i>&nbsp;&nbsp;&nbsp;Adicionar item
                                                </button>
                                            </div>
                                        </div>

                                        <div class="table-responsive p-2">
                                            <table class="table table-bordered align-middle mb-0">
                                                <thead>
                                                    <tr>
                                                        <th style="width: 40%;">Produto</th>
                                                        <th>Altura (cm)</th>
                                                        <th>Largura (cm)</th>
                                                        <th>Qtde</th>
                                                        <th class="text-center" style="width: 60px;"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr v-for="(item, index) in state.form.itens" :key="index">
                                                        <td>
                                                            <select v-model="item.produtoId" class="form-select">
                                                                <option value="">Selecione</option>
                                                                <option v-for="produto in state.produtos"
                                                                    :key="produto.id" :value="produto.id">
                                                                    {{ produto.nome }}</option>
                                                            </select>
                                                        </td>
                                                        <td><input v-model="item.altura" type="number" step="0.01"
                                                                min="0.01" class="form-control" /></td>
                                                        <td><input v-model="item.largura" type="number" step="0.01"
                                                                min="0.01" class="form-control" /></td>
                                                        <td><input v-model="item.quantidade" type="number" step="0.01"
                                                                min="0.01" class="form-control" /></td>
                                                        <td class="text-center">
                                                            <button type="button" class="btn btn-danger btn-sm"
                                                                @click="removerItem(index)">
                                                                <i class="bi bi-trash"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div class="card-footer text-center">
                                        <button type="button" class="btn btn-primary button-medium m-2" @click="salvar">
                                            <i class="bi bi-floppy"></i>&nbsp;&nbsp;&nbsp;Salvar
                                        </button>
                                        <button type="button" class="btn btn-primary button-medium m-2"
                                            @click="router.push('/orcamentos')">
                                            <i class="bi bi-arrow-counterclockwise"></i>&nbsp;&nbsp;&nbsp;Voltar
                                        </button>
                                    </div>
                                </template>

                                <!-- ===================== DETALHE ===================== -->
                                <template v-if="state.isReady && isDetail && state.venda">
                                    <div class="card-header">
                                        <div class="card-title">
                                            <h5>
                                                {{ statusLabel }}
                                                <span class="badge ms-2" :class="statusBadgeClass">{{ statusLabel }}</span>
                                            </h5>
                                        </div>
                                    </div>
                                    <div class="card-body my-3">
                                        <div v-if="state.venda.vencido" class="alert alert-warning" role="alert">
                                            <i class="bi bi-exclamation-triangle"></i>
                                            Orçamento vencido. Recalcule (para usar os preços atuais) ou cancele.
                                        </div>

                                        <div class="row p-2">
                                            <div class="col-lg-4"><strong>Cliente:</strong>
                                                {{ nomeCliente(state.venda.clienteId) }}</div>
                                            <div class="col-lg-4"><strong>Data:</strong>
                                                {{ formatData(state.venda.dataCriacao) }}</div>
                                            <div class="col-lg-4"><strong>Total:</strong>
                                                {{ formatBRL(state.venda.total) }}</div>
                                        </div>

                                        <div v-for="(item, index) in state.venda.itens" :key="index"
                                            class="border rounded p-3 m-2">
                                            <div class="row">
                                                <div class="col-lg-5"><strong>{{ item.produtoNome }}</strong></div>
                                                <div class="col-lg-4 text-muted">
                                                    {{ item.altura }} × {{ item.largura }} cm · qtd {{ item.quantidade }}
                                                </div>
                                                <div class="col-lg-3 text-end">
                                                    <strong>{{ formatBRL(item.precoFinal) }}</strong>
                                                </div>
                                            </div>
                                            <div class="row text-muted small mb-2">
                                                <div class="col">Custo: {{ formatBRL(item.custoTotal) }} ·
                                                    Markup: {{ item.markupAplicado }}% ·
                                                    Sugerido: {{ formatBRL(item.precoSugerido) }}</div>
                                            </div>
                                            <div class="table-responsive">
                                                <table class="table table-sm table-bordered mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th>Item</th>
                                                            <th>Tipo</th>
                                                            <th class="text-end">Qtde</th>
                                                            <th>Un</th>
                                                            <th class="text-end">Preço</th>
                                                            <th class="text-end">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr v-for="(d, di) in item.detalhes" :key="di">
                                                            <td>{{ d.nome }}</td>
                                                            <td>{{ d.tipoItem }}</td>
                                                            <td class="text-end">{{ d.quantidadeCalculada }}</td>
                                                            <td>{{ d.unidade }}</td>
                                                            <td class="text-end">{{ formatBRL(d.precoUnitario) }}</td>
                                                            <td class="text-end">{{ formatBRL(d.valorTotal) }}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="card-footer text-center">
                                        <button v-if="state.venda.status === 'ORCAMENTO'" type="button"
                                            class="btn btn-success button-medium m-2" @click="converter">
                                            <i class="bi bi-clipboard-check"></i>&nbsp;&nbsp;&nbsp;Converter em OS
                                        </button>
                                        <button v-if="state.venda.status === 'ORCAMENTO'" type="button"
                                            class="btn btn-warning button-medium m-2" @click="recalcular">
                                            <i class="bi bi-arrow-repeat"></i>&nbsp;&nbsp;&nbsp;Recalcular
                                        </button>
                                        <button v-if="state.venda.status !== 'CANCELADO'" type="button"
                                            class="btn btn-danger button-medium m-2" @click="cancelar">
                                            <i class="bi bi-x-circle"></i>&nbsp;&nbsp;&nbsp;Cancelar
                                        </button>
                                        <button type="button" class="btn btn-primary button-medium m-2"
                                            @click="router.push('/orcamentos')">
                                            <i class="bi bi-arrow-counterclockwise"></i>&nbsp;&nbsp;&nbsp;Voltar
                                        </button>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>
