const MAPA_ROTULOS = {
    '1': 'AS01',
    '2': 'AA01',
    '3': 'AS02',
    '4': 'AA02',
    '5': 'AS03',
    '6': 'AA03',
    '7': 'AS04',
    '8': 'AA04',
    '9': 'AS05',
    '10': 'AA05',
    'av': 'AD',
    'noa': 'NOA'
};

const remover_excesso_de_espacos = (texto) => {
    return texto.replaceAll('  ', ' ').trim();

};

const ajustar_texto = (arr_entrada, competencia) => {
    
    // Remover excesso de espaços e linhas vazias.
    let index = 0;
    while (index < arr_entrada.length) {
        arr_entrada[index] = remover_excesso_de_espacos(arr_entrada[index]);
        if (arr_entrada[index] === '') arr_entrada.splice(index, 1);
        else index++;
    }

    // Trocar o símbolo de igual (=) pelo código "&equals;"
    for (let i = 0; i < arr_entrada.length; i++) arr_entrada[i] = arr_entrada[i].replaceAll('=', '&equals;');

    // Trocar o símbolo de til (~) pelo código "&tilde;"
    for (let i = 0; i < arr_entrada.length; i++) arr_entrada[i] = arr_entrada[i].replaceAll('~', '&tilde;');

    // Trocar o símbolo dois dois pontos (::) pelo código "&colon;&colon;"
    for (let i = 0; i < arr_entrada.length; i++) arr_entrada[i] = arr_entrada[i].replaceAll('::', '&colon;&colon;');

    // Trocar o símbolo de chave abrindo ({) pelo código "&lbrace;"
    for (let i = 0; i < arr_entrada.length; i++) arr_entrada[i] = arr_entrada[i].replaceAll('{', '&lbrace;');

    // Trocar o símbolo de chave fechando (}) pelo código "&rbrace;"
    for (let i = 0; i < arr_entrada.length; i++) arr_entrada[i] = arr_entrada[i].replaceAll('}', '&rbrace;');

    // Trocar o símbolo de hashtag (#) pelo código "&num;"
    for (let i = 0; i < arr_entrada.length; i++) arr_entrada[i] = arr_entrada[i].replaceAll('#', '&num;');

    // Trocar o símbolo de tabulação (\t) pelo ""
    for (let i = 0; i < arr_entrada.length; i++) arr_entrada[i] = arr_entrada[i].replaceAll('\t', ' ');

    // Colocar o símbolo de igual (=) na alternativa correta.
    [
        'A) ', 'A. ', 'A- ', 'A - ', 'A– ', 'A – ',
    ].forEach((item) => {
        for (let i = 0; i < arr_entrada.length; i++) {
            if (arr_entrada[i].indexOf(item) === 0) arr_entrada[i] = arr_entrada[i].replace(item, '=');
            else if (arr_entrada[i].indexOf(item.toLowerCase()) === 0) arr_entrada[i] = arr_entrada[i].replace(item.toLowerCase(), '=');
        }
    });

    // Colocar o símbolo de til (~) nas demais alternativas.
    [
        'B) ','B. ', 'B- ', 'B - ', 'B– ', 'B – ',
        'C) ','C. ', 'C- ', 'C - ', 'C– ', 'C – ',
        'D) ','D. ', 'D- ', 'D - ', 'D– ', 'D – ',
        'E) ','E. ', 'E- ', 'E - ', 'E– ', 'E – ',
    ].forEach((item) => {
        for (let i = 0; i < arr_entrada.length; i++) {
            if (arr_entrada[i].indexOf(item) === 0) arr_entrada[i] = arr_entrada[i].replace(item, '~');
            else if (arr_entrada[i].indexOf(item.toLowerCase()) === 0) arr_entrada[i] = arr_entrada[i].replace(item.toLowerCase(), '~');
        }
    });

    // Adicionar o símbolo de hashtag (#) nos comentários.
    for (let i = 1; i < arr_entrada.length; i++) {
        if (['=', '~'].includes(arr_entrada[i - 1][0])) {
            arr_entrada[i] = '#' + arr_entrada[i];
        }
    }

    // Adicionar a competência ou NOA e, o número da questão.
    for (let i = 0; i < arr_entrada.length; i++) {
        for (let j = 1; j <= 99; j++) {
            [
                `${j}) `, `${j}. `, `${j}- `, `${j} - `, `${j}–`, `${j} – `,
            ].forEach((item) => {
                if (arr_entrada[i].indexOf(item) === 0) {
                    let prefixo = MAPA_ROTULOS[competencia] || 'Q';
                    let numero_questao = (j < 10) ? '0' + j : j;
                    arr_entrada[i] = arr_entrada[i].replace(item, `::${prefixo}_Q${numero_questao}::`);
                }
            });
        }
    }

    // Adicionar o símbolo de abertura de chave ({) na linha anterior ao símbolo de igual (=).
    index = 0;
    while (index < arr_entrada.length) {
        if (arr_entrada[index][0] === '=') {
            arr_entrada.splice(index, 0, '{');
            index += 2;
        } else {
            index++;
        }
    }

    // Adicionar o símbolo de fechamento de chave (}) na linha anterior a marcação da questão.
    let primeira_ocorrencia = true;
    index = 0;
    while (index < arr_entrada.length) {
        if (arr_entrada[index].startsWith('::')) {
            if (!primeira_ocorrencia) {
                arr_entrada.splice(index, 0, '}');
                arr_entrada.splice(index + 1, 0, '');
                index += 3;
            } else {
                primeira_ocorrencia = false;
                index++;
                continue;
            }
        } else {
            index++;
        }
    }
    if (arr_entrada.length > 0) arr_entrada.push('}');

    return arr_entrada;

};

