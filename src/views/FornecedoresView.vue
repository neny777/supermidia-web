<script setup>
import DataTables from 'datatables.net-vue3';
import DataTablesCore from 'datatables.net-bs5';
import DataTablesButtonsHtml5 from 'datatables.net-buttons/js/buttons.html5';
import { redrawTable } from '@/composables/dataTablesUtils';
import { customDataTables } from '@/composables/customDataTables';
DataTables.use(DataTablesCore);
DataTables.use(DataTablesButtonsHtml5);
import { useRouter } from 'vue-router';
import { reactive, onMounted } from 'vue';
import axiosInstance from '@/axiosInstance';
import { showModal } from '@/composables/modalUtils';
import { showToast } from '@/composables/toastUtils';
import FornecedorFisicoJuridicoModal from "@/components/FornecedorFisicoJuridicoModal.vue";

const router = useRouter();
const state = reactive({
    fornecedores: [],
    isProcessing: false,
});

const fetchFornecedores = async () => {
    try {
        state.isProcessing = true;
        const response = await axiosInstance.get('/fornecedores');
        state.fornecedores = response.data;
    } catch (error) {
        showToast("erro", "Erro ao carregar fornecedores");
    } finally {
        state.isProcessing = false;
    }
};
// Fetch options from the composable
const { options } = customDataTables();
// Delete a fornecedor
const deletefornecedor = async (id) => {
    const modal = showModal("Excluir fornecedor", 'Confirma a exclusão do fornecedor?', async () => {
        try {
            state.isProcessing = true;
            await axiosInstance.delete(`/fornecedores/${id}`);
            state.fornecedores = state.fornecedores.filter(fornecedor => fornecedor.id !== id);
            redrawTable('list');
            // Mostrar toast de sucesso
            showToast("sucesso", "fornecedor excluído com sucesso.");
        } catch (error) {
            // Mostrar toast de erro
            showToast("erro", "Não foi possível excluir o fornecedor.");
        } finally {
            state.isProcessing = false;
            modal.hide(); // Fecha o modal após a confirmação
        }
    });
};

onMounted(async () => {
    fetchFornecedores();
});

const handleFornecedorFisicoJuridico = (type) => {
    if (type === "fisico") {
        window.location.href = "/fornecedores/fisico";
    } else if (type === "juridico") {
        window.location.href = "/fornecedores/juridico";
    }
};

</script>
<template>
    <!--begin::App Main-->
    <main class="app-main"> <!--begin::App Content Header-->
        <div class="app-content-header"> <!--begin::Container-->
            <div class="container-fluid"> <!--begin::Row-->
                <div class="row"> <!--begin::Col-->
                    <div class="col-sm-6">
                        <h5 class="mb-0">Cadastro</h5>
                    </div> <!--end::Col--> <!--begin::Col-->
                    <div class="col-sm-6">
                        <ol class="breadcrumb float-sm-end">
                            <li class="breadcrumb-item">Cadastros</li>
                            <li class="breadcrumb-item active" aria-current="page">
                                Pessoas
                            </li>
                            <li class="breadcrumb-item active" aria-current="page">
                                Fornecedores
                            </li>
                        </ol>
                    </div> <!--end::Col-->
                </div> <!--end::Row-->
            </div> <!--end::Container-->
        </div> <!--end::App Content Header-->
        <!--begin::App Content-->
        <div class="app-content"> <!--begin::Container-->
            <div class="container-fluid"> <!--begin::Row-->
                <div class="row"> <!--begin::Col-->
                    <div class="col-12"> <!--begin::Card-->
                        <div class="card"> <!--begin::Card Header-->
                            <div class="card-header">
                                <!--begin::Card Title-->
                                <div class="card-title">
                                    <h5>Fornecedores</h5>
                                </div>
                                <!--end::Card Title-->
                                <!--begin::Add button-->
                                <button type="button" class="btn btn-primary button-medium float-end"
                                    data-bs-toggle="modal" data-bs-target="#supplierTypeModal"><i
                                        class="bi bi-plus"></i>&nbsp;&nbsp;&nbsp;Novo</button>
                                <!--end::Add button-->
                                <!-- Modal para selecionar a categoria de fornecedor -->
                                <!-- Modal de seleção de tipo de fornecedor -->
                                <FornecedorFisicoJuridicoModal @selectType="handleFornecedorFisicoJuridico" />
                            </div> <!--end::Card Header--> <!--begin::Card Body-->
                            <div class="card-body"> <!--begin::Row-->
                                <div class="row"> <!--begin::Col-->
                                    <div class="col-md-12">
                                        <!-- Table for fornecedores -->
                                        <div class="table-responsive p-2">
                                            <!-- Show loading spinner while loading is true -->
                                            <div v-if="state.isProcessing" class="text-center">
                                                <DataTables id="list" :options="options"
                                                    class="display table table-bordered table-striped">
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
                                            <!-- Shoe fornecedor listing when done loading -->
                                            <div v-else>
                                                <DataTables id="list" :options="options"
                                                    class="display table table-bordered table-striped">
                                                    <thead>
                                                        <tr>
                                                            <th class="d-none">id</th>
                                                            <th>Nome</th>
                                                            <th>Email</th>
                                                            <th>Telefone</th>
                                                            <th>Município</th>
                                                            <th class="text-center">Ações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr v-for="(fornecedor, index) in state.fornecedores"
                                                            :key="fornecedor.id">
                                                            <td class="d-none">{{ fornecedor.id }}</td>
                                                            <td>{{ fornecedor.nome }}</td>
                                                            <td>{{ fornecedor.email }}</td>
                                                            <td>{{ fornecedor.telefone }}</td>
                                                            <td>{{ fornecedor.municipio }}</td>
                                                            <td class="text-center">
                                                                <button class="btn btn-primary btn-sm mx-2"
                                                                    @click="$router.push(fornecedor.tipo === 'FÍSICA'
                                                                        ? { name: 'fornecedor-fisico', params: { fisicoId: fornecedor.id } }
                                                                        : { name: 'fornecedor-juridico', params: { juridicoId: fornecedor.id } })">
                                                                    <i class="bi bi-pen"></i></button>
                                                                <button class="btn btn-danger btn-sm mx-2"><i
                                                                        class="bi bi-trash"
                                                                        @click="deletefornecedor(fornecedor.id)"></i></button>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </DataTables>
                                            </div>
                                        </div>
                                    </div> <!--end::Col-->
                                </div> <!--end::Row-->
                            </div> <!--end::Card Body--> <!--begin::Card Footer-->
                            <div class="card-footer text-center">
                                <button type="button" class="btn btn-primary button-medium m-2"><i
                                        class="bi bi-arrow-counterclockwise"></i>&nbsp;&nbsp;&nbsp;Voltar</button>
                            </div> <!--end::Card Footer-->
                        </div> <!--end::Card--> <!--begin::Card-->
                    </div> <!--end::Col-->
                </div> <!--end::Row-->
            </div> <!--end::Container-->
        </div> <!--end::App Content-->
    </main> <!--end::App Main--> <!--begin::Footer-->
</template>