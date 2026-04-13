/**
 * gerarQrCode.js — v2.0.0
 *
 * Gerador de QR Code Universal
 * Suporta: PIX (estático / dinâmico), Wi-Fi (WPA / WPA2 / WPA3),
 *          URL, E-mail, Telefone, SMS, Contato (vCard 3.0), Texto livre
 *
 * Dependência: qrcode v1.5.4+ (https://github.com/soldair/node-qrcode)
 *
 * Referências normativas:
 *   • Manual BR Code — BCB v2.0.1
 *   • Manual de Padrões para Iniciação do Pix — BCB v2.9.0
 *   • EMV QRCPS-MPM v1.1 (Merchant Presented Mode)
 *   • WPA3 Specification v3.2 — Wi-Fi Alliance, §7.1 URI format
 *   • vCard 3.0 — RFC 2426
 *
 * Changelog v2.0.0 (vs v1.0.0):
 *   [FIX-01]  innerHTML → replaceChildren (vetor XSS eliminado)
 *   [FIX-02]  Sanitização de inputs em WiFi, vCard, PIX
 *   [FIX-03]  CDN SRI documentado (não aplicável em ESM import dinâmico)
 *   [FIX-04]  className sanitizada contra caracteres inválidos
 *   [FIX-05]  PIX EMV completo — geração real de payload com CRC16
 *   [FIX-06]  Validação de valor aceita 0, "", false (sem falso negativo)
 *   [FIX-07]  WiFi / Contato com valor string → erro explícito
 *   [FIX-08]  tel / sms / url com valor numérico → coerção segura
 *   [FIX-09]  (coberto pelo FIX-08)
 *   [FIX-10]  ResizeObserver reutilizado via Symbol — sem memory leak
 *   [FIX-11]  Shadowing de variável corrigido no callback do observer
 *   [FIX-12]  debounce reescrito — clearTimeout redundante removido
 *   [NEW-01]  PIX dinâmico (URL location)
 *   [NEW-02]  WiFi WPA3: campos R:, K:, I:, H:true, escape ZXing
 *   [NEW-03]  vCard expandido: ORG, TITLE, ADR, URL
 *   [NEW-04]  Exports utilitários: formatarPix, formatarWiFi, formatarContato
 *   [NEW-05]  Deep merge de opcoes.color
 *
 * @license MIT
 */

// [FIX-03] Nota sobre SRI / CSP:
//   - npm / bundler: o import abaixo resolve via node_modules
//   - CDN direto (sem bundler): troque a linha por:
//       import QRCode from 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm';
//     e adicione CSP no HTML hospedeiro:
//       <meta http-equiv="Content-Security-Policy"
//             content="script-src 'self' https://cdn.jsdelivr.net">
import QRCode from 'qrcode';

// ═══════════════════════════════════════════════════════════════
//  CONSTANTES
// ═══════════════════════════════════════════════════════════════

/** @private Chave para armazenar ResizeObserver no elemento DOM */
const OBSERVER_KEY = Symbol('qrObserver');

/**
 * Mapa de tipos de criptografia Wi-Fi aceitos.
 * Chave = valor que o usuário passa em `criptografia`.
 * Valor = valor emitido no campo T: do QR Code.
 *
 * Nota: WPA3 usa T:WPA combinado com R: (Transition Disable).
 *       T:SAE é legado e nem todos os leitores suportam.
 */
const WIFI_CRIPTO = Object.freeze({
    WPA:    'WPA',
    WPA2:   'WPA',
    WPA3:   'WPA',
    SAE:    'SAE',
    WEP:    'WEP',
    NOPASS: 'nopass'
});

// ═══════════════════════════════════════════════════════════════
//  UTILIDADES INTERNAS
// ═══════════════════════════════════════════════════════════════

/**
 * Codifica um campo TLV (Tag-Length-Value) no padrão EMV.
 * @param {string} id    ID do campo (2 dígitos, ex: '00', '26')
 * @param {string} valor Conteúdo do campo
 * @returns {string} Campo TLV formatado
 */
function tlv(id, valor) {
    return `${id}${String(valor.length).padStart(2, '0')}${valor}`;
}

/**
 * CRC16-CCITT-FALSE (poly 0x1021, init 0xFFFF).
 * Conforme EMV QRCPS-MPM §4.7 e Manual BR Code §4.
 * @param {string} str Payload completo incluindo o tag "6304"
 * @returns {string} 4 caracteres hexadecimais uppercase
 */
