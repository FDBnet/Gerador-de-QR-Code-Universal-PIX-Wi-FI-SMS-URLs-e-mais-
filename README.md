# 🔲 Gerador de QR Code Universal (PIX, Wi-Fi, SMS, URLs e mais)

Um gerador de QR Code otimizado em JavaScript puro (ES6+) com suporte a múltiplos formatos, incluindo PIX. Leve, responsivo e fácil de usar.

## ✨ Funcionalidades

- 📱 **Múltiplos Formatos Suportados:**
  - PIX (Otimizado para o padrão brasileiro)
  - URLs
  - E-mails
  - Telefones
  - SMS
  - WiFi
  - Contatos (vCard)
  - Texto simples

- 🚀 **Características Técnicas:**
  - JavaScript puro (ES6+)
  - Sem dependências além do QRCode.js
  - Responsivo com ResizeObserver
  - Otimizado para performance
  - Suporte a módulos ES6
  - Completamente personalizável

## 📦 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/FDBnet/Gerador-de-QR-Code-Universal-PIX-Wi-FI-SMS-URLs-e-mais-
```

2. Inclua os arquivos necessários no seu projeto:
```html
<script type="module" src="gerarQrCode.js"></script>
```

## 🔧 Como Usar

### Exemplo Básico

```javascript
import { gerarQRCode } from './gerarQrCode.js';

// Gerar QR Code simples
await gerarQRCode({
    elementoId: 'meu-qrcode',
    valor: 'Olá Mundo!',
    tipo: 'texto'
});
```

### Exemplo com PIX

```javascript
// Gerar QR Code PIX
await gerarQRCode({
    elementoId: 'qrcode-pix',
    valor: 'Seu-Codigo-PIX-Aqui',
    tipo: 'pix',
    opcoes: {
        width: 350,
        height: 350,
        errorCorrectionLevel: 'Q'
    }
});
```

### Exemplo com WiFi

```javascript
// Gerar QR Code para WiFi
await gerarQRCode({
    elementoId: 'qrcode-wifi',
    valor: {
        nomeRede: 'MinhaRedeWiFi',
        senha: 'MinhaSenha123',
        criptografia: 'WPA'
    },
    tipo: 'wifi'
});
```

### Exemplo com Contato

```javascript
// Gerar QR Code para Contato
await gerarQRCode({
    elementoId: 'qrcode-contato',
    valor: {
        nome: 'João Silva',
        telefone: '11999999999',
        email: 'joao@exemplo.com.br'
    },
    tipo: 'contato'
});
```

## ⚙️ Opções de Configuração

```javascript
const opcoes = {
    // Dimensões
    width: 256,        // Largura do QR Code
    height: 256,       // Altura do QR Code
    margin: 1,         // Margem

    // Cores
    color: {
        dark: '#000000',  // Cor dos módulos
        light: '#FFFFFF'  // Cor do fundo
    },

    // Correção de Erros
    errorCorrectionLevel: 'H', // L, M, Q, H

    // Outros
    version: undefined,    // Versão do QR Code
    maskPattern: undefined // Padrão de máscara
};
```

## 📋 Tipos Suportados

| Tipo     | Descrição                    | Formato do Valor                |
|----------|-----------------------------|---------------------------------|
| `pix`    | QR Code PIX                 | String com código EMV do PIX    |
| `url`    | URLs                        | String com URL                  |
| `email`  | Endereços de e-mail        | String com e-mail               |
| `tel`    | Números de telefone        | String com número               |
| `sms`    | Mensagens SMS              | String com número               |
| `wifi`   | Configurações de WiFi      | Objeto com rede e senha         |
| `contato`| Informações de contato     | Objeto com dados do contato     |
| `texto`  | Texto livre                | String com qualquer texto       |

## 🎨 Personalização CSS

```css
/* Estilo para o container */
#container-qrcode {
    background: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin: 20px auto;
}

/* Estilo para o QR Code */
.qrcode-pix {
    display: block;
    max-width: 100%;
    height: auto;
}
```

## 🔍 Recursos Especiais

- **Responsividade Automática**: Ajusta-se automaticamente ao tamanho do container
- **Debounce Integrado**: Otimiza o redimensionamento
- **Validação de Dados**: Previne erros comuns
- **Formatação Automática**: Formata dados conforme o tipo
- **Suporte a PIX**: Otimizado para o padrão brasileiro

## 📱 Compatibilidade

- Todos os navegadores modernos
- Suporte a ES6+
- Responsivo em dispositivos móveis

## 🛠️ Desenvolvimento

Para contribuir:

1. Faça um Fork do projeto
2. Crie uma Branch para sua Feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🤝 Suporte

- Abra uma issue para reportar bugs
- Abra uma pull request para melhorias
- ⭐ Dê uma estrela se este projeto ajudou você!

---

Feito com ❤️ por [Rodrigo S. Magalhães](https://github.com/FDBnet)
