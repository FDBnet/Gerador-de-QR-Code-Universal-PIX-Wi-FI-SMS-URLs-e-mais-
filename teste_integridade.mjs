/**
 * Testes de integridade — gerarQrCode.js v2.2.0
 *
 * [REFATORADO v2.2.0] Importa o MÓDULO REAL em vez de reimplementar
 * a lógica inline. Antes, o teste validava uma cópia duplicada
 * do código — bugs no arquivo principal passavam despercebidos.
 *
 * Executa: node teste_integridade.mjs
 */

import {
    formatarPix,
    formatarWiFi,
    formatarContato,
    detectarTipoChave,
    decodificarPix,
    validarPayloadPix,
    normalizarChavePix
} from './gerarQrCode.js';

// ═══════════════════════════════════════════════════════════════
// Framework de asserção mínimo
// ═══════════════════════════════════════════════════════════════
let total = 0, passou = 0, falhou = 0;
const falhas = [];

function assert(cond, descr) {
    total++;
    if (cond) { passou++; }
    else { falhou++; falhas.push(descr); console.log(`  ✗ ${descr}`); }
}
function assertEq(atual, esperado, descr) {
    total++;
    if (atual === esperado) { passou++; }
    else {
        falhou++; falhas.push(descr);
        console.log(`  ✗ ${descr}\n    esperado: ${JSON.stringify(esperado)}\n    obtido:   ${JSON.stringify(atual)}`);
    }
}
function assertThrows(fn, descr) {
    total++;
    try { fn(); falhou++; falhas.push(descr); console.log(`  ✗ ${descr} (não lançou)`); }
    catch { passou++; }
}
function assertNotThrows(fn, descr) {
    total++;
    try { fn(); passou++; }
    catch (e) { falhou++; falhas.push(descr); console.log(`  ✗ ${descr}: ${e.message}`); }
}

console.log('\n══════════════════════════════════════════');
console.log(' TESTES DE INTEGRIDADE — gerarQrCode v2.2.0');
console.log(' (importa o módulo real)');
console.log('══════════════════════════════════════════\n');

// ═══════════════════════════════════════════════════════════════
// 1. Detecção e validação de chaves PIX
// ═══════════════════════════════════════════════════════════════
console.log('▸ Detecção / validação de chaves PIX');

assertEq(detectarTipoChave('52998224725'), 'cpf', 'Det CPF 529');
assertEq(detectarTipoChave('11144477735'), 'cpf', 'Det CPF 111');
assertEq(detectarTipoChave('123.456.789-09'), 'cpf', 'Det CPF formatado');

assertEq(detectarTipoChave('11222333000181'), 'cnpj', 'Det CNPJ');
assertEq(detectarTipoChave('11.222.333/0001-81'), 'cnpj', 'Det CNPJ formatado');

assertEq(detectarTipoChave('fulano@banco.com'), 'email', 'Det email');
assertEq(detectarTipoChave('FULANO@BANCO.COM'), 'email', 'Det email upper');

assertEq(detectarTipoChave('+5511999998888'), 'telefone', 'Det tel +55 13d');
assertEq(detectarTipoChave('11999998888'), 'telefone', 'Det tel 11d celular');
assertEq(detectarTipoChave('+55 (11) 99999-8888'), 'telefone', 'Det tel formatado');
assertEq(detectarTipoChave('55999887766'), 'telefone', 'Det tel DDD 55 celular');

assertEq(detectarTipoChave('123e4567-e89b-42d3-a456-556642440000'), 'evp', 'Det EVP');
assertEq(detectarTipoChave('123E4567-E89B-42D3-A456-556642440000'), 'evp', 'Det EVP upper');

assertEq(detectarTipoChave(''), null, 'Det vazio');
assertEq(detectarTipoChave('abc'), null, 'Det lixo');
assertEq(detectarTipoChave(null), null, 'Det null');

// ═══════════════════════════════════════════════════════════════
// 2. Normalização
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ Normalização de chaves');