function crc16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
            crc &= 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Escapa caracteres especiais para WiFi QR (formato ZXing / Android).
 *
 * O WPA3 §7.1 exige percent-encoding, mas Android não o interpreta
 * ao escanear. Backslash-escape (formato ZXing original) tem a maior
 * compatibilidade cross-platform (Android, iOS, Windows).
 *
 * Caracteres escapados: \ ; , : "
 *
 * @param {string} valor
 * @returns {string}
 */
function escaparWiFi(valor) {
    if (typeof valor !== 'string') { return ''; }
    return valor.replace(/([\\;,:"'])/g, '\\$1');
}

/**
 * Remove caracteres de controle. Preserva \n e \r (necessários em vCard).
 * @param {string} valor
 * @returns {string}
 */
function sanitizar(valor) {
    if (valor === null || valor === undefined) { return ''; }
    return String(valor).replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Converte qualquer valor para string de forma segura.
 * Nunca retorna "undefined" ou "null" literal.
 */
function paraString(valor) {
    if (valor === null || valor === undefined) { return ''; }
    return String(valor);
}

/**
 * Remove diacríticos (acentos) para máxima compatibilidade EMV.
 * Ex: "São Paulo" → "Sao Paulo"
 */
function removerAcentos(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Debounce: adia execução até que o intervalo de espera
 * transcorra sem nova invocação.
 * [FIX-12] clearTimeout redundante removido.
 */
function debounce(funcao, espera) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => funcao.apply(this, args), espera);
    };
}

/**
 * Configura responsividade do QR Code.
 * [FIX-10] Reutiliza observer existente via Symbol — sem acúmulo.
 * [FIX-11] Variável "alvo" em vez de "elemento" no callback — sem shadowing.
 */
function configurarResponsividade(elemento) {
    if (elemento[OBSERVER_KEY]) {
        elemento[OBSERVER_KEY].disconnect();
    }

    const observador = new ResizeObserver(debounce((entries) => {
        for (const entry of entries) {
            const alvo = entry.target;
            const canvas = alvo.querySelector('canvas');
            if (canvas) {
                const { width, height } = entry.contentRect;
                const tamanho = Math.min(width, height);
                canvas.style.width  = `${tamanho}px`;
                canvas.style.height = `${tamanho}px`;
            }
        }
    }, 250));

    observador.observe(elemento);
    elemento[OBSERVER_KEY] = observador;
}

/**
 * Sanitiza tipo para uso seguro como classe CSS.
 * [FIX-04] Remove tudo que não seja a-z, 0-9 ou hífen.
 */
function tipoParaClasse(tipo) {
    return tipo.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

// ═══════════════════════════════════════════════════════════════
//  FORMATADORES — PIX
// ═══════════════════════════════════════════════════════════════

/**
 * Gera payload PIX EMV estático.
 * Conforme Manual BR Code BCB v2.0.1 e Manual de Padrões v2.9.0.
 *
 * @param {Object} dados
 * @param {string}        dados.chave         Chave PIX (CPF, CNPJ, e-mail, telefone ou EVP) — obrigatório
 * @param {string}        [dados.beneficiario] Nome do beneficiário (máx 25 chars, sem acentos)
 * @param {string}        [dados.cidade]       Cidade (máx 15 chars, sem acentos)
 * @param {number|string} [dados.valor]        Valor (0 ou omitido = pagador informa)
 * @param {string}        [dados.identificador] txid (máx 25 chars alfanuméricos; padrão '***')
 * @param {string}        [dados.descricao]    Texto adicional campo 26-02 (máx 72 chars)
 * @returns {string} Payload EMV completo com CRC16
 */
function formatarPixEstatico(dados) {
    const chave = sanitizar(dados.chave).trim();
    if (!chave) {
        throw new Error('PIX estático: campo "chave" é obrigatório e não pode ser vazio');
    }

    const beneficiario = removerAcentos(
        sanitizar(dados.beneficiario || 'RECEBEDOR')
    ).substring(0, 25).toUpperCase();

    const cidade = removerAcentos(
        sanitizar(dados.cidade || 'BRASILIA')
    ).substring(0, 15).toUpperCase();

    const identificador = dados.identificador
        ? sanitizar(dados.identificador).replace(/[^A-Za-z0-9]/g, '').substring(0, 25)
        : '***';

    // --- Merchant Account Information (ID 26) ---
    let mai = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', chave);
    if (dados.descricao) {
        mai += tlv('02', sanitizar(dados.descricao).substring(0, 72));
    }

    // --- Montagem do payload ---
    let payload = '';
    payload += tlv('00', '01');                     // Payload Format Indicator

    // Point of Initiation Method (ID 01)
    // "12" = uso único (quando valor é definido); omitido = reutilizável
    const valorNum = dados.valor != null ? parseFloat(paraString(dados.valor)) : 0;
    if (valorNum > 0) {
        payload += tlv('01', '12');
    }

    payload += tlv('26', mai);                      // Merchant Account Information
    payload += tlv('52', '0000');                    // MCC (0000 = não informado)
    payload += tlv('53', '986');                     // Moeda (986 = BRL)

    if (valorNum > 0) {
        payload += tlv('54', valorNum.toFixed(2));   // Valor da transação
    }

    payload += tlv('58', 'BR');                      // País
    payload += tlv('59', beneficiario);              // Nome do beneficiário
    payload += tlv('60', cidade);                    // Cidade

    // Additional Data Field (ID 62)
    payload += tlv('62', tlv('05', identificador));  // txid

    // CRC16 (ID 63, sempre 4 chars hex)
    const comTag = payload + '6304';
    return comTag + crc16(comTag);
}

/**
 * Gera payload PIX EMV dinâmico (URL-based).
 * O QR Code contém a URL do location; o app do PSP pagador
 * consulta essa URL para obter os dados completos da cobrança.
 *
 * @param {Object} dados
 * @param {string} dados.url           URL do location — obrigatório
 * @param {string} [dados.beneficiario] Nome (máx 25 chars)
 * @param {string} [dados.cidade]       Cidade (máx 15 chars)
 * @returns {string} Payload EMV completo com CRC16
 */
function formatarPixDinamico(dados) {
    const url = sanitizar(dados.url).trim();
    if (!url) {
        throw new Error('PIX dinâmico: campo "url" é obrigatório e não pode ser vazio');
    }

    const beneficiario = removerAcentos(
        sanitizar(dados.beneficiario || 'RECEBEDOR')
    ).substring(0, 25).toUpperCase();

    const cidade = removerAcentos(
        sanitizar(dados.cidade || 'BRASILIA')
    ).substring(0, 15).toUpperCase();

    // Merchant Account Information com URL (campo 25)
    const mai = tlv('00', 'BR.GOV.BCB.PIX') + tlv('25', url);

    let payload = '';
    payload += tlv('00', '01');                        // Payload Format Indicator
    payload += tlv('01', '12');                        // Uso único (dinâmico)
    payload += tlv('26', mai);                         // Merchant Account Information
    payload += tlv('52', '0000');                      // MCC
    payload += tlv('53', '986');                       // BRL
    payload += tlv('58', 'BR');                        // País
    payload += tlv('59', beneficiario);                // Nome
    payload += tlv('60', cidade);                      // Cidade
    payload += tlv('62', tlv('05', '***'));             // txid não utilizado

    const comTag = payload + '6304';
    return comTag + crc16(comTag);
}

/**
 * Roteador PIX — decide entre payload bruto, estático ou dinâmico.
 *
 * Aceita:
 *   • String EMV completa (retorna direto)
 *   • String simples (interpreta como chave PIX → estático)
 *   • Objeto com { dadosEmv } ou { payload } (retorna direto)
 *   • Objeto com { url } (→ dinâmico)
 *   • Objeto com { chave } (→ estático)
 *
 * @param {string|Object} dados
 * @returns {string} Payload EMV pronto para o QR Code
 */
function formatarPix(dados) {
    // String EMV completa
    if (typeof dados === 'string') {
        if (dados.startsWith('00020126') || dados.includes('BR.GOV.BCB.PIX')) {
            return dados;
        }
        // String simples → chave PIX
        return formatarPixEstatico({ chave: dados });
    }

    if (typeof dados !== 'object' || dados === null) {
        throw new Error('PIX: valor deve ser string (chave ou EMV) ou objeto');
    }

    // Payload bruto
    if (dados.dadosEmv) { return dados.dadosEmv; }
    if (dados.payload)  { return dados.payload;  }

    // Dinâmico (URL)
    if (dados.url) { return formatarPixDinamico(dados); }

    // Estático (chave)
    if (dados.chave) { return formatarPixEstatico(dados); }

    throw new Error(
        'PIX: objeto deve conter "chave" (estático), "url" (dinâmico), ou "payload"/"dadosEmv" (bruto)'
    );
}

// ═══════════════════════════════════════════════════════════════
//  FORMATADORES — WI-FI
// ═══════════════════════════════════════════════════════════════

/**
 * Formata Wi-Fi QR Code.
 *
 * Compatível com: ZXing, Android 10+, iOS 11+, WPA3 §7.1.
 * Usa backslash-escape (ZXing) para máxima compatibilidade.
 *
 * @param {Object} dados
 * @param {string}  dados.nomeRede           SSID — obrigatório
 * @param {string}  [dados.senha]            Senha (omitido se criptografia = NOPASS)
 * @param {string}  [dados.criptografia]     'WPA' | 'WPA2' | 'WPA3' | 'SAE' | 'WEP' | 'NOPASS' (padrão: 'WPA')
 * @param {boolean} [dados.oculta]           true se SSID é oculto (H:true)
 * @param {string}  [dados.transitionDisable] WPA3: valor R: ('1' = WPA3-only, '3' = SAE-PK only)
 * @param {string}  [dados.chavePublica]     WPA3 SAE-PK: base64 DER SubjectPublicKeyInfo
 * @param {string}  [dados.identificadorSenha] WPA3: SAE password identifier (campo I:)
 * @returns {string} String WIFI: formatada
 */
function formatarWiFi(dados) {
    // [FIX-07] String crua → erro explícito (antes gerava "undefined" silenciosamente)
    if (typeof dados === 'string') {
        if (dados.startsWith('WIFI:')) { return dados; }
        throw new Error(
            'WiFi: valor string deve ser um payload WIFI:... completo, '
            + 'ou passe um objeto com { nomeRede, senha }'
        );
    }

    if (typeof dados !== 'object' || dados === null) {
        throw new Error('WiFi: valor deve ser objeto com { nomeRede, senha }');
    }

    const {
        nomeRede,
        senha,
        criptografia      = 'WPA',
        oculta             = false,
        transitionDisable  = null,
        chavePublica       = null,
        identificadorSenha = null
    } = dados;

    if (!nomeRede) {
        throw new Error('WiFi: campo "nomeRede" (SSID) é obrigatório');
    }

    // Resolve tipo T:
    const chaveUpper = criptografia.toUpperCase();
    const tipo = WIFI_CRIPTO[chaveUpper] || criptografia;

    // Valida que redes protegidas tenham senha
    if (tipo !== 'nopass' && !senha) {
        throw new Error(
            `WiFi: campo "senha" é obrigatório para criptografia "${criptografia}". `
            + 'Para rede aberta, use criptografia: "NOPASS"'
        );
    }

    // Monta partes na ordem da spec WPA3 §7.1:
    // T: → R: → S: → H: → I: → P: → K:
    const partes = [];

    partes.push(`T:${escaparWiFi(tipo)}`);

    // [NEW-02] Transition Disable (WPA3)
    if (transitionDisable !== null && transitionDisable !== undefined) {
        partes.push(`R:${paraString(transitionDisable)}`);
    }

    partes.push(`S:${escaparWiFi(nomeRede)}`);

    // [NEW-02] Hidden SSID
    if (oculta) {
        partes.push('H:true');
    }

    // [NEW-02] Password Identifier (WPA3 SAE)
    if (identificadorSenha) {
        partes.push(`I:${escaparWiFi(identificadorSenha)}`);
    }

    // Password (omitido para nopass)
    if (tipo !== 'nopass' && senha) {
        partes.push(`P:${escaparWiFi(senha)}`);
    }

    // [NEW-02] Public Key (WPA3 SAE-PK) — base64, sem escape
    if (chavePublica) {
        partes.push(`K:${chavePublica}`);
    }

    return `WIFI:${partes.join(';')};;`;
}

// ═══════════════════════════════════════════════════════════════
//  FORMATADORES — DEMAIS TIPOS
// ═══════════════════════════════════════════════════════════════

/**
 * Formata URL. Adiciona https:// se protocolo ausente.
 * [FIX-08] Coerção segura para valores numéricos.
 */
function formatarUrl(valor) {
    const str = paraString(valor).trim();
    if (!str) { throw new Error('URL: valor não pode ser vazio'); }
    return /^https?:\/\//i.test(str) ? str : `https://${str}`;
}

/**
 * Formata e-mail (mailto:).
 */
function formatarEmail(valor) {
    const str = sanitizar(paraString(valor)).trim();
    if (!str) { throw new Error('Email: valor não pode ser vazio'); }
    return `mailto:${str}`;
}

/**
 * Formata telefone (tel:).
 * [FIX-08] Coerção via paraString antes de .replace — sem crash em Number.
 */
function formatarTelefone(valor) {
    const str = paraString(valor).replace(/\D/g, '');
    if (!str) { throw new Error('Telefone: valor inválido — nenhum dígito encontrado'); }
    return `tel:${str}`;
}

/**
 * Formata SMS (sms:).
 * [FIX-08] Coerção via paraString antes de .replace — sem crash em Number.
 */
function formatarSms(valor) {
    const str = paraString(valor).replace(/\D/g, '');
    if (!str) { throw new Error('SMS: valor inválido — nenhum dígito encontrado'); }
    return `sms:${str}`;
}

/**
 * Formata contato como vCard 3.0 (RFC 2426).
 * [FIX-07] Valor string → erro explícito.
 * [NEW-03] Campos expandidos: ORG, TITLE, ADR, URL.
 *
 * @param {Object} dados
 * @param {string}        dados.nome         Nome completo — obrigatório
 * @param {string|number} [dados.telefone]   Telefone
 * @param {string}        [dados.email]      E-mail
 * @param {string}        [dados.organizacao] Empresa / organização
 * @param {string}        [dados.cargo]       Cargo / título
 * @param {string}        [dados.endereco]    Endereço (texto livre)
 * @param {string}        [dados.site]        URL / website
 * @returns {string} vCard 3.0 formatado
 */
function formatarContato(dados) {
    if (typeof dados !== 'object' || dados === null) {
        throw new Error(
            'Contato: valor deve ser objeto com { nome, telefone, email }. '
            + 'String direta não é suportada.'
        );
    }

    const { nome, telefone, email, organizacao, cargo, endereco, site } = dados;

    if (!nome) {
        throw new Error('Contato: campo "nome" é obrigatório');
    }

    const linhas = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${sanitizar(nome)}`,
        `N:${sanitizar(nome)};;;;`
    ];

    if (telefone != null) { linhas.push(`TEL:${sanitizar(paraString(telefone))}`); }
    if (email)            { linhas.push(`EMAIL:${sanitizar(email)}`); }
    if (organizacao)      { linhas.push(`ORG:${sanitizar(organizacao)}`); }
    if (cargo)            { linhas.push(`TITLE:${sanitizar(cargo)}`); }
    if (endereco)         { linhas.push(`ADR:;;${sanitizar(endereco)};;;;`); }
    if (site)             { linhas.push(`URL:${sanitizar(site)}`); }

    linhas.push('END:VCARD');
    return linhas.join('\n');
}

// ═══════════════════════════════════════════════════════════════
//  ROTEADOR DE TIPOS
// ═══════════════════════════════════════════════════════════════

/**
 * Roteia o valor para o formatador correto com base no tipo.
 *
 * @param {string|number|Object} valor
 * @param {string} tipo  'pix' | 'url' | 'email' | 'tel' | 'telefone' |
 *                       'sms' | 'wifi' | 'contato' | 'vcard' | 'texto'
 * @returns {string} Valor formatado pronto para o QR Code
 */
function formatarValorQR(valor, tipo) {
    switch (tipo.toLowerCase()) {
        case 'pix':
            return formatarPix(valor);

        case 'url':
            return formatarUrl(valor);

        case 'email':
            return formatarEmail(valor);

        case 'tel':
        case 'telefone':
            return formatarTelefone(valor);

        case 'sms':
            return formatarSms(valor);

        case 'wifi':
            return formatarWiFi(valor);

        case 'contato':
        case 'vcard':
            return formatarContato(valor);

        case 'texto':
        default:
            return paraString(valor);
    }
}

// ═══════════════════════════════════════════════════════════════
//  FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════

/**
 * Gera um QR Code em um elemento HTML.
 *
 * @param {Object} config
 * @param {string}              config.elementoId  ID do elemento DOM contentor
 * @param {string|number|Object} config.valor      Valor a codificar
 * @param {string}              config.tipo        Tipo do QR Code
 * @param {Object}              [config.opcoes]    Opções de renderização
 * @param {number}  [config.opcoes.width]               Largura em px (padrão 256; PIX: 350)
 * @param {number}  [config.opcoes.height]              Altura em px
 * @param {number}  [config.opcoes.margin]              Quiet zone em módulos (padrão 1; PIX: 2)
 * @param {Object}  [config.opcoes.color]               { dark: '#000', light: '#FFF' }
 * @param {string}  [config.opcoes.errorCorrectionLevel] 'L' | 'M' | 'Q' | 'H' (padrão 'H'; PIX: 'Q')
 * @returns {Promise<boolean>} true se renderizado com sucesso
 *
 * @example
 * // PIX estático com valor
 * await gerarQRCode({
 *     elementoId: 'qr-pix',
 *     tipo: 'pix',
 *     valor: {
 *         chave: '12345678900',
 *         beneficiario: 'Fulano de Tal',
 *         cidade: 'São Paulo',
 *         valor: 10.50,
 *         identificador: 'PEDIDO123'
 *     }
 * });
 *
 * @example
 * // WiFi WPA3
 * await gerarQRCode({
 *     elementoId: 'qr-wifi',
 *     tipo: 'wifi',
 *     valor: {
 *         nomeRede: 'MinhaRede5G',
 *         senha: 'S3nh@F0rt3!',
 *         criptografia: 'WPA3',
 *         transitionDisable: '1',
 *         oculta: false
 *     }
 * });
 */
const gerarQRCode = async ({
    elementoId,
    valor,
    tipo,
    opcoes = {}
}) => {
    try {
        // ── Validações ──────────────────────────────────────
        // [FIX-06] Aceita valor = 0, "", false — só rejeita null/undefined
        if (!elementoId) {
            throw new Error('Parâmetro "elementoId" é obrigatório');
        }
        if (valor === null || valor === undefined) {
            throw new Error('Parâmetro "valor" é obrigatório (aceita 0, "", false)');
        }
        if (!tipo) {
            throw new Error('Parâmetro "tipo" é obrigatório');
        }

        const elemento = document.getElementById(elementoId);
        if (!elemento) {
            throw new Error(`Elemento com ID "${elementoId}" não encontrado no DOM`);
        }

        // ── Configurações padrão ────────────────────────────
        const configPadrao = {
            width:  256,
            height: 256,
            margin: 1,
            color: {
                dark:  '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
        };

        // Ajustes específicos para PIX (conforme BCB)
        if (tipo.toLowerCase() === 'pix') {
            configPadrao.errorCorrectionLevel = 'Q';
            configPadrao.margin = 2;
            configPadrao.width  = 350;
            configPadrao.height = 350;
        }

        // [NEW-05] Deep merge preserva color parcial do usuário
        const opcoesQR = {
            ...configPadrao,
            ...opcoes,
            color: { ...configPadrao.color, ...(opcoes.color || {}) }
        };

        // ── Formatação do valor ─────────────────────────────
        const valorFormatado = formatarValorQR(valor, tipo);

        // ── Canvas ──────────────────────────────────────────
        let canvas = elemento.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            // [FIX-01] replaceChildren em vez de innerHTML = ''
            elemento.replaceChildren(canvas);
        }

        // ── Renderização ────────────────────────────────────
        await QRCode.toCanvas(canvas, valorFormatado, opcoesQR);

        // [FIX-04] Classe CSS sanitizada
        canvas.className = `qrcode-${tipoParaClasse(tipo)}`;

        // [FIX-10] Responsividade sem memory leak
        configurarResponsividade(elemento);

        return true;
    } catch (erro) {
        console.error('Erro ao gerar QR Code:', erro);
        return false;
    }
};

// ═══════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
    gerarQRCode,           // Função principal — renderiza no DOM
    formatarPix,           // Utilitário — retorna payload EMV (Pix Copia e Cola)
    formatarWiFi,          // Utilitário — retorna string WIFI:...
    formatarContato        // Utilitário — retorna vCard 3.0
};
