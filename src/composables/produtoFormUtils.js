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
  TAXA_FIXA: ['QUANTIDADE_FIXA'],
  SELECAO_POR_MEDIDA: [],
  QUANTIDADE_INFORMADA: [],
  METRO_LINEAR_INFORMADO: [],
};

export const createParametro = () => ({ codigo: '', valor: '', vinculos: [] });
export const createMateriaItem = () => ({ materiaId: '', grupoSlot: '', calculoId: '', parametros: [] });
export const createServicoItem = () => ({ servicoId: '', calculoId: '', parametros: [] });
export const createMedida = () => ({ nome: '', unidade: '', obrigatoria: false, valorPadrao: '', minimo: '', maximo: '' });
export const createVinculo = () => ({ medidaNome: '', multiplicador: 1 });
export const createContribuicao = () => ({ codigo: '', valor: '' });
export const createOpcao = () => ({ nome: '', materiasCalculo: [], servicosCalculo: [], contribuicoes: [] });
export const createGrupoOpcao = () => ({ nome: '', obrigatorio: false, opcoes: [] });
export const createProduto = () => ({ nome: '', medidas: [], materiasCalculo: [], servicosCalculo: [], gruposOpcoes: [] });

const numeroOuNull = (valor) => (valor === '' || valor == null ? null : Number(valor));

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
      // preserva os vínculos de medida existentes (editados na tela de produto/SQL)
      vinculos: origemValor?.vinculos || [],
    };
  });
};

const normalizeVinculos = (vinculos) => (vinculos || []).map((vinculo) => ({
  medidaNome: vinculo.medidaNome ?? '',
  multiplicador: vinculo.multiplicador === '' || vinculo.multiplicador == null ? 1 : Number(vinculo.multiplicador),
}));

export const normalizeParametros = (parametros) => (parametros || []).map((parametro) => ({
  codigo: parametro.codigo ?? '',
  valor: numeroOuNull(parametro.valor),
  vinculos: normalizeVinculos(parametro.vinculos),
}));

export const normalizeItems = (items, tipo) => (items || []).map((item) => ({
  ...(tipo === 'materia'
    ? { materiaId: item.materiaId || null, grupoSlot: item.grupoSlot || null }
    : { servicoId: item.servicoId ?? '' }),
  calculoId: item.calculoId ?? '',
  parametros: normalizeParametros(item.parametros),
}));

const normalizeMedidas = (medidas) => (medidas || []).map((medida) => ({
  nome: medida.nome ?? '',
  unidade: medida.unidade || null,
  obrigatoria: !!medida.obrigatoria,
  valorPadrao: numeroOuNull(medida.valorPadrao),
  minimo: numeroOuNull(medida.minimo),
  maximo: numeroOuNull(medida.maximo),
}));

const normalizeGrupos = (grupos) => (grupos || []).map((grupo) => ({
  nome: grupo.nome ?? '',
  obrigatorio: !!grupo.obrigatorio,
  opcoes: (grupo.opcoes || []).map((opcao) => ({
    nome: opcao.nome ?? '',
    materiasCalculo: normalizeItems(opcao.materiasCalculo, 'materia'),
    servicosCalculo: normalizeItems(opcao.servicosCalculo, 'servico'),
    contribuicoes: (opcao.contribuicoes || []).map((contribuicao) => ({
      codigo: contribuicao.codigo ?? '',
      valor: numeroOuNull(contribuicao.valor),
    })),
  })),
}));

// Envia o produto COMPLETO no PUT (o update substitui tudo): medidas, componentes
// (com slot e vínculos) e grupos de opções são preservados mesmo quando a tela
// só edita uma parte.
export const normalizeProdutoPayload = (values) => ({
  nome: values.nome ?? '',
  medidas: normalizeMedidas(values.medidas),
  materiasCalculo: normalizeItems(values.materiasCalculo, 'materia'),
  servicosCalculo: normalizeItems(values.servicosCalculo, 'servico'),
  gruposOpcoes: normalizeGrupos(values.gruposOpcoes),
});

export const buildItemSchema = (tipoItem, calculos) => yup.object({
  ...(tipoItem === 'materia'
    ? {
      materiaId: yup.string().test(
        'materia-ou-slot',
        'Informe a matéria fixa OU o grupo do slot (apenas um dos dois).',
        function (materiaId) {
          const grupoSlot = this.parent.grupoSlot;
          return Boolean(materiaId) !== Boolean(grupoSlot);
        }
      ),
      grupoSlot: yup.string(),
    }
    : { servicoId: yup.string().required('Selecione o serviço.') }),
  calculoId: yup.string().required('Selecione o cálculo.'),
  parametros: yup.array().of(
    yup.object({
      codigo: yup.string().required('Selecione o parâmetro.'),
      valor: yup.number()
        .transform((valor, original) => (original === '' || original == null ? null : valor))
        .typeError('Informe um valor válido.')
        .nullable(),
      vinculos: yup.array(),
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
        if (!parametro?.codigo) {
          continue;
        }
        const temVinculo = (parametro.vinculos || []).length > 0;
        const semValor = parametro.valor == null || parametro.valor === '';
        if (semValor) {
          if (!temVinculo) {
            return this.createError({
              message: `Informe o valor do parâmetro ${parametro.codigo} (ou um vínculo de medida).`,
            });
          }
          continue;
        }
        if (permiteZero(parametro.codigo) || temVinculo) {
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
