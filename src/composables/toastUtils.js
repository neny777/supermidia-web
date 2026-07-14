import { ref } from 'vue';

const toasts = ref([]);
let toastId = 0;

function showToast(type, message, duration = 5000) {
    const id = toastId++;
    toasts.value.push({ id, type, message });

    // Remover automaticamente após o tempo definido
    setTimeout(() => {
        removeToast(id);
    }, duration);
}

function removeToast(id) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
}

// 🔹 Agora exportamos corretamente todas as funções
export function useToasts() {
    return {
        toasts,
        showToast,
        removeToast,
    };
}

export { showToast, removeToast };
