function formatToDatabaseDateCurrencyBR(value) {
    if (!value) return 0
    // Remove pontos de milhar e troca a vírgula decimal por ponto
    const normalized = value.replace(/\./g, '').replace(',', '.')
    return parseFloat(normalized)
}

function formatToCurrencyBR(value) {
    if (value === null || value === undefined || value === '') return ''
    return Number(value).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}