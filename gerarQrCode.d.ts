/**
 * gerarQrCode.js — v2.0.0
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

/**
 * Gera um QR Code em um elemento HTML.
 * @returns true se renderizado com sucesso
 */
export function gerarQRCode(config: ConfigQRCode): Promise<boolean>;

/**
 * Formata dados PIX em payload EMV (Pix Copia e Cola).
 * @returns Payload EMV completo com CRC16
 */
export function formatarPix(dados: DadosPix): string;

/**
 * Formata dados WiFi em string WIFI:...
 * @returns String WIFI: formatada
 */
export function formatarWiFi(dados: DadosWiFi | string): string;

/**
 * Formata dados de contato em vCard 3.0.
 * @returns vCard 3.0 formatado
 */
export function formatarContato(dados: DadosContato): string;
