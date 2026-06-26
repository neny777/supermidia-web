import { defineRule, configure } from "vee-validate";
import { required, min, max } from "@vee-validate/rules";
import * as yup from "yup";

configure({
  validateOnBlur: true,  // Valida apenas no evento blur
  validateOnInput: false, // Desativa validação no evento input
  validateOnChange: false,
  validateOnModelUpdate: false,
});

yup.addMethod(yup.string, "brDate", function (message) {
  return this.test("brDate", message, (value) => {
    if (!value) return true; // Allow empty values
    const datePattern = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    if (!datePattern.test(value)) return false;
    const [day, month, year] = value.split("/").map(Number);
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  });
});

// Método personalizado para validar idade mínima
yup.addMethod(yup.string, "minAge", function (message) {
  return this.test("minAge", message, (value) => {
    if (!value) return true; // Campo vazio é tratado em outra validação
    const today = new Date();
    const [day, month, year] = value.split("/").map(Number);
    const minDate = new Date(year, month - 1, day);
    let yearsDifference = today.getFullYear() - minDate.getFullYear()
    // Check if the current year difference accounts for the full year
    if (
      today.getMonth() < minDate.getMonth() ||
      (today.getMonth() === minDate.getMonth() && today.getDate() < minDate.getDate())
    ) {
      yearsDifference--;
    }
    return (yearsDifference >= 16); // A data deve ser menor ou igual à data mínima
  });
});

yup.addMethod(yup.string, "brEmail", function (message) {
  return this.test("brEmail", message, (value) => {
    if (!value) return true; // Allow empty values
    //const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+(\.[^\s@]+)?$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?$/;
    return emailRegex.test(value) || false;
  });
});

// Adiciona o método 'cpf' ao Yup
yup.addMethod(yup.string, "cpf", function (message) {
  return this.test("cpf", message || "CPF inválido", function (value) {
    if (!value) return true; // Permite valores vazios
    return isValidCPF(value);
  });
});

// Função para validar CPF
function isValidCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g, ""); // Remove caracteres não numéricos
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
  let firstDigit = 11 - (sum % 11);
  if (firstDigit > 9) firstDigit = 0;
  if (firstDigit !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
  let secondDigit = 11 - (sum % 11);
  if (secondDigit > 9) secondDigit = 0;
  if (secondDigit !== parseInt(cpf.charAt(10))) return false;

  return true;
}

// Adiciona o método 'cnpj' ao Yup
yup.addMethod(yup.string, "cnpj", function (message) {
  return this.test("cnpj", message || "CNPJ inválido", function (value) {
    if (!value) return true; // Permite valores vazios
    return isValidCNPJ(value);
  });
});

// Função para validar CNPJ
function isValidCNPJ(cnpj) {
  cnpj = cnpj.replace(/[^\d]+/g, ""); // Remove caracteres não numéricos

  // CNPJ deve ter 14 dígitos
  if (cnpj.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  let sum = 0;
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  let digits = cnpj.substring(size);
  let pos = size - 7;

  // Calcula o primeiro dígito verificador
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  // Calcula o segundo dígito verificador
  size += 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}