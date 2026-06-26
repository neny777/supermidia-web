<script setup>
import { reactive, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Form, Field, ErrorMessage } from 'vee-validate';
import "@/composables/custom-vee-validate";
import * as yup from "yup";
import { showModal } from '@/composables/modalUtils';
import { showToast } from '@/composables/toastUtils';
import { formatToDatabaseDate, formatToBrDate } from '@/composables/date-utils';
import axiosInstance from '@/axiosInstance';
// State
const route = useRoute();
const router = useRouter();
const isEditMode = ref(!!route.params.juridicoId);
// Validation schema
const schema = yup.object({
  nome: yup.string().required('Nome é obrigatório').max(60, 'Máximo de 60 caracteres'),
  email: yup.string().nullable().optional().email('Email inválido').max(70, 'Máximo de 70 caracteres'),
  telefone: yup.string().required('Telefone é obrigatório').min(14, 'Mínimo de 14 caracteres').max(15, 'Máximo de 15 caracteres'),
  cep: yup.string().nullable().optional().matches(/^\d{5}-\d{3}$/, 'CEP inválido'),
  numero: yup.string().nullable().optional().max(6, 'Máximo de 6 caracteres'),
  logradouro: yup.string().nullable().optional().max(60, 'Máximo de 60 caracteres'),
  bairro: yup.string().nullable().optional().max(60, 'Máximo de 60 caracteres'),
  municipio: yup.string().nullable().optional().max(60, 'Máximo de 60 caracteres'),
  uf: yup.string().nullable().optional().length(2, '2 caracteres'),
  cnpj: yup.string().nullable().optional().cnpj("CNPJ inválido"),
  ie: yup.string().nullable().optional().max(14, 'Máximo de 14 caracteres'),
});
const state = reactive({
  juridico: {},
  isProcessing: false,
  isFetchingCepAddress: false,
  isFetchingJuridica: false,
  existJuridica: false,
});
// Função para verificar alterações
const hasChanges = (newValues) => {
  return JSON.stringify(newValues) !== JSON.stringify(state.juridico);
};
onMounted(async () => {
  state.isProcessing = true;
  if (isEditMode.value) {
    try {
      const { data } = await axiosInstance.get(`/fornecedores/juridico/${route.params.juridicoId}`);
      state.juridico = data;
    } catch (error) {
      showToast("erro", "Erro ao carregar fornecedor: ", error);
    }
  }
  state.isProcessing = false;
});
// Função de envio do formulário
const onSubmit = async (values, { resetForm }) => {
  // Adiciona a validação no backend
  if (isEditMode.value) {
    // Verifica se houve alterações nos valores do formulário
    if (!hasChanges(values)) {
      showToast("info", "Não houve alterações no fornecedor.");
      return;
    }
    // Abre o modal de confirmação no modo de edição
    const modal = showModal(
      "Editar Fornecedor",
      "Confirma a edição do fornecedor?",
      async () => {
        try {
          state.isProcessing = true;
          await axiosInstance.put(`/fornecedores/juridico/${values.id}`, values);
          showToast("sucesso", "Fornecedor editado com sucesso!");
          resetForm();
          router.push("/fornecedores");
        } catch (error) {
          if (error.response && error.response.data && error.response.data.errors) {
            error.response.data.errors.forEach((err) => {
              showToast("erro", err);
            });
          } else {
            showToast("erro", "Erro inesperado ao validar.");
            console.error(error);
          }
        } finally {
          state.isProcessing = false;
          modal.hide(); // Fecha o modal
        }
      }
    );
  } else {
    // Validação no backend (somente no fluxo de criação)
    try {
      const validacao = await validarFornecedorJuridico(values);
    } catch (error) {
      console.warn("Erro tratado:", error.message);
      return;
    }
    // Criação de um novo fornecedor
    try {
      state.isProcessing = true;
      await axiosInstance.post("/fornecedores/juridico", values);
      showToast("sucesso", "Fornecedor cadastrado com sucesso!");
      resetForm();
      router.push("/fornecedores");
    } catch (error) {
      console.warn("Erro tratado:", error.message);
      return;
    } finally {
      state.isProcessing = false;
    }
  }
};