assertEq(normalizarChavePix('529.982.247-25', 'cpf'), '52998224725', 'Norm CPF');
assertEq(normalizarChavePix('11.222.333/0001-81', 'cnpj'), '11222333000181', 'Norm CNPJ');
assertEq(normalizarChavePix('11999998888', 'telefone'), '+5511999998888', 'Norm tel +55');
assertEq(normalizarChavePix('5511999998888', 'telefone'), '+5511999998888', 'Norm tel 55→+55');
assertEq(normalizarChavePix('+55 (11) 99999-8888', 'telefone'), '+5511999998888', 'Norm tel formatado');
assertEq(normalizarChavePix('ABC@X.COM', 'email'), 'abc@x.com', 'Norm email lower');
assertEq(normalizarChavePix('123E4567-E89B-42D3-A456-556642440000', 'evp'),
         '123e4567-e89b-42d3-a456-556642440000', 'Norm EVP lower');
assertEq(normalizarChavePix('55999887766', 'telefone'), '+5555999887766', 'Norm DDD 55 celular');

// ═══════════════════════════════════════════════════════════════
// 3. PIX Estático — roundtrip
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ PIX Estático — roundtrip completo');

function roundtripPix(dados, nome) {
    const payload = formatarPix(dados);
    const dec = decodificarPix(payload);
    const val = validarPayloadPix(payload);
    assert(dec.valido && val.valido && dec.crcValido, `RT ${nome}`);
}

roundtripPix({ chave: '52998224725', valor: 1, cidade: 'SP' }, 'CPF+valor');
roundtripPix({ chave: '11222333000181', cidade: 'RJ' }, 'CNPJ');
roundtripPix({ chave: 'teste@email.com', valor: 500 }, 'Email');
roundtripPix({ chave: '+5511999998888' }, 'Telefone');
roundtripPix({ chave: '123e4567-e89b-42d3-a456-556642440000' }, 'EVP');
roundtripPix({ chave: '52998224725', beneficiario: 'Joao', cidade: 'Brasilia',
               valor: 99.9, identificador: 'ABC', descricao: 'Teste' }, 'Completo');

const pxSimples = formatarPix({ chave: '52998224725', beneficiario: 'Fulano',
                                cidade: 'São Paulo', valor: 10.50, identificador: 'PED1' });
assert(pxSimples.includes('52998224725'), 'PIX inclui CPF');
assert(pxSimples.includes('BR.GOV.BCB.PIX'), 'PIX inclui GUI');
assert(pxSimples.includes('10.50'), 'PIX inclui valor');
assert(pxSimples.includes('SAO PAULO'), 'PIX cidade sem acento + upper');

// ═══════════════════════════════════════════════════════════════
// 4. Decodificador PIX
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ Decodificador PIX');

const dec1 = decodificarPix(formatarPix({
    chave: '52998224725', beneficiario: 'Joao', cidade: 'Brasilia',
    valor: 99.90, identificador: 'ABC', descricao: 'Teste'
}));
assert(dec1.valido, 'Dec válido');
assert(dec1.crcValido, 'Dec CRC ok');
assertEq(dec1.formatIndicator, '01', 'Dec FI');
assertEq(dec1.chave, '52998224725', 'Dec chave');
assertEq(dec1.tipoChave, 'cpf', 'Dec tipo');
assertEq(dec1.valor, 99.90, 'Dec valor');
assertEq(dec1.beneficiario, 'JOAO', 'Dec ben');
assertEq(dec1.identificador, 'ABC', 'Dec txid');
assertEq(dec1.descricao, 'Teste', 'Dec desc');

const pxBom = formatarPix({ chave: '52998224725', cidade: 'SP' });
const pxAdult = pxBom.substring(0, pxBom.length - 4) + '0000';
assert(!decodificarPix(pxAdult).crcValido, 'Dec CRC adulterado');
assert(!decodificarPix('lixo').valido, 'Dec lixo');

// ═══════════════════════════════════════════════════════════════
// 5. WiFi
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ WiFi');

assertEq(formatarWiFi({ nomeRede: 'X', senha: 'Y' }),
         'WIFI:T:WPA;S:X;P:Y;;', 'WiFi básico');
assertEq(formatarWiFi({ nomeRede: 'F', criptografia: 'NOPASS' }),
         'WIFI:T:nopass;S:F;;', 'WiFi nopass');
assertEq(formatarWiFi({ nomeRede: 'Rede;Teste', senha: 'sen,ha' }),
         'WIFI:T:WPA;S:Rede\\;Teste;P:sen\\,ha;;', 'WiFi escape ; e ,');
