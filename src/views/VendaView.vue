<script setup>
import { reactive, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axiosInstance from '@/axiosInstance';
import { showModal } from '@/composables/modalUtils';
import { showToast } from '@/composables/toastUtils';
import BuscaSelect from '@/components/BuscaSelect.vue';

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
        condicaoPagamento: '',
        formaEntrega: '',
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
        medidas: {}, // nome da medida -> valor
        escolhasMateria: {}, // componenteId (slot) -> materiaId
        escolhasOpcao: {}, // grupoId -> opcaoId ('' = nenhum)
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

// Título = tipo + nº ("Ordem de Serviço nº 12"); cancelada vira "Venda nº 12"
// porque o tipo original não é mais relevante.
const tituloVenda = computed(() => {
    if (!state.venda) return '-';
    const numero = state.venda.numero ? ` ${String(state.venda.numero).padStart(4, '0')}` : '';
    switch (state.venda.status) {
        case 'ORCAMENTO':
            return `ORÇAMENTO${numero}`;
        case 'ORDEM_SERVICO':
            return `OS${numero}`; // curto: cabe na coluna do título
        case 'CANCELADO':
            return `VENDA${numero}`;
        default:
            return '-';
    }
});
// Badge informa a SITUAÇÃO (o título já diz o tipo).
const badgeSituacao = computed(() => {
    if (!state.venda) return null;
    if (state.venda.status === 'CANCELADO') return { texto: 'Cancelada', classe: 'text-bg-secondary' };
    if (state.venda.status === 'ORCAMENTO') {
        return state.venda.vencido
            ? { texto: 'Vencido', classe: 'text-bg-warning' }
            : { texto: 'Vigente', classe: 'text-bg-success' };
    }
    return null;
});
// Comunica a janela de edição em vez de sumir com os botões.
const janelaEdicao = computed(() => {
    if (!state.venda || state.venda.status === 'CANCELADO') return null;
    if (state.venda.editavel) {
        const limite = state.venda.editavelAte
            ? new Date(state.venda.editavelAte).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
            : null;
        return limite ? `Edição e exclusão disponíveis até ${limite}.` : null;
    }
    return 'A janela de edição/exclusão expirou — itens e cliente estão congelados.';
});
const voltarParaLista = () => router.push(state.venda?.status === 'ORDEM_SERVICO' ? '/ordens-servico' : '/orcamentos');

// Reconstrói o formulário a partir do snapshot (entradaJson) para a edição na janela de 1h.
const preencherFormularioParaEdicao = (venda) => {
    state.form.status = venda.status;
    state.form.clienteId = venda.clienteId;
    state.form.referencia = venda.referencia || '';
    state.form.formaPagamento = venda.formaPagamento || '';
    state.form.condicaoPagamento = venda.condicaoPagamento || '';
    state.form.formaEntrega = venda.formaEntrega || '';
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
            (produto.materiasCalculo || [])
                .filter((mc) => mc.grupoSlot)
                .forEach((slot) => {
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

// ---- preço ao vivo: o motor calcula enquanto o vendedor preenche ----
const previews = reactive({});
let previewTimer = null;
let previewRun = 0;

const clienteFormulario = computed(() => state.clientes.find((c) => c.id === state.form.clienteId) || null);

const itemCompleto = (item) => {
    if (!item.produtoId) return false;
    if (!(Number(item.altura) > 0) || !(Number(item.largura) > 0) || !(Number(item.quantidade) > 0)) return false;
    for (const medida of medidasDe(item)) {
        const valor = item.medidas[medida.nome];
        if (medida.obrigatoria && (valor === '' || valor == null)) return false;
    }
    for (const slot of slotsDe(item)) {
        if (!item.escolhasMateria[slot.id]) return false;
    }
    for (const grupo of gruposDe(item)) {
        if (grupo.obrigatorio && !item.escolhasOpcao[grupo.id]) return false;
    }
    return true;
};

const montarPayloadCalculo = (item) => ({
    altura: Number(item.altura),
    largura: Number(item.largura),
    quantidade: Number(item.quantidade),
    categoria: clienteFormulario.value?.categoria || null,
    medidas: Object.fromEntries(
        Object.entries(item.medidas)
            .filter(([, valor]) => valor !== '' && valor != null)
            .map(([nome, valor]) => [nome, Number(valor)])
    ),
    escolhasMateria: Object.entries(item.escolhasMateria)
        .filter(([, materiaId]) => materiaId)
        .map(([componenteId, materiaId]) => ({ componenteId, materiaId })),
    escolhasOpcao: Object.values(item.escolhasOpcao).filter((opcaoId) => opcaoId),
});

const calcularPrevias = async () => {
    const run = ++previewRun;
    for (const [index, item] of state.form.itens.entries()) {
        if (!itemCompleto(item)) {
            previews[index] = null;
            continue;
        }
        previews[index] = { ...(previews[index] || {}), carregando: true };
        try {
            const { data } = await axiosInstance.post(
                `/produtos/${item.produtoId}/calcular`,
                montarPayloadCalculo(item)
            );
            if (run !== previewRun) return; // veio edição nova no meio: descarta
            previews[index] = {
                preco: data.precoSugerido,
                atacado: data.precoAtacado,
                varejo: data.precoVarejo,
                erro: null,
            };
        } catch (error) {
            if (run !== previewRun) return;
            previews[index] = { preco: null, erro: getErrorMessage(error, 'Não foi possível calcular.') };
        }
    }
    Object.keys(previews).forEach((chave) => {
        if (Number(chave) >= state.form.itens.length) delete previews[chave];
    });
};

// Debounce: recalcula meio segundo após a última digitação.
watch(
    () => [state.form.itens, state.form.clienteId],
    () => {
        if (isDetail.value) return;
        clearTimeout(previewTimer);
        previewTimer = setTimeout(calcularPrevias, 500);
    },
    { deep: true }
);

// Total corrente do formulário (só quando há cliente: o preço certo depende da categoria).
const totalPrevisto = computed(() => {
    if (!clienteFormulario.value || !state.form.itens.length) return null;
    const valores = state.form.itens.map((item, index) => previews[index]?.preco);
    if (valores.some((valor) => valor == null)) return null;
    return valores.reduce((soma, valor) => soma + Number(valor), 0);
});

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
        condicaoPagamento: state.form.condicaoPagamento,
        formaEntrega: state.form.formaEntrega,
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
            showToast(
                'sucesso',
                state.form.status === 'ORDEM_SERVICO'
                    ? 'Ordem de serviço criada com sucesso!'
                    : 'Orçamento criado com sucesso!'
            );
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

// Campos livres do cabeçalho (referência/pagamento/prazo/observações): não
// mexem em preço, então são editáveis fora da janela de 1h. Cada bloco tem
// seu lápis; tudo bate no mesmo PUT /cabecalho.
const CAMPOS_CABECALHO = [
    'referencia',
    'formaPagamento',
    'condicaoPagamento',
    'formaEntrega',
    'prazoEntrega',
    'observacoes',
];
// Pseudo-campos de par: 'pagamento' edita forma+condição; 'entrega' edita
// forma+prazo (valor + valorExtra).
const campoEdicao = reactive({ campo: null, valor: '', valorExtra: '' });
const podeEditarCabecalho = computed(() => state.venda && state.venda.status !== 'CANCELADO');
const iniciarEdicaoCampo = (campo) => {
    campoEdicao.campo = campo;
    if (campo === 'pagamento') {
        campoEdicao.valor = state.venda.formaPagamento || '';
        campoEdicao.valorExtra = state.venda.condicaoPagamento || '';
    } else if (campo === 'entrega') {
        campoEdicao.valor = state.venda.formaEntrega || '';
        campoEdicao.valorExtra = state.venda.prazoEntrega || '';
    } else {
        campoEdicao.valor = state.venda[campo] || '';
    }
};
const cancelarEdicaoCampo = () => {
    campoEdicao.campo = null;
    campoEdicao.valor = '';
    campoEdicao.valorExtra = '';
};
const salvarCampo = async () => {
    try {
        state.isProcessing = true;
        const payload = Object.fromEntries(CAMPOS_CABECALHO.map((campo) => [campo, state.venda[campo]]));
        if (campoEdicao.campo === 'pagamento') {
            payload.formaPagamento = campoEdicao.valor;
            payload.condicaoPagamento = campoEdicao.valorExtra;
        } else if (campoEdicao.campo === 'entrega') {
            payload.formaEntrega = campoEdicao.valor;
            payload.prazoEntrega = campoEdicao.valorExtra;
        } else {
            payload[campoEdicao.campo] = campoEdicao.valor;
        }
        const response = await axiosInstance.put(`/vendas/${route.params.vendaId}/cabecalho`, payload);
        state.venda = response.data;
        cancelarEdicaoCampo();
        showToast('sucesso', 'Alteração salva.');
    } catch (error) {
        showToast('erro', getErrorMessage(error, 'Não foi possível salvar a alteração.'));
    } finally {
        state.isProcessing = false;
    }
};

// Resumo financeiro DERIVADO dos snapshots: desconto = soma dos ajustes de
// preço final abaixo do sugerido (nada novo é gravado).
const resumoFinanceiro = computed(() => {
    if (!state.venda) return null;
    const sugerido = (state.venda.itens || []).reduce(
        (soma, item) => soma + Number(item.precoSugerido ?? item.precoFinal ?? 0),
        0
    );
    const total = Number(state.venda.total || 0);
    return { sugerido, total, ajuste: Math.round((total - sugerido) * 100) / 100 };
});

const clienteVenda = computed(() => state.clientes.find((c) => c.id === state.venda?.clienteId) || null);
const categoriaClienteLabel = computed(() => {
    switch (clienteVenda.value?.categoria) {
        case 'R':
            return 'REVENDA';
        case 'F':
            return 'CONSUMIDOR FINAL';
        default:
            return null;
    }
});
const abrirFichaCliente = () => {
    const cliente = clienteVenda.value;
    if (!cliente) return;
    const rota =
        cliente.tipo === 'JURÍDICA'
            ? { name: 'cliente-juridico', params: { juridicoId: cliente.id } }
            : { name: 'cliente-fisico', params: { fisicoId: cliente.id } };
    // Nova guia: consultar a ficha é tarefa paralela — a venda continua aberta aqui.
    window.open(router.resolve(rota).href, '_blank');
};
const formatDia = (valor) => (valor ? new Date(`${valor}T00:00:00`).toLocaleDateString('pt-BR') : '-');

// Ajuste manual do preço final — a única edição permitida depois do congelamento.
const precoEdicao = reactive({ index: null, valor: null });
const podeAjustarPreco = computed(() => state.venda && state.venda.status !== 'CANCELADO' && !state.venda.vencido);
const precoAjustado = (item) =>
    item.precoSugerido != null && item.precoFinal != null && Number(item.precoFinal) !== Number(item.precoSugerido);
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
        const response = await axiosInstance.put(`/vendas/${route.params.vendaId}/itens/${item.id}/preco-final`, {
            precoFinal: valor,
        });
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
    const modal = showModal(
        'Excluir venda',
        'Excluir definitivamente esta venda? (permitido apenas na primeira hora após a criação)',
        async () => {
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
        }
    );
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
    executarAcao(
        'Converter em Ordem de Serviço',
        'Confirma converter este orçamento em ordem de serviço?',
        'ordem-servico',
        'Convertido em ordem de serviço!'
    );
const recalcular = () =>
    executarAcao(
        'Recalcular orçamento',
        'Reprocessar com os preços atuais? O preço final de cada item será redefinido e a validade reiniciada.',
        'recalcular',
        'Orçamento recalculado!'
    );
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
                                {{ isDetail ? 'Detalhe' : isEditVenda ? 'Editar' : 'Nova Venda' }}
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
                                <div
                                    v-if="state.isProcessing"
                                    class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75"
                                    style="z-index: 10"
                                >
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Processando...</span>
                                    </div>
                                </div>

                                <!-- ===================== CRIAÇÃO ===================== -->
                                <template v-if="state.isReady && !isDetail">
                                    <div class="card-header">
                                        <div class="card-title">
                                            <h5>
                                                {{
                                                    isEditVenda
                                                        ? 'Editar Venda'
                                                        : state.form.status === 'ORDEM_SERVICO'
                                                          ? 'Nova Ordem de Serviço'
                                                          : 'Novo Orçamento'
                                                }}
                                            </h5>
                                        </div>
                                    </div>
                                    <div class="card-body my-3">
                                        <div class="row g-3 p-2">
                                            <div class="col-lg-3">
                                                <label class="form-label"><strong>Tipo</strong></label>
                                                <select v-model="state.form.status" class="form-select">
                                                    <option value="ORCAMENTO">Orçamento</option>
                                                    <option value="ORDEM_SERVICO">
                                                        Ordem de Serviço (venda direta)
                                                    </option>
                                                </select>
                                            </div>
                                            <div class="col-lg-5">
                                                <label class="form-label"><strong>Cliente</strong></label>
                                                <BuscaSelect
                                                    v-model="state.form.clienteId"
                                                    :opcoes="state.clientes"
                                                    placeholder="Digite para buscar o cliente..."
                                                />
                                            </div>
                                            <div class="col-lg-4">
                                                <label class="form-label">Referência</label>
                                                <input
                                                    v-model="state.form.referencia"
                                                    type="text"
                                                    maxlength="120"
                                                    class="form-control"
                                                    placeholder="ex.: fachada loja centro"
                                                />
                                            </div>
                                        </div>

                                        <div class="row g-3 p-2">
                                            <div class="col-lg-3">
                                                <label class="form-label">Forma de pagamento</label>
                                                <input
                                                    v-model="state.form.formaPagamento"
                                                    type="text"
                                                    maxlength="120"
                                                    class="form-control"
                                                    placeholder="ex.: PIX, dinheiro, cartão"
                                                />
                                            </div>
                                            <div class="col-lg-3">
                                                <label class="form-label">Condição de pagamento</label>
                                                <input
                                                    v-model="state.form.condicaoPagamento"
                                                    type="text"
                                                    maxlength="120"
                                                    class="form-control"
                                                    placeholder="ex.: à vista, 50% + 50% na retirada"
                                                />
                                            </div>
                                            <div class="col-lg-3">
                                                <label class="form-label">Forma de entrega</label>
                                                <input
                                                    v-model="state.form.formaEntrega"
                                                    type="text"
                                                    maxlength="120"
                                                    class="form-control"
                                                    placeholder="ex.: retirada, entrega, instalação"
                                                />
                                            </div>
                                            <div class="col-lg-3">
                                                <label class="form-label">Prazo de entrega</label>
                                                <input
                                                    v-model="state.form.prazoEntrega"
                                                    type="text"
                                                    maxlength="60"
                                                    class="form-control"
                                                    placeholder="ex.: 5 dias úteis"
                                                />
                                            </div>
                                        </div>

                                        <div class="row g-3 p-2 pt-0">
                                            <div class="col-12">
                                                <label class="form-label">Observações</label>
                                                <textarea
                                                    v-model="state.form.observacoes"
                                                    maxlength="1000"
                                                    rows="1"
                                                    class="form-control"
                                                    placeholder="instruções de produção, detalhes combinados..."
                                                ></textarea>
                                            </div>
                                        </div>

                                        <!-- Contêiner dos itens (mesmo padrão dos demais blocos) -->
                                        <div class="border rounded p-3 m-2 mt-3">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <strong>Itens</strong>
                                                <button
                                                    type="button"
                                                    class="btn btn-primary button-medium"
                                                    @click="adicionarItem"
                                                >
                                                    <i class="bi bi-plus"></i>&nbsp;&nbsp;&nbsp;Adicionar item
                                                </button>
                                            </div>

                                            <div
                                                v-for="(item, index) in state.form.itens"
                                                :key="index"
                                                class="border rounded p-3 mt-3"
                                            >
                                                <div class="row g-2 align-items-end">
                                                    <div class="col-lg-4">
                                                        <label class="form-label">Produto</label>
                                                        <BuscaSelect
                                                            :model-value="item.produtoId"
                                                            :opcoes="state.produtos"
                                                            placeholder="Digite para buscar o produto..."
                                                            @update:model-value="
                                                                (valor) => {
                                                                    item.produtoId = valor;
                                                                    aoTrocarProduto(item);
                                                                }
                                                            "
                                                        />
                                                    </div>
                                                    <div class="col-lg-2">
                                                        <label class="form-label">Altura (cm)</label>
                                                        <input
                                                            v-model="item.altura"
                                                            type="number"
                                                            step="0.01"
                                                            min="0.01"
                                                            class="form-control"
                                                        />
                                                    </div>
                                                    <div class="col-lg-2">
                                                        <label class="form-label">Largura (cm)</label>
                                                        <input
                                                            v-model="item.largura"
                                                            type="number"
                                                            step="0.01"
                                                            min="0.01"
                                                            class="form-control"
                                                        />
                                                    </div>
                                                    <div class="col-lg-2">
                                                        <label class="form-label">Qtde</label>
                                                        <input
                                                            v-model="item.quantidade"
                                                            type="number"
                                                            step="0.01"
                                                            min="0.01"
                                                            class="form-control"
                                                        />
                                                    </div>
                                                    <div class="col-lg-2 text-end">
                                                        <button
                                                            type="button"
                                                            class="btn btn-danger"
                                                            @click="removerItem(index)"
                                                        >
                                                            <i class="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                </div>

                                                <!-- Medidas extras declaradas pelo produto -->
                                                <div v-if="medidasDe(item).length" class="row g-2 mt-1">
                                                    <div
                                                        v-for="medida in medidasDe(item)"
                                                        :key="medida.id"
                                                        class="col-lg-3"
                                                    >
                                                        <label class="form-label">
                                                            {{ medida.nome }}
                                                            <span v-if="medida.unidade">({{ medida.unidade }})</span>
                                                            <span v-if="medida.obrigatoria" class="text-danger">*</span>
                                                            <small
                                                                v-if="medida.minimo != null || medida.maximo != null"
                                                                class="text-muted"
                                                            >
                                                                [{{ medida.minimo ?? '…' }} a
                                                                {{ medida.maximo ?? '…' }}]
                                                            </small>
                                                        </label>
                                                        <input
                                                            v-model="item.medidas[medida.nome]"
                                                            type="number"
                                                            step="0.01"
                                                            class="form-control"
                                                        />
                                                    </div>
                                                </div>

                                                <!-- Escolha do material dos slots -->
                                                <div v-if="slotsDe(item).length" class="row g-2 mt-1">
                                                    <div v-for="slot in slotsDe(item)" :key="slot.id" class="col-lg-4">
                                                        <label class="form-label"
                                                            >Material ({{ slot.grupoSlot }})
                                                            <span class="text-danger">*</span></label
                                                        >
                                                        <select
                                                            v-model="item.escolhasMateria[slot.id]"
                                                            class="form-select"
                                                        >
                                                            <option value="">Selecione</option>
                                                            <option
                                                                v-for="materia in materiasDoGrupo(slot.grupoSlot)"
                                                                :key="materia.id"
                                                                :value="materia.id"
                                                            >
                                                                {{ materia.nome }} — {{ formatBRL(materia.preco) }}/{{
                                                                    materia.unidade
                                                                }}
                                                            </option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <!-- Grupos de opções (acabamentos/seleções) -->
                                                <div v-if="gruposDe(item).length" class="row g-2 mt-1">
                                                    <div
                                                        v-for="grupo in gruposDe(item)"
                                                        :key="grupo.id"
                                                        class="col-lg-3"
                                                    >
                                                        <label class="form-label"
                                                            >{{ grupo.nome }}
                                                            <span v-if="grupo.obrigatorio" class="text-danger"
                                                                >*</span
                                                            ></label
                                                        >
                                                        <select
                                                            v-model="item.escolhasOpcao[grupo.id]"
                                                            class="form-select"
                                                        >
                                                            <option v-if="!grupo.obrigatorio" value="">Nenhum</option>
                                                            <option v-else value="" disabled>Selecione</option>
                                                            <option
                                                                v-for="opcao in grupo.opcoes"
                                                                :key="opcao.id"
                                                                :value="opcao.id"
                                                            >
                                                                {{ opcao.nome }}
                                                            </option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <!-- Preço ao vivo do item -->
                                                <div class="row mt-2">
                                                    <div class="col text-end">
                                                        <span
                                                            v-if="previews[index]?.carregando"
                                                            class="text-muted small"
                                                            >calculando…</span
                                                        >
                                                        <span
                                                            v-else-if="previews[index]?.erro"
                                                            class="text-danger small"
                                                            >{{ previews[index].erro }}</span
                                                        >
                                                        <strong v-else-if="previews[index]?.preco != null">
                                                            {{ formatBRL(previews[index].preco) }}</strong
                                                        >
                                                        <span v-else-if="previews[index]?.varejo != null" class="small">
                                                            Varejo
                                                            <strong>{{ formatBRL(previews[index].varejo) }}</strong> ·
                                                            Atacado
                                                            <strong>{{ formatBRL(previews[index].atacado) }}</strong>
                                                            <span class="text-muted">(escolha o cliente)</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Total corrente -->
                                            <div v-if="totalPrevisto != null" class="row mt-3">
                                                <div class="col text-end fs-5">
                                                    <strong>Total: {{ formatBRL(totalPrevisto) }}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="card-footer text-center">
                                        <button type="button" class="btn btn-primary button-medium m-2" @click="salvar">
                                            <i class="bi bi-floppy"></i>&nbsp;&nbsp;&nbsp;Salvar
                                        </button>
                                        <button
                                            type="button"
                                            class="btn btn-primary button-medium m-2"
                                            @click="
                                                router.push(
                                                    state.form.status === 'ORDEM_SERVICO'
                                                        ? '/ordens-servico'
                                                        : '/orcamentos'
                                                )
                                            "
                                        >
                                            <i class="bi bi-arrow-counterclockwise"></i>&nbsp;&nbsp;&nbsp;Voltar
                                        </button>
                                    </div>
                                </template>

                                <!-- ===================== DETALHE ===================== -->
                                <template v-if="state.isReady && isDetail && state.venda">
                                    <div class="card-header">
                                        <!-- Identidade em grade: título 2 / referência 6 / data 2 / validade 2 -->
                                        <div class="row g-2 w-100 align-items-center">
                                            <div class="col-lg-2">
                                                <h5 class="mb-0">{{ tituloVenda }}</h5>
                                                <span
                                                    v-if="badgeSituacao"
                                                    class="badge"
                                                    :class="badgeSituacao.classe"
                                                    >{{ badgeSituacao.texto }}</span
                                                >
                                            </div>
                                            <div class="col-lg-6">
                                                <div class="text-muted small">Referência</div>
                                                <template v-if="campoEdicao.campo === 'referencia'">
                                                    <div class="input-group input-group-sm" style="max-width: 26rem">
                                                        <input
                                                            v-model="campoEdicao.valor"
                                                            type="text"
                                                            maxlength="120"
                                                            class="form-control"
                                                            placeholder="referência do trabalho"
                                                            @keyup.enter="salvarCampo"
                                                            @keyup.esc="cancelarEdicaoCampo"
                                                        />
                                                        <button
                                                            type="button"
                                                            class="btn btn-success"
                                                            :disabled="state.isProcessing"
                                                            @click="salvarCampo"
                                                        >
                                                            <i class="bi bi-check-lg"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            class="btn btn-outline-secondary"
                                                            @click="cancelarEdicaoCampo"
                                                        >
                                                            <i class="bi bi-x-lg"></i>
                                                        </button>
                                                    </div>
                                                </template>
                                                <div v-else class="fw-semibold">
                                                    {{ state.venda.referencia || '—' }}
                                                    <button
                                                        v-if="podeEditarCabecalho"
                                                        type="button"
                                                        class="btn btn-outline-secondary btn-sm ms-1 py-0"
                                                        title="Editar referência"
                                                        @click="iniciarEdicaoCampo('referencia')"
                                                    >
                                                        <i class="bi bi-pencil"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div class="col-lg-1">
                                                <div class="text-muted small">Data</div>
                                                <div>{{ formatData(state.venda.dataCriacao) }}</div>
                                            </div>
                                            <div class="col-lg-1">
                                                <template v-if="state.venda.status === 'ORCAMENTO'">
                                                    <div class="text-muted small">Válido até</div>
                                                    <div>{{ formatDia(state.venda.validoAte) }}</div>
                                                </template>
                                            </div>
                                            <div class="col-lg-2">
                                                <div class="text-muted small">Atendente</div>
                                                <div v-if="state.venda.atendenteNome" class="text-muted small">
                                                    {{ state.venda.atendenteNome }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="card-body my-3">
                                        <div v-if="state.venda.vencido" class="alert alert-warning" role="alert">
                                            <i class="bi bi-exclamation-triangle"></i>
                                            Orçamento vencido. Recalcule (para usar os preços atuais) ou cancele.
                                        </div>

                                        <!-- 2 · Cliente: grade rótulo/valor, mesmo padrão do cabeçalho -->
                                        <div class="border rounded p-3 m-2">
                                            <div class="d-flex justify-content-between align-items-center mb-1">
                                                <strong>Cliente</strong>
                                                <button
                                                    v-if="clienteVenda"
                                                    type="button"
                                                    class="btn btn-outline-secondary btn-sm py-0"
                                                    title="Abrir a ficha do cliente em outra guia"
                                                    @click="abrirFichaCliente"
                                                >
                                                    <i class="bi bi-box-arrow-up-right"></i>&nbsp;Ficha
                                                </button>
                                            </div>
                                            <div class="row g-2">
                                                <div class="col-lg-4">
                                                    <div class="text-muted small">Nome</div>
                                                    <div class="fw-semibold">
                                                        {{ clienteVenda?.nome || nomeCliente(state.venda.clienteId) }}
                                                    </div>
                                                </div>
                                                <div class="col-lg-2">
                                                    <div class="text-muted small">Categoria</div>
                                                    <div>{{ categoriaClienteLabel || '—' }}</div>
                                                </div>
                                                <div class="col-lg-2">
                                                    <div class="text-muted small">Telefone</div>
                                                    <div>{{ clienteVenda?.telefone || '—' }}</div>
                                                </div>
                                                <div class="col-lg-2">
                                                    <div class="text-muted small">E-mail</div>
                                                    <div class="text-truncate" :title="clienteVenda?.email">
                                                        {{ clienteVenda?.email || '—' }}
                                                    </div>
                                                </div>
                                                <div class="col-lg-2">
                                                    <div class="text-muted small">Cidade</div>
                                                    <div>
                                                        {{ clienteVenda?.municipio || '—'
                                                        }}<template v-if="clienteVenda?.uf"
                                                            >/{{ clienteVenda.uf }}</template
                                                        >
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- 3 · Itens: contêiner único; itens separados por divisórias -->
                                        <div class="border rounded p-3 m-2">
                                            <div class="mb-2"><strong>Itens</strong></div>
                                            <div
                                                v-for="(item, index) in state.venda.itens"
                                                :key="index"
                                                class="py-2"
                                                :class="{ 'border-top': index > 0 }"
                                            >
                                                <div class="row">
                                                    <div class="col-lg-9">
                                                        <strong>{{ item.descricao || item.produtoNome }}</strong>
                                                    </div>
                                                    <div class="col-lg-3 text-end">
                                                        <template v-if="precoEdicao.index === index">
                                                            <div class="input-group input-group-sm justify-content-end">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0.01"
                                                                    class="form-control text-end"
                                                                    style="max-width: 8rem"
                                                                    v-model="precoEdicao.valor"
                                                                    @keyup.enter="salvarPrecoFinal(item)"
                                                                    @keyup.esc="cancelarEdicaoPreco"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    class="btn btn-success"
                                                                    :disabled="state.isProcessing"
                                                                    @click="salvarPrecoFinal(item)"
                                                                >
                                                                    <i class="bi bi-check-lg"></i>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    class="btn btn-outline-secondary"
                                                                    @click="cancelarEdicaoPreco"
                                                                >
                                                                    <i class="bi bi-x-lg"></i>
                                                                </button>
                                                            </div>
                                                        </template>
                                                        <template v-else>
                                                            <span
                                                                v-if="precoAjustado(item)"
                                                                class="badge text-bg-info me-2"
                                                                >ajustado</span
                                                            >
                                                            <strong>{{ formatBRL(item.precoFinal) }}</strong>
                                                            <button
                                                                v-if="podeAjustarPreco"
                                                                type="button"
                                                                class="btn btn-outline-secondary btn-sm ms-2 py-0"
                                                                title="Ajustar preço final"
                                                                @click="iniciarEdicaoPreco(index, item)"
                                                            >
                                                                <i class="bi bi-pencil"></i>
                                                            </button>
                                                        </template>
                                                    </div>
                                                </div>
                                                <div class="row text-muted small mb-2">
                                                    <div class="col">
                                                        Sugerido: {{ formatBRL(item.precoSugerido) }}
                                                        <button
                                                            v-if="temDadosDeCusto(item)"
                                                            type="button"
                                                            class="btn btn-outline-secondary btn-sm ms-2 py-0"
                                                            @click="toggleDetalhes(index)"
                                                        >
                                                            <i
                                                                class="bi"
                                                                :class="
                                                                    detalhesAbertos[index] ? 'bi-eye-slash' : 'bi-eye'
                                                                "
                                                            ></i>
                                                            {{
                                                                detalhesAbertos[index] ? 'Ocultar detalhes' : 'Detalhes'
                                                            }}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div
                                                    v-if="detalhesAbertos[index] && item.custoTotal != null"
                                                    class="row text-muted small mb-2"
                                                >
                                                    <div class="col">
                                                        Custo: {{ formatBRL(item.custoTotal) }} · Margem:
                                                        {{ item.markupAplicado }}%
                                                    </div>
                                                </div>
                                                <div
                                                    v-if="detalhesAbertos[index] && item.detalhes?.length"
                                                    class="table-responsive"
                                                >
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
                                                                <td>
                                                                    {{ d.nome }}
                                                                    <small v-if="d.opcaoNome" class="text-muted">
                                                                        ({{ d.opcaoNome }})</small
                                                                    >
                                                                </td>
                                                                <td>{{ d.tipoItem }}</td>
                                                                <td class="text-end">{{ d.quantidadeCalculada }}</td>
                                                                <td>{{ d.unidade }}</td>
                                                                <td class="text-end">
                                                                    {{ formatBRL(d.precoUnitario) }}
                                                                </td>
                                                                <td class="text-end">{{ formatBRL(d.valorTotal) }}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- 4 · Pagamento (4) / Entrega (5) / Total (3): pares Forma+Condição e
                                             Forma+Prazo na horizontal — mesma altura em todos -->
                                        <div class="row g-2 m-2">
                                            <div class="col-lg-4">
                                                <div class="border rounded p-3 h-100">
                                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                                        <strong>Pagamento</strong>
                                                        <button
                                                            v-if="
                                                                podeEditarCabecalho && campoEdicao.campo !== 'pagamento'
                                                            "
                                                            type="button"
                                                            class="btn btn-outline-secondary btn-sm py-0"
                                                            title="Editar forma e condição de pagamento"
                                                            @click="iniciarEdicaoCampo('pagamento')"
                                                        >
                                                            <i class="bi bi-pencil"></i>
                                                        </button>
                                                    </div>
                                                    <div v-if="campoEdicao.campo === 'pagamento'" class="row g-2">
                                                        <div class="col-lg-5">
                                                            <input
                                                                v-model="campoEdicao.valor"
                                                                type="text"
                                                                maxlength="120"
                                                                class="form-control form-control-sm"
                                                                placeholder="forma: PIX, dinheiro..."
                                                                @keyup.enter="salvarCampo"
                                                                @keyup.esc="cancelarEdicaoCampo"
                                                            />
                                                        </div>
                                                        <div class="col-lg-4">
                                                            <input
                                                                v-model="campoEdicao.valorExtra"
                                                                type="text"
                                                                maxlength="120"
                                                                class="form-control form-control-sm"
                                                                placeholder="condição"
                                                                @keyup.enter="salvarCampo"
                                                                @keyup.esc="cancelarEdicaoCampo"
                                                            />
                                                        </div>
                                                        <div class="col-lg-3 text-end">
                                                            <button
                                                                type="button"
                                                                class="btn btn-success btn-sm me-1"
                                                                :disabled="state.isProcessing"
                                                                @click="salvarCampo"
                                                            >
                                                                <i class="bi bi-check-lg"></i>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                class="btn btn-outline-secondary btn-sm"
                                                                @click="cancelarEdicaoCampo"
                                                            >
                                                                <i class="bi bi-x-lg"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div v-else class="row">
                                                        <div class="col-lg-5 small">
                                                            Forma: {{ state.venda.formaPagamento || '—' }}
                                                        </div>
                                                        <div class="col-lg-7 small">
                                                            Condição: {{ state.venda.condicaoPagamento || '—' }}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-lg-5">
                                                <div class="border rounded p-3 h-100">
                                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                                        <strong>Entrega</strong>
                                                        <button
                                                            v-if="
                                                                podeEditarCabecalho && campoEdicao.campo !== 'entrega'
                                                            "
                                                            type="button"
                                                            class="btn btn-outline-secondary btn-sm py-0"
                                                            title="Editar forma e prazo de entrega"
                                                            @click="iniciarEdicaoCampo('entrega')"
                                                        >
                                                            <i class="bi bi-pencil"></i>
                                                        </button>
                                                    </div>
                                                    <div v-if="campoEdicao.campo === 'entrega'" class="row g-2">
                                                        <div class="col-lg-7">
                                                            <input
                                                                v-model="campoEdicao.valor"
                                                                type="text"
                                                                maxlength="120"
                                                                class="form-control form-control-sm"
                                                                placeholder="forma: retirada, entrega, instalação..."
                                                                @keyup.enter="salvarCampo"
                                                                @keyup.esc="cancelarEdicaoCampo"
                                                            />
                                                        </div>
                                                        <div class="col-lg-3">
                                                            <input
                                                                v-model="campoEdicao.valorExtra"
                                                                type="text"
                                                                maxlength="60"
                                                                class="form-control form-control-sm"
                                                                placeholder="prazo"
                                                                @keyup.enter="salvarCampo"
                                                                @keyup.esc="cancelarEdicaoCampo"
                                                            />
                                                        </div>
                                                        <div class="col-lg-2 text-end">
                                                            <button
                                                                type="button"
                                                                class="btn btn-success btn-sm me-1"
                                                                :disabled="state.isProcessing"
                                                                @click="salvarCampo"
                                                            >
                                                                <i class="bi bi-check-lg"></i>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                class="btn btn-outline-secondary btn-sm"
                                                                @click="cancelarEdicaoCampo"
                                                            >
                                                                <i class="bi bi-x-lg"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div v-else class="row">
                                                        <div class="col-lg-7 small">
                                                            Forma: {{ state.venda.formaEntrega || '—' }}
                                                        </div>
                                                        <div class="col-lg-5 small">
                                                            Prazo: {{ state.venda.prazoEntrega || '—' }}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div v-if="resumoFinanceiro" class="col-lg-3">
                                                <div class="border rounded p-3 h-100 text-end">
                                                    <div class="text-muted small">
                                                        Total sugerido: {{ formatBRL(resumoFinanceiro.sugerido) }}
                                                        <template v-if="resumoFinanceiro.ajuste !== 0">
                                                            ·
                                                            <span
                                                                :class="
                                                                    resumoFinanceiro.ajuste < 0
                                                                        ? 'text-success'
                                                                        : 'text-danger'
                                                                "
                                                            >
                                                                {{
                                                                    resumoFinanceiro.ajuste < 0
                                                                        ? 'Desconto'
                                                                        : 'Acréscimo'
                                                                }}: {{ formatBRL(Math.abs(resumoFinanceiro.ajuste)) }}
                                                            </span>
                                                        </template>
                                                    </div>
                                                    <div class="fs-5">
                                                        <strong>Total: {{ formatBRL(state.venda.total) }}</strong>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Observações em linha própria (texto longo merece largura) -->
                                        <div class="border rounded p-3 m-2">
                                            <div class="d-flex justify-content-between align-items-center mb-1">
                                                <strong>Observações</strong>
                                                <button
                                                    v-if="podeEditarCabecalho && campoEdicao.campo !== 'observacoes'"
                                                    type="button"
                                                    class="btn btn-outline-secondary btn-sm py-0"
                                                    title="Editar observações"
                                                    @click="iniciarEdicaoCampo('observacoes')"
                                                >
                                                    <i class="bi bi-pencil"></i>
                                                </button>
                                            </div>
                                            <template v-if="campoEdicao.campo === 'observacoes'">
                                                <textarea
                                                    v-model="campoEdicao.valor"
                                                    maxlength="1000"
                                                    rows="2"
                                                    class="form-control form-control-sm"
                                                    @keyup.esc="cancelarEdicaoCampo"
                                                ></textarea>
                                                <div class="text-end mt-1">
                                                    <button
                                                        type="button"
                                                        class="btn btn-success btn-sm me-1"
                                                        :disabled="state.isProcessing"
                                                        @click="salvarCampo"
                                                    >
                                                        <i class="bi bi-check-lg"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        class="btn btn-outline-secondary btn-sm"
                                                        @click="cancelarEdicaoCampo"
                                                    >
                                                        <i class="bi bi-x-lg"></i>
                                                    </button>
                                                </div>
                                            </template>
                                            <div v-else class="small" style="white-space: pre-wrap">
                                                {{ state.venda.observacoes || '—' }}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="card-footer text-center">
                                        <!-- Ação principal do status em cor sólida; secundárias em outline;
                                             destrutivas agrupadas; janela de 1h desabilita em vez de sumir. -->
                                        <button
                                            v-if="state.venda.status === 'ORCAMENTO'"
                                            type="button"
                                            class="btn btn-success button-medium m-2"
                                            @click="converter"
                                        >
                                            <i class="bi bi-clipboard-check"></i>&nbsp;&nbsp;&nbsp;Converter em OS
                                        </button>
                                        <button
                                            v-if="state.venda.status === 'ORCAMENTO'"
                                            type="button"
                                            class="btn btn-outline-warning button-medium m-2"
                                            @click="recalcular"
                                        >
                                            <i class="bi bi-arrow-repeat"></i>&nbsp;&nbsp;&nbsp;Recalcular
                                        </button>
                                        <button
                                            v-if="state.venda.status !== 'CANCELADO'"
                                            type="button"
                                            class="button-medium m-2"
                                            :class="
                                                state.venda.status === 'ORDEM_SERVICO'
                                                    ? 'btn btn-success'
                                                    : 'btn btn-outline-secondary'
                                            "
                                            @click="
                                                router.push({
                                                    name: 'venda-imprimir',
                                                    params: { vendaId: route.params.vendaId },
                                                })
                                            "
                                        >
                                            <i class="bi bi-printer"></i>&nbsp;&nbsp;&nbsp;Imprimir
                                        </button>
                                        <span v-if="state.venda.status !== 'CANCELADO'" :title="janelaEdicao">
                                            <button
                                                type="button"
                                                class="btn btn-outline-primary button-medium m-2"
                                                :disabled="!state.venda.editavel"
                                                @click="editarVenda"
                                            >
                                                <i class="bi bi-pen"></i>&nbsp;&nbsp;&nbsp;Editar
                                            </button>
                                        </span>
                                        <span v-if="state.venda.status !== 'CANCELADO'" :title="janelaEdicao">
                                            <button
                                                type="button"
                                                class="btn btn-outline-danger button-medium m-2"
                                                :disabled="!state.venda.editavel"
                                                @click="excluirVenda"
                                            >
                                                <i class="bi bi-trash"></i>&nbsp;&nbsp;&nbsp;Excluir
                                            </button>
                                        </span>
                                        <button
                                            v-if="state.venda.status !== 'CANCELADO'"
                                            type="button"
                                            class="btn btn-outline-danger button-medium m-2"
                                            @click="cancelar"
                                        >
                                            <i class="bi bi-x-circle"></i>&nbsp;&nbsp;&nbsp;Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            class="btn btn-primary button-medium m-2"
                                            @click="voltarParaLista"
                                        >
                                            <i class="bi bi-arrow-counterclockwise"></i>&nbsp;&nbsp;&nbsp;Voltar
                                        </button>
                                        <div v-if="janelaEdicao" class="text-muted small mt-1">{{ janelaEdicao }}</div>
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