const validarFornecedorJuridico = async (values) => {
  const response = await axiosInstance.post("/fornecedores/juridico/validar", values);
  return { isValid: true }; // Retorna sucesso 
};

const fetchCepAddress = async (event) => {
  const cep = event.target.value.replace(/\D/g, ""); // Remove caracteres não numéricos
  // Valida se o CEP é vazio ou nulo
  if (!cep) {
    return;
  }
  if (cep.length !== 8) {
    return;
  }
  try {
    state.isFetchingCepAddress = true;
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();
    if (data.erro) {
      showToast("erro", "CEP não encontrado.");
      state.isFetchingCepAddress = false;
      return;
    }
    // Simular entradas nos campos do formulário
    const addressFielsUpdate = {
      logradouro: data.logradouro || "",
      bairro: data.bairro || "",
      municipio: data.localidade || "",
      uf: data.uf || "",
    };
    Object.entries(addressFielsUpdate).forEach(([fieldId, value]) => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = value;
        field.dispatchEvent(new Event("input", { bubbles: true })); // Simula entrada do usuário
      }
    });
  } catch (error) {
    console.error("Erro ao consultar o CEP:", error);
    showToast("erro", "Erro ao consultar o CEP.");
  } finally {
    state.isFetchingCepAddress = false;
  }
};

