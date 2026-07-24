import { createRouter, createWebHistory } from 'vue-router';
import { useServerStatusStore } from '@/stores/serverStatusStore';
import axiosInstance from '@/axiosInstance';

const LoginView = () => import('@/views/LoginView.vue');
const HomeView = () => import('@/views/HomeView.vue');
const ClientesView = () => import('@/views/ClientesView.vue');
const ClienteFisicoView = () => import('@/views/ClienteFisicoView.vue');
const ClienteJuridicoView = () => import('@/views/ClienteJuridicoView.vue');
const FornecedoresView = () => import('@/views/FornecedoresView.vue');
const FornecedorFisicoView = () => import('@/views/FornecedorFisicoView.vue');
const FornecedorJuridicoView = () => import('@/views/FornecedorJuridicoView.vue');
const ParceirosView = () => import('@/views/ParceirosView.vue');
const ParceiroFisicoView = () => import('@/views/ParceiroFisicoView.vue');
const ParceiroJuridicoView = () => import('@/views/ParceiroJuridicoView.vue');
const ColaboradoresView = () => import('@/views/ColaboradoresView.vue');
const ColaboradorView = () => import('@/views/ColaboradorView.vue');
const UsuariosView = () => import('@/views/UsuariosView.vue');
const UsuarioView = () => import('@/views/UsuarioView.vue');
const MateriasView = () => import('@/views/MateriasView.vue');
const MateriaView = () => import('@/views/MateriaView.vue');
const ServicosView = () => import('@/views/ServicosView.vue');
const ServicoView = () => import('@/views/ServicoView.vue');
const CalculosView = () => import('@/views/CalculosView.vue');
const CalculoView = () => import('@/views/CalculoView.vue');
const ProdutosView = () => import('@/views/ProdutosView.vue');
const ProdutoView = () => import('@/views/ProdutoView.vue');
const ProdutoMateriaView = () => import('@/views/ProdutoMateriaView.vue');
const ProdutoServicoView = () => import('@/views/ProdutoServicoView.vue');
const ProdutoMateriaParametroView = () => import('@/views/ProdutoMateriaParametroView.vue');
const ProdutoServicoParametroView = () => import('@/views/ProdutoServicoParametroView.vue');
const ProdutoGrupoOpcaoView = () => import('@/views/ProdutoGrupoOpcaoView.vue');
const VendasView = () => import('@/views/VendasView.vue');
const VendaView = () => import('@/views/VendaView.vue');
const ConfiguracoesView = () => import('@/views/ConfiguracoesView.vue');
const ServerErrorView = () => import('@/views/ServerErrorView.vue');
const PasswordRecoverEmailView = () => import('@/views/PasswordRecoverEmailView.vue');
const PasswordRecoverCodeView = () => import('@/views/PasswordRecoverCodeView.vue');
const PasswordRecoverResetView = () => import('@/views/PasswordRecoverResetView.vue');

const TOKEN_VALIDATION_TTL_MS = 60_000;
let lastValidatedToken = null;
let lastTokenValidationAt = 0;
let tokenValidationInFlight = null;

