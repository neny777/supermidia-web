<script setup>
import { reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axiosInstance from '@/axiosInstance';
import { showModal } from '@/composables/modalUtils';
import { showToast } from '@/composables/toastUtils';

const route = useRoute();
const router = useRouter();
const isEditVenda = computed(() => route.name === 'venda-editar');
const isDetail = computed(() => !!route.params.vendaId && !isEditVenda.value);

const state = reactive({
    clientes: [],
    produtos: [],
    materias: [],
    venda: null,
    form: {
        status: 'ORCAMENTO',
        clienteId: '',
        referencia: '',
        formaPagamento: '',
        prazoEntrega: '',
        observacoes: '',
        itens: [novoItem()],
    },
    isProcessing: false,
    isReady: false,
});

function novoItem() {
    return {
        produtoId: '',
        altura: '',
        largura: '',
        quantidade: '',
        medidas: {},        // nome da medida -> valor
        escolhasMateria: {}, // componenteId (slot) -> materiaId
        escolhasOpcao: {},   // grupoId -> opcaoId ('' = nenhum)
    };
}

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;
const formatBRL = (valor) =>
    valor == null ? '-' : Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatData = (valor) => (valor ? new Date(valor).toLocaleDateString('pt-BR') : '-');
const nomeCliente = (id) => state.clientes.find((c) => c.id === id)?.nome || '-';

// ---- definição dinâmica do item conforme o produto escolhido ----
const produtoDe = (item) => state.produtos.find((p) => p.id === item.produtoId) || null;
const medidasDe = (item) => produtoDe(item)?.medidas || [];
const slotsDe = (item) => (produtoDe(item)?.materiasCalculo || []).filter((mc) => mc.grupoSlot);
const gruposDe = (item) => produtoDe(item)?.gruposOpcoes || [];
const materiasDoGrupo = (grupo) =>
    state.materias.filter((m) => (m.grupo || '').toUpperCase() === (grupo || '').toUpperCase());

const aoTrocarProduto = (item) => {
    item.medidas = {};
    item.escolhasMateria = {};
    item.escolhasOpcao = {};
    medidasDe(item).forEach((medida) => {
        item.medidas[medida.nome] = medida.valorPadrao ?? '';
    });
    slotsDe(item).forEach((slot) => {
        item.escolhasMateria[slot.id] = '';
    });
    gruposDe(item).forEach((grupo) => {
        item.escolhasOpcao[grupo.id] = '';
    });
};

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

// Reconstrói o formulário a partir do snapshot (entradaJson) para a edição na janela de 1h.
const preencherFormularioParaEdicao = (venda) => {
    state.form.status = venda.status;
    state.form.clienteId = venda.clienteId;
    state.form.referencia = venda.referencia || '';
    state.form.formaPagamento = venda.formaPagamento || '';
    state.form.prazoEntrega = venda.prazoEntrega || '';
    state.form.observacoes = venda.observacoes || '';
    state.form.itens = (venda.itens || []).map((itemVenda) => {
        let entrada = {};
        try {
            entrada = JSON.parse(itemVenda.entradaJson || '{}');
        } catch {
            entrada = {};
        }
        const item = novoItem();
        item.produtoId = itemVenda.produtoId;
        item.altura = itemVenda.altura;
        item.largura = itemVenda.largura;
        item.quantidade = itemVenda.quantidade;
        const produto = state.produtos.find((p) => p.id === itemVenda.produtoId);
        if (produto) {
            (produto.medidas || []).forEach((medida) => {
                item.medidas[medida.nome] = entrada.medidas?.[medida.nome] ?? medida.valorPadrao ?? '';
            });
            (produto.materiasCalculo || []).filter((mc) => mc.grupoSlot).forEach((slot) => {
                const escolha = (entrada.escolhasMateria || []).find((e) => e.componenteId === slot.id);
                item.escolhasMateria[slot.id] = escolha ? escolha.materiaId : '';
            });
            (produto.gruposOpcoes || []).forEach((grupo) => {
                const escolhida = (grupo.opcoes || []).find((o) => (entrada.escolhasOpcao || []).includes(o.id));
                item.escolhasOpcao[grupo.id] = escolhida ? escolhida.id : '';
            });
        }
        return item;
    });
    if (!state.form.itens.length) {
        state.form.itens = [novoItem()];
    }
};

const adicionarItem = () => state.form.itens.push(novoItem());
const removerItem = (index) => {
    state.form.itens.splice(index, 1);
    if (!state.form.itens.length) {
        state.form.itens.push(novoItem());
    }
};

const validarFormulario = () => {
    if (!state.form.clienteId) {
        return 'Selecione o cliente.';
    }
    for (const item of state.form.itens) {
        if (!item.produtoId) {
            return 'Selecione o produto em todos os itens.';
        }
        if (!(Number(item.altura) > 0) || !(Number(item.largura) > 0) || !(Number(item.quantidade) > 0)) {
            return 'Preencha altura, largura e quantidade (maiores que zero) em todos os itens.';
        }
        for (const medida of medidasDe(item)) {
            const valor = item.medidas[medida.nome];
            if (medida.obrigatoria && (valor === '' || valor == null)) {
                return `Informe a medida ${medida.nome}.`;
            }
        }
        for (const slot of slotsDe(item)) {
            if (!item.escolhasMateria[slot.id]) {
                return `Escolha o material do grupo ${slot.grupoSlot}.`;
            }
        }
        for (const grupo of gruposDe(item)) {
            if (grupo.obrigatorio && !item.escolhasOpcao[grupo.id]) {
                return `Escolha uma opção de ${grupo.nome}.`;
            }
        }
    }
    return null;
};

const salvar = async () => {
    const erro = validarFormulario();
    if (erro) {
        showToast('erro', erro);
        return;
    }

    const payload = {
        clienteId: state.form.clienteId,
        status: state.form.status,
        referencia: state.form.referencia,
        formaPagamento: state.form.formaPagamento,
        prazoEntrega: state.form.prazoEntrega,
        observacoes: state.form.observacoes,
        itens: state.form.itens.map((item) => ({
            produtoId: item.produtoId,
            altura: Number(item.altura),
            largura: Number(item.largura),
            quantidade: Number(item.quantidade),
            medidas: Object.fromEntries(
                Object.entries(item.medidas)
                    .filter(([, valor]) => valor !== '' && valor != null)
                    .map(([nome, valor]) => [nome, Number(valor)])
            ),
            escolhasMateria: Object.entries(item.escolhasMateria)
                .filter(([, materiaId]) => materiaId)
                .map(([componenteId, materiaId]) => ({ componenteId, materiaId })),
            escolhasOpcao: Object.values(item.escolhasOpcao).filter((opcaoId) => opcaoId),
        })),
    };

    try {
        state.isProcessing = true;
        if (isEditVenda.value) {
            await axiosInstance.put(`/vendas/${route.params.vendaId}`, payload);
            showToast('sucesso', 'Venda editada com sucesso!');
        } else {
            await axiosInstance.post('/vendas', payload);
            showToast('sucesso', state.form.status === 'ORDEM_SERVICO'
                ? 'Ordem de serviço criada com sucesso!'
                : 'Orçamento criado com sucesso!');
        }
        // Salvar conclui a tarefa: volta para a lista correspondente.
        router.push(state.form.status === 'ORDEM_SERVICO' ? '/ordens-servico' : '/orcamentos');
    } catch (error) {
        showToast('erro', getErrorMessage(error, 'Erro ao salvar a venda.'));
    } finally {
        state.isProcessing = false;
    }
};

// Toggle "Detalhes" por item: quem tem a permissão 'custos' decide se quer ver.
const detalhesAbertos = reactive({});
const toggleDetalhes = (index) => {
    detalhesAbertos[index] = !detalhesAbertos[index];
};
const temDadosDeCusto = (item) => item.custoTotal != null || (item.detalhes || []).length > 0;

// Condições (pagamento/prazo/observações): não mexem em preço, então são
// editáveis fora da janela de 1h — só venda cancelada trava.
const cabecalho = reactive({ editando: false, referencia: '', formaPagamento: '', prazoEntrega: '', observacoes: '' });
const editarCabecalho = () => {
    cabecalho.referencia = state.venda.referencia || '';
    cabecalho.formaPagamento = state.venda.formaPagamento || '';
    cabecalho.prazoEntrega = state.venda.prazoEntrega || '';
    cabecalho.observacoes = state.venda.observacoes || '';
    cabecalho.editando = true;
};
const salvarCabecalho = async () => {
    try {
        state.isProcessing = true;
        const response = await axiosInstance.put(`/vendas/${route.params.vendaId}/cabecalho`, {
            referencia: cabecalho.referencia,
            formaPagamento: cabecalho.formaPagamento,
            prazoEntrega: cabecalho.prazoEntrega,
            observacoes: cabecalho.observacoes,
        });
        state.venda = response.data;
        cabecalho.editando = false;
        showToast('sucesso', 'Condições salvas.');
    } catch (error) {
        showToast('erro', getErrorMessage(error, 'Não foi possível salvar as condições.'));
    } finally {
        state.isProcessing = false;
    }
};

// Ajuste manual do preço final — a única edição permitida depois do congelamento.
const precoEdicao = reactive({ index: null, valor: null });
const podeAjustarPreco = computed(() =>
    state.venda && state.venda.status !== 'CANCELADO' && !state.venda.vencido);
const precoAjustado = (item) => item.precoSugerido != null && item.precoFinal != null
    && Number(item.precoFinal) !== Number(item.precoSugerido);
const iniciarEdicaoPreco = (index, item) => {
    precoEdicao.index = index;
    precoEdicao.valor = item.precoFinal;
};
const cancelarEdicaoPreco = () => {
    precoEdicao.index = null;
    precoEdicao.valor = null;
};
const salvarPrecoFinal = async (item) => {
    const valor = Number(precoEdicao.valor);
    if (!valor || valor <= 0) {
        showToast('erro', 'Informe um preço final maior que zero.');
        return;
    }
    try {
        state.isProcessing = true;
        const response = await axiosInstance.put(
            `/vendas/${route.params.vendaId}/itens/${item.id}/preco-final`, { precoFinal: valor });
        state.venda = response.data;
        cancelarEdicaoPreco();
        showToast('sucesso', 'Preço final ajustado.');
    } catch (error) {
        showToast('erro', getErrorMessage(error, 'Não foi possível ajustar o preço.'));
    } finally {
        state.isProcessing = false;
    }
};

const editarVenda = () => {
    router.push({ name: 'venda-editar', params: { vendaId: route.params.vendaId } });
};

const excluirVenda = () => {
    const modal = showModal('Excluir venda',
        'Excluir definitivamente esta venda? (permitido apenas na primeira hora após a criação)', async () => {
        try {
            state.isProcessing = true;
            const destino = state.venda.status === 'ORDEM_SERVICO' ? '/ordens-servico' : '/orcamentos';
            await axiosInstance.delete(`/vendas/${route.params.vendaId}`);
            showToast('sucesso', 'Venda excluída.');
            router.push(destino);
        } catch (error) {
            showToast('erro', getErrorMessage(error, 'Não foi possível excluir a venda.'));
        } finally {
            state.isProcessing = false;
            modal.hide();
        }
    });
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
        const [clientesResponse, produtosResponse, materiasResponse] = await Promise.all([
            axiosInstance.get('/clientes'),
            axiosInstance.get('/produtos'),
            axiosInstance.get('/materias'),
        ]);
        state.clientes = clientesResponse.data;
        state.produtos = produtosResponse.data;
        state.materias = materiasResponse.data;

        if (route.params.vendaId) {
            const response = await axiosInstance.get(`/vendas/${route.params.vendaId}`);
            state.venda = response.data;
            if (isEditVenda.value) {
                preencherFormularioParaEdicao(response.data);
            }
        } else if (route.query.tipo === 'os') {
            state.form.status = 'ORDEM_SERVICO';
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
                                {{ isDetail ? 'Detalhe' : (isEditVenda ? 'Editar' : 'Nova Venda') }}
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
                                            <h5>{{ isEditVenda ? 'Editar Venda' : (state.form.status === 'ORDEM_SERVICO' ? 'Nova Ordem de Serviço' : 'Novo Orçamento') }}</h5>
                                        </div>
                                    </div>
                                    <div class="card-body my-3">
                                        <div class="row g-3 p-2">
                                            <div class="col-lg-3">
                                                <label class="form-label"><strong>Tipo</strong></label>
                                                <select v-model="state.form.status" class="form-select">
                                                    <option value="ORCAMENTO">Orçamento</option>
                                                    <option value="ORDEM_SERVICO">Ordem de Serviço (venda direta)</option>
                                                </select>
                                            </div>
                                            <div class="col-lg-5">
                                                <label for="cliente" class="form-label"><strong>Cliente</strong></label>
                                                <select id="cliente" v-model="state.form.clienteId" class="form-select">
                                                    <option value="">Selecione</option>
                                                    <option v-for="cliente in state.clientes" :key="cliente.id"
                                                        :value="cliente.id">{{ cliente.nome }}</option>
                                                </select>
                                            </div>
                                            <div class="col-lg-4">
                                                <label class="form-label">Referência</label>
                                                <input v-model="state.form.referencia" type="text" maxlength="120"
                                                    class="form-control" placeholder="ex.: fachada loja centro" />
                                            </div>
                                        </div>

                                        <div class="row g-3 p-2">
                                            <div class="col-lg-4">
                                                <label class="form-label">Forma de pagamento</label>
                                                <input v-model="state.form.formaPagamento" type="text" maxlength="120"
                                                    class="form-control" placeholder="ex.: PIX, 50% entrada + 50% na entrega" />
                                            </div>
                                            <div class="col-lg-4">
                                                <label class="form-label">Prazo de entrega</label>
                                                <input v-model="state.form.prazoEntrega" type="text" maxlength="60"
                                                    class="form-control" placeholder="ex.: 5 dias úteis" />
                                            </div>
                                            <div class="col-lg-4">
                                                <label class="form-label">Observações</label>
                                                <textarea v-model="state.form.observacoes" maxlength="1000" rows="1"
                                                    class="form-control" placeholder="instruções de produção, detalhes combinados..."></textarea>
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

                                        <div v-for="(item, index) in state.form.itens" :key="index"
                                            class="border rounded p-3 m-2">
                                            <div class="row g-2 align-items-end">
                                                <div class="col-lg-4">
                                                    <label class="form-label">Produto</label>
                                                    <select v-model="item.produtoId" class="form-select"
                                                        @change="aoTrocarProduto(item)">
                                                        <option value="">Selecione</option>
                                                        <option v-for="produto in state.produtos" :key="produto.id"
                                                            :value="produto.id">{{ produto.nome }}</option>
                                                    </select>
                                                </div>
                                                <div class="col-lg-2">
                                                    <label class="form-label">Altura (cm)</label>
                                                    <input v-model="item.altura" type="number" step="0.01" min="0.01"
                                                        class="form-control" />
                                                </div>
                                                <div class="col-lg-2">
                                                    <label class="form-label">Largura (cm)</label>
                                                    <input v-model="item.largura" type="number" step="0.01" min="0.01"
                                                        class="form-control" />
                                                </div>
                                                <div class="col-lg-2">
                                                    <label class="form-label">Qtde</label>
                                                    <input v-model="item.quantidade" type="number" step="0.01" min="0.01"
                                                        class="form-control" />
                                                </div>
                                                <div class="col-lg-2 text-end">
                                                    <button type="button" class="btn btn-danger"
                                                        @click="removerItem(index)">
                                                        <i class="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>

                                            <!-- Medidas extras declaradas pelo produto -->
                                            <div v-if="medidasDe(item).length" class="row g-2 mt-1">
                                                <div v-for="medida in medidasDe(item)" :key="medida.id"
                                                    class="col-lg-3">
                                                    <label class="form-label">
                                                        {{ medida.nome }}
                                                        <span v-if="medida.unidade">({{ medida.unidade }})</span>
                                                        <span v-if="medida.obrigatoria" class="text-danger">*</span>
                                                    </label>
                                                    <input v-model="item.medidas[medida.nome]" type="number" step="0.01"
                                                        class="form-control" />
                                                </div>
                                            </div>

                                            <!-- Escolha do material dos slots -->
                                            <div v-if="slotsDe(item).length" class="row g-2 mt-1">
                                                <div v-for="slot in slotsDe(item)" :key="slot.id" class="col-lg-4">
                                                    <label class="form-label">Material ({{ slot.grupoSlot }})
                                                        <span class="text-danger">*</span></label>
                                                    <select v-model="item.escolhasMateria[slot.id]" class="form-select">
                                                        <option value="">Selecione</option>
                                                        <option v-for="materia in materiasDoGrupo(slot.grupoSlot)"
                                                            :key="materia.id" :value="materia.id">
                                                            {{ materia.nome }} — {{ formatBRL(materia.preco) }}/{{ materia.unidade }}
                                                        </option>
                                                    </select>
                                                </div>
                                            </div>

                                            <!-- Grupos de opções (acabamentos/seleções) -->
                                            <div v-if="gruposDe(item).length" class="row g-2 mt-1">
                                                <div v-for="grupo in gruposDe(item)" :key="grupo.id" class="col-lg-3">
                                                    <label class="form-label">{{ grupo.nome }}
                                                        <span v-if="grupo.obrigatorio" class="text-danger">*</span></label>
                                                    <select v-model="item.escolhasOpcao[grupo.id]" class="form-select">
                                                        <option v-if="!grupo.obrigatorio" value="">Nenhum</option>
                                                        <option v-else value="" disabled>Selecione</option>
                                                        <option v-for="opcao in grupo.opcoes" :key="opcao.id"
                                                            :value="opcao.id">{{ opcao.nome }}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="card-footer text-center">
                                        <button type="button" class="btn btn-primary button-medium m-2" @click="salvar">
                                            <i class="bi bi-floppy"></i>&nbsp;&nbsp;&nbsp;Salvar
                                        </button>
                                        <button type="button" class="btn btn-primary button-medium m-2"
                                            @click="router.push(state.form.status === 'ORDEM_SERVICO' ? '/ordens-servico' : '/orcamentos')">
                                            <i class="bi bi-arrow-counterclockwise"></i>&nbsp;&nbsp;&nbsp;Voltar
                                        </button>
                                    </div>
                                </template>

                                <!-- ===================== DETALHE ===================== -->
                                <template v-if="state.isReady && isDetail && state.venda">
                                    <div class="card-header">
                                        <div class="card-title">
                                            <h5>
                                                {{ statusLabel }}<template v-if="state.venda.numero"> nº
                                                    {{ state.venda.numero }}</template>
                                                <span class="badge ms-2" :class="statusBadgeClass">{{ statusLabel }}</span>
                                            </h5>
                                        </div>
                                    </div>
                                    <div class="card-body my-3">
                                        <div v-if="state.venda.vencido" class="alert alert-warning" role="alert">
                                            <i class="bi bi-exclamation-triangle"></i>
                                            Orçamento vencido. Recalcule (para usar os preços atuais) ou cancele.
                                        </div>

                                        <div v-if="state.venda.referencia" class="row px-2 pt-2">
                                            <div class="col"><strong>Referência:</strong>
                                                {{ state.venda.referencia }}</div>
                                        </div>
                                        <div class="row p-2">
                                            <div class="col-lg-4"><strong>Cliente:</strong>
                                                {{ nomeCliente(state.venda.clienteId) }}</div>
                                            <div class="col-lg-4"><strong>Data:</strong>
                                                {{ formatData(state.venda.dataCriacao) }}</div>
                                            <div class="col-lg-4"><strong>Total:</strong>
                                                {{ formatBRL(state.venda.total) }}</div>
                                        </div>

                                        <div class="border rounded p-3 m-2">
                                            <div class="d-flex justify-content-between align-items-center mb-1">
                                                <strong>Condições</strong>
                                                <button v-if="state.venda.status !== 'CANCELADO' && !cabecalho.editando"
                                                    type="button" class="btn btn-outline-secondary btn-sm py-0"
                                                    title="Editar condições" @click="editarCabecalho">
                                                    <i class="bi bi-pencil"></i>
                                                </button>
                                            </div>
                                            <template v-if="!cabecalho.editando">
                                                <div class="row small">
                                                    <div class="col-lg-3"><strong>Referência:</strong>
                                                        {{ state.venda.referencia || '—' }}</div>
                                                    <div class="col-lg-3"><strong>Forma de pagamento:</strong>
                                                        {{ state.venda.formaPagamento || '—' }}</div>
                                                    <div class="col-lg-3"><strong>Prazo de entrega:</strong>
                                                        {{ state.venda.prazoEntrega || '—' }}</div>
                                                    <div class="col-lg-3"><strong>Observações:</strong>
                                                        {{ state.venda.observacoes || '—' }}</div>
                                                </div>
                                            </template>
                                            <template v-else>
                                                <div class="row g-2">
                                                    <div class="col-lg-3">
                                                        <label class="form-label small mb-0">Referência</label>
                                                        <input v-model="cabecalho.referencia" type="text"
                                                            maxlength="120" class="form-control form-control-sm" />
                                                    </div>
                                                    <div class="col-lg-3">
                                                        <label class="form-label small mb-0">Forma de pagamento</label>
                                                        <input v-model="cabecalho.formaPagamento" type="text"
                                                            maxlength="120" class="form-control form-control-sm" />
                                                    </div>
                                                    <div class="col-lg-3">
                                                        <label class="form-label small mb-0">Prazo de entrega</label>
                                                        <input v-model="cabecalho.prazoEntrega" type="text"
                                                            maxlength="60" class="form-control form-control-sm" />
                                                    </div>
                                                    <div class="col-lg-3">
                                                        <label class="form-label small mb-0">Observações</label>
                                                        <textarea v-model="cabecalho.observacoes" maxlength="1000"
                                                            rows="1" class="form-control form-control-sm"></textarea>
                                                    </div>
                                                </div>
                                                <div class="text-end mt-2">
                                                    <button type="button" class="btn btn-success btn-sm me-2"
                                                        :disabled="state.isProcessing" @click="salvarCabecalho">
                                                        <i class="bi bi-check-lg"></i>&nbsp;Salvar
                                                    </button>
                                                    <button type="button" class="btn btn-outline-secondary btn-sm"
                                                        @click="cabecalho.editando = false">
                                                        <i class="bi bi-x-lg"></i>&nbsp;Cancelar
                                                    </button>
                                                </div>
                                            </template>
                                        </div>

                                        <div v-for="(item, index) in state.venda.itens" :key="index"
                                            class="border rounded p-3 m-2">
                                            <div class="row">
                                                <div class="col-lg-9"><strong>{{ item.descricao || item.produtoNome }}</strong></div>
                                                <div class="col-lg-3 text-end">
                                                    <template v-if="precoEdicao.index === index">
                                                        <div class="input-group input-group-sm justify-content-end">
                                                            <input type="number" step="0.01" min="0.01"
                                                                class="form-control text-end" style="max-width: 8rem"
                                                                v-model="precoEdicao.valor"
                                                                @keyup.enter="salvarPrecoFinal(item)"
                                                                @keyup.esc="cancelarEdicaoPreco" />
                                                            <button type="button" class="btn btn-success"
                                                                :disabled="state.isProcessing"
                                                                @click="salvarPrecoFinal(item)">
                                                                <i class="bi bi-check-lg"></i>
                                                            </button>
                                                            <button type="button" class="btn btn-outline-secondary"
                                                                @click="cancelarEdicaoPreco">
                                                                <i class="bi bi-x-lg"></i>
                                                            </button>
                                                        </div>
                                                    </template>
                                                    <template v-else>
                                                        <span v-if="precoAjustado(item)"
                                                            class="badge text-bg-info me-2">ajustado</span>
                                                        <strong>{{ formatBRL(item.precoFinal) }}</strong>
                                                        <button v-if="podeAjustarPreco" type="button"
                                                            class="btn btn-outline-secondary btn-sm ms-2 py-0"
                                                            title="Ajustar preço final"
                                                            @click="iniciarEdicaoPreco(index, item)">
                                                            <i class="bi bi-pencil"></i>
                                                        </button>
                                                    </template>
                                                </div>
                                            </div>
                                            <div class="row text-muted small mb-2">
                                                <div class="col">
                                                    Sugerido: {{ formatBRL(item.precoSugerido) }}
                                                    <button v-if="temDadosDeCusto(item)" type="button"
                                                        class="btn btn-outline-secondary btn-sm ms-2 py-0"
                                                        @click="toggleDetalhes(index)">
                                                        <i class="bi" :class="detalhesAbertos[index] ? 'bi-eye-slash' : 'bi-eye'"></i>
                                                        {{ detalhesAbertos[index] ? 'Ocultar detalhes' : 'Detalhes' }}
                                                    </button>
                                                </div>
                                            </div>
                                            <div v-if="detalhesAbertos[index] && item.custoTotal != null"
                                                class="row text-muted small mb-2">
                                                <div class="col">Custo: {{ formatBRL(item.custoTotal) }} ·
                                                    Margem: {{ item.markupAplicado }}%</div>
                                            </div>
                                            <div v-if="detalhesAbertos[index] && item.detalhes?.length" class="table-responsive">
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
                                                            <td>{{ d.nome }}
                                                                <small v-if="d.opcaoNome" class="text-muted">
                                                                    ({{ d.opcaoNome }})</small>
                                                            </td>
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
                                        <button v-if="state.venda.editavel" type="button"
                                            class="btn btn-primary button-medium m-2" @click="editarVenda">
                                            <i class="bi bi-pen"></i>&nbsp;&nbsp;&nbsp;Editar
                                        </button>
                                        <button v-if="state.venda.editavel" type="button"
                                            class="btn btn-danger button-medium m-2" @click="excluirVenda">
                                            <i class="bi bi-trash"></i>&nbsp;&nbsp;&nbsp;Excluir
                                        </button>
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
                                        <button v-if="state.venda.status !== 'CANCELADO'" type="button"
                                            class="btn btn-secondary button-medium m-2"
                                            @click="router.push({ name: 'venda-imprimir', params: { vendaId: route.params.vendaId } })">
                                            <i class="bi bi-printer"></i>&nbsp;&nbsp;&nbsp;Imprimir
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