const nome = ref('');
const pessoas = ref([]);
let lastSearchTerm = ""; // Último termo buscado
let lastSearchResultEmpty = false; // Indica se a última busca retornou vazio
const findByName = async (nomeDigitado) => {
  if (state.isFetchingJuridica) {
    pessoas.value = [];
    return;
  }
  const nome = nomeDigitado.trim();
  // Regra 1: Não realiza buscas com menos de 3 caracteres
  if (nome.length <= 2) {
    pessoas.value = [];
    lastSearchTerm = "";
    lastSearchResultEmpty = false; // Reseta a flag
    return;
  }
  // Regra 2: Parar buscas após um resultado vazio (exceto no decremento)
  if (lastSearchResultEmpty && nome.length >= lastSearchTerm.length) {
    return; // Não realiza novas buscas se a última foi vazia e estamos incrementando
  }
  // Regra 3: Retomar busca em caso de decremento
  if (nome.length < lastSearchTerm.length) {
    lastSearchResultEmpty = false; // Permite novas buscas
  }
  try {
    // Atualiza o termo antes de buscar
    lastSearchTerm = nome;
    state.isFetchingJuridica = true;
    const response = await axiosInstance.get('/pessoas/nome', { params: { nome } });
    pessoas.value = response.data;
    // Atualiza a flag para indicar se o resultado foi vazio
    lastSearchResultEmpty = response.data.length === 0;
  } catch (error) {
    console.error('Erro ao buscar pessoas:', error);
    pessoas.value = [];
    lastSearchResultEmpty = false; // Evita travar buscas em caso de erro
  } finally {
    state.isFetchingJuridica = false;
  }
};
const fetchJuridica = async (pessoaId) => {
  try {
    state.isFetchingJuridica = true;
    const response = await axiosInstance.get(`/fornecedores/pessoa/juridica/${pessoaId}`);
    const data = response.data;
    if (data.erro) {
      showToast("erro", "Erro ao carregar pessoa jurídica.");
      state.isFetchingCepAddress = false;
      return;
    }
    // Preencher os campos do formulário com os dados retornados
    const fisicaFieldsUpdate = {
      id: data.id || "",
      nome: data.nome || "",
      email: data.email || "",
      telefone: data.telefone || "",
      cep: data.cep || "",
      logradouro: data.logradouro || "",
      numero: data.numero || "",
      bairro: data.bairro || "",
      municipio: data.municipio || "",
      uf: data.uf || "",
      cnpj: data.cnpj || "",
      ie: data.ie || "",
    };
    // Atualizar o estado do formulário
    Object.entries(fisicaFieldsUpdate).forEach(([fieldId, value]) => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = value;
        field.dispatchEvent(new Event("input", { bubbles: true })); // Simula entrada do usuário
      }
    });
    // Limpar sugestões da lista
    pessoas.value = [];
    state.existJuridica = true;
  } catch (error) {
    console.error("Erro ao preencher formulário:", error);
    showToast("erro", "Erro ao carregar dados da pessoa.");
  } finally {
    state.isFetchingJuridica = false;
  }
};
</script>
<template>
  <!--begin::App Main-->
  <main class="app-main"> <!--begin::App Content Header-->
    <div class="app-content-header"> <!--begin::Container-->
      <div class="container-fluid"> <!--begin::Row-->
        <div class="row"> <!--begin::Col-->
          <div class="col-lg-6">
            <h5 class="mb-0">Cadastro</h5>
          </div> <!--end::Col--> <!--begin::Col-->
          <div class="col-lg-6">
            <ol class="breadcrumb float-sm-end">
              <li class="breadcrumb-item">Cadastros</li>
              <li class="breadcrumb-item active" aria-current="page">
                Pessoas
              </li>
              <li class="breadcrumb-item active" aria-current="page">
                Fornecedores
              </li>
              <li class="breadcrumb-item active" aria-current="page">
                Fornecedor
              </li>
            </ol>
          </div> <!--end::Col-->
        </div> <!--end::Row-->
      </div> <!--end::Container-->
    </div> <!--end::App Content Header--> <!--begin::App Content-->
    <div class="app-content"> <!--begin::Container-->
      <div class="container-fluid"> <!--begin::Row-->
        <div class="row"> <!--begin::Col-->
          <div class="col-12">
            <!--begin::Form Validation-->
            <div class="card"> <!--begin::Header-->
              <div class="card-header">
                <div class="card-title">
                  <h5>{{ isEditMode ? 'Editar Fornecedor Pessoa Jurídica' : 'Novo Fornecedor Pessoa Jurídica' }}</h5>
                </div>
              </div> <!--end::Header--> <!--begin::Form-->
              <div v-if="state.isProcessing" class="text-center">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden"> Processando...</span>
                </div>
              </div>
              <div v-else="!state.isProcessing">
                <Form @submit="onSubmit" :validation-schema="schema" :initial-values="state.juridico"
                  validate-on-change="false" validate-on-input="false" validate-on-blur="true">
                  <!--begin::Body-->
                  <div class="card-body my-4"> <!--begin::Row-->
                    <div class="row g-2">
                      <!--begin::Col-->
                      <div class="col-md-6 px-5 d-none">
                        <div class="row"> <label for="id" class="col-form-label col-lg-4">Id</label>
                          <div class="col-lg-8">
                            <Field as="input" id="id" name="id" type="text" class="form-control" :validateOnBlur="false"
                              :validateOnChange="false" :validateOnInput="false" :validateOnModelUpdate="false" />
                            <ErrorMessage name="id" class="text-danger" />
                          </div>
                        </div>
                      </div> <!--end::Col-->
                      <!--begin::Col-->
                      <div class="col-md-6 px-5">
                        <div class="row"> <label for="nome" class="col-form-label col-lg-4">Nome</label>
                          <div class="col-lg-8">
                            <Field as="input" id="nome" name="nome" type="text" class="form-control" maxlength="60"
                              @input="(e) => findByName(e.target.value)" :readonly="state.existJuridica" />
                            <ErrorMessage name="nome" class="text-danger" />
                            <div v-if="state.isFetchingJuridica" class="loader"></div>
                            <div v-if="pessoas.length > 0" class="card mt-1">
                              <div class="card-body">
                                <ul class="list-group">
                                  <button v-for="pessoa in pessoas" :key="pessoa.id" type="button"
                                    class="list-group-item  list-group-item-action" @click="fetchJuridica(pessoa.id)">
                                    {{ pessoa.nome }}
                                  </button>
                                </ul>
                                <div class="d-grid gap-2">
                                  <button class="btn btn-primary mt-2" @click="pessoas = []">
                                    <i class="bi bi-x-circle"></i>&nbsp;&nbsp;&nbsp;&nbsp;Fechar
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div> <!--end::Col-->
                      <!--begin::Col-->
                      <div class="col-md-6 px-5">
                        <div class="row"> <label for="email" class="col-form-label col-lg-4">Email</label>
                          <div class="col-lg-8">
                            <Field as="input" id="email" name="email" type="email" class="form-control" maxlength="70"
                              :readonly="state.existJuridica" />
                            <ErrorMessage name="email" class="text-danger" />
                            <div v-if="state.isFetchingJuridica" class="loader"></div>
                          </div>
                        </div>
                      </div> <!--end::Col-->
                      <!--begin::Col-->
                      <div class="col-md-6 px-5">
                        <div class="row"> <label for="telefone" class="col-form-label col-lg-4">Telefone</label>
                          <div class="col-lg-8">
                            <Field as="input" id="telefone" name="telefone" type="text" class="form-control"
                              maxlength="15" v-mask="['(##) ####-####', '(##) #####-####']"
                              :readonly="state.existJuridica" />
                            <ErrorMessage name="telefone" class="text-danger" />
                            <div v-if="state.isFetchingJuridica" class="loader"></div>
                          </div>
                        </div>
                      </div> <!--end::Col-->
                      <!--begin::Col-->
                      <div class="col-md-6 px-5">
                        <div class="row"> <label for="cep" class="col-form-label col-lg-4">CEP</label>
                          <div class="col-lg-8">
                            <Field as="input" id="cep" name="cep" type="text" class="form-control" maxlength="9"
                              v-mask="'#####-###'" @blur="fetchCepAddress" :readonly="state.existJuridica" />
                            <ErrorMessage name="cep" class="text-danger" />
                            <div v-if="state.isFetchingJuridica" class="loader"></div>
                          </div>
                        </div>
                      </div> <!--end::Col-->
                      <!--begin::Col-->
                      <div class="col-md-6 px-5">
                        <div class="row"> <label for="numero" class="col-form-label col-lg-4">Número</label>
                          <div class="col-lg-8">
                            <Field as="input" id="numero" name="numero" type="text" class="form-control" maxlength="6"
                              :readonly="state.existJuridica" />
                            <ErrorMessage name="numero" class="text-danger" />
                            <div v-if="state.isFetchingJuridica" class="loader"></div>
                          </div>
                        </div>
                      </div> <!--end::Col-->
                      <!--begin::Col-->
                      <div class="col-md-6 px-5">
                        <div class="row"> <label for="logradouro" class="col-form-label col-lg-4">Logradouro</label>
                          <div class="col-lg-8">
                            <Field as="input" id="logradouro" name="logradouro" type="text" class="form-control"
                              maxlength="60" :readonly="state.existJuridica" />
                            <ErrorMessage name="logradouro" class="text-danger" />
                            <div v-if="state.isFetchingJuridica" class="loader"></div>
                            <div v-if="state.isFetchingCepAddress" class="loader"></div>
                          </div>
                        </div>
                      </div> <!--end::Col-->
                      <!--begin::Col-->
                      <div class="col-md-6 px-5">
                        <div class="row"> <label for="bairro" class="col-form-label col-lg-4">Bairro</label>
                          <div class="col-lg-8">
                            <Field as="input" id="bairro" name="bairro" type="text" class="form-control" maxlength="60"
                              :readonly="state.existJuridica" />
                            <ErrorMessage name="bairro" class="text-danger" />
                            <div v-if="state.isFetchingJuridica" class="loader"></div>
                            <div v-if="state.isFetchingCepAddress" class="loader"></div>
                          </div>
                        </div>
                      </div> <!--end::Col-->
                      <!--begin::Col-->
                      <div class="col-md-6 px-5">
                        <div class="row"> <label for="municipio" class="col-form-label col-lg-4">Município</label>
                          <div class="col-lg-8">
                            <Field as="input" id="municipio" name="municipio" type="text" class="form-control"
                              maxlength="60" :readonly="state.existJuridica" />
                            <ErrorMessage name="municipio" class="text-danger" />
                            <div v-if="state.isFetchingJuridica" class="loader"></div>
                            <div v-if="state.isFetchingCepAddress" class="loader"></div>
                          </div>
                        </div>
                      </div> <!--end::Col-->
                      <!--begin::Col-->
                      <div class="col-md-6 px-5">
                        <div class="row"> <label for="uf" class="col-form-label col-lg-4">Estado</label>
                          <div class="col-lg-8">
                            <Field as="input" id="uf" name="uf" type="text" class="form-control" maxlength="2"
                              :readonly="state.existJuridica" />
                            <ErrorMessage name="uf" class="text-danger" />
                            <div v-if="state.isFetchingJuridica" class="loader"></div>
                            <div v-if="state.isFetchingCepAddress" class="loader"></div>
                          </div>
                        </div>
                      </div> <!--end::Col-->
                      <!--begin::Col-->
                      <div class="col-md-6 px-5">
                        <div class="row"> <label for="cnpj" class="col-form-label col-lg-4">CNPJ</label>
                          <div class="col-lg-8">
                            <Field as="input" id="cnpj" name="cnpj" type="text" class="form-control" maxlength="18"
                              v-mask="'##.###.###/####-##'" :readonly="state.existJuridica" />
                            <ErrorMessage name="cnpj" class="text-danger" />
                            <div v-if="state.isFetchingJuridica" class="loader"></div>
                          </div>
                        </div>
                      </div> <!--end::Col-->
                      <!--begin::Col-->
                      <div class="col-md-6 px-5">
                        <div class="row"> <label for="ie" class="col-form-label col-lg-4">IE</label>
                          <div class="col-lg-8">
                            <Field as="input" id="ie" name="ie" type="text" class="form-control" maxlength="14"
                              :readonly="state.existJuridica" />
                            <ErrorMessage name="ie" class="text-danger" />
                            <div v-if="state.isFetchingJuridica" class="loader"></div>
                          </div>
                        </div>
                      </div> <!--end::Col-->
                    </div> <!--end::Row-->
                  </div> <!--end::Body--> <!--begin::Footer-->
                  <div class="card-footer">
                    <div class="row m-2">
                      <div class="col-lg-6 text-center">
                        <RouterLink to="/fornecedores" class="nav-link"><button type="button"
                            class="btn btn-danger button-medium m-2"><i
                              class="bi bi-arrow-counterclockwise"></i>&nbsp;&nbsp;&nbsp;Voltar</button>
                        </RouterLink>
                      </div>
                      <div class="col-lg-6 text-center">
                        <button class="btn btn-success button-medium m-2" type="submit"><i
                            class="bi bi-floppy"></i>&nbsp;&nbsp;&nbsp;Salvar</button>
                      </div>
                    </div>
                  </div> <!--end::Footer-->
                </Form> <!--end::Form-->
              </div>
              <!--begin::JavaScript-->
            </div> <!--end::Form Validation-->
          </div>
        </div> <!--end::Row-->
      </div> <!--end::Container-->
    </div> <!--end::App Content-->
  </main> <!--end::App Main--> <!--begin::Footer-->