assertEq(formatarWiFi({ nomeRede: 'NET', senha: 'pwd',
                        criptografia: 'WPA3', transitionDisable: '1' }),
         'WIFI:T:WPA;R:1;S:NET;P:pwd;;', 'WiFi WPA3 com R:');

assertThrows(() => formatarWiFi({ nomeRede: 'X' }), 'WiFi sem senha em WPA');
assertThrows(() => formatarWiFi({ senha: 'abc' }),  'WiFi sem nomeRede');

// ═══════════════════════════════════════════════════════════════
// 6. Contato / vCard
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ Contato / vCard');

const vcBasico = formatarContato({ nome: 'Rodrigo Silva', telefone: '11999998888' });
assert(vcBasico.includes('BEGIN:VCARD'),      'vCard begin');
assert(vcBasico.includes('VERSION:3.0'),      'vCard version');
assert(vcBasico.includes('FN:Rodrigo Silva'), 'vCard FN');
assert(vcBasico.includes('TEL:11999998888'),  'vCard TEL');
assert(vcBasico.includes('END:VCARD'),        'vCard end');

const vcCompleto = formatarContato({
    nome: 'Ana', telefone: '11999', email: 'a@b.c',
    organizacao: 'ACME', cargo: 'CEO', endereco: 'Rua X', site: 'https://x.com'
});
assert(vcCompleto.includes('ORG:ACME'),          'vCard ORG');
assert(vcCompleto.includes('TITLE:CEO'),         'vCard TITLE');
assert(vcCompleto.includes('ADR:;;Rua X;;;;'),   'vCard ADR');
assert(vcCompleto.includes('URL:https://x.com'), 'vCard URL');

assertThrows(() => formatarContato('Rodrigo'),    'Contato string crua');
assertThrows(() => formatarContato({ telefone: '11' }), 'Contato sem nome');

// ═══════════════════════════════════════════════════════════════
// 7. REGRESSÃO v2.2.0 — os 6 bugs corrigidos
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ [REGRESSÃO v2.2.0] Bugs corrigidos');

// ── [FIX-13] escaparWiFi não escapa aspa simples ──
const wfAspas = formatarWiFi({ nomeRede: "Rede'do'Joao", senha: 'abc' });
assert(!wfAspas.includes("\\'"),
       '[FIX-13] escaparWiFi não escapa aspa simples (fora WPA3 §7.1)');
assert(wfAspas.includes("Rede'do'Joao"),
       '[FIX-13] SSID com aspas simples preservado literal');

// ── [FIX-14] tlv rejeita length > 99 ──
assertThrows(
    () => formatarPix({
        url: 'https://psp.banco.com.br/v2/cob/' + 'a'.repeat(100),
        beneficiario: 'X', cidade: 'Y'
    }),
    '[FIX-14] tlv rejeita campo > 99 chars (URL longa)'
);
assertNotThrows(
    () => formatarPix({
        url: 'https://' + 'a'.repeat(69),  // 8 + 69 = 77 chars
        beneficiario: 'X', cidade: 'Y'
    }),
    '[FIX-14] URL com 77 chars (limite) aceita'
);
assertThrows(
    () => formatarPix({
        url: 'https://' + 'a'.repeat(70),  // 78 chars
        beneficiario: 'X', cidade: 'Y'
    }),
    '[FIX-14] URL com 78 chars rejeitada'
);

// ── [FIX-15] vCard escapa conforme RFC 2426 §4 ──
const vcEsc = formatarContato({ nome: 'Silva; Rodrigo', organizacao: 'ACME, Inc.' });
assert(vcEsc.includes('FN:Silva\\; Rodrigo'),
       '[FIX-15] vCard FN escapa ;');
assert(vcEsc.includes('N:Silva\\; Rodrigo;;;;'),
       '[FIX-15] vCard N preserva ; separador e escapa ; de valor');
assert(vcEsc.includes('ORG:ACME\\, Inc.'),
       '[FIX-15] vCard ORG escapa ,');

const vcADR = formatarContato({ nome: 'Ana', endereco: 'Rua A, 123; Centro' });
assert(vcADR.includes('ADR:;;Rua A\\, 123\\; Centro;;;;'),
       '[FIX-15] vCard ADR escapa , e ; em componente');

