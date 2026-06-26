import $ from 'jquery';

export const redrawTable = (tableId) => {
    const table = $(`#${tableId}`).DataTable();
    table.rows().invalidate().draw();
};