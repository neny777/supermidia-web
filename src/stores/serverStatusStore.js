import { defineStore } from 'pinia';
import axiosInstance from '@/axiosInstance';
export const useServerStatusStore = defineStore('serverStatus', {
    state: () => ({
        isOffline: false,
        requestInProgress: false,
    }),
    actions: {
        async checkServerStatus() {
            try {
                // Timeout curto próprio: detectar servidor fora do ar tem que ser rápido.
                await axiosInstance.get('/health', { timeout: 3000 });
                this.isOffline = false; // Servidor está online
            } catch (err) {
                this.isOffline = true; // Servidor está offline
            }
        },
        setRequestInProgress(value) {
            this.requestInProgress = value; // Atualiza o estado do progresso
        },
    },
});