const vcBS = formatarContato({ nome: 'Path\\to\\file' });
assert(vcBS.includes('FN:Path\\\\to\\\\file'),
       '[FIX-15] vCard escapa backslash (\\ → \\\\)');

const vcNL = formatarContato({ nome: 'Ana', endereco: 'Rua A\nApto 2' });
assert(vcNL.includes('ADR:;;Rua A\\nApto 2;;;;'),
       '[FIX-15] vCard escapa newline → \\n literal');

// ── [FIX-17] validarTelefonePix rejeita estruturas inválidas ──
assertEq(detectarTipoChave('12345678900'), null,
         '[FIX-17] CPF inválido com 3º dígito ≠ 9 → null, não telefone');
assertEq(detectarTipoChave('11987654321'), 'telefone',
         '[FIX-17] Celular 11d com 9 na posição 3 → telefone');
assertEq(detectarTipoChave('01987654321'), null,
         '[FIX-17] DDD 01 (inválido) → null');
assertEq(detectarTipoChave('10987654321'), null,
         '[FIX-17] DDD 10 (inválido) → null');
assertEq(detectarTipoChave('1134567890'), 'telefone',
         '[FIX-17] Fixo DDD 11 válido → telefone');
assertEq(detectarTipoChave('1114567890'), null,
         '[FIX-17] Fixo começando com 1 (reservado) → null');

// ── [FIX-18] valor negativo / NaN ──
assertThrows(
    () => formatarPix({ chave: '52998224725', valor: -10 }),
    '[FIX-18] PIX com valor negativo lança erro'
);
assertThrows(
    () => formatarPix({ chave: '52998224725', valor: 'abc' }),
    '[FIX-18] PIX com valor NaN lança erro'
);
assertNotThrows(
    () => formatarPix({ chave: '52998224725', valor: 10.50 }),
    '[FIX-18] PIX com valor positivo OK'
);
assertNotThrows(
    () => formatarPix({ chave: '52998224725', valor: 0 }),
    '[FIX-18] PIX com valor 0 OK'
);
assertNotThrows(
    () => formatarPix({ chave: '52998224725' }),
    '[FIX-18] PIX sem valor OK'
);
assertNotThrows(
    () => formatarPix({ chave: '52998224725', valor: '' }),
    '[FIX-18] PIX com valor "" tratado como omitido'
);

// ── [FIX-16] campo obrigatório pós-sanitização ──
const pxCtrl = formatarPix({
    chave: '52998224725',
    beneficiario: '\x01\x02\x03',
    cidade: '\x01\x02\x03'
});
const decCtrl = decodificarPix(pxCtrl);
assertEq(decCtrl.cidade, 'BRASILIA',
         '[FIX-16] Cidade com só ctrl chars → fallback BRASILIA');
assertEq(decCtrl.beneficiario, 'RECEBEDOR',
         '[FIX-16] Beneficiário com só ctrl chars → fallback RECEBEDOR');

// ═══════════════════════════════════════════════════════════════
// 8. Validação de payload
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ Validação de payload EMV');

assert(validarPayloadPix(formatarPix({ chave: '52998224725', cidade: 'SP' })).valido,
       'Payload gerado é válido');
assert(!validarPayloadPix('000201lixo').valido, 'VP lixo');
assert(!validarPayloadPix(null).valido,         'VP null');
assert(!validarPayloadPix(pxAdult).valido,      'VP CRC adulterado');

// ═══════════════════════════════════════════════════════════════
// 9. Roteador formatarPix
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ Roteador formatarPix');

assert(formatarPix('52998224725').includes('BR.GOV.BCB.PIX'),
       'String simples → estático');
assertEq(formatarPix(pxBom), pxBom, 'EMV bruto aceito');
assertThrows(() => formatarPix('00020126' + 'X'.repeat(30)), 'EMV corrompido rejeitado');
assertThrows(() => formatarPix(''),   'String vazia rejeitada');
assertThrows(() => formatarPix({}),   'Objeto vazio rejeitado');
assertThrows(() => formatarPix(null), 'null rejeitado');

const pxDin = formatarPix({ url: 'https://psp.com/p/abc', beneficiario: 'X', cidade: 'Y' });
assert(pxDin.includes('https://psp.com/p/abc'), 'Dinâmico inclui URL');

// ═══════════════════════════════════════════════════════════════
// Resultado
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
