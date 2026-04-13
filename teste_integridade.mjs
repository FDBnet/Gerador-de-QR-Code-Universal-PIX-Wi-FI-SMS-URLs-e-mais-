/**
 * Testes de integridade — gerarQrCode.js v2.1.0
 * Executa: node teste_integridade.mjs
 */

function tlv(id, valor) { return `${id}${String(valor.length).padStart(2, '0')}${valor}`; }
function crc16(str) { let c = 0xFFFF; for (let i = 0; i < str.length; i++) { c ^= str.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) { c = (c & 0x8000) ? ((c << 1) ^ 0x1021) : (c << 1); c &= 0xFFFF; } } return c.toString(16).toUpperCase().padStart(4, '0'); }
function escaparWiFi(v) { if (typeof v !== 'string') return ''; return v.replace(/([\\;,:"'])/g, '\\$1'); }
function sanitizar(v) { if (v === null || v === undefined) return ''; return String(v).replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, ''); }
function paraString(v) { if (v === null || v === undefined) return ''; return String(v); }
function removerAcentos(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function tipoParaClasse(t) { return t.toLowerCase().replace(/[^a-z0-9-]/g, ''); }

function validarCPF(cpf) {
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    for (let t = 9; t < 11; t++) { let s = 0; for (let i = 0; i < t; i++) s += parseInt(cpf[i],10)*((t+1)-i); if (parseInt(cpf[t],10) !== ((s*10)%11)%10) return false; }
    return true;
}
function validarCNPJ(cnpj) {
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    const p1=[5,4,3,2,9,8,7,6,5,4,3,2], p2=[6,5,4,3,2,9,8,7,6,5,4,3,2];
    let s=0; for (let i=0;i<12;i++) s+=parseInt(cnpj[i],10)*p1[i]; let r=s%11, d1=r<2?0:11-r; if (parseInt(cnpj[12],10)!==d1) return false;
    s=0; for (let i=0;i<13;i++) s+=parseInt(cnpj[i],10)*p2[i]; r=s%11; let d2=r<2?0:11-r; if (parseInt(cnpj[13],10)!==d2) return false;
    return true;
}
function validarEmailPix(e) { return e.length <= 77 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function validarTelefonePix(t) { const d=t.replace(/\D/g,''); if (d.length>=10&&d.length<=11) return true; if (d.length>=12&&d.length<=13&&d.startsWith('55')) return true; return false; }
function validarEVP(e) { return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(e); }

function detectarTipoChave(chave) {
    if (!chave || typeof chave !== 'string') return null;
    const t = chave.trim();
    if (validarEVP(t.toLowerCase())) return 'evp';
    const d = t.replace(/\D/g, '');
    if (d.length === 11 && !/[@+]/.test(t)) { if (validarCPF(d)) return 'cpf'; if (validarTelefonePix(t)) return 'telefone'; }
    if (d.length === 14 && validarCNPJ(d)) return 'cnpj';
    if (/^\+?55/.test(t) && validarTelefonePix(t)) return 'telefone';
    if (d.length >= 10 && d.length <= 13 && validarTelefonePix(t)) return 'telefone';
    if (t.includes('@') && validarEmailPix(t.toLowerCase())) return 'email';
    return null;
}
function normalizarChavePix(chave, tipo) {
    switch (tipo) {
        case 'cpf': case 'cnpj': return chave.replace(/\D/g, '');
        case 'telefone': { const d=chave.replace(/\D/g,''); return (d.startsWith('55')&&d.length>=12)?`+${d}`:`+55${d}`; }
        case 'email': return chave.trim().toLowerCase();
        case 'evp': return chave.trim().toLowerCase();
        default: return chave.trim();
    }
}
function validarChavePix(chave) {
    const r={valida:false,tipo:null,erro:null,chaveNormalizada:''};
    if (!chave||typeof chave!=='string'||!chave.trim()) { r.erro='Chave vazia'; return r; }
    const tipo=detectarTipoChave(chave.trim());
    if (!tipo) { r.erro=`Chave "${chave.trim()}" inválida`; return r; }
    r.tipo=tipo; r.valida=true; r.chaveNormalizada=normalizarChavePix(chave.trim(),tipo); return r;
}
function parseTLV(emv) {
    const c={}; let p=0;
    while (p<emv.length) { if (p+4>emv.length) break; const id=emv.substring(p,p+2), tam=parseInt(emv.substring(p+2,p+4),10); if (isNaN(tam)||p+4+tam>emv.length) break; c[id]=emv.substring(p+4,p+4+tam); p+=4+tam; }
    return c;
}
function decodificarPix(payload) {
    const r={valido:false,erro:null,formatIndicator:null,pontoIniciacao:null,chave:null,tipoChave:null,descricao:null,urlDinamica:null,mcc:null,moeda:null,valor:null,pais:null,beneficiario:null,cidade:null,identificador:null,crcInformado:null,crcCalculado:null,crcValido:false};
    if (!payload||typeof payload!=='string') { r.erro='Payload vazio'; return r; }
    const s=payload.trim(); if (s.length<8) { r.erro='Curto'; return r; }
    const cp=s.lastIndexOf('6304'); if (cp===-1) { r.erro='Sem CRC'; return r; }
    r.crcInformado=s.substring(cp+4,cp+8).toUpperCase(); r.crcCalculado=crc16(s.substring(0,cp+4)); r.crcValido=r.crcInformado===r.crcCalculado;
    const c=parseTLV(s); r.formatIndicator=c['00']||null; r.pontoIniciacao=c['01']||null; r.mcc=c['52']||null; r.moeda=c['53']||null; r.pais=c['58']||null; r.beneficiario=c['59']||null; r.cidade=c['60']||null;
    if (c['54']) { const v=parseFloat(c['54']); r.valor=isNaN(v)?null:v; }
    if (c['26']) { const m=parseTLV(c['26']); r.chave=m['01']||null; r.descricao=m['02']||null; r.urlDinamica=m['25']||null; }
    if (c['62']) { r.identificador=parseTLV(c['62'])['05']||null; }
    if (r.chave) r.tipoChave=detectarTipoChave(r.chave);
    r.valido=r.crcValido&&r.formatIndicator==='01'&&!!(r.chave||r.urlDinamica);
    if (!r.valido&&!r.erro) r.erro='Inválido';
    return r;
}
function validarPayloadPix(payload) {
    const e=[]; if (!payload||typeof payload!=='string') return {valido:false,erros:['Vazio']};
    const s=payload.trim(); if (s.length<50) e.push('Curto'); if (!s.startsWith('000201')) e.push('Header'); if (!s.includes('BR.GOV.BCB.PIX')) e.push('GUI');
    const cp=s.lastIndexOf('6304'); if (cp===-1) e.push('CRC tag'); else { const ci=s.substring(cp+4,cp+8).toUpperCase(),cc=crc16(s.substring(0,cp+4)); if (ci!==cc) e.push(`CRC ${ci}≠${cc}`); if (s.length>cp+8) e.push('Após CRC'); }
    const c=parseTLV(s); if (!c['52']) e.push('52'); if (!c['53']) e.push('53'); if (c['53']&&c['53']!=='986') e.push('Moeda'); if (!c['58']) e.push('58'); if (!c['59']) e.push('59'); if (!c['60']) e.push('60');
    return {valido:e.length===0,erros:e};
}
function formatarPixEstatico(dados) {
    const cr=sanitizar(dados.chave).trim(); if (!cr) throw new Error('Chave vazia');
    const v=validarChavePix(cr); if (!v.valida) throw new Error(v.erro);
    const chave=v.chaveNormalizada;
    const ben=removerAcentos(sanitizar(dados.beneficiario||'RECEBEDOR')).substring(0,25).toUpperCase();
    const cid=removerAcentos(sanitizar(dados.cidade||'BRASILIA')).substring(0,15).toUpperCase();
    const ident=dados.identificador?sanitizar(dados.identificador).replace(/[^A-Za-z0-9]/g,'').substring(0,25):'***';
    let mai=tlv('00','BR.GOV.BCB.PIX')+tlv('01',chave);
    if (dados.descricao) mai+=tlv('02',sanitizar(dados.descricao).substring(0,72));
    let p=''; p+=tlv('00','01');
    const vn=dados.valor!=null?parseFloat(paraString(dados.valor)):0;
    if (vn>0) p+=tlv('01','12');
    p+=tlv('26',mai)+tlv('52','0000')+tlv('53','986');
    if (vn>0) p+=tlv('54',vn.toFixed(2));
    p+=tlv('58','BR')+tlv('59',ben)+tlv('60',cid)+tlv('62',tlv('05',ident));
    const ct=p+'6304'; return ct+crc16(ct);
}

// ═══════════════════════════════════════════════════════════════
let total=0,passou=0,falhou=0; const falhas=[];
function assert(c,d){total++;if(c){passou++}else{falhou++;falhas.push(d);console.log(`  ✗ ${d}`)}}
function assertEq(a,b,d){total++;if(a===b){passou++}else{falhou++;falhas.push(d);console.log(`  ✗ ${d}\n    exp: ${JSON.stringify(b)}\n    got: ${JSON.stringify(a)}`)}}
function assertThrows(fn,d){total++;try{fn();falhou++;falhas.push(d);console.log(`  ✗ ${d}`)}catch{passou++}}

console.log('\n══════════════════════════════════════════');
console.log(' TESTES DE INTEGRIDADE — gerarQrCode v2.1');
console.log('══════════════════════════════════════════\n');

// ── Básicos ──
console.log('▸ TLV / CRC16 / Sanitização');
assertEq(tlv('00','01'),'000201','TLV ok');
assertEq(crc16('123456789'),'29B1','CRC16 ok');
assertEq(crc16(''),'FFFF','CRC16 vazio');
assertEq(sanitizar(null),'','sanitizar null');
assertEq(sanitizar('a\x00b'),'ab','sanitizar ctrl');
assertEq(removerAcentos('São Paulo'),'Sao Paulo','acentos');
assertEq(tipoParaClasse('tipo<x>'),'tipox','classe');
assertEq(escaparWiFi('a;b'),'a\\;b','escape ;');

// ── CPF ──
console.log('▸ CPF');
assert(validarCPF('52998224725')===true,'CPF válido 529');
assert(validarCPF('11144477735')===true,'CPF válido 111');
assert(validarCPF('12345678909')===true,'CPF válido 123');
assert(validarCPF('00000000000')===false,'CPF repetido');
assert(validarCPF('11111111111')===false,'CPF 111');
assert(validarCPF('12345678900')===false,'CPF dígitos errados');
assert(validarCPF('1234567890')===false,'CPF 10 dígitos');

// ── CNPJ ──
console.log('▸ CNPJ');
assert(validarCNPJ('11222333000181')===true,'CNPJ válido');
assert(validarCNPJ('11444777000161')===true,'CNPJ válido 2');
assert(validarCNPJ('00000000000000')===false,'CNPJ zeros');
assert(validarCNPJ('11222333000100')===false,'CNPJ dígitos errados');

// ── Email ──
console.log('▸ Email PIX');
assert(validarEmailPix('a@b.c')===true,'Email ok');
assert(validarEmailPix('sem-arroba')===false,'Email sem @');
assert(validarEmailPix('a'.repeat(78))===false,'Email >77');

// ── Telefone ──
console.log('▸ Telefone PIX');
assert(validarTelefonePix('11999998888')===true,'Tel 11d');
assert(validarTelefonePix('5511999998888')===true,'Tel 13d');
assert(validarTelefonePix('+5511999998888')===true,'Tel +55');
assert(validarTelefonePix('1199999')===false,'Tel curto');

// ── EVP ──
console.log('▸ EVP');
assert(validarEVP('123e4567-e89b-42d3-a456-556642440000')===true,'EVP ok');
assert(validarEVP('123e4567-e89b-12d3-a456-556642440000')===false,'EVP não v4');
assert(validarEVP('123e4567-e89b-42d3-c456-556642440000')===false,'EVP variant');
assert(validarEVP('nao-uuid')===false,'EVP texto');

// ── Detecção ──
console.log('▸ Detecção automática');
assertEq(detectarTipoChave('52998224725'),'cpf','Det CPF');
assertEq(detectarTipoChave('11222333000181'),'cnpj','Det CNPJ');
assertEq(detectarTipoChave('fulano@banco.com'),'email','Det email');
assertEq(detectarTipoChave('+5511999998888'),'telefone','Det tel');
assertEq(detectarTipoChave('123e4567-e89b-42d3-a456-556642440000'),'evp','Det EVP');
assertEq(detectarTipoChave(''),null,'Det vazio');
assertEq(detectarTipoChave('abc'),null,'Det lixo');

// ── validarChavePix ──
console.log('▸ validarChavePix');
const vc1=validarChavePix('529.982.247-25');
assert(vc1.valida===true,'vChave CPF ok');
assertEq(vc1.tipo,'cpf','vChave tipo cpf');
assertEq(vc1.chaveNormalizada,'52998224725','vChave CPF norm');

const vc2=validarChavePix('+55 (11) 99999-8888');
assert(vc2.valida===true,'vChave tel ok');
assertEq(vc2.chaveNormalizada,'+5511999998888','vChave tel norm');

const vc3=validarChavePix('FULANO@X.COM');
assertEq(vc3.chaveNormalizada,'fulano@x.com','vChave email lower');

const vc4=validarChavePix('123E4567-E89B-42D3-A456-556642440000');
assertEq(vc4.chaveNormalizada,'123e4567-e89b-42d3-a456-556642440000','vChave EVP lower');

assert(validarChavePix('lixo').valida===false,'vChave inválida');
assert(validarChavePix('').valida===false,'vChave vazia');

// ── Normalização ──
console.log('▸ Normalização');
assertEq(normalizarChavePix('529.982.247-25','cpf'),'52998224725','Norm CPF');
assertEq(normalizarChavePix('11.222.333/0001-81','cnpj'),'11222333000181','Norm CNPJ');
assertEq(normalizarChavePix('11999998888','telefone'),'+5511999998888','Norm tel +55');
assertEq(normalizarChavePix('5511999998888','telefone'),'+5511999998888','Norm tel 55→+55');
assertEq(normalizarChavePix('ABC@X.COM','email'),'abc@x.com','Norm email');

// ── PIX Estático ──
console.log('▸ PIX Estático');
const px1=formatarPixEstatico({chave:'52998224725',beneficiario:'Fulano',cidade:'São Paulo',valor:10.50,identificador:'PED1'});
assert(px1.includes('52998224725'),'PIX CPF presente');
assert(px1.includes('BR.GOV.BCB.PIX'),'PIX GUI');
assert(px1.includes('10.50'),'PIX valor');
assert(px1.includes('SAO PAULO'),'PIX cidade');

const px2=formatarPixEstatico({chave:'11999998888',cidade:'Curitiba'});
assert(px2.includes('+5511999998888'),'PIX tel normalizado');

const px3=formatarPixEstatico({chave:'TESTE@BANCO.COM'});
assert(px3.includes('teste@banco.com'),'PIX email normalizado');

assertThrows(()=>formatarPixEstatico({chave:'invalida'}),'PIX chave inválida');

// ── Decodificador ──
console.log('▸ Decodificador');
const pxDec=formatarPixEstatico({chave:'52998224725',beneficiario:'Joao',cidade:'Brasilia',valor:99.90,identificador:'ABC',descricao:'Teste'});
const d1=decodificarPix(pxDec);
assert(d1.valido===true,'Dec válido');
assert(d1.crcValido===true,'Dec CRC ok');
assertEq(d1.formatIndicator,'01','Dec FI');
assertEq(d1.chave,'52998224725','Dec chave');
assertEq(d1.tipoChave,'cpf','Dec tipo');
assertEq(d1.valor,99.90,'Dec valor');
assertEq(d1.beneficiario,'JOAO','Dec ben');
assertEq(d1.identificador,'ABC','Dec txid');
assertEq(d1.descricao,'Teste','Dec desc');

const pxSV=formatarPixEstatico({chave:'123e4567-e89b-42d3-a456-556642440000'});
const d2=decodificarPix(pxSV);
assert(d2.valido===true,'Dec EVP ok');
assertEq(d2.valor,null,'Dec EVP sem valor');
assertEq(d2.tipoChave,'evp','Dec EVP tipo');

assert(decodificarPix('lixo').valido===false,'Dec lixo');
const pxAdult=pxDec.substring(0,pxDec.length-4)+'0000';
assert(decodificarPix(pxAdult).crcValido===false,'Dec CRC adulterado');

// ── Validação de Payload ──
console.log('▸ Validação Payload');
assert(validarPayloadPix(pxDec).valido===true,'VP válido');
assert(validarPayloadPix('000201lixo').valido===false,'VP lixo');
assert(validarPayloadPix(null).valido===false,'VP null');
assert(validarPayloadPix(pxAdult).valido===false,'VP CRC adulterado');

// ── Roundtrip ──
console.log('▸ Roundtrip');
function rt(d,n){const p=formatarPixEstatico(d),dc=decodificarPix(p),v=validarPayloadPix(p);assert(dc.valido&&v.valido&&dc.crcValido,`RT ${n}`)}
rt({chave:'52998224725',valor:1,cidade:'SP'},'CPF+valor');
rt({chave:'11222333000181',cidade:'RJ'},'CNPJ');
rt({chave:'teste@email.com',valor:500},'Email');
rt({chave:'+5511999998888'},'Telefone');
rt({chave:'123e4567-e89b-42d3-a456-556642440000'},'EVP');

// ── WiFi ──
console.log('▸ WiFi');
const WIFI_CRIPTO={WPA:'WPA',WPA2:'WPA',WPA3:'WPA',SAE:'SAE',WEP:'WEP',NOPASS:'nopass'};
function fmtWiFi(d){if(typeof d==='string'){if(d.startsWith('WIFI:'))return d;throw new Error('X')}const{nomeRede:n,senha:s,criptografia:cr='WPA',oculta:o=false,transitionDisable:td=null,chavePublica:pk=null}=d;if(!n)throw new Error('N');const t=WIFI_CRIPTO[cr.toUpperCase()]||cr;if(t!=='nopass'&&!s)throw new Error('S');const p=[];p.push(`T:${escaparWiFi(t)}`);if(td!==null)p.push(`R:${td}`);p.push(`S:${escaparWiFi(n)}`);if(o)p.push('H:true');if(t!=='nopass'&&s)p.push(`P:${escaparWiFi(s)}`);if(pk)p.push(`K:${pk}`);return`WIFI:${p.join(';')};;`}
assertEq(fmtWiFi({nomeRede:'X',senha:'Y'}),'WIFI:T:WPA;S:X;P:Y;;','WiFi ok');
assertEq(fmtWiFi({nomeRede:'F',criptografia:'NOPASS'}),'WIFI:T:nopass;S:F;;','WiFi nopass');

// ═══════════════════════════════════════════════════════════════
console.log('\n──────────────────────────────────────────');
console.log(`  Total: ${total}  |  ✓ ${passou}  |  ✗ ${falhou}`);
console.log('──────────────────────────────────────────');
if (falhou > 0) { console.log('\nFALHAS:'); falhas.forEach((f,i) => console.log(`  ${i+1}. ${f}`)); process.exit(1); }
else { console.log('\n  ✓ TODOS OS TESTES PASSARAM — PADRÃO OURO\n'); process.exit(0); }
