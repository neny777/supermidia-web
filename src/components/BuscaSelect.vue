<script setup>
import { ref, computed } from 'vue';

// Select com busca por digitação: campo de texto filtra a lista, clique ou
// Enter seleciona. Substitui <select> em listas grandes (clientes, produtos).
const props = defineProps({
    modelValue: { type: String, default: '' },
    opcoes: { type: Array, default: () => [] }, // [{ id, nome }]
    placeholder: { type: String, default: 'Digite para buscar...' },
    // Mostra "+ Cadastrar 'X'" no rodapé da lista (cadastro rápido do balcão)
    permitirCadastro: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'cadastrar']);

const aberto = ref(false);
const filtro = ref('');

const nomeSelecionado = computed(() => props.opcoes.find((opcao) => opcao.id === props.modelValue)?.nome || '');

const filtradas = computed(() => {
    const termo = filtro.value.trim().toLowerCase();
    if (!termo) return props.opcoes;
    return props.opcoes.filter((opcao) => (opcao.nome || '').toLowerCase().includes(termo));
});

const abrir = () => {
    aberto.value = true;
    filtro.value = '';
};
const fechar = () => {
    aberto.value = false;
    filtro.value = '';
};
const selecionar = (opcao) => {
    emit('update:modelValue', opcao.id);
    fechar();
};
// mousedown.prevent na lista ganha do blur; o timeout cobre navegadores lentos
const aoBlur = () => setTimeout(fechar, 150);
const aoEnter = () => {
    if (aberto.value && filtradas.value.length) {
        selecionar(filtradas.value[0]);
    }
};
const cadastrar = () => {
    emit('cadastrar', filtro.value.trim());
    fechar();
};
</script>

<template>
    <div class="position-relative">
        <input
            type="text"
            class="form-control"
            :value="aberto ? filtro : nomeSelecionado"
            :placeholder="nomeSelecionado || placeholder"
            @focus="abrir"
            @input="filtro = $event.target.value"
            @blur="aoBlur"
            @keyup.enter="aoEnter"
            @keyup.esc="fechar"
        />
        <ul v-if="aberto" class="dropdown-menu show w-100 busca-select-lista">
            <li v-if="!filtradas.length" class="dropdown-item text-muted">Nenhum resultado</li>
            <li v-for="opcao in filtradas" :key="opcao.id">
                <button
                    type="button"
                    class="dropdown-item text-wrap"
                    :class="{ active: opcao.id === modelValue }"
                    @mousedown.prevent="selecionar(opcao)"
                >
                    {{ opcao.nome }}
                </button>
            </li>
            <li v-if="permitirCadastro && filtro.trim()">
                <button type="button" class="dropdown-item text-primary" @mousedown.prevent="cadastrar">
                    <i class="bi bi-plus-circle"></i> Cadastrar "{{ filtro.trim().toUpperCase() }}"
                </button>
            </li>
        </ul>
    </div>
</template>

<style scoped>
.busca-select-lista {
    max-height: 260px;
    overflow-y: auto;
}
</style>
