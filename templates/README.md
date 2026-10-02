# Templates de documentos (HTML → PDF)

Esta pasta recebe os modelos HTML oficiais da Lubian Limpezas. O sistema preenche os
campos dinâmicos e gera o PDF mantendo o layout.

| Arquivo | Documento | Status |
|---|---|---|
| `orcamento-tecnico.html` | Orçamento Técnico (Padrão Luva Branca) | ✅ pronto (original em `_original-orcamento-raissa.html`) |
| `recibo-sinal.html` | Recibo de Sinal (Reserva de Agenda — 50%) | aguardando modelo |
| `recibo-quitacao.html` | Recibo de Quitação (50% / 100%) | aguardando modelo |
| `fatura-mensal.html` | Fatura Mensal (contratos recorrentes) | ✅ pronto (original em `_original-fatura-katiane.html`) |
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

## Testar os documentos prontos

```bash
npm install
npm run orcamento -- exemplos/orcamento-raissa.json saida/orcamento.pdf
npm run fatura    -- exemplos/fatura-katiane.json  saida/fatura.pdf
```

A fatura calcula sozinha os dias do mês a partir dos dias da semana do contrato
(ex.: seg/qua/sex em outubro/2026 = 13 diárias), abate as faltas e monta as duas opções
de pagamento. Feriados ou dias combinados vão em `excluirDias`.

O exemplo reproduz o orçamento da Raíssa: custo R$ 1.200 × 1,35 = R$ 1.620,
desconto especial de 15% → Valor de Tabela R$ 1.905, itens R$ 650 / 400 / 450 / 405.

O logo oficial fica em `assets/logo-lubian.png` (original em alta: `assets/logo-lubian-original.webp`)
e é embutido no PDF, sem depender da internet:
`"logoUrl": "assets/logo-lubian.png"`.
