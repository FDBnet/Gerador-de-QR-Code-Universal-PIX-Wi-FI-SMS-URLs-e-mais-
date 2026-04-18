/**
 * gerarQrCode.js — v2.2.1
 * Gerador de QR Code Universal
 *
 * Referências normativas:
 *   • Manual BR Code — BCB v2.0.1
 *   • EMV QRCPS-MPM v1.1
 *   • vCard 3.0 — RFC 2426
 *   • WPA3 Specification v3.2 — Wi-Fi Alliance §7.1
 *   • Plano de Numeração Brasileiro — ANATEL Res. 709/2020
 */

export interface OpcoesQR {
    width?: number;
    height?: number;
    margin?: number;
    color?: {
        dark?: string;
        light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    version?: number;
    maskPattern?: number;
}

export interface ConfigQRCode {
    elementoId: string;
    valor: string | number | DadosPix | DadosWiFi | DadosContato;
    tipo: 'pix' | 'url' | 'email' | 'tel' | 'telefone' | 'sms' | 'wifi' | 'contato' | 'vcard' | 'texto';
    opcoes?: OpcoesQR;
}

export interface DadosPixEstatico {
    chave: string;
    beneficiario?: string;
    cidade?: string;
    /**
     * Valor da transação. Aceita number positivo, 0 (pagador informa),
     * string vazia ou omitido. NaN ou negativo lançam Error.
     */
    valor?: number | string;
    identificador?: string;
    descricao?: string;
}

export interface DadosPixDinamico {
    /**
     * URL do location. Máximo 77 caracteres — imposto pelo campo 26 EMV
     * (99 chars total menos overhead TLV). URL maior lança Error.
     */
    url: string;
    beneficiario?: string;
    cidade?: string;
}

export interface DadosPixBruto {
    dadosEmv?: string;
    payload?: string;
}

export type DadosPix = string | DadosPixEstatico | DadosPixDinamico | DadosPixBruto;

export interface DadosWiFi {
    nomeRede: string;
    senha?: string;
    criptografia?: 'WPA' | 'WPA2' | 'WPA3' | 'SAE' | 'WEP' | 'NOPASS';
    oculta?: boolean;
    transitionDisable?: string;
    chavePublica?: string;
    identificadorSenha?: string;
}

export interface DadosContato {
    nome: string;
    telefone?: string | number;
    email?: string;
    organizacao?: string;
    cargo?: string;
    endereco?: string;
    site?: string;
}

export type TipoChavePix = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'evp';

export interface ResultadoValidacaoChave {
    valida: boolean;
    tipo: TipoChavePix | null;
    erro: string | null;
    chaveNormalizada: string;
}

export interface ResultadoDecodificacao {
    valido: boolean;
    erro: string | null;
    formatIndicator: string | null;
    pontoIniciacao: string | null;
    chave: string | null;
    tipoChave: TipoChavePix | null;
    descricao: string | null;
    urlDinamica: string | null;
    mcc: string | null;
    moeda: string | null;
    valor: number | null;
    pais: string | null;
    beneficiario: string | null;
    cidade: string | null;
    identificador: string | null;
    crcInformado: string | null;
    crcCalculado: string | null;
    crcValido: boolean;
}

export interface ResultadoValidacaoPayload {
    valido: boolean;
    erros: string[];
}

/** Gera um QR Code em um elemento HTML. */
export function gerarQRCode(config: ConfigQRCode): Promise<boolean>;

/**
 * Formata dados PIX em payload EMV (Pix Copia e Cola).
 * @throws Error se chave inválida, URL > 77 chars (dinâmico),
 *         valor NaN ou negativo, ou qualquer campo TLV > 99 chars.
 */
export function formatarPix(dados: DadosPix): string;

/**
 * Formata dados WiFi em string WIFI:...
 * Escape conforme WPA3 §7.1 / ZXing: \ ; , : "
 * @throws Error se nomeRede ausente ou senha ausente em rede protegida.
 */
export function formatarWiFi(dados: DadosWiFi | string): string;

/**
 * Formata dados de contato em vCard 3.0.
 * Caracteres especiais (; , \ newline) escapados conforme RFC 2426 §4.
 * @throws Error se nome ausente ou dados não-objeto.
 */
export function formatarContato(dados: DadosContato): string;

/** Valida chave PIX (CPF, CNPJ, e-mail, telefone ou EVP) com detecção automática. */
export function validarChavePix(chave: string): ResultadoValidacaoChave;

/**
 * Detecta automaticamente o tipo de chave PIX.
 * Telefone segue Plano de Numeração Brasileiro (ANATEL Res. 709/2020):
 * DDD ∈ [11-99]; celular de 11 dígitos com 9 obrigatório na posição 3;
 * fixo de 10 dígitos com primeiro dígito ∈ [2-9].
 */
export function detectarTipoChave(chave: string): TipoChavePix | null;

/** Decodifica payload PIX EMV em objeto estruturado. */
export function decodificarPix(payload: string): ResultadoDecodificacao;

/** Valida payload EMV (estrutura TLV, campos obrigatórios, CRC16). */
export function validarPayloadPix(payload: string): ResultadoValidacaoPayload;

/** Normaliza chave PIX para o formato exigido no campo EMV 26-01. */
export function normalizarChavePix(chave: string, tipo: TipoChavePix): string;
