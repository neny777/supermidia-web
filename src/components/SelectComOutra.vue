<script setup>
import { ref, computed } from 'vue';

// Dropdown alimentado por uma lista (da Configuração). A opção "Outra..." libera
// um campo de texto, e o valor digitado fica no PRÓPRIO modelo — não some para
// outro campo. Assim o valor certo aparece no impresso e no futuro financeiro.
const props = defineProps({
    modelValue: { type: String, default: '' },
    opcoes: { type: Array, default: () => [] },
    placeholderOutra: { type: String, default: 'Digite...' },
});
const emit = defineEmits(['update:modelValue']);

const OUTRA = '__OUTRA__';
const outraManual = ref(false);

// Mostra o texto livre quando o usuário escolheu "Outra..." OU quando o valor
// atual não está na lista (ex.: uma condição personalizada de venda editada).
const mostrarTexto = computed(
    () => outraManual.value || (!!props.modelValue && !props.opcoes.includes(props.modelValue))
);
const valorSelect = computed(() => (mostrarTexto.value ? OUTRA : props.modelValue));

const aoSelecionar = (evento) => {
    const valor = evento.target.value;
    if (valor === OUTRA) {
        outraManual.value = true;
        emit('update:modelValue', '');
    } else {
        outraManual.value = false;
        emit('update:modelValue', valor);
    }
};
</script>

<template>
    <div>
        <select :value="valorSelect" class="form-select form-select-sm" @change="aoSelecionar">
            <option value="">Selecione</option>
            <option v-for="opcao in opcoes" :key="opcao" :value="opcao">{{ opcao }}</option>
            <option :value="OUTRA">Outra...</option>
        </select>
        <input
            v-if="mostrarTexto"
            :value="modelValue"
            type="text"
            maxlength="120"
            class="form-control form-control-sm mt-1"
            :placeholder="placeholderOutra"
            @input="emit('update:modelValue', $event.target.value)"
        />
    </div>
</template>
