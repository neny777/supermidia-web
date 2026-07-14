<script setup>
import { reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axiosInstance from '@/axiosInstance';
import { showToast } from '@/composables/toastUtils';
import logo from '@/assets/img/supermidia-logo-291x226.png';

// Dados da empresa no cabeçalho do impresso (futuro: configuração global).
const EMPRESA = {
    nome: 'SuperMídia',
    ramo: 'Comunicação Visual',
    linhas: [
        'Supermidia Alfenas Comercio Servicos e Comunicacao LTDA · CNPJ 06.333.873/0001-00 · IE 016305690.00-24',
        'Av. José Paulino da Costa, 693 · Cruz Preta · Alfenas/MG · CEP 37132-204',
        'WhatsApp: (35) 98879-1615 · contato@supermidiaalfenas.com.br',
    ],
};

const route = useRoute();
const router = useRouter();

const state = reactive({
    venda: null,
    cliente: null,
    isReady: false,
});

const isOrcamento = computed(() => state.venda?.status === 'ORCAMENTO');
const isCancelado = computed(() => state.venda?.status === 'CANCELADO');
const tituloDocumento = computed(() => (isOrcamento.value ? 'ORÇAMENTO' : 'ORDEM DE SERVIÇO'));
const numeroFormatado = computed(() =>
    state.venda?.numero != null ? String(state.venda.numero).padStart(4, '0') : 's/nº');

const formatBRL = (valor) =>
    valor == null ? '-' : Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatData = (valor) => (valor ? new Date(valor).toLocaleDateString('pt-BR') : '-');
const formatDia = (valor) => (valor ? new Date(`${valor}T00:00:00`).toLocaleDateString('pt-BR') : '-');

// A descrição estruturada ("2 × LONA · BRILHO · 100 × 150 cm · ...") vira
// título (1ª parte) + linha de características (restante).
const tituloItem = (item) => (item.descricao || item.produtoNome || '').split(' · ')[0];
const caracteristicasItem = (item) => (item.descricao || '').split(' · ').slice(1).join('  ·  ');

const imprimir = () => window.print();
const voltar = () => router.push({ name: 'venda', params: { vendaId: route.params.vendaId } });

onMounted(async () => {
    // Marca o body: as regras de @media print só valem enquanto esta tela existe.
    document.body.classList.add('modo-impressao');
    try {
        const vendaResponse = await axiosInstance.get(`/vendas/${route.params.vendaId}`);
        state.venda = vendaResponse.data;
        if (state.venda.clienteId) {
            const clientesResponse = await axiosInstance.get('/clientes');
            state.cliente = (clientesResponse.data || []).find((c) => c.id === state.venda.clienteId) || null;
        }
        state.isReady = true;
        setTimeout(imprimir, 400);
    } catch (error) {
        showToast('erro', 'Não foi possível carregar a venda para impressão.');
    }
});

onBeforeUnmount(() => {
    document.body.classList.remove('modo-impressao');
});
</script>

<template>
    <div class="imprimir-wrapper">
        <div class="nao-imprime text-center my-3">
            <button type="button" class="btn btn-primary button-medium m-2" @click="imprimir">
                <i class="bi bi-printer"></i>&nbsp;&nbsp;&nbsp;Imprimir
            </button>
            <button type="button" class="btn btn-secondary button-medium m-2" @click="voltar">
                <i class="bi bi-arrow-counterclockwise"></i>&nbsp;&nbsp;&nbsp;Voltar
            </button>
        </div>

        <div v-if="state.isReady" class="folha">
            <header class="folha-cabecalho">
                <div class="empresa">
                    <img :src="logo" alt="Logo Supermídia" class="empresa-logo" />
                    <div>
                        <div class="empresa-nome">{{ EMPRESA.nome }}</div>
                        <div class="empresa-ramo">{{ EMPRESA.ramo }}</div>
                        <div v-for="(linha, index) in EMPRESA.linhas" :key="index" class="empresa-contato">
                            {{ linha }}</div>
                    </div>
                </div>
                <div class="documento-info">
                    <div class="documento-titulo">{{ tituloDocumento }}</div>
                    <div class="documento-numero">Nº {{ numeroFormatado }}</div>
                    <div v-if="state.venda.referencia"><strong>Ref.: {{ state.venda.referencia }}</strong></div>
                    <div>Data: {{ formatData(state.venda.dataCriacao) }}</div>
                    <div v-if="isOrcamento">Válido até: {{ formatDia(state.venda.validoAte) }}</div>
                    <div v-if="isCancelado" class="documento-cancelado">CANCELADO</div>
                </div>
            </header>

            <section class="bloco">
                <div class="bloco-titulo">Cliente</div>
                <div class="cliente-nome">{{ state.cliente?.nome || '-' }}</div>
                <div class="cliente-contato">
                    <span v-if="state.cliente?.telefone">Telefone: {{ state.cliente.telefone }}</span>
                    <span v-if="state.cliente?.email">E-mail: {{ state.cliente.email }}</span>
                    <span v-if="state.cliente?.municipio">{{ state.cliente.municipio }}<template
                            v-if="state.cliente?.uf">/{{ state.cliente.uf }}</template></span>
                </div>
            </section>

            <section class="bloco">
                <div class="bloco-titulo">Itens</div>
                <table class="tabela-itens">
                    <thead>
                        <tr>
                            <th class="col-indice">#</th>
                            <th>Descrição</th>
                            <th class="col-valor">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in state.venda.itens" :key="index">
                            <td class="col-indice">{{ index + 1 }}</td>
                            <td>
                                <div class="item-titulo">{{ tituloItem(item) }}</div>
                                <div v-if="caracteristicasItem(item)" class="item-caracteristicas">
                                    {{ caracteristicasItem(item) }}</div>
                            </td>
                            <td class="col-valor">{{ formatBRL(item.precoFinal) }}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" class="total-rotulo">TOTAL</td>
                            <td class="col-valor total-valor">{{ formatBRL(state.venda.total) }}</td>
                        </tr>
                    </tfoot>
                </table>
            </section>

            <!-- Condições: valor digitado quando existe; na OS, campo vazio vira lacuna p/ caneta -->
            <section v-if="!isOrcamento || state.venda.formaPagamento || state.venda.prazoEntrega"
                class="bloco linha-preencher">
                <div v-if="!isOrcamento || state.venda.formaPagamento">Forma de pagamento:
                    <strong v-if="state.venda.formaPagamento">{{ state.venda.formaPagamento }}</strong>
                    <span v-else class="lacuna"></span>
                </div>
                <div v-if="!isOrcamento || state.venda.prazoEntrega">Prazo de entrega:
                    <strong v-if="state.venda.prazoEntrega">{{ state.venda.prazoEntrega }}</strong>
                    <span v-else class="lacuna"></span>
                </div>
            </section>

            <section v-if="!isOrcamento || state.venda.observacoes" class="bloco">
                <div class="bloco-titulo">Observações</div>
                <div class="observacoes">{{ state.venda.observacoes }}</div>
            </section>

            <section v-if="!isOrcamento" class="assinaturas">
                <div class="assinatura">
                    <div class="assinatura-linha"></div>
                    <div>Cliente</div>
                </div>
                <div class="assinatura">
                    <div class="assinatura-linha"></div>
                    <div>Responsável</div>
                </div>
            </section>
            <section v-else class="rodape-orcamento">
                Este orçamento não é comprovante de compra. Preços válidos até a data indicada.
            </section>
        </div>
    </div>
</template>

<style>
.imprimir-wrapper {
    min-height: 100vh;
    background: #e9ecef;
    padding-bottom: 2rem;
}

.folha {
    background: #fff;
    color: #111;
    max-width: 210mm;
    min-height: 250px;
    margin: 0 auto;
    padding: 14mm 16mm;
    box-shadow: 0 0 8px rgba(0, 0, 0, .25);
    font-size: 11pt;
    line-height: 1.35;
}

.folha-cabecalho {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #111;
    padding-bottom: 8px;
    margin-bottom: 14px;
}

.empresa {
    display: flex;
    align-items: center;
    gap: 12px;
}

.empresa-logo {
    height: 16mm;
    width: auto;
}

.empresa-nome {
    font-size: 20pt;
    font-weight: 700;
    letter-spacing: 1px;
}

.empresa-ramo {
    font-size: 10pt;
    color: #444;
}

.empresa-contato {
    font-size: 8pt;
    color: #444;
}

.documento-info {
    text-align: right;
    font-size: 10pt;
}

.documento-titulo {
    font-size: 13pt;
    font-weight: 700;
}

.documento-numero {
    font-size: 13pt;
    font-weight: 700;
}

.documento-cancelado {
    color: #b02a37;
    font-weight: 700;
    font-size: 13pt;
    border: 2px solid #b02a37;
    padding: 0 6px;
    display: inline-block;
    margin-top: 4px;
}

.bloco {
    margin-bottom: 14px;
}

.bloco-titulo {
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #555;
    border-bottom: 1px solid #bbb;
    margin-bottom: 4px;
}

.cliente-nome {
    font-weight: 700;
}

.cliente-contato span {
    margin-right: 16px;
    font-size: 10pt;
}

.tabela-itens {
    width: 100%;
    border-collapse: collapse;
}

.tabela-itens th,
.tabela-itens td {
    border: 1px solid #999;
    padding: 5px 8px;
    text-align: left;
    vertical-align: top;
}

.tabela-itens thead th {
    background: #f1f1f1;
    font-size: 9pt;
    text-transform: uppercase;
}

.col-indice {
    width: 30px;
    text-align: center !important;
}

.col-valor {
    width: 110px;
    text-align: right !important;
    white-space: nowrap;
}

.item-titulo {
    font-weight: 700;
}

.item-caracteristicas {
    font-size: 9.5pt;
    color: #333;
}

.total-rotulo {
    text-align: right !important;
    font-weight: 700;
}

.total-valor {
    font-weight: 700;
    font-size: 12pt;
}

.linha-preencher {
    display: flex;
    gap: 24px;
}

.linha-preencher>div {
    flex: 1;
}

.lacuna {
    display: inline-block;
    width: 60%;
    border-bottom: 1px solid #111;
}

.observacoes {
    border: 1px solid #999;
    min-height: 60px;
    padding: 4px 8px;
    white-space: pre-wrap;
}

.assinaturas {
    display: flex;
    gap: 40px;
    margin-top: 48px;
    text-align: center;
    font-size: 10pt;
}

.assinatura {
    flex: 1;
}

.assinatura-linha {
    border-bottom: 1px solid #111;
    margin-bottom: 4px;
    height: 28px;
}

.rodape-orcamento {
    margin-top: 24px;
    font-size: 9pt;
    color: #555;
    border-top: 1px solid #bbb;
    padding-top: 6px;
}

/* Na impressão só a folha existe; regras presas ao body.modo-impressao para
   não vazarem para o Ctrl+P de outras telas. */
@media print {
    body.modo-impressao * {
        visibility: hidden;
    }

    body.modo-impressao .folha,
    body.modo-impressao .folha * {
        visibility: visible;
    }

    body.modo-impressao .folha {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        max-width: none;
        margin: 0;
        padding: 0;
        box-shadow: none;
    }

    body.modo-impressao .nao-imprime {
        display: none;
    }
}

@page {
    size: A4;
    margin: 14mm 16mm;
}
</style>
