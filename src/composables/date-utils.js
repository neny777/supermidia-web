export function formatToDatabaseDate(brDate) {
    if (!brDate) return null;
    const [day, month, year] = brDate.split('/');
    if (!day || !month || !year) return null; // Validar formato
    return `${year}-${month}-${day}`;
}

export function formatToBrDate(dbDate) {
    if (!dbDate) return null;
    const [year, month, day] = dbDate.split('-');
    if (!year || !month || !day) return null; // Validar formato
    return `${day}/${month}/${year}`;
}