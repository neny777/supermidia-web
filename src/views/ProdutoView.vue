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
    createMedida,
    createProduto,
    getNomeCalculo,
    getNomeMateria,
    getNomeServico,
    normalizeProdutoPayload,
} from '@/composables/produtoFormUtils';

const route = useRoute();
const router = useRouter();
const isEditMode = ref(!!route.params.produtoId);

const schema = yup.object({
    nome: yup.string().required('Informe o nome do produto.').max(140, 'Máximo de 140 caracteres.'),
});

const state = reactive({
    produto: createProduto(),
    materiasCalculoApoio: [],
    servicosApoio: [],
    calculosApoio: [],
    isProcessing: false,
    formReady: false,
});

const originalSnapshot = ref(null);

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;
const buildSnapshot = (produto) => ({
    nome: produto.nome ?? '',
    medidas: JSON.parse(JSON.stringify(produto.medidas ?? [])),
});
const hasChanges = (values) =>
    JSON.stringify(buildSnapshot({ ...state.produto, nome: values.nome })) !== JSON.stringify(originalSnapshot.value);

const removerGrupo = (index) => {
    const modal = showModal(
        'Excluir grupo de opções',
        'Confirma a exclusão deste grupo de opções do produto?',
        async () => {
            try {
                state.isProcessing = true;
                const payload = normalizeProdutoPayload({
                    ...state.produto,
                    gruposOpcoes: state.produto.gruposOpcoes.filter((_, itemIndex) => itemIndex !== index),
                });
                const response = await axiosInstance.put(`/produtos/${route.params.produtoId}`, payload);
                state.produto = response.data;
                originalSnapshot.value = buildSnapshot(response.data);
                showToast('sucesso', 'Grupo de opções excluído com sucesso!');
            } catch (error) {
                showToast('erro', getErrorMessage(error, 'Erro ao excluir o grupo de opções.'));
            } finally {
                state.isProcessing = false;
                modal.hide();
            }
        }
    );
};

const adicionarMedida = () => {
    state.produto.medidas = [...(state.produto.medidas || []), createMedida()];
};
const removerMedida = (index) => {
    state.produto.medidas.splice(index, 1);
};

const removerMateria = (index) => {
    const modal = showModal('Excluir matéria do produto', 'Confirma a exclusão desta matéria do produto?', async () => {
        try {
            state.isProcessing = true;
            const payload = normalizeProdutoPayload({
                ...state.produto,
                materiasCalculo: state.produto.materiasCalculo.filter((_, itemIndex) => itemIndex !== index),
            });
            const response = await axiosInstance.put(`/produtos/${route.params.produtoId}`, payload);
            state.produto = response.data;
            originalSnapshot.value = buildSnapshot(response.data);
            showToast('sucesso', 'Matéria do produto excluída com sucesso!');
        } catch (error) {
            showToast('erro', getErrorMessage(error, 'Erro ao excluir matéria do produto.'));
        } finally {
            state.isProcessing = false;
            modal.hide();
        }
    });
};

const removerServico = (index) => {
    const modal = showModal('Excluir serviço do produto', 'Confirma a exclusão deste serviço do produto?', async () => {
        try {
            state.isProcessing = true;
            const payload = normalizeProdutoPayload({
                ...state.produto,
                servicosCalculo: state.produto.servicosCalculo.filter((_, itemIndex) => itemIndex !== index),
            });
            const response = await axiosInstance.put(`/produtos/${route.params.produtoId}`, payload);
            state.produto = response.data;
            originalSnapshot.value = buildSnapshot(response.data);
            showToast('sucesso', 'Serviço do produto excluído com sucesso!');
        } catch (error) {
            showToast('erro', getErrorMessage(error, 'Erro ao excluir serviço do produto.'));
        } finally {
            state.isProcessing = false;
            modal.hide();
        }
    });
};

onMounted(async () => {
    try {
        state.isProcessing = true;
        const [materiasResponse, servicosResponse, calculosResponse] = await Promise.all([
            axiosInstance.get('/materias'),
            axiosInstance.get('/servicos'),
            axiosInstance.get('/calculos'),
        ]);

        state.materiasCalculoApoio = materiasResponse.data;
        state.servicosApoio = servicosResponse.data;
        state.calculosApoio = calculosResponse.data;

        if (isEditMode.value) {
            const response = await axiosInstance.get(`/produtos/${route.params.produtoId}`);
            state.produto = response.data;
            originalSnapshot.value = buildSnapshot(response.data);
        } else {
            originalSnapshot.value = buildSnapshot(createProduto());
        }
        state.formReady = true;
    } catch {
        showToast('erro', 'Erro ao carregar produto.');
        router.push('/produtos');
    } finally {
        state.isProcessing = false;
    }
});

