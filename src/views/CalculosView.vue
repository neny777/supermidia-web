<script setup>
import DataTables from 'datatables.net-vue3';
import DataTablesCore from 'datatables.net-bs5';
import DataTablesButtonsHtml5 from 'datatables.net-buttons/js/buttons.html5';
import { reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axiosInstance from '@/axiosInstance';
import { redrawTable } from '@/composables/dataTablesUtils';
import { customDataTables } from '@/composables/customDataTables';
import { showModal } from '@/composables/modalUtils';
import { showToast } from '@/composables/toastUtils';

DataTables.use(DataTablesCore);
DataTables.use(DataTablesButtonsHtml5);

const router = useRouter();
const state = reactive({
    calculos: [],
    isProcessing: false,
});

const { options } = customDataTables();

const fetchCalculos = async () => {
    try {
        state.isProcessing = true;
        const response = await axiosInstance.get('/calculos');
        state.calculos = response.data;
    } catch (error) {
        showToast('erro', 'Erro ao carregar cálculos.');
    } finally {
        state.isProcessing = false;
    }
};

const deleteCalculo = async (id) => {
    const modal = showModal('Excluir cálculo', 'Confirma a exclusão do cálculo?', async () => {
        try {
            state.isProcessing = true;
            await axiosInstance.delete(`/calculos/${id}`);
            state.calculos = state.calculos.filter((calculo) => calculo.id !== id);
            redrawTable('list-calculos');
            showToast('sucesso', 'Cálculo excluído com sucesso.');
        } catch (error) {
            showToast('erro', 'Não foi possível excluir o cálculo.');
        } finally {
            state.isProcessing = false;
            modal.hide();
        }
    });
};

onMounted(async () => {
    fetchCalculos();
});
</script>

<template>
    <main class="app-main">
        <div class="app-content-header">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-sm-6">
                        <h5 class="mb-0">Cadastro</h5>
                    </div>
                    <div class="col-sm-6">
                        <ol class="breadcrumb float-sm-end">
                            <li class="breadcrumb-item">Cadastros</li>
                            <li class="breadcrumb-item active" aria-current="page">Produtos</li>
                            <li class="breadcrumb-item active" aria-current="page">Cálculos</li>
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
                                    <h5>Cálculos</h5>
                                </div>
                                <button
                                    type="button"
                                    class="btn btn-primary button-medium float-end"
                                    @click="router.push('/calculo')"
                                >
                                    <i class="bi bi-plus"></i>&nbsp;&nbsp;&nbsp;Novo
                                </button>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-12">
                                        <div class="table-responsive p-2">
                                            <div v-if="state.isProcessing" class="text-center">
                                                <DataTables
                                                    id="list-calculos"
                                                    :options="options"
                                                    class="display table table-bordered table-striped"
                                                >
                                                    <thead>
                                                        <tr>
                                                            <th>Processando ...</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <td>
                                                                <div class="spinner-border text-primary" role="status">
                                                                    <span class="visually-hidden">Processando ...</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </DataTables>
                                            </div>
                                            <div v-else>
                                                <DataTables
                                                    id="list-calculos"
                                                    :options="options"
                                                    class="display table table-bordered table-striped"
                                                >
                                                    <thead>
                                                        <tr>
                                                            <th class="d-none">id</th>
                                                            <th>Nome</th>
                                                            <th>Tipo</th>
                                                            <th>Base Operacional</th>
                                                            <th class="text-center">Ações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr v-for="calculo in state.calculos" :key="calculo.id">
                                                            <td class="d-none">{{ calculo.id }}</td>
                                                            <td>{{ calculo.nome }}</td>
                                                            <td>{{ calculo.tipoCalculo }}</td>
                                                            <td>{{ calculo.baseOperacional }}</td>
                                                            <td class="text-center">
                                                                <button
                                                                    class="btn btn-primary btn-sm mx-2"
                                                                    @click="
                                                                        router.push({
                                                                            name: 'calculo',
                                                                            params: { calculoId: calculo.id },
                                                                        })
                                                                    "
                                                                >
                                                                    <i class="bi bi-pen"></i>
                                                                </button>
                                                                <button
                                                                    class="btn btn-danger btn-sm mx-2"
                                                                    @click="deleteCalculo(calculo.id)"
                                                                >
                                                                    <i class="bi bi-trash"></i>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </DataTables>
                                            </div>
                                        </div>
                                    </div>
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
