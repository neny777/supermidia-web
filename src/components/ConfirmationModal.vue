<script setup>
import { title, message, confirmAction } from '@/composables/modalUtils';
</script>
<template>
    <div class="modal fade" id="confirmationModal" tabindex="-1" aria-labelledby="modalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="modalLabel"><i class="bi bi-exclamation-diamond text-warning"></i>&nbsp;&nbsp;&nbsp;{{ title }}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">{{ message }}</div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-danger button-small" data-bs-dismiss="modal"><i
                            class="bi bi-arrow-counterclockwise"></i>&nbsp;&nbsp;&nbsp;Cancelar</button>
                    <button type="button" class="btn btn-success button-small" @click="confirmAction"><i
                            class="bi bi-floppy"></i>&nbsp;&nbsp;&nbsp;Salvar</button>
                </div>
            </div>
        </div>
    </div>
</template>