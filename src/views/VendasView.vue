<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import DataTable from 'datatables.net-vue3';
import DataTablesCore from 'datatables.net-bs5';
import axiosInstance from '@/axiosInstance';
import { showToast } from '@/composables/toastUtils';
import { customDataTables } from '@/composables/customDataTables';

DataTable.use(DataTablesCore);

const props = defineProps({
    status: { type: String, required: true },
});

const router = useRouter();

const isOrcamento = computed(() => props.status === 'ORCAMENTO');
const isCancelado = computed(() => props.status === 'CANCELADO');
const titulo = computed(() => {
    if (isOrcamento.value) return 'Orçamentos';
    if (isCancelado.value) return 'Vendas Canceladas';
    return 'Ordens de Serviço';
});

const formatBRL = (valor) =>
    valor == null ? '-' : Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatData = (valor) => (valor ? new Date(valor).toLocaleDateString('pt-BR') : '-');

// Colunas do DataTable. As chaves de ordenação (whitelist do backend) andam em
// paralelo — null = coluna não ordenável (Situação e Ações).
const colunas = [
    { data: 'numero', title: 'Nº', render: (n) => n ?? '—' },
    { data: 'dataCriacao', title: 'Data', render: (d) => formatData(d) },
    { data: 'clienteNome', title: 'Cliente', render: (c) => c || '—' },
    { data: 'referencia', title: 'Referência', render: (r) => r || '—' },
    { data: 'total', title: 'Total', className: 'text-end', render: (t) => formatBRL(t) },
];
const chavesOrdem = ['numero', 'data', 'cliente', 'referencia', 'total'];
if (isOrcamento.value) {
    colunas.push({
        data: 'vencido',
        title: 'Situação',
        className: 'text-center',
        orderable: false,
        render: (v) =>
            v
                ? '<span class="badge text-bg-warning">Vencido</span>'
                : '<span class="badge text-bg-success">Vigente</span>',
    });
    chavesOrdem.push(null);
}
// Atendente fica por último entre os dados — logo antes das Ações.
colunas.push({ data: 'atendenteNome', title: 'Atendente', render: (a) => a || '—' });
chavesOrdem.push('atendente');
colunas.push({
    data: 'id',
    title: 'Ações',
    className: 'text-center',
    orderable: false,
    searchable: false,
    render: (id) =>
        `<button class="btn btn-primary btn-sm abrir-venda" data-id="${id}"><i class="bi bi-box-arrow-up-right"></i>&nbsp; Abrir</button>`,
});
chavesOrdem.push(null);

// Busca, ordenação e página vêm do SERVIDOR — escala com o volume de vendas.
const ajax = (data, callback) => {
    const ordem = data.order && data.order[0];
    const coluna = (ordem && chavesOrdem[ordem.column]) || 'numero';
    const direcao = ordem ? ordem.dir : 'desc';
    axiosInstance
        .get('/vendas/pagina', {
            params: {
                status: props.status,
                termo: data.search?.value || '',
                inicio: data.start,
                tamanho: data.length,
                coluna,
                direcao,
            },
        })
        .then((resp) => {
            callback({
                draw: data.draw,
                recordsTotal: resp.data.recordsTotal,
                recordsFiltered: resp.data.recordsFiltered,
                data: resp.data.data,
            });
        })
        .catch(() => {
            showToast('erro', `Erro ao carregar ${titulo.value.toLowerCase()}.`);
            callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
        });
};

const options = {
    ...customDataTables().options,
    serverSide: true,
    processing: true,
    ajax,
    columns: colunas,
    order: [[0, 'desc']], // nº decrescente = mais recentes primeiro
    lengthMenu: [
        [10, 25, 50, 100],
        [10, 25, 50, 100],
    ],
};

// Botão "Abrir" é HTML renderizado pelo DataTable — clique via delegação num
// container estável (sobrevive à troca de página/ordenação).
const wrapper = ref(null);
const aoClicar = (evento) => {
    const botao = evento.target.closest('.abrir-venda');
    if (botao) {
        router.push({ name: 'venda', params: { vendaId: botao.dataset.id } });
    }
};
onMounted(() => wrapper.value?.addEventListener('click', aoClicar));
onBeforeUnmount(() => wrapper.value?.removeEventListener('click', aoClicar));
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
                                <button
                                    v-if="!isCancelado"
                                    type="button"
                                    class="btn btn-primary button-medium float-end"
                                    @click="router.push({ name: 'venda', query: isOrcamento ? {} : { tipo: 'os' } })"
                                >
                                    <i class="bi bi-plus"></i>&nbsp;&nbsp;&nbsp;{{
                                        isOrcamento ? 'Novo Orçamento' : 'Nova Ordem de Serviço'
                                    }}
                                </button>
                            </div>
                            <div ref="wrapper" class="card-body">
                                <div class="table-responsive p-2">
                                    <DataTable class="table table-bordered table-striped w-100" :options="options" />
                                </div>
                            </div>
                            <div class="card-footer text-center">
                                <button
                                    type="button"
                                    class="btn btn-secondary button-medium m-2"
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
