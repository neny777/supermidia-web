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
import ClienteFisicoJuridicoModal from "@/components/ClienteFisicoJuridicoModal.vue";

const router = useRouter();
const state = reactive({
    clientes: [],
    isProcessing: false,
});

const fetchClientes = async () => {
    try {
        state.isProcessing = true;
        const response = await axiosInstance.get('/clientes');
        state.clientes = response.data;
    } catch (error) {
        showToast("erro", "Erro ao carregar clientes");
    } finally {
        state.isProcessing = false;
    }
};
// Fetch options from the composable
const { options } = customDataTables();
// Delete a cliente
const deletecliente = async (id) => {
    const modal = showModal("Excluir cliente", 'Confirma a exclusão do cliente?', async () => {
        try {
            state.isProcessing = true;
            await axiosInstance.delete(`/clientes/${id}`);
            state.clientes = state.clientes.filter(cliente => cliente.id !== id);
            redrawTable('list');
            // Mostrar toast de sucesso
            showToast("sucesso", "cliente excluído com sucesso.");
        } catch (error) {
            // Mostrar toast de erro
            showToast("erro", "Não foi possível excluir o cliente.");
        } finally {
            state.isProcessing = false;
            modal.hide(); // Fecha o modal após a confirmação
        }
    });
};

onMounted(async () => {
    fetchClientes();
});

const handleClienteFisicoJuridico = (type) => {
    if (type === "fisico") {
        window.location.href = "/clientes/fisico";
    } else if (type === "juridico") {
        window.location.href = "/clientes/juridico";
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
                                Clientes
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
                                    <h5>Clientes</h5>
                                </div>
                                <!--end::Card Title-->
                                <!--begin::Add button-->
                                <button type="button" class="btn btn-primary button-medium float-end"
                                    data-bs-toggle="modal" data-bs-target="#clientTypeModal"><i
                                        class="bi bi-plus"></i>&nbsp;&nbsp;&nbsp;Novo</button>
                                <!--end::Add button-->
                                <!-- Modal para selecionar a categoria de cliente -->
                                <!-- Modal de seleção de tipo de cliente -->
                                <ClienteFisicoJuridicoModal @selectType="handleClienteFisicoJuridico" />
                            </div> <!--end::Card Header--> <!--begin::Card Body-->
                            <div class="card-body"> <!--begin::Row-->
                                <div class="row"> <!--begin::Col-->
                                    <div class="col-md-12">
                                        <!-- Table for clientes -->
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
                                            <!-- Shoe cliente listing when done loading -->
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
                                                        <tr v-for="(cliente, index) in state.clientes"
                                                            :key="cliente.id">
                                                            <td class="d-none">{{ cliente.id }}</td>
                                                            <td>{{ cliente.nome }}</td>
                                                            <td>{{ cliente.email }}</td>
                                                            <td>{{ cliente.telefone }}</td>
                                                            <td>{{ cliente.municipio }}</td>                                                            
                                                            <td class="text-center">
                                                                <button class="btn btn-primary btn-sm mx-2"
                                                                    @click="$router.push(cliente.tipo === 'FÍSICA'
                                                                        ? { name: 'cliente-fisico', params: { fisicoId: cliente.id } }
                                                                        : { name: 'cliente-juridico', params: { juridicoId: cliente.id } })">
                                                                    <i class="bi bi-pen"></i></button>
                                                                <button class="btn btn-danger btn-sm mx-2"><i
                                                                        class="bi bi-trash"
                                                                        @click="deletecliente(cliente.id)"></i></button>
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