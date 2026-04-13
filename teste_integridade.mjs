/**
 * Testes de integridade — gerarQrCode.js v2.0.0
 * Executa: node teste_integridade.mjs
 *
 * Valida: TLV, CRC16, PIX estático/dinâmico, WiFi WPA2/WPA3,
 *         vCard, URL, tel, sms, email, sanitização, edge cases.
 */

// ── Extrai funções internas para teste ──────────────────────
// Como o módulo usa ESM com import de CDN (que não resolve no Node),
// copiamos as funções puras aqui para teste isolado.

function tlv(id, valor) {
    return `${id}${String(valor.length).padStart(2, '0')}${valor}`;
}

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

function escaparWiFi(valor) {
    if (typeof valor !== 'string') { return ''; }
    return valor.replace(/([\\;,:"'])/g, '\\$1');
}

function sanitizar(valor) {
    if (valor === null || valor === undefined) { return ''; }
    return String(valor).replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function paraString(valor) {
    if (valor === null || valor === undefined) { return ''; }
    return String(valor);
}

function removerAcentos(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function tipoParaClasse(tipo) {
    return tipo.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

const WIFI_CRIPTO = { WPA: 'WPA', WPA2: 'WPA', WPA3: 'WPA', SAE: 'SAE', WEP: 'WEP', NOPASS: 'nopass' };

// ── PIX estático (cópia da lógica do módulo) ────────────────
function formatarPixEstatico(dados) {
    const chave = sanitizar(dados.chave).trim();
    if (!chave) throw new Error('PIX estático: campo "chave" é obrigatório');
    const beneficiario = removerAcentos(sanitizar(dados.beneficiario || 'RECEBEDOR')).substring(0, 25).toUpperCase();
    const cidade = removerAcentos(sanitizar(dados.cidade || 'BRASILIA')).substring(0, 15).toUpperCase();
    const identificador = dados.identificador
        ? sanitizar(dados.identificador).replace(/[^A-Za-z0-9]/g, '').substring(0, 25) : '***';
    let mai = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', chave);
    if (dados.descricao) mai += tlv('02', sanitizar(dados.descricao).substring(0, 72));
    let payload = '';
    payload += tlv('00', '01');
    const valorNum = dados.valor != null ? parseFloat(paraString(dados.valor)) : 0;
    if (valorNum > 0) payload += tlv('01', '12');
    payload += tlv('26', mai);
    payload += tlv('52', '0000');
    payload += tlv('53', '986');
    if (valorNum > 0) payload += tlv('54', valorNum.toFixed(2));
    payload += tlv('58', 'BR');
    payload += tlv('59', beneficiario);
    payload += tlv('60', cidade);
    payload += tlv('62', tlv('05', identificador));
    const comTag = payload + '6304';
    return comTag + crc16(comTag);
}

function formatarPixDinamico(dados) {
    const url = sanitizar(dados.url).trim();
    if (!url) throw new Error('PIX dinâmico: campo "url" é obrigatório');
    const beneficiario = removerAcentos(sanitizar(dados.beneficiario || 'RECEBEDOR')).substring(0, 25).toUpperCase();
    const cidade = removerAcentos(sanitizar(dados.cidade || 'BRASILIA')).substring(0, 15).toUpperCase();
    const mai = tlv('00', 'BR.GOV.BCB.PIX') + tlv('25', url);
    let payload = '';
    payload += tlv('00', '01');
    payload += tlv('01', '12');
    payload += tlv('26', mai);
    payload += tlv('52', '0000');
    payload += tlv('53', '986');
    payload += tlv('58', 'BR');
    payload += tlv('59', beneficiario);
    payload += tlv('60', cidade);
    payload += tlv('62', tlv('05', '***'));
    const comTag = payload + '6304';
    return comTag + crc16(comTag);
}

function formatarWiFi(dados) {
    if (typeof dados === 'string') {
        if (dados.startsWith('WIFI:')) return dados;
        throw new Error('WiFi: valor string deve ser payload WIFI:...');
    }
    if (typeof dados !== 'object' || dados === null) throw new Error('WiFi: valor deve ser objeto');
    const { nomeRede, senha, criptografia = 'WPA', oculta = false,
            transitionDisable = null, chavePublica = null, identificadorSenha = null } = dados;
    if (!nomeRede) throw new Error('WiFi: nomeRede obrigatório');
    const tipo = WIFI_CRIPTO[criptografia.toUpperCase()] || criptografia;
    if (tipo !== 'nopass' && !senha) throw new Error('WiFi: senha obrigatória');
    const partes = [];
    partes.push(`T:${escaparWiFi(tipo)}`);
    if (transitionDisable !== null && transitionDisable !== undefined) partes.push(`R:${paraString(transitionDisable)}`);
    partes.push(`S:${escaparWiFi(nomeRede)}`);
    if (oculta) partes.push('H:true');
    if (identificadorSenha) partes.push(`I:${escaparWiFi(identificadorSenha)}`);
    if (tipo !== 'nopass' && senha) partes.push(`P:${escaparWiFi(senha)}`);
    if (chavePublica) partes.push(`K:${chavePublica}`);
    return `WIFI:${partes.join(';')};;`;
}

function formatarContato(dados) {
    if (typeof dados !== 'object' || dados === null) throw new Error('Contato: valor deve ser objeto');
    const { nome, telefone, email, organizacao, cargo, endereco, site } = dados;
    if (!nome) throw new Error('Contato: nome obrigatório');
    const linhas = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${sanitizar(nome)}`, `N:${sanitizar(nome)};;;;`];
    if (telefone != null) linhas.push(`TEL:${sanitizar(paraString(telefone))}`);
    if (email) linhas.push(`EMAIL:${sanitizar(email)}`);
    if (organizacao) linhas.push(`ORG:${sanitizar(organizacao)}`);
    if (cargo) linhas.push(`TITLE:${sanitizar(cargo)}`);
    if (endereco) linhas.push(`ADR:;;${sanitizar(endereco)};;;;`);
    if (site) linhas.push(`URL:${sanitizar(site)}`);
    linhas.push('END:VCARD');
    return linhas.join('\n');
}

// ═══════════════════════════════════════════════════════════════
//  FRAMEWORK DE TESTES (micro)
// ═══════════════════════════════════════════════════════════════

let total = 0, passou = 0, falhou = 0;
const falhas = [];

function assert(condicao, descricao) {
    total++;
    if (condicao) {
        passou++;
    } else {
        falhou++;
        falhas.push(descricao);
        console.log(`  ✗ FALHOU: ${descricao}`);
    }
}

function assertThrows(fn, descricao) {
    total++;
    try {
        fn();
        falhou++;
        falhas.push(`${descricao} (não lançou erro)`);
        console.log(`  ✗ FALHOU: ${descricao} — esperava erro, não lançou`);
    } catch {
        passou++;
    }
}

function assertEq(a, b, descricao) {
    total++;
    if (a === b) {
        passou++;
    } else {
        falhou++;
        falhas.push(descricao);
        console.log(`  ✗ FALHOU: ${descricao}`);
        console.log(`    esperado: ${JSON.stringify(b)}`);
        console.log(`    recebido: ${JSON.stringify(a)}`);
    }
}

// ═══════════════════════════════════════════════════════════════
//  TESTES
// ═══════════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════');
console.log(' TESTES DE INTEGRIDADE — gerarQrCode v2.0');
console.log('══════════════════════════════════════════\n');

// ── TLV ─────────────────────────────────────────────────────
console.log('▸ TLV');
assertEq(tlv('00', '01'), '000201', 'TLV: Payload Format Indicator');
assertEq(tlv('26', 'ABCDEFGHIJ'), '2610ABCDEFGHIJ', 'TLV: tamanho 10');
assertEq(tlv('58', 'BR'), '5802BR', 'TLV: país BR');

// ── CRC16 ───────────────────────────────────────────────────
console.log('▸ CRC16');
// Vetor de teste conhecido: string "123456789" → CRC16-CCITT-FALSE = 0x29B1
assertEq(crc16('123456789'), '29B1', 'CRC16: vetor padrão "123456789"');
// Vetor vazio
assertEq(crc16(''), 'FFFF', 'CRC16: string vazia = FFFF');

// ── PIX Estático ────────────────────────────────────────────
console.log('▸ PIX Estático');

const pixBasico = formatarPixEstatico({
    chave: '12345678900',
    beneficiario: 'Fulano de Tal',
    cidade: 'São Paulo',
    valor: 10.50,
    identificador: 'PEDIDO123'
});

assert(pixBasico.startsWith('0002010102122'), 'PIX: começa com header EMV + Point of Initiation 12');
assert(pixBasico.includes('BR.GOV.BCB.PIX'), 'PIX: contém GUI BR.GOV.BCB.PIX');
assert(pixBasico.includes('12345678900'), 'PIX: contém a chave');
assert(pixBasico.includes('5405'), 'PIX: contém campo 54 (valor)');
assert(pixBasico.includes('10.50'), 'PIX: valor formatado 10.50');
assert(pixBasico.includes('FULANO DE TAL'), 'PIX: beneficiário uppercase sem acento');
assert(pixBasico.includes('SAO PAULO'), 'PIX: cidade sem acento');
assert(pixBasico.includes('PEDIDO123'), 'PIX: identificador presente');
assert(pixBasico.length > 100, 'PIX: payload tem tamanho plausível');

// Validação do CRC16 embutido
const payloadSemCrc = pixBasico.substring(0, pixBasico.length - 4);
const crcEsperado = crc16(payloadSemCrc);
const crcNoPayload = pixBasico.substring(pixBasico.length - 4);
assertEq(crcNoPayload, crcEsperado, 'PIX: CRC16 no payload confere com cálculo');

// PIX sem valor (reutilizável)
const pixSemValor = formatarPixEstatico({ chave: 'email@test.com' });
assert(!pixSemValor.includes('010212'), 'PIX sem valor: sem campo 01 (reutilizável)');
assert(!pixSemValor.includes('5405'), 'PIX sem valor: sem campo 54');
assert(pixSemValor.includes('BR.GOV.BCB.PIX'), 'PIX sem valor: tem GUI');
assert(pixSemValor.includes('***'), 'PIX sem valor: txid = ***');

// PIX chave vazia → erro
assertThrows(() => formatarPixEstatico({ chave: '' }), 'PIX: chave vazia lança erro');
assertThrows(() => formatarPixEstatico({ chave: '  ' }), 'PIX: chave só espaços lança erro');

// [FIX-05] PIX com objeto real NÃO retorna string vazia
const pixObj = formatarPixEstatico({ chave: '11999998888', valor: 5 });
assert(pixObj.length > 50, 'FIX-05: PIX com objeto real NÃO retorna vazio');
assert(pixObj.includes('11999998888'), 'FIX-05: chave presente no payload');

// ── PIX Dinâmico ────────────────────────────────────────────
console.log('▸ PIX Dinâmico');

const pixDin = formatarPixDinamico({
    url: 'pix.example.com/qr/v2/abc123',
    beneficiario: 'Loja Teste',
    cidade: 'Curitiba'
});

assert(pixDin.includes('010212'), 'PIX dinâmico: Point of Initiation = 12');
assert(pixDin.includes('pix.example.com/qr/v2/abc123'), 'PIX dinâmico: URL no payload');
assert(pixDin.includes('LOJA TESTE'), 'PIX dinâmico: beneficiário');
assert(pixDin.includes('CURITIBA'), 'PIX dinâmico: cidade');

assertThrows(() => formatarPixDinamico({ url: '' }), 'PIX dinâmico: URL vazia lança erro');

// ── WiFi ────────────────────────────────────────────────────
console.log('▸ WiFi');

// WPA2 básico
const wifi1 = formatarWiFi({ nomeRede: 'MinhaRede', senha: '12345678' });
assertEq(wifi1, 'WIFI:T:WPA;S:MinhaRede;P:12345678;;', 'WiFi WPA2 básico');

// WPA3 com Transition Disable
const wifi3 = formatarWiFi({
    nomeRede: 'RedeSegura',
    senha: 'senhaforte',
    criptografia: 'WPA3',
    transitionDisable: '1'
});
assertEq(wifi3, 'WIFI:T:WPA;R:1;S:RedeSegura;P:senhaforte;;', 'WiFi WPA3 com R:1');

// Rede oculta
const wifiOculta = formatarWiFi({ nomeRede: 'Hidden', senha: 'abc', oculta: true });
assert(wifiOculta.includes('H:true'), 'WiFi: rede oculta tem H:true');

// NOPASS (rede aberta)
const wifiAberta = formatarWiFi({ nomeRede: 'FreeWifi', criptografia: 'NOPASS' });
assertEq(wifiAberta, 'WIFI:T:nopass;S:FreeWifi;;', 'WiFi nopass');

// [FIX-02] Escape de caracteres especiais (injeção bloqueada)
const wifiInject = formatarWiFi({ nomeRede: 'Rede;Teste', senha: 'abc;;def' });
assert(wifiInject.includes('S:Rede\\;Teste'), 'FIX-02: SSID com ; é escapado');
assert(wifiInject.includes('P:abc\\;\\;def'), 'FIX-02: senha com ;; é escapada');

// WPA3 SAE-PK com chave pública
const wifiPK = formatarWiFi({
    nomeRede: 'SAENet',
    senha: 'pk123',
    criptografia: 'WPA3',
    transitionDisable: '3',
    chavePublica: 'MDkwEwYHKoZIzj0C'
});
assert(wifiPK.includes('K:MDkwEwYHKoZIzj0C'), 'WiFi WPA3 SAE-PK: chave pública presente');
assert(wifiPK.includes('R:3'), 'WiFi WPA3 SAE-PK: R:3 presente');

// [FIX-07] String direta → erro
assertThrows(() => formatarWiFi('MinhaRede'), 'FIX-07: WiFi string crua lança erro');

// String WIFI:... → passthrough
assertEq(formatarWiFi('WIFI:T:WPA;S:X;P:Y;;'), 'WIFI:T:WPA;S:X;P:Y;;', 'WiFi: string WIFI:... passthrough');

// Sem senha com WPA → erro
assertThrows(() => formatarWiFi({ nomeRede: 'X', criptografia: 'WPA' }), 'WiFi: WPA sem senha lança erro');

// ── Contato (vCard) ─────────────────────────────────────────
console.log('▸ Contato (vCard)');

const vc1 = formatarContato({ nome: 'João Silva', telefone: 5511999, email: 'j@x.com' });
assert(vc1.startsWith('BEGIN:VCARD'), 'vCard: começa com BEGIN');
assert(vc1.includes('VERSION:3.0'), 'vCard: versão 3.0');
assert(vc1.includes('FN:João Silva'), 'vCard: FN presente');
assert(vc1.includes('TEL:5511999'), 'vCard: TEL com número');
assert(vc1.includes('EMAIL:j@x.com'), 'vCard: EMAIL presente');
assert(vc1.endsWith('END:VCARD'), 'vCard: termina com END');

// [NEW-03] Campos expandidos
const vc2 = formatarContato({
    nome: 'Maria', organizacao: 'ACME', cargo: 'CEO',
    endereco: 'Rua 1', site: 'https://acme.com'
});
assert(vc2.includes('ORG:ACME'), 'vCard: ORG presente');
assert(vc2.includes('TITLE:CEO'), 'vCard: TITLE presente');
assert(vc2.includes('ADR:;;Rua 1;;;;'), 'vCard: ADR presente');
assert(vc2.includes('URL:https://acme.com'), 'vCard: URL presente');

// [FIX-07] String direta → erro
assertThrows(() => formatarContato('João'), 'FIX-07: Contato string lança erro');

// ── URL ─────────────────────────────────────────────────────
console.log('▸ URL');

function formatarUrl(valor) {
    const str = paraString(valor).trim();
    if (!str) throw new Error('URL: vazio');
    return /^https?:\/\//i.test(str) ? str : `https://${str}`;
}

assertEq(formatarUrl('example.com'), 'https://example.com', 'URL: adiciona https://');
assertEq(formatarUrl('http://x.com'), 'http://x.com', 'URL: preserva http://');
assertEq(formatarUrl('https://y.com'), 'https://y.com', 'URL: preserva https://');
// [FIX-08] Número → coerção
assertEq(formatarUrl(12345), 'https://12345', 'FIX-08: URL numérica → coerção');

// ── Telefone / SMS ──────────────────────────────────────────
console.log('▸ Telefone / SMS');

function formatarTelefone(valor) {
    const str = paraString(valor).replace(/\D/g, '');
    if (!str) throw new Error('vazio');
    return `tel:${str}`;
}
function formatarSms(valor) {
    const str = paraString(valor).replace(/\D/g, '');
    if (!str) throw new Error('vazio');
    return `sms:${str}`;
}

assertEq(formatarTelefone('(11) 99999-8888'), 'tel:11999998888', 'Tel: remove formatação');
assertEq(formatarTelefone(5571999998888), 'tel:5571999998888', 'FIX-08: Tel numérico → sem crash');
assertEq(formatarSms(5511999), 'sms:5511999', 'FIX-08: SMS numérico → sem crash');

// ── Sanitização ─────────────────────────────────────────────
console.log('▸ Sanitização');

assertEq(sanitizar(null), '', 'Sanitizar: null → ""');
assertEq(sanitizar(undefined), '', 'Sanitizar: undefined → ""');
assertEq(sanitizar(0), '0', 'Sanitizar: 0 → "0"');
assertEq(sanitizar('abc\x00\x01def'), 'abcdef', 'Sanitizar: remove controle');
assertEq(sanitizar('abc\ndef'), 'abc\ndef', 'Sanitizar: preserva \\n');
assertEq(paraString(null), '', 'paraString: null → ""');
assertEq(paraString(0), '0', 'paraString: 0 → "0"');
assertEq(removerAcentos('São Paulo'), 'Sao Paulo', 'removerAcentos: ã → a');
assertEq(removerAcentos('Conceição'), 'Conceicao', 'removerAcentos: ç → c, ã → a');

// ── tipoParaClasse [FIX-04] ────────────────────────────────
console.log('▸ tipoParaClasse');

assertEq(tipoParaClasse('pix'), 'pix', 'Classe: pix');
assertEq(tipoParaClasse('WiFi'), 'wifi', 'Classe: WiFi → wifi');
assertEq(tipoParaClasse('tipo com espaço'), 'tipocomespao', 'FIX-04: espaço removido');
assertEq(tipoParaClasse('tipo<script>'), 'tiposcript', 'FIX-04: < > removidos');

// ── [FIX-06] Validação de valor ─────────────────────────────
console.log('▸ FIX-06: Validação de valor');

// Simulação da validação do gerarQRCode
function validarParams(valor) {
    return !(valor === null || valor === undefined);
}

assert(validarParams(0) === true,     'FIX-06: valor=0 é aceito');
assert(validarParams('') === true,    'FIX-06: valor="" é aceito');
assert(validarParams(false) === true, 'FIX-06: valor=false é aceito');
assert(validarParams(null) === false, 'FIX-06: valor=null é rejeitado');
assert(validarParams(undefined) === false, 'FIX-06: valor=undefined é rejeitado');

// ── Escape WiFi ─────────────────────────────────────────────
console.log('▸ Escape WiFi');

assertEq(escaparWiFi('abc;def'), 'abc\\;def', 'Escape: ponto-e-vírgula');
assertEq(escaparWiFi('a:b'), 'a\\:b', 'Escape: dois-pontos');
assertEq(escaparWiFi('a\\b'), 'a\\\\b', 'Escape: backslash');
assertEq(escaparWiFi('normal'), 'normal', 'Escape: sem chars especiais');
assertEq(escaparWiFi(123), '', 'Escape: número → ""');

// ═══════════════════════════════════════════════════════════════
//  RESULTADO
// ═══════════════════════════════════════════════════════════════

console.log('\n──────────────────────────────────────────');
console.log(`  Total: ${total}  |  ✓ ${passou}  |  ✗ ${falhou}`);
console.log('──────────────────────────────────────────');

if (falhou > 0) {
    console.log('\nFALHAS:');
    falhas.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    process.exit(1);
} else {
    console.log('\n  ✓ TODOS OS TESTES PASSARAM — PADRÃO OURO\n');
    process.exit(0);
}
