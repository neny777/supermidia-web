import { onMounted } from 'vue';
import { useServerStatusStore } from '@/stores/serverStatusStore';

export function useServerStatus() {
  const serverStatusStore = useServerStatusStore();

  onMounted(() => {
    serverStatusStore.checkServerStatus();
  });

  return {
    isOffline: serverStatusStore.isOffline,
  };
}
