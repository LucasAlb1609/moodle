# Documentação — Importação de Questionário Moodle via GIFT e Moodle XML

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Estrutura do Projeto](#2-estrutura-do-projeto)
3. [Formato GIFT](#3-formato-gift)
4. [Formato Moodle XML](#4-formato-moodle-xml)
5. [Fluxo de Funcionamento](#5-fluxo-de-funcionamento)
6. [Funções do Script](#6-funções-do-script)
7. [Modo Estilizado (Moodle XML + CSS Moove)](#7-modo-estilizado-moodle-xml--css-moove)
8. [Classes CSS Utilizadas](#8-classes-css-utilizadas)
9. [Pré-requisitos no Moodle](#9-pré-requisitos-no-moodle)
10. [Exemplos Completos](#10-exemplos-completos)
11. [Solução de Problemas](#11-solução-de-problemas)

---

## 1. Visão Geral

Este projeto é uma ferramenta web que facilita a criação de questionários para importação no [Moodle](https://moodle.org/).

O usuário cola texto com questões numeradas e alternativas em um campo de entrada, seleciona a competência ou unidade correspondente, e o script converte automaticamente o texto — pronto para ser importado diretamente no Moodle como banco de questões.

### Dois modos de exportação

| Modo | Formato | Extensão | Estilização |
|------|---------|----------|-------------|
| **Padrão** | GIFT (texto plano) | `.txt` | Sem estilização |
| **Estilizado** | Moodle XML (com HTML) | `.xml` | Classes CSS do tema Moove |

### Por que Moodle XML e não GIFT para o modo estilizado?

O formato GIFT aceita o marcador `[html]` apenas no **texto da pergunta**. As **alternativas de resposta** são sempre tratadas como texto plano, tornando impossível estilizá-las via GIFT.

O formato **Moodle XML** permite definir `format="html"` individualmente em cada elemento — tanto na pergunta quanto em **cada alternativa de resposta** — garantindo que o HTML com as classes CSS seja renderizado corretamente.

---

## 2. Estrutura do Projeto

```
moodle/
├── index.html              # Página inicial (redireciona para questionario.html)
├── questionario.html       # Interface principal da ferramenta
├── css/
│   └── questionario.css    # Estilos da interface da ferramenta
├── js/
│   ├── index.js            # Script de redirecionamento
│   └── questionario.js     # Lógica principal de conversão
├── DOCUMENTACAO.md          # Este arquivo
└── README.md               # Informações básicas e links
```

### Descrição dos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `index.html` | Redireciona automaticamente para `questionario.html` |
| `questionario.html` | Interface com dois textareas (entrada e saída), dropdown de competência, checkbox de estilização e botões de ação |
| `questionario.css` | Estilos visuais da interface (fontes, layout, botões) |
| `index.js` | Uma linha: `window.location.assign('./questionario.html')` |
| `questionario.js` | Contém toda a lógica: parsing de texto, escaping GIFT, e geração de Moodle XML estilizado |

---

## 3. Formato GIFT

O GIFT (_General Import Format Technology_) é um formato de texto plano reconhecido pelo Moodle para importação em massa de questões.

### Sintaxe Básica

```
::Título da Questão::Texto da pergunta{
=Alternativa correta
#Feedback para alternativa correta
~Alternativa incorreta 1
#Feedback para alternativa incorreta 1
~Alternativa incorreta 2
#Feedback para alternativa incorreta 2
}
```

### Caracteres Especiais

| Caractere | Significado no GIFT | Entidade de Escape |
|-----------|--------------------|--------------------|
| `=` | Alternativa correta (início de linha dentro de `{ }`) | `&equals;` |
| `~` | Alternativa incorreta (início de linha dentro de `{ }`) | `&tilde;` |
| `::` | Delimitador de título | `&colon;&colon;` |
| `{` | Início do bloco de alternativas | `&lbrace;` |
| `}` | Fim do bloco de alternativas | `&rbrace;` |
| `#` | Início de feedback (após alternativa) | `&num;` |

### Limitação do GIFT

O marcador `[html]` no formato GIFT só funciona para o **texto da pergunta**. As alternativas de resposta são sempre renderizadas como texto plano, impedindo a estilização CSS das opções.

---

## 4. Formato Moodle XML

O Moodle XML é o formato de importação mais completo do Moodle. Permite controle total sobre cada elemento da questão.

### Estrutura Básica

```xml
<?xml version="1.0" encoding="UTF-8"?>
<quiz>
  <question type="multichoice">
    <name>
      <text>Título</text>
    </name>
    <questiontext format="html">
      <text><![CDATA[<div class="pergunta-texto">Texto da pergunta</div>]]></text>
    </questiontext>
    <defaultgrade>1.0000000</defaultgrade>
    <penalty>0.3333333</penalty>
    <hidden>0</hidden>
    <single>true</single>
    <shuffleanswers>true</shuffleanswers>
    <answernumbering>abc</answernumbering>
    <answer fraction="100" format="html">
      <text><![CDATA[<div class="resposta-card">Alternativa correta</div>]]></text>
      <feedback format="html">
        <text><![CDATA[Feedback]]></text>
      </feedback>
    </answer>
    <answer fraction="0" format="html">
      <text><![CDATA[<div class="resposta-card">Alternativa incorreta</div>]]></text>
      <feedback format="html">
        <text><![CDATA[Feedback]]></text>
      </feedback>
    </answer>
  </question>
</quiz>
```

### Elementos-chave

| Elemento | Atributo | Descrição |
|----------|----------|-----------|
| `<questiontext>` | `format="html"` | Texto da pergunta interpretado como HTML |
| `<answer>` | `format="html"` | Texto da alternativa interpretado como HTML |
| `<answer>` | `fraction="100"` | Alternativa correta (100% do peso) |
| `<answer>` | `fraction="0"` | Alternativa incorreta (0% do peso) |
| `<![CDATA[...]]>` | — | Bloco seguro para inserir HTML sem conflito com XML |
| `<single>` | — | `true` = resposta única; `false` = múltiplas respostas |
| `<shuffleanswers>` | — | `true` = embaralhar alternativas a cada tentativa |
| `<answernumbering>` | — | `abc` = letras minúsculas do Moodle |

---

## 5. Fluxo de Funcionamento

```
┌─────────────────────────────────────────────────────────────┐
│  1. Usuário cola o texto das questões no campo "Entrada"    │
│     (formato livre: numeração + alternativas com letras)    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Seleciona a competência no dropdown (C01–C10, AV, NOA)  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  3. (Opcional) Marca o checkbox                              │
│     "Exportar como Moodle XML estilizado (CSS Moove)"        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Clica em "Processar", "Copiar" ou "Baixar"              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────┴──────────┐
              │   ajustar_texto()   │  ← Converte para GIFT puro
              └──────────┬──────────┘
                         │
            ┌────────────┴────────────┐
            │  Checkbox marcado?      │
            ├───── SIM ──┐            │
            │             ▼           │
            │  gerar_moodle_xml()     │
            │  (GIFT → Moodle XML     │
            │   com HTML estilizado)  │
            ├─────────────┘   NÃO ───┤
            │  (GIFT puro como .txt)  │
            └────────────┬────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Resultado exibido no campo "Saída"                      │
│     → Copiar para clipboard OU Baixar como .txt / .xml      │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Importar no Moodle                                      │
│     • GIFT puro: Formato GIFT                               │
│     • Estilizado: Formato Moodle XML                        │
│     (Administração > Banco de questões > Importar)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Funções do Script

### `remover_excesso_de_espacos(texto)`

**Localização**: `questionario.js`, linha 1  
**Objetivo**: Remove espaços duplos consecutivos e espaços no início/fim.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `texto` | `string` | Texto a ser limpo |
| **Retorno** | `string` | Texto sem espaços excessivos |

---

### `ajustar_texto(arr_entrada, competencia)`

**Localização**: `questionario.js`, linha 6  
**Objetivo**: Função principal de conversão. Transforma texto livre em formato GIFT puro.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `arr_entrada` | `string[]` | Linhas do texto original (split por `\n`) |
| `competencia` | `string` | Valor da competência (`"1"` a `"10"`, `"av"`, `"noa"`) |
| **Retorno** | `string[]` | Array de linhas no formato GIFT |

**Etapas internas:**

1. **Limpeza** — Remove espaços excessivos e linhas vazias
2. **Escaping** — Substitui caracteres especiais GIFT por entidades HTML (`=` → `&equals;`, `~` → `&tilde;`, etc.)
3. **Marcação da alternativa correta** — Identifica variações da alternativa A (`A) `, `A. `, `A- `, etc.) e substitui por `=`
4. **Marcação das incorretas** — Alternativas B a E recebem `~`
5. **Feedbacks** — Linhas após alternativa recebem `#`
6. **Título** — Numeração formatada como `::C01_Q01::`, `::AV_Q01::` ou `::NOA_Q01::`
7. **Delimitadores** — Insere `{` e `}` ao redor das alternativas

---

### `gerar_moodle_xml(arr_saida)`

**Localização**: `questionario.js`, linha 128  
**Objetivo**: Converte o GIFT puro (saída de `ajustar_texto`) em Moodle XML com HTML estilizado.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `arr_saida` | `string[]` | Array de linhas GIFT puro |
| **Retorno** | `string` | String XML completa no formato Moodle XML |

**Processamento em duas fases:**

**Fase 1 — Extração estruturada** (linhas 130–219):
- Percorre o array GIFT e extrai cada questão como objeto:
  ```javascript
  { titulo: "C01_Q01", textoLinhas: [...], alternativas: [{correta, texto, feedback}, ...] }
  ```

**Fase 2 — Construção XML** (linhas 222–293):
- Gera o cabeçalho XML e a tag `<quiz>`
- Para cada questão:
  - Envolve o texto com `<div class="pergunta-texto">` dentro de `<questiontext format="html">`
  - Envolve cada alternativa com `<div class="resposta-card">` dentro de `<answer format="html">`
  - Usa `<![CDATA[...]]>` para isolar o HTML do parsing XML
  - Define `fraction="100"` para a correta e `fraction="0"` para incorretas

---

### `baixar_arquivo()`

**Localização**: `questionario.js`, linha 320  
**Objetivo**: Cria e dispara o download do arquivo com o conteúdo do textarea de saída.

| Modo | MIME Type | Extensão | Exemplo |
|------|-----------|----------|---------|
| GIFT puro | `text/plain` | `.txt` | `questionario_1.txt` |
| Moodle XML | `text/xml` | `.xml` | `questionario_1.xml` |

---

## 7. Modo Estilizado (Moodle XML + CSS Moove)

### O que é

O modo estilizado gera questões no formato **Moodle XML** com HTML embutido. O HTML usa classes CSS já definidas no SCSS do tema Moove do Moodle.

### Como usar

1. Cole as questões no campo "Entrada"
2. Selecione a competência
3. **Marque o checkbox** "Exportar como Moodle XML estilizado (CSS Moove)"
4. Clique em **Baixar** → O arquivo `.xml` será gerado
5. No Moodle, importe como **Formato Moodle XML** (não GIFT!)
   - `Banco de questões → Importar → Formato do arquivo: Formato Moodle XML`

### Por que não GIFT?

O formato GIFT possui uma limitação fundamental: o marcador `[html]` só é aplicado ao **texto da pergunta**. As alternativas de resposta são sempre renderizadas como texto plano. Isso significa que tags HTML dentro das alternativas aparecem como texto cru em vez de serem interpretadas como HTML.

O Moodle XML resolve isso permitindo `format="html"` em cada `<answer>` individualmente.

### Configurações geradas no XML

| Tag | Valor | Significado |
|-----|-------|-------------|
| `<single>` | `true` | Apenas uma resposta correta |
| `<shuffleanswers>` | `true` | Alternativas embaralhadas a cada tentativa |
| `<answernumbering>` | `abc` | Moodle numera com a, b, c, d... |
| `<defaultgrade>` | `1.0` | Peso padrão de 1 ponto |
| `<penalty>` | `0.333` | Penalidade de 33% por tentativa errada |

---

## 8. Classes CSS Utilizadas

As classes abaixo devem estar definidas no campo **"SCSS puro theme_moove | scss"** nas configurações do tema Moove:

### `.pergunta-texto`

Estiliza o enunciado da questão.

```css
.pergunta-texto {
  font-size: 1.15rem;
  font-weight: 500;
  color: #1a202c;
  line-height: 1.6;
  margin-top: 10px;
  margin-bottom: 20px;
}
```

**Efeito visual**: Texto com fonte maior, peso médio, cor escura e espaçamento generoso.

### `.pergunta-destaque` _(uso manual)_

Classe para destacar termos específicos. **Não é aplicada automaticamente** — o usuário pode usá-la manualmente no editor do Moodle.

```css
.pergunta-destaque {
  background-color: #fff9c4;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
}
```

### `.resposta-card`

Estiliza cada alternativa de resposta.

```css
.resposta-card {
  display: block;
  background-color: #f8f9fa;
  border: 1px solid #e3e8ee;
  border-radius: 8px;
  padding: 12px 16px;
  margin: 4px 0;
  transition: all 0.3s ease;
  font-size: 1rem;
  color: #4a5568;
}

.resposta-card:hover {
  background-color: #ffffff;
  border-color: #0f6cbf;
  box-shadow: 0 4px 12px rgba(15, 108, 191, 0.1);
  transform: translateX(4px);
}
```

**Efeito visual**: Cada alternativa aparece como um "card" com fundo claro, bordas arredondadas e efeito interativo ao passar o mouse (movimento lateral + sombra azul). A numeração (a, b, c...) é adicionada automaticamente pelo Moodle.

---

## 9. Pré-requisitos no Moodle

Para que as questões estilizadas funcionem corretamente:

1. **Tema Moove** deve estar instalado e ativo
2. As classes CSS listadas na seção 8 devem estar no campo **"SCSS puro"** do tema:
   - Acesse: `Administração do site → Aparência → Tema Moove → Avançado → SCSS puro`
3. Ao importar o arquivo `.xml` estilizado, selecione o formato correto:
   - Acesse: `Banco de questões → Importar → Formato do arquivo: Formato Moodle XML`
   - ⚠️ **Não selecione** "Formato GIFT" para arquivos `.xml`

> **Nota**: As tags HTML usadas (`<div>`, `<strong>`, `<br>`) são consideradas seguras pelo Moodle e não são filtradas.

---

## 10. Exemplos Completos

### Entrada (texto livre)

```
1) Qual é a capital do Brasil?
A) Brasília
Correto! Brasília é a capital federal desde 1960.
B) São Paulo
Incorreto. São Paulo é a maior cidade, mas não é a capital.
C) Rio de Janeiro
Incorreto. O Rio foi capital até 1960.

2) Qual o maior planeta do Sistema Solar?
A) Júpiter
Correto! Júpiter tem mais de 1.300 vezes o volume da Terra.
B) Saturno
Incorreto. Saturno é o segundo maior.
C) Netuno
Incorreto. Netuno é o quarto maior.
```

### Saída — Modo GIFT Puro (checkbox desmarcado → `.txt`)

```
::C01_Q01::Qual é a capital do Brasil?
{
=Brasília
#Correto! Brasília é a capital federal desde 1960.
~São Paulo
#Incorreto. São Paulo é a maior cidade, mas não é a capital.
~Rio de Janeiro
#Incorreto. O Rio foi capital até 1960.
}

::C01_Q02::Qual o maior planeta do Sistema Solar?
{
=Júpiter
#Correto! Júpiter tem mais de 1.300 vezes o volume da Terra.
~Saturno
#Incorreto. Saturno é o segundo maior.
~Netuno
#Incorreto. Netuno é o quarto maior.
}
```

**Importar como**: Formato GIFT

### Saída — Modo Estilizado (checkbox marcado → `.xml`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<quiz>
  <question type="multichoice">
    <name>
      <text>C01_Q01</text>
    </name>
    <questiontext format="html">
      <text><![CDATA[<div class="pergunta-texto">Qual é a capital do Brasil?</div>]]></text>
    </questiontext>
    <generalfeedback format="html">
      <text></text>
    </generalfeedback>
    <defaultgrade>1.0000000</defaultgrade>
    <penalty>0.3333333</penalty>
    <hidden>0</hidden>
    <single>true</single>
    <shuffleanswers>true</shuffleanswers>
    <answernumbering>abc</answernumbering>
    <correctfeedback format="html">
      <text><![CDATA[Sua resposta está correta.]]></text>
    </correctfeedback>
    <incorrectfeedback format="html">
      <text><![CDATA[Sua resposta está incorreta.]]></text>
    </incorrectfeedback>
    <answer fraction="100" format="html">
      <text><![CDATA[<div class="resposta-card">Brasília</div>]]></text>
      <feedback format="html">
        <text><![CDATA[Correto! Brasília é a capital federal desde 1960.]]></text>
      </feedback>
    </answer>
    <answer fraction="0" format="html">
      <text><![CDATA[<div class="resposta-card">São Paulo</div>]]></text>
      <feedback format="html">
        <text><![CDATA[Incorreto. São Paulo é a maior cidade, mas não é a capital.]]></text>
      </feedback>
    </answer>
    <answer fraction="0" format="html">
      <text><![CDATA[<div class="resposta-card">Rio de Janeiro</div>]]></text>
      <feedback format="html">
        <text><![CDATA[Incorreto. O Rio foi capital até 1960.]]></text>
      </feedback>
    </answer>
  </question>
</quiz>
```

**Importar como**: Formato Moodle XML

---

## 11. Solução de Problemas

| Problema | Causa Provável | Solução |
|----------|---------------|---------|
| HTML aparece como texto nas alternativas | Arquivo importado como GIFT em vez de Moodle XML | Importar como **Formato Moodle XML** |
| Questões sem estilo no Moodle | Classes CSS não estão no SCSS do tema | Adicionar as classes na seção "SCSS puro" do tema Moove |
| Alternativa A não marcada como correta | Formatação da letra A diferente do esperado | Usar: `A) `, `A. `, `A- `, `A - `, `A– `, `A – ` |
| Caracteres especiais corrompidos | Falta de escaping | O script escapa `=`, `~`, `::`, `{`, `}`, `#` automaticamente |
| Feedbacks não aparecem | Sem linha de feedback após alternativa | Adicionar texto logo após cada alternativa |
| Numeração não detectada | Formato não suportado | Usar: `1) `, `1. `, `1- `, `1 - `, `1–`, ou `1 – ` |
| Letras A/B/C duplicadas | Letras no HTML + numeração do Moodle | Normal — no modo XML, o Moodle adiciona suas letras (a,b,c) automaticamente |
| Erro de importação XML | XML malformado | Verificar se o arquivo não foi editado manualmente e perdeu tags |
