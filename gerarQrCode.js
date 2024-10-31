// necessário usar 'qrcode.js':
import QRCode from 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm';

/**
 * Gera um QR Code em um elemento HTML
 * @param {Object} config Configuração do QR Code
 * @param {string} config.elementoId ID do elemento onde o QR Code será renderizado
 * @param {string|number|Object} config.valor Valor a ser codificado
 * @param {string} config.tipo Tipo do valor (url, texto, email, tel, pix, etc)
 * @param {Object} [config.opcoes] Opções de estilo do QR Code
 * @returns {Promise<boolean>} Sucesso da geração
 */
const gerarQRCode = async ({
    elementoId,
    valor,
    tipo,
    opcoes = {}
}) => {
    try {
        // Validações iniciais
        if (!elementoId || !valor || !tipo) {
            throw new Error('Parâmetros obrigatórios não fornecidos');
        }

        const elemento = document.getElementById(elementoId);
        if (!elemento) {
            throw new Error(`Elemento com ID "${elementoId}" não encontrado`);
        }

        // Configurações padrão
        const configPadrao = {
            width: 256, // largura
            height: 256, // altura
            margin: 1, // margem
            color: {
                dark: '#000000', // cor escura
                light: '#FFFFFF' // cor clara
            },
            errorCorrectionLevel: 'H', // nível de correção de erro
            version: undefined, // versão automática
            maskPattern: undefined // padrão de máscara automático
        };

        // Configurações específicas para PIX
        if (tipo.toLowerCase() === 'pix') {
            configPadrao.errorCorrectionLevel = 'Q'; // Nível Q recomendado para PIX
            configPadrao.margin = 0;
            configPadrao.width = 350; // Tamanho recomendado para PIX
            configPadrao.height = 350;
        }

        // Mescla opções com as padrões
        const opcoesQR = { ...configPadrao, ...opcoes };

        // Formata o valor baseado no tipo
        const valorFormatado = formatarValorQR(valor, tipo);

        // Cria ou reutiliza o canvas
        let canvas = elemento.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            elemento.innerHTML = '';
            elemento.appendChild(canvas);
        }

        // Gera o QR Code
        await QRCode.toCanvas(canvas, valorFormatado, opcoesQR);

        // Adiciona classe para identificar o tipo
        canvas.className = `qrcode-${tipo.toLowerCase()}`;

        // Configura o observador de redimensionamento
        configurarResponsividade(elemento);

        return true;
    } catch (erro) {
        console.error('Erro ao gerar QR Code:', erro);
        return false;
    }
};

/**
 * Formata o valor baseado no tipo para o QR Code
 * @param {string|number|Object} valor Valor a ser formatado
 * @param {string} tipo Tipo do valor
 * @returns {string} Valor formatado
 */
function formatarValorQR(valor, tipo) {
    switch (tipo.toLowerCase()) {
        case 'pix':
            // Se já for uma string EMV completa, retorna diretamente
            if (typeof valor === 'string' && (
                valor.startsWith('00020126') || // Padrão EMV
                valor.includes('BR.GOV.BCB.PIX') // Contém identificador PIX
            )) {
                return valor;
            }
            
            // Se for um objeto com dados do PIX, formata adequadamente
            if (typeof valor === 'object') {
                return formatarStringPix(valor);
            }
            
            return valor;

        case 'url':
            return valor.startsWith('http') ? valor : `https://${valor}`;
            
        case 'email':
            return `mailto:${valor}`;
            
        case 'tel':
            // Remove caracteres não numéricos
            return `tel:${valor.replace(/\D/g, '')}`;
            
        case 'sms':
            return `sms:${valor.replace(/\D/g, '')}`;
            
        case 'wifi':
            // Formato: WIFI:T:WPA;S:nome_da_rede;P:senha;;
            const { nomeRede, senha, criptografia = 'WPA' } = typeof valor === 'object' ? valor : {};
            return `WIFI:T:${criptografia};S:${nomeRede};P:${senha};;`;
            
        case 'contato':
            // Formato vCard simplificado
            const { nome, telefone, email } = typeof valor === 'object' ? valor : {};
            return `BEGIN:VCARD\nVERSION:3.0\nN:${nome}\nTEL:${telefone}\nEMAIL:${email}\nEND:VCARD`;
            
        default:
            return String(valor);
    }
}

/**
 * Formata dados do PIX em string EMV
 * @param {Object|string} dadosPix Dados do PIX
 * @returns {string} String formatada no padrão EMV
 */
function formatarStringPix(dadosPix) {
    // Se já for uma string, retorna ela mesma
    if (typeof dadosPix === 'string') {
        return dadosPix;
    }

    // Se for um payload bruto EMV ou payload formatado
    if (dadosPix.dadosEmv || dadosPix.payload) {
        return dadosPix.dadosEmv || dadosPix.payload;
    }

    // Extrai os dados do objeto
    const {
        chave,
        valor,
        beneficiario,
        cidade,
        identificador
    } = dadosPix;

    // Aqui você pode implementar a lógica de geração do EMV
    // Por enquanto, retorna vazio
    return '';
}

/**
 * Aplica debounce em uma função
 * @param {Function} funcao Função a ser executada
 * @param {number} espera Tempo de espera em ms
 * @returns {Function} Função com debounce
 */
function debounceQrCode(funcao, espera) {
    let timeout;
    return function executarFuncao(...args) {
        const depois = () => {
            clearTimeout(timeout);
            funcao(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(depois, espera);
    };
}

/**
 * Configura a responsividade do QR Code
 * @param {HTMLElement} elemento Elemento contentor do QR Code
 */
function configurarResponsividade(elemento) {
    // Cria um ResizeObserver para ajustar o tamanho do QR Code
    const observador = new ResizeObserver(debounceQrCode((entries) => {
        for (const entry of entries) {
            const elemento = entry.target;
            const canvas = elemento.querySelector('canvas');
            if (canvas) {
                const { width, height } = entry.contentRect;
                const tamanho = Math.min(width, height);
                canvas.style.width = `${tamanho}px`;
                canvas.style.height = `${tamanho}px`;
            }
        }
    }, 250));

    observador.observe(elemento);
}

export { gerarQRCode };
