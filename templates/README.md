# Templates de documentos (HTML → PDF)

Esta pasta recebe os modelos HTML oficiais da Lubian Limpezas. O sistema preenche os
campos dinâmicos e gera o PDF mantendo o layout.

| Arquivo | Documento | Status |
|---|---|---|
| `orcamento-tecnico.html` | Orçamento Técnico (Padrão Luva Branca) | aguardando modelo |
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
