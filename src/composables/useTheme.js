import { ref, watchEffect } from 'vue';

export function useTheme() {
  const theme = ref(localStorage.getItem('theme') || 'auto');

  const getPreferredTheme = () => {
    return theme.value === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : theme.value;
  };

  const setTheme = (newTheme) => {
    theme.value = newTheme;
    localStorage.setItem('theme', newTheme);

    const appliedTheme = getPreferredTheme();
    document.documentElement.setAttribute('data-bs-theme', appliedTheme);
  };

  // Inicializar o tema ao carregar o composable
  setTheme(theme.value);

  // Reagir a mudanças no sistema
  watchEffect(() => {
    if (theme.value === 'auto') {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      darkModeQuery.addEventListener('change', () => {
        setTheme('auto');
      });
    }
  });

  return {
    theme,
    setTheme,
  };
}