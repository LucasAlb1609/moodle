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

// Modo seleção (AVA Prova): códigos usados no nome único de cada questão.
const MODALIDADES = { INT: 'Integrado', SUB: 'Subsequente', EAD: 'EAD' };
const MATERIAS = { POR: 'Português', MAT: 'Matemática' };
const QUANTIDADE_DE_ASSUNTOS = 10;

// Questão: "1) ", "1. ", "1 - ", "QUESTÃO 08", "Questão 10" etc.
const REGEX_INICIO_QUESTAO = /^(?:quest[ãa]o\s+(\d+)\s*|(\d+)\s*[\)\.\-–]\s+)/i;

const remover_excesso_de_espacos = (texto) => {
    return texto.replaceAll('  ', ' ').trim();

};

/**
 * Desfaz o escape do GIFT (feito em ajustar_texto) para o texto voltar a ser o
 * que o professor escreveu, antes de ir para o HTML do Moodle XML.
 * @param {string} texto - Texto com as entidades do GIFT (&equals;, &tilde; ...).
 * @returns {string} Texto original.
 */
const desfazer_escape_gift = (texto) => {
    return texto
        .replaceAll('&colon;&colon;', '::')
        .replaceAll('&equals;', '=')
        .replaceAll('&tilde;', '~')
        .replaceAll('&lbrace;', '{')
        .replaceAll('&rbrace;', '}')
        .replaceAll('&num;', '#');
};

/**
 * Escapa &, < e > para o texto entrar no HTML do Moodle XML como texto.
 * Sem isso, "x<3" vira início de tag e some na importação, e "]]>" quebraria o CDATA.
 * @param {string} texto - Texto puro.
 * @returns {string} Texto seguro para HTML.
 */
const escapar_html = (texto) => {
    return texto
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
};

// Texto que veio do GIFT, pronto para o HTML do Moodle XML.
const texto_para_html = (texto) => escapar_html(desfazer_escape_gift(texto));

