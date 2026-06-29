import * as yup from 'yup';

export const codigosParametro = [
  'FATOR',
  'ACRESCIMO_ALTURA',
  'ACRESCIMO_LARGURA',
  'ESPACAMENTO',
  'QUANTIDADE_FIXA',
];

export const metadataParametro = {
  FATOR: { unidade: '', placeholder: 'Ex.: 1.21' },
  ACRESCIMO_ALTURA: { unidade: 'cm', placeholder: 'Ex.: 15' },
  ACRESCIMO_LARGURA: { unidade: 'cm', placeholder: 'Ex.: 0' },
  ESPACAMENTO: { unidade: 'cm', placeholder: 'Ex.: 25' },
  QUANTIDADE_FIXA: { unidade: '', placeholder: 'Ex.: 4' },
};

export const parametrosObrigatoriosPorTipo = {
  AREA_BASE: [],
  AREA_COM_FATOR: ['FATOR'],
  AREA_COM_ACRESCIMOS_E_FATOR: ['ACRESCIMO_ALTURA', 'ACRESCIMO_LARGURA', 'FATOR'],
  PERIMETRO_BASE: [],
  PERIMETRO_COM_ESPACAMENTO: ['ESPACAMENTO'],
  UNIDADE_FIXA: ['QUANTIDADE_FIXA'],
  SELECAO_POR_MEDIDA: [],
  QUANTIDADE_INFORMADA: [],
  METRO_LINEAR_INFORMADO: [],
};

export const createParametro = () => ({ codigo: '', valor: '' });
export const createMateriaItem = () => ({ materiaId: '', calculoId: '', parametros: [] });
export const createServicoItem = () => ({ servicoId: '', calculoId: '', parametros: [] });
export const createProduto = () => ({ nome: '', materiasCalculo: [], servicosCalculo: [] });

export const permiteZero = (codigo) => ['ACRESCIMO_ALTURA', 'ACRESCIMO_LARGURA'].includes(codigo);

export const getTipoCalculoById = (calculoId, calculos) =>
  calculos.find((calculo) => calculo.id === calculoId)?.tipoCalculo;

export const getParametrosObrigatorios = (calculoId, calculos) => {
  const tipoCalculo = getTipoCalculoById(calculoId, calculos);
  return parametrosObrigatoriosPorTipo[tipoCalculo] || [];
};

export const syncRequiredParametros = (calculoId, calculos, parametros = []) => {
  const obrigatorios = getParametrosObrigatorios(calculoId, calculos);
  const parametrosAtuais = Array.isArray(parametros) ? parametros : [];

  return obrigatorios.map((codigo, index) => {
    const existente = parametrosAtuais.find((parametro) => parametro?.codigo === codigo);
    const fallbackPorIndice = parametrosAtuais[index];
    const origemValor = existente ?? fallbackPorIndice;
    return {
      codigo,
      valor: origemValor?.valor === '' || origemValor?.valor == null ? '' : origemValor.valor,
    };
  });
};

export const normalizeItems = (items, tipo) => (items || []).map((item) => ({
  ...(tipo === 'materia' ? { materiaId: item.materiaId ?? '' } : { servicoId: item.servicoId ?? '' }),
  calculoId: item.calculoId ?? '',
  parametros: (item.parametros || []).map((parametro) => ({
    codigo: parametro.codigo ?? '',
    valor: parametro.valor === '' || parametro.valor == null ? '' : Number(parametro.valor),
  })),
}));

export const normalizeProdutoPayload = (values) => ({
  nome: values.nome ?? '',
  materiasCalculo: normalizeItems(values.materiasCalculo, 'materia'),
  servicosCalculo: normalizeItems(values.servicosCalculo, 'servico'),
});

export const buildItemSchema = (tipoItem, calculos) => yup.object({
  [`${tipoItem}Id`]: yup.string().required(`Selecione ${tipoItem === 'materia' ? 'a matéria' : 'o serviço'}.`),
  calculoId: yup.string().required('Selecione o cálculo.'),
  parametros: yup.array().of(
    yup.object({
      codigo: yup.string().required('Selecione o parâmetro.'),
      valor: yup.number().typeError('Informe um valor válido.').required('Informe o valor.'),
    })
  ).test(
    'parametros-obrigatorios',
    'Parâmetros obrigatórios não informados.',
    function (parametros = []) {
      const tipoCalculo = getTipoCalculoById(this.parent.calculoId, calculos);
      const obrigatorios = parametrosObrigatoriosPorTipo[tipoCalculo] || [];
      const presentes = parametros.map((parametro) => parametro?.codigo).filter(Boolean);

      const faltantes = obrigatorios.filter((codigo) => !presentes.includes(codigo));
      if (faltantes.length > 0) {
        return this.createError({
          message: `Informe os parâmetros obrigatórios: ${faltantes.join(', ')}.`,
        });
      }

      const duplicados = presentes.filter((codigo, index) => presentes.indexOf(codigo) !== index);
      if (duplicados.length > 0) {
        return this.createError({
          message: `Os parâmetros ${[...new Set(duplicados)].join(', ')} foram informados mais de uma vez.`,
        });
      }

      return true;
    }
  ).test(
    'parametros-valores',
    'Valores inválidos.',
    function (parametros = []) {
      for (const parametro of parametros) {
        if (!parametro?.codigo || parametro?.valor == null || parametro?.valor === '') {
          continue;
        }
        if (permiteZero(parametro.codigo)) {
          if (Number(parametro.valor) < 0) {
            return this.createError({
              message: `O parâmetro ${parametro.codigo} não pode ser negativo.`,
            });
          }
          continue;
        }
        if (Number(parametro.valor) <= 0) {
          return this.createError({
            message: `O parâmetro ${parametro.codigo} precisa ser maior que zero.`,
          });
        }
      }
      return true;
    }
  ),
});

export const getNomeMateria = (materias, materiaId) => materias.find((item) => item.id === materiaId)?.nome || '-';
export const getNomeServico = (servicos, servicoId) => servicos.find((item) => item.id === servicoId)?.nome || '-';
export const getNomeCalculo = (calculos, calculoId) => calculos.find((item) => item.id === calculoId)?.nome || '-';
