import { ref } from 'vue';

const title = ref('');
const message = ref('');
const confirmAction = ref(() => {});

export const showModal = (modalTitle, modalMessage, action) => {
    title.value = modalTitle;
    message.value = modalMessage;
    confirmAction.value = action;
    const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    modal.show();

    return modal; 
};

export { title, message, confirmAction };