const ajustar_texto = (arr_entrada, prefixo) => {
    
    // Remover excesso de espaços, linhas vazias e marcações de nível de dificuldade.
    let index = 0;
    while (index < arr_entrada.length) {
        arr_entrada[index] = remover_excesso_de_espacos(arr_entrada[index]);
        
        // Normalizar a linha (sem acentos e minúscula) para facilitar a busca
        let linha_norm = arr_entrada[index].normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
        
        // Identificar se a linha é sobre dificuldade
        let eh_dificuldade = linha_norm.includes('nivel de dificuldade') || 
                             (linha_norm.includes('facil') && linha_norm.includes('medio') && linha_norm.includes('dificil'));

        if (arr_entrada[index] === '' || eh_dificuldade) {
            arr_entrada.splice(index, 1);
        } else {
            index++;
        }
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

    // Adicionar o símbolo de hashtag (#) nos comentários: a linha logo após uma
    // alternativa, desde que não seja outra alternativa nem o início da próxima
    // questão (o comentário é opcional; sem ele, a questão seguinte se perdia).
    for (let i = 1; i < arr_entrada.length; i++) {
        let anterior_eh_alternativa = ['=', '~'].includes(arr_entrada[i - 1][0]);
        let atual_eh_alternativa = ['=', '~'].includes(arr_entrada[i][0]);
        let atual_eh_questao = REGEX_INICIO_QUESTAO.test(arr_entrada[i]);
        if (anterior_eh_alternativa && !atual_eh_alternativa && !atual_eh_questao) {
            arr_entrada[i] = '#' + arr_entrada[i];
        }
    }

    // Adicionar o prefixo (rótulo da EAD ou código da seleção) e o número da questão.
    for (let i = 0; i < arr_entrada.length; i++) {
        let match = arr_entrada[i].match(REGEX_INICIO_QUESTAO);

        if (match) {
            let num = match[1] || match[2];
            let j = parseInt(num, 10);
            let numero_questao = (j < 10) ? '0' + j : j;
            
            arr_entrada[i] = arr_entrada[i].replace(match[0], `::${prefixo}_Q${numero_questao}::`);
        }
    }

    // Adicionar o símbolo de abertura de chave ({) antes da primeira alternativa da
    // questão (= ou ~). Abrir só antes do "=" fundia a questão sem alternativa
    // correta com a seguinte, e a conferência da seleção não percebia.
    index = 0;
    while (index < arr_entrada.length) {
        let eh_alternativa = ['=', '~'].includes(arr_entrada[index][0]);
        let anterior = index > 0 ? arr_entrada[index - 1][0] : '';
        if (eh_alternativa && !['=', '~', '#'].includes(anterior)) {
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
 * @returns {object[]} Questões: { titulo, textoLinhas, alternativas: [{ correta, texto, feedback }] }.
 */
const extrair_questoes = (arr_saida) => {

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

    return questoes;

};

/**
 * Confere as questões antes de gerar o arquivo da seleção: cada uma precisa de
 * exatamente uma alternativa correta e de ao menos duas alternativas, e o número
 * da questão não pode se repetir (o nome é o código que o candidato cita no recurso).
 * @param {object[]} questoes - Saída de extrair_questoes.
 * @returns {string[]} Problemas encontrados (vazio quando está tudo certo).
 */
const conferir_questoes = (questoes) => {

    let problemas = [];
    let vistos = new Set();

    if (questoes.length === 0) problemas.push('Nenhuma questão encontrada. Confira a numeração ("1) ", "2. " ...).');

    for (let q of questoes) {
        let corretas = q.alternativas.filter((alt) => alt.correta).length;
        if (corretas !== 1) problemas.push(`${q.titulo}: ${corretas} alternativas corretas (precisa ser exatamente 1, a letra A).`);
        if (q.alternativas.length < 2) problemas.push(`${q.titulo}: só ${q.alternativas.length} alternativa(s).`);
        if (vistos.has(q.titulo)) problemas.push(`${q.titulo}: número de questão repetido.`);
        vistos.add(q.titulo);
    }

    return problemas;

};

/**
 * Gera o Moodle XML com HTML estilizado.
 * @param {object[]} questoes - Saída de extrair_questoes.
 * @param {object} opcoes - { categoria: caminho da pasta ou null, mostrarCodigo: mostra o nome da questão ao candidato }.
 * @returns {string} String XML completa no formato Moodle XML.
 */
const gerar_moodle_xml = (questoes, opcoes = {}) => {

    // Construir o XML no formato Moodle XML.
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<quiz>\n';

    // Pasta de destino: sem o contexto ($course$ etc.), o Moodle cria a pasta no
    // banco de questões em que a importação é feita.
    if (opcoes.categoria) {
        xml += '  <question type="category">\n';
        xml += '    <category>\n';
        xml += `      <text>${escapar_html(opcoes.categoria)}</text>\n`;
        xml += '    </category>\n';
        xml += '  </question>\n';
    }

    for (let q of questoes) {

        // Unir linhas do enunciado com <br> para manter quebras de linha.
        let textoHTML = q.textoLinhas.map(texto_para_html).join('<br>');

        // Código da questão visível ao candidato (a revisão do Moodle não mostra o nome).
        let codigoHTML = opcoes.mostrarCodigo
            ? `<p class="questao-codigo">Código da questão: ${escapar_html(q.titulo)}</p>`
            : '';

        xml += '  <question type="multichoice">\n';

        // Nome/título da questão.
        xml += '    <name>\n';
        xml += `      <text>${escapar_html(q.titulo)}</text>\n`;
        xml += '    </name>\n';

        // Texto da pergunta com HTML estilizado (classe pergunta-texto).
        xml += '    <questiontext format="html">\n';
        xml += `      <text><![CDATA[${codigoHTML}<div class="pergunta-texto">${textoHTML}</div>]]></text>\n`;
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
            xml += `      <text><![CDATA[<div class="resposta-card">${texto_para_html(alt.texto)}</div>]]></text>\n`;
            xml += '      <feedback format="html">\n';
            xml += `        <text><![CDATA[${texto_para_html(alt.feedback)}]]></text>\n`;
            xml += '      </feedback>\n';
            xml += '    </answer>\n';
        }

        xml += '  </question>\n';
    }

    xml += '</quiz>\n';

    return xml;

};

const select_modo = document.querySelector('#modo');

const div_campos_ead = document.querySelector('#campos-ead');

const div_campos_selecao = document.querySelector('#campos-selecao');

const input_selecao = document.querySelector('#selecao');

const select_modalidade = document.querySelector('#modalidade');

const select_materia = document.querySelector('#materia');

const select_assunto = document.querySelector('#assunto');

const checkbox_incluir_pasta = document.querySelector('#incluir-pasta');

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

const modo_selecao = () => select_modo.value === 'selecao';

// Assuntos 01 a 10 no seletor do modo seleção.
for (let n = 1; n <= QUANTIDADE_DE_ASSUNTOS; n++) {
    let codigo = String(n).padStart(2, '0');
    select_assunto.add(new Option(`Assunto ${codigo}`, codigo));
}

/**
 * Lê os campos do modo seleção.
 * @returns {object} { erro } ou { prefixo: "2027.1_SUB_POR_A03", categoria: "top/Português/Assunto 03" }.
 */
const ler_campos_selecao = () => {

    let selecao = input_selecao.value.trim();
    if (!/^\d{4}\.\d$/.test(selecao)) return { erro: 'Informe a seleção no formato ano.semestre, por exemplo 2027.1.' };

    let materia = select_materia.value;
    let assunto = select_assunto.value;

    return {
        prefixo: `${selecao}_${select_modalidade.value}_${materia}_A${assunto}`,
        categoria: `top/${MATERIAS[materia]}/Assunto ${assunto}`,
    };

};

const baixar_arquivo = () => {

    let texto = textarea_saida.value;

    let link = document.createElement('a');

    // Definir MIME type, extensão e nome conforme o modo de exportação.
    let xml = modo_selecao() || checkbox_estilizar.checked;
    let mimeType = xml ? 'text/xml' : 'text/plain';
    let extensao = xml ? 'xml' : 'txt';
    let nome = modo_selecao()
        ? `selecao_${ler_campos_selecao().prefixo}`
        : `questionario_${MAPA_ROTULOS[select_competencia.value.toLowerCase()] || select_competencia.value}`;

    link.href = `data:${mimeType};charset=utf-8,` + encodeURIComponent(texto);
    link.download = `${nome}.${extensao}`;

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
    if (modo_selecao()) {
        let campos = ler_campos_selecao();
        let exemplo = campos.prefixo || '2027.1_SUB_POR_A03';
        textarea_saida.placeholder = [
            'O arquivo Moodle XML aparece aqui.',
            '',
            `Cada questão recebe o código ${exemplo}_Q01, ${exemplo}_Q02 ...,`,
            'mostrado ao candidato no início da questão.',
        ].join('\n');
        return;
    }

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

// Mostra os campos do modo escolhido e limpa a saída do modo anterior.
const atualizar_modo = () => {
    div_campos_ead.classList.toggle('oculto', modo_selecao());
    div_campos_selecao.classList.toggle('oculto', !modo_selecao());
    textarea_saida.value = '';
    atualizar_placeholder();
};

// Atualiza imediatamente e também a cada mudança nos campos
atualizar_modo();
select_modo.addEventListener('change', atualizar_modo);
select_competencia.addEventListener('change', atualizar_placeholder);
[input_selecao, select_modalidade, select_materia, select_assunto].forEach((campo) => {
    campo.addEventListener('input', atualizar_placeholder);
});

// Gera a saída do modo seleção. Devolve false quando há algo a corrigir.
const processar_selecao = (arr_entrada) => {

    let campos = ler_campos_selecao();
    if (campos.erro) {
        alert(campos.erro);
        return false;
    }

    let questoes = extrair_questoes(ajustar_texto(arr_entrada, campos.prefixo));
    let problemas = conferir_questoes(questoes);
    if (problemas.length > 0) {
        textarea_saida.value = '';
        alert('Corrija antes de gerar o arquivo:\n\n' + problemas.join('\n'));
        return false;
    }

    textarea_saida.value = gerar_moodle_xml(questoes, {
        categoria: checkbox_incluir_pasta.checked ? campos.categoria : null,
        mostrarCodigo: true,
    });
    return true;

};

button_processar.addEventListener('click', () => {

    if (textarea_entrada.value !== '') {

        let arr_entrada = textarea_entrada.value.split('\n');

        if (modo_selecao()) {
            processar_selecao(arr_entrada);
            return;
        }

        let prefixo = MAPA_ROTULOS[select_competencia.value.toLowerCase()] || 'Q';
        arr_entrada = ajustar_texto(arr_entrada, prefixo);

        // Gerar Moodle XML com HTML estilizado ou GIFT puro.
        if (checkbox_estilizar.checked) {
            textarea_saida.value = gerar_moodle_xml(extrair_questoes(arr_entrada));
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
