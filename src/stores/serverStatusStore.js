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
        await axiosInstance.get('/health');
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
