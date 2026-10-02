# Templates de documentos (HTML → PDF)

Esta pasta recebe os modelos HTML oficiais da Lubian Limpezas. O sistema preenche os
campos dinâmicos e gera o PDF mantendo o layout.

| Arquivo | Documento | Status |
|---|---|---|
| `orcamento-tecnico.html` | Orçamento Técnico (Padrão Luva Branca) | ✅ pronto (original em `_original-orcamento-raissa.html`) |
| `recibo-sinal.html` | Recibo de Sinal (Reserva de Agenda — 50%) | aguardando modelo |
| `recibo-quitacao.html` | Recibo de Quitação (50% / 100%) | aguardando modelo |
| `fatura-mensal.html` | Fatura Mensal (contratos recorrentes) | aguardando modelo |
| `checklist-handover.html` | Checklist / Termo de Entrega | aguardando modelo |

## Como enviar

Cole o HTML completo no chat (um documento por vez) ou faça commit do arquivo nesta
pasta com o nome da tabela acima. Pode enviar **com dados reais de exemplo**: eu
identifico o que é fixo (marca, textos técnicos) e o que vira campo dinâmico.

## Campos dinâmicos

Os valores variáveis viram marcações `{{campo}}`, por exemplo:

```html
<td>{{cliente.nome}}</td>
<td>{{obra.endereco}}</td>
<strong>{{orcamento.valor_final | moeda}}</strong>
{{#each orcamento.itens_escopo}} <li>{{descricao}}</li> {{/each}}
```

Regras do PDF do cliente:
- **Nunca** exibir custos, diárias da equipe ou markup.
- Exibir: Valor de Tabela → Desconto de Parceria → Valor Final, sinal 50% / quitação 50%,
  validade (7 dias) e chave Pix CNPJ 44.883.814/0001-97.

## Testar o Orçamento Técnico

```bash
npm install
npm run orcamento -- exemplos/orcamento-raissa.json saida/orcamento.pdf
```

O exemplo reproduz o orçamento da Raíssa: custo R$ 1.200 × 1,35 = R$ 1.620,
desconto especial de 15% → Valor de Tabela R$ 1.905, itens R$ 650 / 400 / 450 / 405.

Para usar o logo sem depender da internet, salve o arquivo em `assets/` e use
`"logoUrl": "assets/logo-lubian.png"` — ele é embutido no PDF.
