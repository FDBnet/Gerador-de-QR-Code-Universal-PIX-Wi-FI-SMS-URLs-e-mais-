/**
 * gerarQrCode.js — v2.1.0
 * Gerador de QR Code Universal
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
    valor?: number | string;
    identificador?: string;
    descricao?: string;
}

export interface DadosPixDinamico {
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

/** Formata dados PIX em payload EMV (Pix Copia e Cola). */
export function formatarPix(dados: DadosPix): string;

/** Formata dados WiFi em string WIFI:... */
export function formatarWiFi(dados: DadosWiFi | string): string;

/** Formata dados de contato em vCard 3.0. */
export function formatarContato(dados: DadosContato): string;

/** Valida chave PIX (CPF, CNPJ, e-mail, telefone ou EVP) com detecção automática. */
export function validarChavePix(chave: string): ResultadoValidacaoChave;

/** Detecta automaticamente o tipo de chave PIX. */
export function detectarTipoChave(chave: string): TipoChavePix | null;

/** Decodifica payload PIX EMV em objeto estruturado. */
export function decodificarPix(payload: string): ResultadoDecodificacao;

/** Valida payload EMV (estrutura TLV, campos obrigatórios, CRC16). */
export function validarPayloadPix(payload: string): ResultadoValidacaoPayload;

/** Normaliza chave PIX para o formato exigido no campo EMV 26-01. */
export function normalizarChavePix(chave: string, tipo: TipoChavePix): string;
