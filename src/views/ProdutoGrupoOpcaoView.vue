<script setup>
import { reactive, ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axiosInstance from '@/axiosInstance';
import { showToast } from '@/composables/toastUtils';
import {
    codigosParametro,
    createContribuicao,
    createGrupoOpcao,
    createOpcao,
    getNomeCalculo,
    getNomeMateria,
    getNomeServico,
    normalizeProdutoPayload,
} from '@/composables/produtoFormUtils';

const route = useRoute();
const router = useRouter();
const isEditMode = ref(route.params.grupoIndex !== undefined);
const grupoIndex = computed(() => (isEditMode.value ? Number(route.params.grupoIndex) : null));

const state = reactive({
    produto: null,
    materias: [],
    servicos: [],
    calculos: [],
    grupo: createGrupoOpcao(),
    isProcessing: false,
    formReady: false,
});

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;
const nomeInsumoMateria = (item) =>
    item.grupoSlot ? `SLOT: ${item.grupoSlot}` : getNomeMateria(state.materias, item.materiaId);

const adicionarOpcao = () => state.grupo.opcoes.push(createOpcao());
const removerOpcao = (index) => state.grupo.opcoes.splice(index, 1);
const adicionarContribuicao = (opcao) => {
    opcao.contribuicoes = [...(opcao.contribuicoes || []), createContribuicao()];
};
const removerContribuicao = (opcao, index) => opcao.contribuicoes.splice(index, 1);
const removerComponente = (opcao, tipo, index) => {
    const lista = tipo === 'materia' ? opcao.materiasCalculo : opcao.servicosCalculo;
    lista.splice(index, 1);
};

const validar = () => {
    if (!state.grupo.nome || !state.grupo.nome.trim()) {
        return 'Informe o nome do grupo.';
    }
    if (!state.grupo.opcoes.length) {
        return 'O grupo precisa de ao menos uma opção.';
    }
    for (const opcao of state.grupo.opcoes) {
        if (!opcao.nome || !opcao.nome.trim()) {
            return 'Toda opção precisa de um nome.';
        }
        for (const contribuicao of opcao.contribuicoes || []) {
            if (!contribuicao.codigo || contribuicao.valor === '' || contribuicao.valor == null) {
                return `Complete as contribuições da opção ${opcao.nome} (parâmetro e valor).`;
            }
        }
    }
    return null;
};

const salvar = async () => {
    const erro = validar();
    if (erro) {
        showToast('erro', erro);
        return;
    }
    try {
        state.isProcessing = true;
        const grupos = JSON.parse(JSON.stringify(state.produto.gruposOpcoes || []));
        if (isEditMode.value) {
            grupos[grupoIndex.value] = state.grupo;
        } else {
            grupos.push(state.grupo);
        }
        const response = await axiosInstance.put(`/produtos/${route.params.produtoId}`,
            normalizeProdutoPayload({ ...state.produto, gruposOpcoes: grupos }));
        showToast('sucesso', 'Grupo de opções salvo com sucesso!');

        const indexSalvo = isEditMode.value ? grupoIndex.value : response.data.gruposOpcoes.length - 1;
        state.produto = response.data;
        state.grupo = JSON.parse(JSON.stringify(response.data.gruposOpcoes[indexSalvo]));
        if (!isEditMode.value) {
            router.push({ name: 'produto-grupo-editar', params: { produtoId: route.params.produtoId, grupoIndex: indexSalvo } });
            isEditMode.value = true;
        }
    } catch (error) {
        showToast('erro', getErrorMessage(error, 'Erro ao salvar o grupo de opções.'));
    } finally {
        state.isProcessing = false;
    }
};

const irParaComponente = (tipo, opcaoIndex, itemIndex) => {
    router.push({
        name: tipo === 'materia' ? 'produto-grupo-materia' : 'produto-grupo-servico',
        params: {
            produtoId: route.params.produtoId,
            grupoIndex: grupoIndex.value,
            opcaoIndex,
            ...(itemIndex !== undefined ? { itemIndex } : {}),
        },
    });
};

onMounted(async () => {
    try {
        state.isProcessing = true;
        const [produtoResponse, materiasResponse, servicosResponse, calculosResponse] = await Promise.all([
            axiosInstance.get(`/produtos/${route.params.produtoId}`),
            axiosInstance.get('/materias'),
            axiosInstance.get('/servicos'),
            axiosInstance.get('/calculos'),
        ]);
        state.produto = produtoResponse.data;
        state.materias = materiasResponse.data;
        state.servicos = servicosResponse.data;
        state.calculos = calculosResponse.data;

        if (isEditMode.value) {
            const grupo = state.produto.gruposOpcoes?.[grupoIndex.value];
            if (!grupo) {
                showToast('erro', 'Grupo de opções não encontrado.');
                router.push({ name: 'produto', params: { produtoId: route.params.produtoId } });
                return;
            }
            state.grupo = JSON.parse(JSON.stringify(grupo));
        }
        state.formReady = true;
    } catch {
        showToast('erro', 'Erro ao carregar o grupo de opções.');
        router.push('/produtos');
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
                        <h5 class="mb-0">Cadastro</h5>
                    </div>
                    <div class="col-lg-6">
                        <ol class="breadcrumb float-sm-end">
                            <li class="breadcrumb-item">Cadastros</li>
                            <li class="breadcrumb-item active" aria-current="page">Produto</li>
                            <li class="breadcrumb-item active" aria-current="page">Grupo de Opções</li>
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
                                    <h5>{{ isEditMode ? 'Editar Grupo de Opções' : 'Novo Grupo de Opções' }}
                                        <small class="text-muted" v-if="state.produto"> — {{ state.produto.nome }}</small>
                                    </h5>
                                </div>
                            </div>

                            <div class="position-relative">
                                <div v-if="state.isProcessing"
                                    class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75"
                                    style="z-index: 10;">
                                    <div class="spinner-border text-primary" role="status"></div>
                                </div>

                                <div v-if="state.formReady">
                                    <div class="card-body my-3">
                                        <div class="row g-3 p-2 align-items-center">
                                            <div class="col-lg-5">
                                                <label class="form-label"><strong>Nome do grupo</strong></label>
                                                <input v-model="state.grupo.nome" type="text" class="form-control"
                                                    placeholder="Ex.: ILHÓS, RECORTE, REFILE" />
                                            </div>
                                            <div class="col-lg-4 pt-4">
                                                <input id="obrigatorio" v-model="state.grupo.obrigatorio" type="checkbox"
                                                    class="form-check-input mx-2" />
                                                <label for="obrigatorio" class="form-check-label">
                                                    Obrigatório (sem a alternativa "Nenhum")</label>
                                            </div>
                                            <div class="col-lg-3 text-lg-end pt-4">
                                                <button type="button" class="btn btn-primary button-medium" @click="adicionarOpcao">
                                                    <i class="bi bi-plus"></i>&nbsp;&nbsp;&nbsp;Nova opção
                                                </button>
                                            </div>
                                        </div>

                                        <div v-if="!state.grupo.opcoes.length" class="text-muted p-2">
                                            Nenhuma opção ainda — clique em "Nova opção".
                                        </div>

                                        <div v-for="(opcao, opcaoIndex) in state.grupo.opcoes" :key="opcaoIndex"
                                            class="border rounded p-3 m-2">
                                            <div class="row g-2 align-items-end">
                                                <div class="col-lg-5">
                                                    <label class="form-label"><strong>Opção</strong></label>
                                                    <input v-model="opcao.nome" type="text" class="form-control"
                                                        placeholder="Ex.: COM ILHÓS, RETO, CONTORNO" />
                                                </div>
                                                <div class="col-lg-7 text-end">
                                                    <button type="button" class="btn btn-outline-secondary btn-sm m-1"
                                                        @click="adicionarContribuicao(opcao)">
                                                        <i class="bi bi-plus-slash-minus"></i> Contribuição
                                                    </button>
                                                    <button type="button" class="btn btn-outline-primary btn-sm m-1"
                                                        :disabled="!isEditMode" @click="irParaComponente('materia', opcaoIndex)">
                                                        <i class="bi bi-box2"></i> Nova matéria
                                                    </button>
                                                    <button type="button" class="btn btn-outline-primary btn-sm m-1"
                                                        :disabled="!isEditMode" @click="irParaComponente('servico', opcaoIndex)">
                                                        <i class="bi bi-tools"></i> Novo serviço
                                                    </button>
                                                    <button type="button" class="btn btn-danger btn-sm m-1"
                                                        @click="removerOpcao(opcaoIndex)">
                                                        <i class="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <small v-if="!isEditMode" class="text-muted d-block mt-1">
                                                Salve o grupo para poder adicionar matérias e serviços às opções.
                                            </small>

                                            <!-- Contribuições: somam nos parâmetros dos componentes BASE (ex.: bainha +6cm) -->
                                            <div v-if="opcao.contribuicoes?.length" class="mt-2">
                                                <label class="form-label"><strong>Contribuições nos parâmetros da base</strong></label>
                                                <div v-for="(contribuicao, ci) in opcao.contribuicoes" :key="ci"
                                                    class="input-group input-group-sm mb-1" style="max-width: 480px;">
                                                    <select v-model="contribuicao.codigo" class="form-select">
                                                        <option value="">Parâmetro</option>
                                                        <option v-for="codigo in codigosParametro" :key="codigo" :value="codigo">
                                                            {{ codigo.replaceAll('_', ' ') }}</option>
                                                    </select>
                                                    <span class="input-group-text">+</span>
                                                    <input v-model="contribuicao.valor" type="number" step="0.01"
                                                        class="form-control" placeholder="valor" />
                                                    <button type="button" class="btn btn-outline-danger"
                                                        @click="removerContribuicao(opcao, ci)">
                                                        <i class="bi bi-x"></i>
                                                    </button>
                                                </div>
                                            </div>

                                            <!-- Componentes da opção -->
                                            <div v-if="opcao.materiasCalculo?.length || opcao.servicosCalculo?.length"
                                                class="table-responsive mt-2">
                                                <table class="table table-sm table-bordered mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th>Componente</th>
                                                            <th>Cálculo</th>
                                                            <th class="text-center" style="width: 110px;">Ações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr v-for="(item, mi) in opcao.materiasCalculo || []" :key="'m' + mi">
                                                            <td><i class="bi bi-box2 text-muted"></i> {{ nomeInsumoMateria(item) }}</td>
                                                            <td>{{ getNomeCalculo(state.calculos, item.calculoId) }}</td>
                                                            <td class="text-center">
                                                                <button type="button" class="btn btn-primary btn-sm mx-1"
                                                                    :disabled="!isEditMode"
                                                                    @click="irParaComponente('materia', opcaoIndex, mi)">
                                                                    <i class="bi bi-pen"></i>
                                                                </button>
                                                                <button type="button" class="btn btn-danger btn-sm mx-1"
                                                                    @click="removerComponente(opcao, 'materia', mi)">
                                                                    <i class="bi bi-trash"></i>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                        <tr v-for="(item, si) in opcao.servicosCalculo || []" :key="'s' + si">
                                                            <td><i class="bi bi-tools text-muted"></i>
                                                                {{ getNomeServico(state.servicos, item.servicoId) }}</td>
                                                            <td>{{ getNomeCalculo(state.calculos, item.calculoId) }}</td>
                                                            <td class="text-center">
                                                                <button type="button" class="btn btn-primary btn-sm mx-1"
                                                                    :disabled="!isEditMode"
                                                                    @click="irParaComponente('servico', opcaoIndex, si)">
                                                                    <i class="bi bi-pen"></i>
                                                                </button>
                                                                <button type="button" class="btn btn-danger btn-sm mx-1"
                                                                    @click="removerComponente(opcao, 'servico', si)">
                                                                    <i class="bi bi-trash"></i>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="card-footer text-center">
                                        <button type="button" class="btn btn-primary button-medium m-2" @click="salvar">
                                            <i class="bi bi-floppy"></i>&nbsp;&nbsp;&nbsp;Salvar
                                        </button>
                                        <button type="button" class="btn btn-primary button-medium m-2"
                                            @click="router.push({ name: 'produto', params: { produtoId: route.params.produtoId } })">
                                            <i class="bi bi-arrow-counterclockwise"></i>&nbsp;&nbsp;&nbsp;Voltar
                                        </button>
                                    </div>
                                </div>
                                <div v-else class="p-4"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>
