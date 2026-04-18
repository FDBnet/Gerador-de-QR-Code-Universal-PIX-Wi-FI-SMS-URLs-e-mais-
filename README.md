# Gerador de QR Code Universal

PIX (estático/dinâmico) · Wi-Fi (WPA2/WPA3) · URL · E-mail · Telefone · SMS · Contato (vCard) · Texto

JavaScript puro (ES6+). Zero frameworks. Uma dependência ([qrcode](https://www.npmjs.com/package/qrcode)).

> **v2.2.1** — Documentação corrigida (README e `.d.ts` alinhados à v2.2.0). Código idêntico a v2.2.0.
>
> **v2.2.0** — Correções de raiz: `tlv()` valida length ≤ 99 (EMV QRCPS-MPM §4.3), `formatarContato` escapa conforme RFC 2426 §4, `validarTelefonePix` reescrito com Plano de Numeração Brasileiro (ANATEL Res. 709/2020), PIX rejeita valor NaN/negativo, escape WiFi alinhado a WPA3 §7.1. Testes passaram a importar o módulo real (antes reimplementavam inline). **98 testes**.
>
> **v2.1.0** — Validação de chave PIX (CPF/CNPJ/email/tel/EVP com dígitos verificadores), detecção automática de tipo, decodificador EMV, normalização para campo 26-01, validação de payload.

## Instalação

### npm (recomendado para projetos com bundler)

```bash
npm install gerar-qrcode
```

```javascript
import { gerarQRCode } from 'gerar-qrcode';
```

### CDN (direto no navegador, sem bundler)

```html
<script type="module">
  import { gerarQRCode } from 'https://cdn.jsdelivr.net/npm/gerar-qrcode@2/gerarQrCode.min.js';
</script>
```

Se usar CDN, altere a primeira linha do `gerarQrCode.js` para:

```javascript
import QRCode from 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm';
```

### Clone

```bash
git clone https://github.com/FDBnet/Gerador-de-QR-Code-Universal-PIX-Wi-FI-SMS-URLs-e-mais-
```

## Uso

### PIX Estático (Copia e Cola)

Gera payload EMV completo com CRC16. A chave é validada (CPF/CNPJ com dígitos verificadores, e-mail, telefone, EVP) e normalizada automaticamente antes da geração.

```javascript
await gerarQRCode({
    elementoId: 'qr-pix',
    tipo: 'pix',
    valor: {
        chave: '529.982.247-25',        // aceita formatado — normaliza para 52998224725
        beneficiario: 'Fulano de Tal',  // até 25 chars
        cidade: 'São Paulo',            // até 15 chars
        valor: 10.50,                   // 0 ou omitido = pagador informa
        identificador: 'PEDIDO123',     // até 25 chars alfanuméricos
        descricao: 'Pagamento ref NF'   // opcional, até 72 chars
    }
});
```

A chave PIX aceita qualquer formato de entrada e normaliza automaticamente:

| Entrada | Tipo detectado | Normalizado no EMV |
|---------|---------------|-------------------|
| `'529.982.247-25'` | CPF | `52998224725` |
| `'11.222.333/0001-81'` | CNPJ | `11222333000181` |
| `'(11) 99999-8888'` | Telefone | `+5511999998888` |
| `'FULANO@Banco.COM'` | E-mail | `fulano@banco.com` |
| `'123E4567-E89B-42D3-A456-556642440000'` | EVP | `123e4567-e89b-42d3-a456-556642440000` |

Chave inválida (CPF com dígitos errados, formato não reconhecido) lança erro antes de gerar o QR Code.

O campo `valor` aceita `number` positivo, `0` (pagador informa), string vazia ou omitido. `NaN` e negativos lançam `Error` explícito — nunca são descartados silenciosamente.

### PIX Dinâmico (URL)

```javascript
await gerarQRCode({
    elementoId: 'qr-pix-din',
    tipo: 'pix',
    valor: {
        url: 'pix.meudominio.com/qr/v2/cobv/abc-123',
        beneficiario: 'Minha Loja',
        cidade: 'Curitiba'
    }
});
```

> ⚠️ **Limite de URL: 77 caracteres.** Imposto pela spec EMV: o campo 26 (Merchant Account Information) tem no máximo 99 chars de conteúdo; desses, 18 são consumidos pelo GUI `BR.GOV.BCB.PIX` e 4 pelo overhead TLV da URL. Sobram 77 para a URL. URLs maiores lançam `Error` antes de gerar o QR Code — EMV QRCPS-MPM §4.3.

### PIX com payload EMV pronto

O payload é validado (estrutura TLV, CRC16, campos obrigatórios) antes de gerar o QR Code.

```javascript
await gerarQRCode({
    elementoId: 'qr-pix-raw',
    tipo: 'pix',
    valor: '00020126580014BR.GOV.BCB.PIX...'
});
```

### Wi-Fi WPA2

```javascript
await gerarQRCode({
    elementoId: 'qr-wifi',
    tipo: 'wifi',
    valor: {
        nomeRede: 'MinhaRedeWiFi',
        senha: 'MinhaSenha123',
        criptografia: 'WPA'  // WPA | WPA2 | WPA3 | WEP | NOPASS
    }
});
```

### Wi-Fi WPA3 (com campos avançados)

```javascript
await gerarQRCode({
    elementoId: 'qr-wifi3',
    tipo: 'wifi',
    valor: {
        nomeRede: 'Rede5G_Segura',
        senha: 'S3nh@F0rt3!',
        criptografia: 'WPA3',
        transitionDisable: '1',       // WPA3-only (sem fallback WPA2)
        oculta: false,                // true para SSID oculto
        chavePublica: 'MDkw...',      // SAE-PK (base64 DER, opcional)
        identificadorSenha: null      // SAE password identifier (opcional)
    }
});
```

### URL

```javascript
await gerarQRCode({
    elementoId: 'qr-url',
    tipo: 'url',
    valor: 'meusite.com.br'  // https:// adicionado automaticamente
});
```

### E-mail

```javascript
await gerarQRCode({
    elementoId: 'qr-email',
    tipo: 'email',
    valor: 'contato@empresa.com.br'
});
```

### Telefone / SMS

```javascript
await gerarQRCode({
    elementoId: 'qr-tel',
    tipo: 'tel',
    valor: '(11) 99999-8888'  // formatação removida automaticamente
});

await gerarQRCode({
    elementoId: 'qr-sms',
    tipo: 'sms',
    valor: 5511999998888  // aceita string ou número
});
```

> **Nota sobre chaves PIX do tipo telefone**: `detectarTipoChave` e `validarChavePix` aplicam o Plano de Numeração Brasileiro (ANATEL Res. 709/2020): DDD ∈ [11-99], celular de 11 dígitos exige 9 na terceira posição, fixo de 10 dígitos exige primeiro dígito em [2-9]. Entradas fora dessa estrutura retornam `null`/erro em vez de ser aceitas silenciosamente.

### Contato (vCard 3.0)

```javascript
await gerarQRCode({
    elementoId: 'qr-contato',
    tipo: 'contato',
    valor: {
        nome: 'João Silva',
        telefone: '11999999999',
        email: 'joao@empresa.com.br',
        organizacao: 'ACME Ltda',       // opcional
        cargo: 'Diretor',               // opcional
        endereco: 'Rua X, 100, SP',     // opcional
        site: 'https://acme.com.br'     // opcional
    }
});
```

Caracteres especiais em qualquer valor (`;`, `,`, `\`, newline) são escapados automaticamente conforme **RFC 2426 §4**. Nomes como `"Silva; Rodrigo"` ou endereços com vírgulas são preservados corretamente no parser de contatos de iOS, Android e Outlook.

### Texto livre

```javascript
await gerarQRCode({
    elementoId: 'qr-texto',
    tipo: 'texto',
    valor: 'Qualquer texto aqui'
});
```

## Utilitários PIX

Funções standalone para usar sem renderizar QR Code.

### Gerar Pix Copia e Cola

```javascript
import { formatarPix } from 'gerar-qrcode';

const pixCopiaCola = formatarPix({
    chave: '52998224725',
    beneficiario: 'Fulano',
    cidade: 'São Paulo',
    valor: 25.00
});
// → 00020101021226430014BR.GOV.BCB.PIX011152998224725...6304XXXX
```

### Validar chave PIX

```javascript
import { validarChavePix } from 'gerar-qrcode';

const resultado = validarChavePix('529.982.247-25');
// {
//   valida: true,
//   tipo: 'cpf',
//   erro: null,
//   chaveNormalizada: '52998224725'
// }

const invalida = validarChavePix('12345678900');
// { valida: false, tipo: null, erro: 'Chave PIX "12345678900" não corresponde a nenhum formato válido...' }
```

### Detectar tipo de chave

```javascript
import { detectarTipoChave } from 'gerar-qrcode';

detectarTipoChave('52998224725');                              // → 'cpf'
detectarTipoChave('11222333000181');                           // → 'cnpj'
detectarTipoChave('fulano@banco.com');                         // → 'email'
detectarTipoChave('+5511999998888');                           // → 'telefone'
detectarTipoChave('123e4567-e89b-42d3-a456-556642440000');    // → 'evp'
detectarTipoChave('texto-qualquer');                           // → null
```

### Decodificar Pix Copia e Cola

```javascript
import { decodificarPix } from 'gerar-qrcode';

const dec = decodificarPix('00020101021226430014BR.GOV.BCB.PIX...');
// {
//   valido: true,
//   crcValido: true,
//   chave: '52998224725',
//   tipoChave: 'cpf',
//   valor: 25.00,
//   beneficiario: 'FULANO',
//   cidade: 'SAO PAULO',
//   identificador: '***',
//   descricao: null,
//   ...
// }
```

### Validar payload EMV

```javascript
import { validarPayloadPix } from 'gerar-qrcode';

const val = validarPayloadPix(payloadString);
// { valido: true, erros: [] }
// ou
// { valido: false, erros: ['CRC16 inválido: ABCD ≠ 1234', 'Campo 59 ausente'] }
```

### Normalizar chave

```javascript
import { normalizarChavePix } from 'gerar-qrcode';

normalizarChavePix('529.982.247-25', 'cpf');    // → '52998224725'
normalizarChavePix('11999998888', 'telefone');   // → '+5511999998888'
normalizarChavePix('FULANO@X.COM', 'email');     // → 'fulano@x.com'
```

## Outros utilitários

```javascript
import { formatarWiFi, formatarContato } from 'gerar-qrcode';

const wifiStr = formatarWiFi({ nomeRede: 'X', senha: 'Y' });
// → WIFI:T:WPA;S:X;P:Y;;

const vcard = formatarContato({ nome: 'João', telefone: '11999' });
// → BEGIN:VCARD\nVERSION:3.0\n...
```

## Opções de configuração

```javascript
const opcoes = {
    width: 256,                     // largura em px (PIX: 350)
    height: 256,                    // altura em px
    margin: 1,                      // quiet zone em módulos (PIX: 2)
    color: {
        dark: '#000000',            // cor dos módulos
        light: '#FFFFFF'            // cor do fundo
    },
    errorCorrectionLevel: 'H'      // L | M | Q | H (PIX: Q)
};
```

## Tipos suportados

| Tipo | Formato do `valor` | Exemplo |
|------|--------------------|---------|
| `pix` | `string` (EMV ou chave) ou `object` | `{ chave, valor, cidade }` |
| `url` | `string` ou `number` | `'meusite.com'` |
| `email` | `string` | `'x@y.com'` |
| `tel` | `string` ou `number` | `'(11) 9999-0000'` |
| `sms` | `string` ou `number` | `5511999990000` |
| `wifi` | `object` | `{ nomeRede, senha, criptografia }` |
| `contato` | `object` | `{ nome, telefone, email }` |
| `texto` | `string` ou `number` | `'Olá mundo'` |

## API completa

| Função | Descrição |
|--------|-----------|
| `gerarQRCode(config)` | Renderiza QR Code no DOM |
| `formatarPix(dados)` | Gera payload EMV (Pix Copia e Cola) |
| `validarChavePix(chave)` | Valida chave PIX com dígitos verificadores |
| `detectarTipoChave(chave)` | Detecta tipo: cpf, cnpj, email, telefone, evp |
| `decodificarPix(payload)` | Decodifica payload EMV → objeto |
| `validarPayloadPix(payload)` | Valida estrutura, CRC16, campos obrigatórios |
| `normalizarChavePix(chave, tipo)` | Normaliza para formato EMV 26-01 |
| `formatarWiFi(dados)` | Gera string WIFI: (WPA2/WPA3) |
| `formatarContato(dados)` | Gera vCard 3.0 |

## Personalização CSS

```css
#container-qrcode {
    background: white;
    padding: 16px;
    border-radius: 8px;
}

/* Classes automáticas por tipo */
.qrcode-pix     { /* ... */ }
.qrcode-wifi    { /* ... */ }
.qrcode-contato { /* ... */ }
```

## Testes

```bash
node teste_integridade.mjs
```

98 testes cobrindo: validação CPF/CNPJ/email/telefone/EVP, detecção automática de tipo, normalização de chave, geração e decodificação de payload EMV, validação de CRC16, roundtrip (gerar → decodificar → comparar), WiFi WPA2/WPA3, vCard com escape RFC 2426, sanitização, edge cases, e seção dedicada de **regressão dos bugs corrigidos em v2.2.0** (FIX-13..18). Os testes importam o módulo real (antes reimplementavam a lógica inline).

## Compatibilidade

- Navegadores: Chrome 80+, Firefox 78+, Safari 14+, Edge 80+
- Node.js: 16+
- ES Modules (ESM)
- TypeScript (declarations incluídas)

## Referências normativas

- [Manual BR Code — BCB v2.0.1](https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf)
- [Manual de Padrões para Iniciação do Pix — BCB v2.9.0](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf)
- [WPA3 Specification v3.2 — Wi-Fi Alliance](https://www.wi-fi.org/system/files/WPA3%20Specification%20v3.2.pdf)
- [EMV QRCPS-MPM v1.1](https://www.emvco.com/emv-technologies/qrcodes/)
- [vCard 3.0 — RFC 2426](https://www.rfc-editor.org/rfc/rfc2426)
- [Plano de Numeração Brasileiro — ANATEL Res. 709/2020](https://www.gov.br/anatel/pt-br/regulado/numeracao/plano-de-numeracao-brasileiro)

## Licença

MIT — veja [LICENSE](LICENSE).

## Contribuição

1. Fork → 2. Branch (`git checkout -b feature/nome`) → 3. Commit → 4. Push → 5. Pull Request

---

Feito por [Rodrigo S. Magalhães](https://github.com/FDBnet) em FDBnet.