/**
 * Transforma o array GIFT puro em formato Moodle XML com HTML estilizado.
 * O formato GIFT não suporta HTML nas alternativas de resposta — apenas no texto da pergunta.
 * O Moodle XML permite definir format="html" em cada resposta individualmente,
 * garantindo que as classes CSS do tema Moove sejam renderizadas corretamente.
 * Utiliza as classes CSS:
 * - .pergunta-texto: estiliza o enunciado da questão.
 * - .resposta-card: estiliza cada alternativa de resposta.
 * @param {string[]} arr_saida - Array de linhas no formato GIFT puro (saída de ajustar_texto).
 * @returns {string} String XML completa no formato Moodle XML.
 */
const gerar_moodle_xml = (arr_saida) => {

    // Array para armazenar as questões extraídas do GIFT.
    let questoes = [];

    // Índice para percorrer o array de entrada.
    let i = 0;

    while (i < arr_saida.length) {
        let linha = arr_saida[i];

        // Pular linhas vazias (separadores entre questões).
        if (linha.trim() === '') {
            i++;
            continue;
        }

        // Linha de título da questão (inicia com ::).
        if (linha.indexOf('::') === 0) {

            // Localizar o fim do título (segundo par de ::).
            let fimTitulo = linha.indexOf('::', 2);

            // Extrair o identificador da questão (ex: AA01_Q01).
            let titulo = linha.substring(2, fimTitulo);

            // Extrair o texto da pergunta que vem após o título.
            let textoPergunta = linha.substring(fimTitulo + 2);

            // Coletar todas as linhas do enunciado até encontrar '{'.
            let linhasTexto = [];
            if (textoPergunta.trim() !== '') {
                linhasTexto.push(textoPergunta);
            }
            i++;
            while (i < arr_saida.length && arr_saida[i] !== '{') {
                if (arr_saida[i].trim() !== '') {
                    linhasTexto.push(arr_saida[i]);
                }
                i++;
            }

            // Avançar além do '{'.
            if (i < arr_saida.length && arr_saida[i] === '{') {
                i++;
            }

            // Extrair alternativas e feedbacks do bloco de respostas.
            let alternativas = [];

            while (i < arr_saida.length && arr_saida[i] !== '}') {
                linha = arr_saida[i];

                // Alternativa correta (=) ou incorreta (~).
                if (linha.length > 0 && (linha[0] === '=' || linha[0] === '~')) {

                    // Determinar se é a resposta correta.
                    let correta = linha[0] === '=';

                    // Extrair o texto da alternativa (sem o marcador).
                    let texto = linha.substring(1);

                    // Verificar se a próxima linha é feedback (#).
                    let feedback = '';
                    if (i + 1 < arr_saida.length && arr_saida[i + 1].length > 0 && arr_saida[i + 1][0] === '#') {
                        i++;
                        feedback = arr_saida[i].substring(1);
                    }

                    alternativas.push({
                        correta: correta,
                        texto: texto,
                        feedback: feedback
                    });
                }
                i++;
            }

            // Avançar além do '}'.
            if (i < arr_saida.length && arr_saida[i] === '}') {
                i++;
            }

            // Armazenar a questão estruturada.
            questoes.push({
                titulo: titulo,
                textoLinhas: linhasTexto,
                alternativas: alternativas
            });
        } else {
            i++;
        }
    }

    // Construir o XML no formato Moodle XML.
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<quiz>\n';

    for (let q of questoes) {

        // Unir linhas do enunciado com <br> para manter quebras de linha.
        let textoHTML = q.textoLinhas.join('<br>');

        xml += '  <question type="multichoice">\n';

        // Nome/título da questão.
        xml += '    <name>\n';
        xml += `      <text>${q.titulo}</text>\n`;
        xml += '    </name>\n';

        // Texto da pergunta com HTML estilizado (classe pergunta-texto).
        xml += '    <questiontext format="html">\n';
        xml += `      <text><![CDATA[<div class="pergunta-texto">${textoHTML}</div>]]></text>\n`;
        xml += '    </questiontext>\n';

        // Feedback geral (vazio).
        xml += '    <generalfeedback format="html">\n';
        xml += '      <text></text>\n';
        xml += '    </generalfeedback>\n';

        // Nota padrão da questão.
        xml += '    <defaultgrade>1.0000000</defaultgrade>\n';

        // Penalidade para tentativas múltiplas.
        xml += '    <penalty>0.3333333</penalty>\n';
        xml += '    <hidden>0</hidden>\n';

        // Resposta única (múltipla escolha com uma correta).
        xml += '    <single>true</single>\n';

        // Embaralhar alternativas.
        xml += '    <shuffleanswers>true</shuffleanswers>\n';

        // Numeração das alternativas (a, b, c...) pelo Moodle.
        xml += '    <answernumbering>abc</answernumbering>\n';

        // Feedback padrão para resposta correta.
        xml += '    <correctfeedback format="html">\n';
        xml += '      <text><![CDATA[Sua resposta está correta.]]></text>\n';
        xml += '    </correctfeedback>\n';

        // Feedback padrão para resposta incorreta.
        xml += '    <incorrectfeedback format="html">\n';
        xml += '      <text><![CDATA[Sua resposta está incorreta.]]></text>\n';
        xml += '    </incorrectfeedback>\n';

        // Gerar cada alternativa com HTML estilizado (classe resposta-card).
        for (let alt of q.alternativas) {

            // fraction="100" para correta, "0" para incorreta.
            let fraction = alt.correta ? '100' : '0';

            xml += `    <answer fraction="${fraction}" format="html">\n`;
            xml += `      <text><![CDATA[<div class="resposta-card">${alt.texto}</div>]]></text>\n`;
            xml += '      <feedback format="html">\n';
            xml += `        <text><![CDATA[${alt.feedback}]]></text>\n`;
            xml += '      </feedback>\n';
            xml += '    </answer>\n';
        }

        xml += '  </question>\n';
    }

    xml += '</quiz>\n';

    return xml;

};