const onSubmit = async (values) => {
    try {
        if (isEditMode.value) {
            if (!hasChanges(values)) {
                showToast('info', 'Não houve alterações no produto.');
                return;
            }

            const modal = showModal('Editar produto', 'Confirma a edição do produto?', async () => {
                try {
                    state.isProcessing = true;
                    const payload = normalizeProdutoPayload({
                        ...state.produto,
                        nome: values.nome,
                    });
                    await axiosInstance.put(`/produtos/${route.params.produtoId}`, payload);
                    showToast('sucesso', 'Produto editado com sucesso!');
                    router.push('/produtos');
                } catch (error) {
                    showToast('erro', getErrorMessage(error, 'Erro ao salvar produto.'));
                } finally {
                    state.isProcessing = false;
                    modal.hide();
                }
            });
            return;
        }

        state.isProcessing = true;
        const response = await axiosInstance.post(
            '/produtos',
            normalizeProdutoPayload({
                ...createProduto(),
                nome: values.nome,
            })
        );
        showToast('sucesso', 'Produto criado com sucesso!');
        router.push({ name: 'produto', params: { produtoId: response.data.id } });
    } catch (error) {
        showToast('erro', getErrorMessage(error, 'Erro ao salvar produto.'));
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
                            <li class="breadcrumb-item active" aria-current="page">Produtos Base</li>
                            <li class="breadcrumb-item active" aria-current="page">Produto</li>
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
                                    <h5>{{ isEditMode ? 'Editar Produto' : 'Novo Produto' }}</h5>
                                </div>
                            </div>

                            <div class="position-relative">
                                <div
                                    v-if="state.isProcessing"
                                    class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75"
                                    style="z-index: 10"
                                >
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Processando...</span>
                                    </div>
                                </div>

                                <Form
                                    v-if="state.formReady"
                                    @submit="onSubmit"
                                    :validation-schema="schema"
                                    :initial-values="{ nome: state.produto.nome }"
                                >
                                    <div class="card-body my-4">
                                        <div class="row g-3 p-3">
                                            <div class="col-lg-6">
                                                <div class="row p-2">
                                                    <label for="nome" class="col-form-label col-lg-3">Nome</label>
                                                    <div class="col-lg-9">
                                                        <Field id="nome" name="nome" type="text" class="form-control" />
                                                        <ErrorMessage name="nome" class="text-danger d-block mt-1" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div v-if="isEditMode" class="row g-3 px-3 pb-3">
                                            <div class="col-12 mt-3">
                                                <div class="row p-2 align-items-center">
                                                    <div class="col-lg-6">
                                                        <h6 class="mb-0">Medidas do Orçamento</h6>
                                                        <small class="text-muted"
                                                            >Altura, largura e quantidade são padrão; declare aqui as
                                                            extras (ex.: BORDA). Salve com o botão Salvar.</small
                                                        >
                                                    </div>
                                                    <div class="col-lg-6 text-lg-end mt-2 mt-lg-0">
                                                        <button
                                                            type="button"
                                                            class="btn btn-primary button-medium"
                                                            @click="adicionarMedida"
                                                        >
                                                            <i class="bi bi-plus"></i>&nbsp;&nbsp;&nbsp;Nova Medida
                                                        </button>
                                                    </div>
                                                </div>
                                                <div class="row p-2">
                                                    <div class="col-12">
                                                        <div v-if="!state.produto.medidas?.length" class="text-muted">
                                                            Nenhuma medida extra declarada.
                                                        </div>
                                                        <div v-else class="table-responsive">
                                                            <table class="table table-bordered align-middle mb-0">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Nome</th>
                                                                        <th style="width: 12%">Unidade</th>
                                                                        <th class="text-center" style="width: 12%">
                                                                            Obrigatória
                                                                        </th>
                                                                        <th style="width: 14%">Padrão</th>
                                                                        <th style="width: 14%">Mínimo</th>
                                                                        <th style="width: 14%">Máximo</th>
                                                                        <th class="text-center" style="width: 8%"></th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <tr
                                                                        v-for="(medida, index) in state.produto.medidas"
                                                                        :key="index"
                                                                    >
                                                                        <td>
                                                                            <input
                                                                                v-model="medida.nome"
                                                                                type="text"
                                                                                class="form-control"
                                                                                placeholder="Ex.: BORDA"
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <input
                                                                                v-model="medida.unidade"
                                                                                type="text"
                                                                                class="form-control"
                                                                                placeholder="cm"
                                                                            />
                                                                        </td>
                                                                        <td class="text-center">
                                                                            <input
                                                                                v-model="medida.obrigatoria"
                                                                                type="checkbox"
                                                                                class="form-check-input"
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <input
                                                                                v-model="medida.valorPadrao"
                                                                                type="number"
                                                                                step="0.01"
                                                                                class="form-control"
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <input
                                                                                v-model="medida.minimo"
                                                                                type="number"
                                                                                step="0.01"
                                                                                class="form-control"
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <input
                                                                                v-model="medida.maximo"
                                                                                type="number"
                                                                                step="0.01"
                                                                                class="form-control"
                                                                            />
                                                                        </td>
                                                                        <td class="text-center">
                                                                            <button
                                                                                type="button"
                                                                                class="btn btn-danger btn-sm"
                                                                                @click="removerMedida(index)"
                                                                            >
                                                                                <i class="bi bi-trash"></i>
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="col-12 mt-3">
                                                <div class="row p-2 align-items-center">
                                                    <div class="col-lg-6">
                                                        <h6 class="mb-0">Matérias</h6>
                                                    </div>
                                                    <div class="col-lg-6 text-lg-end mt-2 mt-lg-0">
                                                        <button
                                                            type="button"
                                                            class="btn btn-primary button-medium"
                                                            @click="
                                                                router.push({
                                                                    name: 'produto-materia',
                                                                    params: { produtoId: route.params.produtoId },
                                                                })
                                                            "
                                                        >
                                                            <i class="bi bi-plus"></i>&nbsp;&nbsp;&nbsp;Novo
                                                        </button>
                                                    </div>
                                                </div>
                                                <div class="row p-2">
                                                    <div class="col-12">
                                                        <div
                                                            v-if="!state.produto.materiasCalculo?.length"
                                                            class="text-muted"
                                                        >
                                                            Nenhuma matéria vinculada.
                                                        </div>
                                                        <div v-else class="table-responsive">
                                                            <table
                                                                class="table table-bordered table-striped mb-0"
                                                                style="table-layout: fixed"
                                                            >
                                                                <thead>
                                                                    <tr>
                                                                        <th style="width: 42.5%">Matéria</th>
                                                                        <th style="width: 42.5%">Cálculo</th>
                                                                        <th class="text-center" style="width: 15%">
                                                                            Ações
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <tr
                                                                        v-for="(item, index) in state.produto
                                                                            .materiasCalculo"
                                                                        :key="index"
                                                                    >
                                                                        <td>
                                                                            {{
                                                                                item.grupoSlot
                                                                                    ? 'SLOT: ' + item.grupoSlot
                                                                                    : getNomeMateria(
                                                                                          state.materiasCalculoApoio ||
                                                                                              [],
                                                                                          item.materiaId
                                                                                      )
                                                                            }}
                                                                        </td>
                                                                        <td>
                                                                            {{
                                                                                getNomeCalculo(
                                                                                    state.calculosApoio || [],
                                                                                    item.calculoId
                                                                                )
                                                                            }}
                                                                        </td>
                                                                        <td class="text-center">
                                                                            <button
                                                                                type="button"
                                                                                class="btn btn-primary btn-sm mx-2"
                                                                                @click="
                                                                                    router.push({
                                                                                        name: 'produto-materia-editar',
                                                                                        params: {
                                                                                            produtoId:
                                                                                                route.params.produtoId,
                                                                                            itemIndex: index,
                                                                                        },
                                                                                    })
                                                                                "
                                                                            >
                                                                                <i class="bi bi-pen"></i>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                class="btn btn-danger btn-sm mx-2"
                                                                                @click="removerMateria(index)"
                                                                            >
                                                                                <i class="bi bi-trash"></i>
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="col-12 mt-4">
                                                <div class="row p-2 align-items-center">
                                                    <div class="col-lg-6">
                                                        <h6 class="mb-0">Serviços</h6>
                                                    </div>
                                                    <div class="col-lg-6 text-lg-end mt-2 mt-lg-0">
                                                        <button
                                                            type="button"
                                                            class="btn btn-primary button-medium"
                                                            @click="
                                                                router.push({
                                                                    name: 'produto-servico',
                                                                    params: { produtoId: route.params.produtoId },
                                                                })
                                                            "
                                                        >
                                                            <i class="bi bi-plus"></i>&nbsp;&nbsp;&nbsp;Novo
                                                        </button>
                                                    </div>
                                                </div>
                                                <div class="row p-2">
                                                    <div class="col-12">
                                                        <div
                                                            v-if="!state.produto.servicosCalculo?.length"
                                                            class="text-muted"
                                                        >
                                                            Nenhum serviço vinculado.
                                                        </div>
                                                        <div v-else class="table-responsive">
                                                            <table
                                                                class="table table-bordered table-striped mb-0"
                                                                style="table-layout: fixed"
                                                            >
                                                                <thead>
                                                                    <tr>
                                                                        <th style="width: 42.5%">Serviço</th>
                                                                        <th style="width: 42.5%">Cálculo</th>
                                                                        <th class="text-center" style="width: 15%">
                                                                            Ações
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <tr
                                                                        v-for="(item, index) in state.produto
                                                                            .servicosCalculo"
                                                                        :key="index"
                                                                    >
                                                                        <td>
                                                                            {{
                                                                                getNomeServico(
                                                                                    state.servicosApoio || [],
                                                                                    item.servicoId
                                                                                )
                                                                            }}
                                                                        </td>
                                                                        <td>
                                                                            {{
                                                                                getNomeCalculo(
                                                                                    state.calculosApoio || [],
                                                                                    item.calculoId
                                                                                )
                                                                            }}
                                                                        </td>
                                                                        <td class="text-center">
                                                                            <button
                                                                                type="button"
                                                                                class="btn btn-primary btn-sm mx-2"
                                                                                @click="
                                                                                    router.push({
                                                                                        name: 'produto-servico-editar',
                                                                                        params: {
                                                                                            produtoId:
                                                                                                route.params.produtoId,
                                                                                            itemIndex: index,
                                                                                        },
                                                                                    })
                                                                                "
                                                                            >
                                                                                <i class="bi bi-pen"></i>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                class="btn btn-danger btn-sm mx-2"
                                                                                @click="removerServico(index)"
                                                                            >
                                                                                <i class="bi bi-trash"></i>
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="col-12 mt-4">
                                                <div class="row p-2 align-items-center">
                                                    <div class="col-lg-6">
                                                        <h6 class="mb-0">Grupos de Opções</h6>
                                                        <small class="text-muted"
                                                            >Acabamentos e seleções do orçamento (ex.: Ilhós,
                                                            Recorte).</small
                                                        >
                                                    </div>
                                                    <div class="col-lg-6 text-lg-end mt-2 mt-lg-0">
                                                        <button
                                                            type="button"
                                                            class="btn btn-primary button-medium"
                                                            @click="
                                                                router.push({
                                                                    name: 'produto-grupo',
                                                                    params: { produtoId: route.params.produtoId },
                                                                })
                                                            "
                                                        >
                                                            <i class="bi bi-plus"></i>&nbsp;&nbsp;&nbsp;Novo
                                                        </button>
                                                    </div>
                                                </div>
                                                <div class="row p-2">
                                                    <div class="col-12">
                                                        <div
                                                            v-if="!state.produto.gruposOpcoes?.length"
                                                            class="text-muted"
                                                        >
                                                            Nenhum grupo de opções.
                                                        </div>
                                                        <div v-else class="table-responsive">
                                                            <table
                                                                class="table table-bordered table-striped mb-0"
                                                                style="table-layout: fixed"
                                                            >
                                                                <thead>
                                                                    <tr>
                                                                        <th style="width: 35%">Grupo</th>
                                                                        <th style="width: 35%">Opções</th>
                                                                        <th style="width: 15%">Obrigatório</th>
                                                                        <th class="text-center" style="width: 15%">
                                                                            Ações
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <tr
                                                                        v-for="(grupo, index) in state.produto
                                                                            .gruposOpcoes"
                                                                        :key="index"
                                                                    >
                                                                        <td>{{ grupo.nome }}</td>
                                                                        <td>
                                                                            {{
                                                                                (grupo.opcoes || [])
                                                                                    .map((opcao) => opcao.nome)
                                                                                    .join(', ')
                                                                            }}
                                                                        </td>
                                                                        <td>{{ grupo.obrigatorio ? 'Sim' : 'Não' }}</td>
                                                                        <td class="text-center">
                                                                            <button
                                                                                type="button"
                                                                                class="btn btn-primary btn-sm mx-2"
                                                                                @click="
                                                                                    router.push({
                                                                                        name: 'produto-grupo-editar',
                                                                                        params: {
                                                                                            produtoId:
                                                                                                route.params.produtoId,
                                                                                            grupoIndex: index,
                                                                                        },
                                                                                    })
                                                                                "
                                                                            >
                                                                                <i class="bi bi-pen"></i>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                class="btn btn-danger btn-sm mx-2"
                                                                                @click="removerGrupo(index)"
                                                                            >
                                                                                <i class="bi bi-trash"></i>
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="card-footer text-center">
                                        <button type="submit" class="btn btn-success button-medium m-2">
                                            <i class="bi bi-floppy"></i>&nbsp;&nbsp;&nbsp;Salvar
                                        </button>
                                        <button
                                            type="button"
                                            class="btn btn-secondary button-medium m-2"
                                            @click="router.push('/produtos')"
                                        >
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
