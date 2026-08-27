# Walkthrough — Exportação GIFT Estilizada com CSS Moove

## Resumo

Foi implementado um **modo de exportação alternativo** na ferramenta de importação de questionários Moodle. O novo modo gera questões GIFT com HTML embutido, utilizando as classes CSS já existentes no tema Moove (`pergunta-texto`, `resposta-card`), para que as perguntas apareçam visualmente formatadas ao serem importadas no Moodle.

## Alterações Realizadas

### 1. [questionario.html] — Linhas 41–48

Adicionado checkbox na interface ao lado do seletor de competência:
- `id="estilizar"` — Permite alternar entre GIFT puro e GIFT com HTML estilizado
- Usa classes Bootstrap (`form-check`, `fw-bold`) para manter consistência visual

### 2. [questionario.js] (/js/questionario.js) — 3 alterações

| Local | Linhas | Descrição |
|-------|--------|-----------|
| Nova função `gerar_gift_estilizado()` | 117–231 | Pós-processa o GIFT puro, adicionando `[html]`, `div.pergunta-texto` e `div.resposta-card` |
| Referência ao checkbox | 235–236 | `const checkbox_estilizar = document.querySelector('#estilizar')` |
| Handler do botão "Processar" | 352–355 | Chamada condicional a `gerar_gift_estilizado()` quando checkbox está marcado |
| Função `baixar_arquivo_txt()` | 262–263 | Sufixo `_estilizado` no nome do arquivo quando checkbox marcado |

### 3. [DOCUMENTACAO.md] — Novo arquivo

Documentação completa com 10 seções:
- Visão geral, estrutura do projeto, formato GIFT
- Fluxo de funcionamento com diagrama
- Documentação detalhada de cada função (incluindo a nova)
- Classes CSS utilizadas com explicação visual
- Pré-requisitos no Moodle
- Exemplos completos (entrada → saída pura → saída estilizada)
- Tabela de solução de problemas

## O que NÃO foi alterado

- A função `ajustar_texto()` permanece intacta — nenhuma mudança na lógica de GIFT puro
- Os botões "Copiar" e "Baixar" já chamam `button_processar.click()` internamente, então herdam o comportamento automaticamente
- A ferramenta "Localizar e Substituir" não foi alterada

## Validação

- ✅ O checkbox **desmarcado** produz exatamente o mesmo GIFT puro de antes (retrocompatibilidade)
- ✅ O checkbox **marcado** adiciona `[html]` + classes CSS sem quebrar a sintaxe GIFT
- ✅ O download diferencia os modos pelo nome do arquivo (`questionario_1.txt` vs `questionario_1_estilizado.txt`)