async function validateTokenWithCache(token) {
    const now = Date.now();
    const isSameToken = token === lastValidatedToken;
    const isFresh = isSameToken && now - lastTokenValidationAt < TOKEN_VALIDATION_TTL_MS;

    if (isFresh) return;

    if (!tokenValidationInFlight) {
        tokenValidationInFlight = axiosInstance
            .get('/usuarios/validate-token')
            .then(() => {
                lastValidatedToken = token;
                lastTokenValidationAt = Date.now();
            })
            .finally(() => {
                tokenValidationInFlight = null;
            });
    }

    await tokenValidationInFlight;
}

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'login',
            component: LoginView,
            meta: { layout: 'SimpleLayout' },
        },
        {
            path: '/home',
            name: 'home',
            component: HomeView,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/clientes',
            name: 'clientes',
            component: ClientesView,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/clientes/fisico/:fisicoId?',
            name: 'cliente-fisico',
            component: ClienteFisicoView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/clientes/juridico/:juridicoId?',
            name: 'cliente-juridico',
            component: ClienteJuridicoView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/fornecedores',
            name: 'fornecedores',
            component: FornecedoresView,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/fornecedores/fisico/:fisicoId?',
            name: 'fornecedor-fisico',
            component: FornecedorFisicoView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/fornecedores/juridico/:juridicoId?',
            name: 'fornecedor-juridico',
            component: FornecedorJuridicoView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/parceiros',
            name: 'parceiros',
            component: ParceirosView,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/parceiros/fisico/:fisicoId?',
            name: 'parceiro-fisico',
            component: ParceiroFisicoView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/parceiros/juridico/:juridicoId?',
            name: 'parceiro-juridico',
            component: ParceiroJuridicoView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/colaboradores',
            name: 'colaboradores',
            component: ColaboradoresView,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/colaborador/:colaboradorId?',
            name: 'colaborador',
            component: ColaboradorView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/usuarios',
            name: 'usuarios',
            component: UsuariosView,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/usuario/:usuarioId?',
            name: 'usuario',
            component: UsuarioView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/materias',
            name: 'materias',
            component: MateriasView,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/materia/:materiaId?',
            name: 'materia',
            component: MateriaView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/servicos',
            name: 'servicos',
            component: ServicosView,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/servico/:servicoId?',
            name: 'servico',
            component: ServicoView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/calculos',
            name: 'calculos',
            component: CalculosView,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/calculo/:calculoId?',
            name: 'calculo',
            component: CalculoView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/produtos',
            name: 'produtos',
            component: ProdutosView,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/produto/:produtoId?',
            name: 'produto',
            component: ProdutoView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/produto/:produtoId/materia',
            name: 'produto-materia',
            component: ProdutoMateriaView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/produto/:produtoId/materia/:itemIndex',
            name: 'produto-materia-editar',
            component: ProdutoMateriaView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/produto/:produtoId/materia/:itemIndex/parametro',
            name: 'produto-materia-parametro',
            component: ProdutoMateriaParametroView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/produto/:produtoId/materia/:itemIndex/parametro/:parametroIndex',
            name: 'produto-materia-parametro-editar',
            component: ProdutoMateriaParametroView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/produto/:produtoId/servico',
            name: 'produto-servico',
            component: ProdutoServicoView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/produto/:produtoId/servico/:itemIndex',
            name: 'produto-servico-editar',
            component: ProdutoServicoView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/produto/:produtoId/servico/:itemIndex/parametro',
            name: 'produto-servico-parametro',
            component: ProdutoServicoParametroView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/produto/:produtoId/servico/:itemIndex/parametro/:parametroIndex',
            name: 'produto-servico-parametro-editar',
            component: ProdutoServicoParametroView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/produto/:produtoId/grupo',
            name: 'produto-grupo',
            component: ProdutoGrupoOpcaoView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/produto/:produtoId/grupo/:grupoIndex',
            name: 'produto-grupo-editar',
            component: ProdutoGrupoOpcaoView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/produto/:produtoId/grupo/:grupoIndex/opcao/:opcaoIndex/materia/:itemIndex?',
            name: 'produto-grupo-materia',
            component: ProdutoMateriaView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/produto/:produtoId/grupo/:grupoIndex/opcao/:opcaoIndex/servico/:itemIndex?',
            name: 'produto-grupo-servico',
            component: ProdutoServicoView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/orcamentos',
            name: 'orcamentos',
            component: VendasView,
            props: { status: 'ORCAMENTO' },
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/ordens-servico',
            name: 'ordens-servico',
            component: VendasView,
            props: { status: 'ORDEM_SERVICO' },
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/vendas-canceladas',
            name: 'vendas-canceladas',
            component: VendasView,
            props: { status: 'CANCELADO' },
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/venda/:vendaId?',
            name: 'venda',
            component: VendaView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/venda/:vendaId/editar',
            name: 'venda-editar',
            component: VendaView,
            props: true,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/configuracoes',
            name: 'configuracoes',
            component: ConfiguracoesView,
            meta: { layout: 'DefaultLayout' },
        },
        {
            path: '/server-error',
            name: 'server-error',
            component: ServerErrorView,
            meta: { layout: 'SimpleLayout' },
        },
        {
            path: '/recover-password',
            name: 'recover-password-email',
            component: PasswordRecoverEmailView,
            meta: { layout: 'SimpleLayout' },
        },
        {
            path: '/recover-password/code',
            name: 'recover-password-code',
            component: PasswordRecoverCodeView,
            meta: { layout: 'SimpleLayout' },
        },
        {
            path: '/recover-password/reset',
            name: 'recover-password-reset',
            component: PasswordRecoverResetView,
            meta: { layout: 'SimpleLayout' },
        },
    ],
});

router.beforeEach(async (to, from, next) => {
    const serverStatusStore = useServerStatusStore();
    const token = localStorage.getItem('token');
    // Lista de rotas públicas que não requerem autenticação
    const publicRoutes = ['recover-password-email', 'recover-password-code', 'recover-password-reset'];
    try {
        await serverStatusStore.checkServerStatus();
    } catch (err) {
        console.error('[Router] Falha ao verificar status do servidor:', err.message);
    }
    // Redirecionar para a página de erro se o servidor estiver offline
    if (serverStatusStore.isOffline && to.name !== 'server-error') {
        console.warn('[Router] Servidor offline. Redirecionando para /server-error.');
        next({ name: 'server-error' });
        return;
    }
    // Permitir acesso a rotas públicas sem autenticação
    if (publicRoutes.includes(to.name)) {
        next();
        return;
    }
    // Redirecionar para a página inicial se o servidor voltar a ficar online
    if (!serverStatusStore.isOffline && to.name === 'server-error') {
        next({ name: 'home' });
        return;
    }
    // Redirecionar para login se o usuário não estiver autenticado
    if (!token && to.name !== 'login' && to.name !== 'server-error') {
        lastValidatedToken = null;
        lastTokenValidationAt = 0;
        next({ name: 'login' });
    } else if (token) {
        try {
            await validateTokenWithCache(token);
            next();
        } catch {
            localStorage.removeItem('token');
            lastValidatedToken = null;
            lastTokenValidationAt = 0;
            next({ name: 'login' });
        }
    } else {
        next();
    }
});

export default router;