const select_competencia = document.querySelector('#competencia');

// Referência ao checkbox de estilização HTML.
const checkbox_estilizar = document.querySelector('#estilizar');

const textarea_entrada = document.querySelector('#entrada');

const textarea_saida = document.querySelector('#saida');

const button_ajuda = document.querySelector('#ajuda');

const button_processar = document.querySelector('#processar');

const button_copiar = document.querySelector('#copiar');

const button_limpar = document.querySelector('#limpar');

const button_mais_ferramentas = document.querySelector('#mais-ferramentas');

const div_mais_ferramentas = document.querySelector('div.mais-ferramentas');

const button_baixar = document.querySelector('#baixar');

const baixar_arquivo = () => {

    let texto = textarea_saida.value;
    
    let link = document.createElement('a');

    // Definir MIME type e extensão conforme o modo de exportação.
    let mimeType = checkbox_estilizar.checked ? 'text/xml' : 'text/plain';
    let extensao = checkbox_estilizar.checked ? 'xml' : 'txt';
    let prefixo = MAPA_ROTULOS[select_competencia.value.toLowerCase()] || select_competencia.value;

    link.href = `data:${mimeType};charset=utf-8,` + encodeURIComponent(texto);
    link.download = `questionario_${prefixo}.${extensao}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

};

button_ajuda.addEventListener('click', () => {

    window.location.assign('https://github.com/joelsonalves/moodle');

});

textarea_entrada.placeholder = [
    '1) Texto da questão',
    'Suporte da questão',
    'A) alternativa 1',
    'Feedback alternativa 1',
    'b) alternativa 2',
    'Feedback alternativa 2',
    '',
    '2- Texto da questão',
    'Suporte da questão',
    'a- alternativa 1',
    'Feedback alternativa 1',
    'B- alternativa 2',
    'Feedback alternativa 2',
    '',
    '3 - Texto da questão',
    'Suporte da questão',
    'B - alternativa 1',
    'Feedback alternativa 1',
    'b - alternativa 2',
    'Feedback alternativa 2',
    '',
    '4. Texto da questão',
    'Suporte da questão',
    'A. alternativa 1',
    'Feedback alternativa 1',
    'b. alternativa 2',
    'Feedback alternativa 2',
].join('\n');

const atualizar_placeholder = () => {
    let valor_selecionado = select_competencia.value.toLowerCase();
    let prefixo = MAPA_ROTULOS[valor_selecionado] || 'Q';

    textarea_saida.placeholder = [
        `::${prefixo}_Q01::Texto da questão`,
        'Suporte da questão',
        '{',
        '=alternativa 1',
        '#Feedback alternativa 1',
        '~alternativa 2',
        '#Feedback alternativa 2',
        '}',
        '',
        `::${prefixo}_Q02::Texto da questão`,
        'Suporte da questão',
        '{',
        '=alternativa 1',
        '#Feedback alternativa 1',
        '~alternativa 2',
        '#Feedback alternativa 2',
        '}',
        '',
        `::${prefixo}_Q03::Texto da questão`,
        'Suporte da questão',
        '~alternativa 1',
        '#Feedback alternativa 1',
        '~alternativa 2',
        '#Feedback alternativa 2',
        '}',
        '',
        `::${prefixo}_Q04::Texto da questão`,
        'Suporte da questão',
        '{',
        '=alternativa 1',
        '#Feedback alternativa 1',
        '~alternativa 2',
        '#Feedback alternativa 2',
        '}'
    ].join('\n');
};

// Atualiza imediatamente e também a cada mudança no select
atualizar_placeholder();
select_competencia.addEventListener('change', atualizar_placeholder);

button_processar.addEventListener('click', () => {

    if (textarea_entrada.value !== '') {

        let arr_entrada = textarea_entrada.value.split('\n');
        arr_entrada = ajustar_texto(arr_entrada, select_competencia.value.toLowerCase());

        // Gerar Moodle XML com HTML estilizado ou GIFT puro.
        if (checkbox_estilizar.checked) {
            textarea_saida.value = gerar_moodle_xml(arr_entrada);
        } else {
            textarea_saida.value = arr_entrada.join('\n');
        }

    } else alert('Não há questionário para processar!')

});

button_copiar.addEventListener('click', async () => {

    if (textarea_entrada.value !== '') button_processar.click();
    if (textarea_saida.value !== '') await navigator.clipboard.writeText(textarea_saida.value);
    else alert('Por hora, não há nada para ser colocado na área de transferência!');

});

button_baixar.addEventListener('click', () => {

    if (textarea_entrada.value !== '') button_processar.click();
    if (textarea_saida.value !== '') baixar_arquivo();
    else alert('Por hora, não há nada para ser baixado!');

});

button_limpar.addEventListener('click', () => {

    textarea_entrada.value = '';
    textarea_saida.value = '';

});

button_mais_ferramentas.addEventListener('click', () => {
    if (div_mais_ferramentas.style.display === 'none') div_mais_ferramentas.style.display = 'block';
    else div_mais_ferramentas.style.display = 'none';
});

button_mais_ferramentas.click();

div_mais_ferramentas.querySelector('section.localizar-e-substituir button').addEventListener('click', () => {
    let input_localizar = div_mais_ferramentas.querySelectorAll('section.localizar-e-substituir input')[0];
    let input_substituir = div_mais_ferramentas.querySelectorAll('section.localizar-e-substituir input')[1];
    textarea_entrada.value = textarea_entrada.value.replaceAll(input_localizar.value, input_substituir.value);
    input_localizar.value = '';
    input_substituir.value = '';
});