</template>
<style>
.loader {
  font-size: 3px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  margin-bottom: 5px;
  animation: mulShdSpin 0.5s infinite ease;
  transform: translateZ(0);
}

.dots-loader::after {
  content: " ";
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #888;
  animation: dots 1.5s infinite;
}

@keyframes mulShdSpin {

  0%,
  100% {
    box-shadow: 0em -2.6em 0em 0em #000000, 1.8em -1.8em 0 0em rgba(0, 0, 0, 0.2), 2.5em 0em 0 0em rgba(0, 0, 0, 0.2), 1.75em 1.75em 0 0em rgba(0, 0, 0, 0.2), 0em 2.5em 0 0em rgba(0, 0, 0, 0.2), -1.8em 1.8em 0 0em rgba(0, 0, 0, 0.2), -2.6em 0em 0 0em rgba(0, 0, 0, 0.5), -1.8em -1.8em 0 0em rgba(0, 0, 0, 0.7);
  }

  12.5% {
    box-shadow: 0em -2.6em 0em 0em rgba(0, 0, 0, 0.7), 1.8em -1.8em 0 0em #000000, 2.5em 0em 0 0em rgba(0, 0, 0, 0.2), 1.75em 1.75em 0 0em rgba(0, 0, 0, 0.2), 0em 2.5em 0 0em rgba(0, 0, 0, 0.2), -1.8em 1.8em 0 0em rgba(0, 0, 0, 0.2), -2.6em 0em 0 0em rgba(0, 0, 0, 0.2), -1.8em -1.8em 0 0em rgba(0, 0, 0, 0.5);
  }

  25% {
    box-shadow: 0em -2.6em 0em 0em rgba(0, 0, 0, 0.5), 1.8em -1.8em 0 0em rgba(0, 0, 0, 0.7), 2.5em 0em 0 0em #000000, 1.75em 1.75em 0 0em rgba(0, 0, 0, 0.2), 0em 2.5em 0 0em rgba(0, 0, 0, 0.2), -1.8em 1.8em 0 0em rgba(0, 0, 0, 0.2), -2.6em 0em 0 0em rgba(0, 0, 0, 0.2), -1.8em -1.8em 0 0em rgba(0, 0, 0, 0.2);
  }

  37.5% {
    box-shadow: 0em -2.6em 0em 0em rgba(0, 0, 0, 0.2), 1.8em -1.8em 0 0em rgba(0, 0, 0, 0.5), 2.5em 0em 0 0em rgba(0, 0, 0, 0.7), 1.75em 1.75em 0 0em #000000, 0em 2.5em 0 0em rgba(0, 0, 0, 0.2), -1.8em 1.8em 0 0em rgba(0, 0, 0, 0.2), -2.6em 0em 0 0em rgba(0, 0, 0, 0.2), -1.8em -1.8em 0 0em rgba(0, 0, 0, 0.2);
  }

  50% {
    box-shadow: 0em -2.6em 0em 0em rgba(0, 0, 0, 0.2), 1.8em -1.8em 0 0em rgba(0, 0, 0, 0.2), 2.5em 0em 0 0em rgba(0, 0, 0, 0.5), 1.75em 1.75em 0 0em rgba(0, 0, 0, 0.7), 0em 2.5em 0 0em #000000, -1.8em 1.8em 0 0em rgba(0, 0, 0, 0.2), -2.6em 0em 0 0em rgba(0, 0, 0, 0.2), -1.8em -1.8em 0 0em rgba(0, 0, 0, 0.2);
  }

  62.5% {
    box-shadow: 0em -2.6em 0em 0em rgba(0, 0, 0, 0.2), 1.8em -1.8em 0 0em rgba(0, 0, 0, 0.2), 2.5em 0em 0 0em rgba(0, 0, 0, 0.2), 1.75em 1.75em 0 0em rgba(0, 0, 0, 0.5), 0em 2.5em 0 0em rgba(0, 0, 0, 0.7), -1.8em 1.8em 0 0em #000000, -2.6em 0em 0 0em rgba(0, 0, 0, 0.2), -1.8em -1.8em 0 0em rgba(0, 0, 0, 0.2);
  }

  75% {
    box-shadow: 0em -2.6em 0em 0em rgba(0, 0, 0, 0.2), 1.8em -1.8em 0 0em rgba(0, 0, 0, 0.2), 2.5em 0em 0 0em rgba(0, 0, 0, 0.2), 1.75em 1.75em 0 0em rgba(0, 0, 0, 0.2), 0em 2.5em 0 0em rgba(0, 0, 0, 0.5), -1.8em 1.8em 0 0em rgba(0, 0, 0, 0.7), -2.6em 0em 0 0em #000000, -1.8em -1.8em 0 0em rgba(0, 0, 0, 0.2);
  }

  87.5% {
    box-shadow: 0em -2.6em 0em 0em rgba(0, 0, 0, 0.2), 1.8em -1.8em 0 0em rgba(0, 0, 0, 0.2), 2.5em 0em 0 0em rgba(0, 0, 0, 0.2), 1.75em 1.75em 0 0em rgba(0, 0, 0, 0.2), 0em 2.5em 0 0em rgba(0, 0, 0, 0.2), -1.8em 1.8em 0 0em rgba(0, 0, 0, 0.5), -2.6em 0em 0 0em rgba(0, 0, 0, 0.7), -1.8em -1.8em 0 0em #000000;
  }
}
</style>