<script setup>
// Evento para lidar com a seleção do tipo de parceiro
const emit = defineEmits(["selectType"]);

const selectType = (type) => {
  emit("selectType", type);
};
</script>
<template>
  <div class="modal fade" id="partnerTypeModal" tabindex="-1" aria-labelledby="partnerTypeModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <!-- Cabeçalho -->
        <div class="modal-header">
          <h5 class="modal-title" id="partnerTypeModalLabel"><i class="bi bi-question-diamond text-info"></i>&nbsp;&nbsp;&nbsp;Tipo</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <!-- Corpo -->
        <div class="modal-body">
          <p>Selecione o tipo de parceiro que deseja cadastrar:</p>
        </div>
        <!-- Rodapé -->
        <div class="modal-footer">         
            <button type="button" class="btn btn-danger button-small" data-bs-dismiss="modal"><i
              class="bi bi-arrow-counterclockwise"></i>&nbsp;&nbsp;&nbsp;Cancelar</button>
            <button type="button" class="btn btn-primary button-small" @click="selectType('fisico')" data-bs-dismiss="modal">
              <i class="bi bi-person-standing"></i>&nbsp;&nbsp;&nbsp;Físico
            </button>
            <button type="button" class="btn btn-primary button-small" @click="selectType('juridico')" data-bs-dismiss="modal"><i
                class="bi bi-buildings"></i>
              &nbsp;&nbsp;&nbsp;Jurídico
            </button>
        </div>
      </div>
    </div>
  </div>
</template>