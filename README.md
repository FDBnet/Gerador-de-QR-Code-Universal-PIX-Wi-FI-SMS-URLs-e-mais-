# Gerador de QR Code Universal

PIX (estático/dinâmico) · Wi-Fi (WPA2/WPA3) · URL · E-mail · Telefone · SMS · Contato (vCard) · Texto

JavaScript puro (ES6+). Zero frameworks. Uma dependência ([qrcode](https://www.npmjs.com/package/qrcode)).

> **v2.0.0** — PIX com EMV + CRC16 completo, Wi-Fi com WPA3, 12 bug fixes, 80 testes automatizados.

## Instalação

### npm (recomendado para projetos com bundler)

```bash
npm install gerar-qrcode qrcode
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

Gera payload EMV completo com CRC16, conforme Manual BR Code BCB v2.0.1 e Manual de Padrões para Iniciação do Pix v2.9.0.

```javascript
await gerarQRCode({
    elementoId: 'qr-pix',
    tipo: 'pix',
    valor: {
        chave: '12345678900',           // CPF, CNPJ, e-mail, telefone ou EVP
        beneficiario: 'Fulano de Tal',  // até 25 chars
        cidade: 'São Paulo',            // até 15 chars
        valor: 10.50,                   // 0 ou omitido = pagador informa
        identificador: 'PEDIDO123',     // até 25 chars alfanuméricos
        descricao: 'Pagamento ref NF'   // opcional, até 72 chars
    }
});
```

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

### PIX com payload EMV pronto

```javascript
// String Pix Copia e Cola já gerada pelo seu PSP
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

### Texto livre

```javascript
await gerarQRCode({
    elementoId: 'qr-texto',
    tipo: 'texto',
    valor: 'Qualquer texto aqui'
});
```

## Utilitários standalone

Para obter o payload sem renderizar QR Code (ex: Pix Copia e Cola):

```javascript
import { formatarPix, formatarWiFi, formatarContato } from 'gerar-qrcode';

// Retorna a string EMV pronta para copiar
const pixCopiaCola = formatarPix({
    chave: '12345678900',
    beneficiario: 'Fulano',
    cidade: 'São Paulo',
    valor: 25.00
});
console.log(pixCopiaCola);
// → 00020101021226430014BR.GOV.BCB.PIX011112345678900...6304XXXX

// Retorna string WIFI:...
const wifiStr = formatarWiFi({ nomeRede: 'X', senha: 'Y' });
// → WIFI:T:WPA;S:X;P:Y;;
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

80 testes cobrindo: TLV, CRC16, PIX estático/dinâmico, WiFi WPA2/WPA3, vCard, URL, telefone, SMS, sanitização, edge cases.

## Compatibilidade

- Navegadores: Chrome 80+, Firefox 78+, Safari 14+, Edge 80+
- Node.js: 16+
- ES Modules (ESM)

## Referências normativas

- [Manual BR Code — BCB v2.0.1](https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf)
- [Manual de Padrões para Iniciação do Pix — BCB v2.9.0](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf)
- [WPA3 Specification v3.2 — Wi-Fi Alliance](https://www.wi-fi.org/system/files/WPA3%20Specification%20v3.2.pdf)
- [EMV QRCPS-MPM v1.1](https://www.emvco.com/emv-technologies/qrcodes/)
- [vCard 3.0 — RFC 2426](https://www.rfc-editor.org/rfc/rfc2426)

## Licença

MIT — veja [LICENSE](LICENSE).

## Contribuição

1. Fork → 2. Branch (`git checkout -b feature/nome`) → 3. Commit → 4. Push → 5. Pull Request

---

Feito por [Rodrigo S. Magalhães](https://github.com/FDBnet)
