# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [2.1.0] — 2026-04-13

### Adicionado

- **Validação de chave PIX** (`validarChavePix`): CPF com dígitos verificadores (algoritmo Receita Federal), CNPJ com dígitos verificadores, e-mail (regex + limite 77 chars), telefone (10-13 dígitos, +55), EVP (UUID v4 strict).
- **Detecção automática de tipo** (`detectarTipoChave`): recebe qualquer string → retorna `'cpf'` | `'cnpj'` | `'email'` | `'telefone'` | `'evp'` | `null`.
- **Decodificador EMV** (`decodificarPix`): payload Pix Copia e Cola → objeto com chave, valor, beneficiário, cidade, txid, descrição, CRC16, tipo de chave detectado.
- **Validação de payload EMV** (`validarPayloadPix`): verifica estrutura TLV, campos obrigatórios (52, 53, 58, 59, 60), tamanhos máximos, CRC16. Retorna lista de erros.
- **Normalização de chave** (`normalizarChavePix`): CPF/CNPJ → só dígitos; telefone → `+55...`; e-mail → lowercase; EVP → lowercase.
- **Integração automática**: `formatarPixEstatico` agora valida e normaliza a chave antes de gerar. Chave inválida → `throw Error`.
- **Validação de payload bruto**: payloads EMV passados via string ou `{ dadosEmv }` / `{ payload }` são validados antes de aceitar.
- **83 testes** (era 80): CPF/CNPJ com dígitos verificadores, detecção, normalização, roundtrip (gerar → decodificar → comparar).

### Alterado

- Detecção de CPF formatado (com pontos/hífens) agora funciona corretamente.
- TypeScript declarations expandidas com interfaces para todos os novos retornos.

## [2.0.0] — 2026-04-13

### Adicionado

- **PIX Estático completo**: geração real de payload EMV com TLV + CRC16-CCITT, campos `chave`, `beneficiario`, `cidade`, `valor`, `identificador`, `descricao`.
- **PIX Dinâmico**: suporte a QR Code baseado em URL (`{ url }`) com campo EMV 26-25.
- **Wi-Fi WPA3**: campos `R:` (Transition Disable), `K:` (chave pública SAE-PK), `I:` (identificador de senha), `H:true` (rede oculta). Conforme WPA3 Specification v3.2 §7.1.
- **vCard expandido**: campos `ORG`, `TITLE`, `ADR`, `URL` além dos existentes.
- **Exports utilitários**: `formatarPix`, `formatarWiFi`, `formatarContato` para uso standalone (ex: Pix Copia e Cola sem renderizar QR).
- **TypeScript declarations**: arquivo `gerarQrCode.d.ts` com tipos completos.
- **package.json**: pronto para publicação no npm.
- **Deep merge de `opcoes.color`**: cor parcial do usuário não sobrescreve os defaults.
- **Suite de testes**: `teste_integridade.mjs` com 80 testes automatizados.

### Corrigido

- **[FIX-01]** `innerHTML = ''` substituído por `replaceChildren()` — vetor XSS eliminado.
- **[FIX-02]** Inputs Wi-Fi e vCard agora são sanitizados. Injeção via SSID/senha com `;` bloqueada por escape ZXing.
- **[FIX-03]** Import CDN documentado com CSP; import npm usa bare specifier.
- **[FIX-04]** `className` sanitizada — caracteres inválidos removidos por regex whitelist.
- **[FIX-05]** **Crítico**: `formatarStringPix` retornava `''` para objetos com dados reais. Agora gera payload EMV completo.
- **[FIX-06]** Validação de `valor` aceitava falso negativo para `0`, `""`, `false`. Agora só rejeita `null` e `undefined`.
- **[FIX-07]** Wi-Fi e Contato com valor `string` geravam `"undefined"` silenciosamente. Agora lançam `Error` explícito.
- **[FIX-08/09]** `tel`, `sms`, `url` com valor numérico causavam `TypeError`. Agora fazem coerção segura via `paraString()`.
- **[FIX-10]** `ResizeObserver` acumulava a cada chamada (memory leak). Agora reutiliza via `Symbol` + `.disconnect()`.
- **[FIX-11]** Shadowing da variável `elemento` no callback do `ResizeObserver`. Renomeada para `alvo`.
- **[FIX-12]** `clearTimeout` redundante no debounce. Função reescrita.

### Alterado

- PIX: `errorCorrectionLevel` padrão continua `Q`; `margin` ajustado de `0` para `2` (quiet zone mínima).
- Wi-Fi: valida que redes protegidas tenham senha (antes aceitava silenciosamente).

### Referências

- Manual BR Code — BCB v2.0.1
- Manual de Padrões para Iniciação do Pix — BCB v2.9.0 (IN BCB nº 658/2025)
- EMV QRCPS-MPM v1.1
- WPA3 Specification v3.2 — Wi-Fi Alliance
- vCard 3.0 — RFC 2426

## [1.0.0] — Versão original

- Geração de QR Code com tipos: PIX, URL, E-mail, Telefone, SMS, Wi-Fi, Contato, Texto.
- Responsividade via ResizeObserver.
- Dependência: qrcode v1.5.4 via CDN.
