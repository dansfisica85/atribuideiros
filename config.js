/* @tweakable lista de nomes dos candidatos */
export const names = [
    "Alexandre Julio", "Álvaro da Silva Alves de Oliveira", "Amanda Aparecida P. Mendoça",
    "Ana Cláudia Ramos da Silva", "Ana Paula de Arruda Ferreira", "Ana Tereza Alves de Freitas",
    "Andrey Eduardo Ramos Mendes", "Angélica dos Santos Henrique", "Antônio Gomes de Souza",
    "Bruno Ricardo Bueno", "Carina Piveta M. Pereira", "Carlos Alexandre S.R. da Costa",
    "Carlos Thiago H. de Carvalho", "Caroline Carvalho Seviero", "Claudiano Rangel de Souza",
    "Cléa Rodrigues Costa", "Clebeson Nascimento da Silva", "Danielle Trindade da Silva Ramos",
    "David Cássio Sisdeli", "Dênis Henrique Ribeiro Bezerra", "Douglas Maciel Alves Soares",
    "Eduardo Capeli", "Emerson da Costa Alicrim", "Fabiana Macedo Pereira dos Santos",
    "Fabiane Elidia Dias", "Fabio Eduardo Amadeu Ribeiro", "Felipe Junqueira Bragola",
    "Felipe Rodrigues dos Santos", "Fernando Barbosa", "Flabio Fiacadori",
    "Francisco José Borges", "Gabriela Lovato Seli", "Giovanni Coelho Borborema",
    "Igor Franco Rodrigues", "José Claúdio Araujo", "Jessé Guidelli de Oliveira",
    "Josiane daSilva", "Joycimara Inez da Silva", "Jozilda Terezinha P. O. Ribeiro",
    "Karina Assunta Moro", "Laura Vitória Caires Costa", "Luciana Aparecida Gomes Encontrão Ungarette",
    "Maila Rodrigues Porto Antônio", "Marcio José Santana", "Maria Eduarda da Silva Felix",
    "Maria Inês Marques de Souza", "Maria Isabella Benetelli Geron", "Mariana Avellaneda Ferreira Januario",
    "Mariane Vieira Almeida Amaral", "Marília Gabriela Benetelli Geron", "Marlon Andrey Passarelli",
    "Mayla Carolina Botelho dos Santos", "Morgana Aparecida Pereira Uescar", "Otávio Guilherme Villela da Costa",
    "Pamela Siqueira Ribeiro", "Regiane de Cassia Pavanin Numajiri", "Roberta Cristina Solano",
    "Roberto Cruz Flores Júnior", "Simone Cristina de Souza", "Taila Signorini Ferreira Griffa",
    "Tainá Tomaz de Souza", "Tatiane de Souza Martins", "Thaís Abdalla Zanqueta",
    "Thiago Rodrigues Nascimento", "Vagner Sponchiado Filho", "Verônica Assis F. Cardoso",
    "Willian Rodrigues de Souza Cruz"
];

/* @tweakable estrutura com perguntas e respostas completas */
export const questionsAndAnswers = [
    {
        question: "Interesse, Motivação e Desempenho: Durante uma aula na sala de informática, metade dos computadores parou de funcionar repentinamente. Como você agiria para garantir o funcionamento dos equipamentos e apoiar o professor responsável pela aula?",
        answer: "Primeiramente, verificaria se o problema é isolado (ex: cabo desconectado) ou geral (falha na rede elétrica/rede). Se for um problema local, tentaria reiniciar os computadores ou trocar de máquina. Caso o problema persista, comunicaria imediatamente ao professor responsável pela aula e entraria em contato com o suporte técnico da escola ou NIT. Enquanto isso, auxiliaria na organização dos alunos em duplas nos computadores que estivessem funcionando, garantindo que a aula pudesse continuar sem grandes interrupções. É importante ressaltar que o PROATI não tem a atribuição de passar atividades pedagógicas, mas sim de garantir o funcionamento dos recursos tecnológicos para que o professor conduza sua aula."
    },
    {
        question: "Comprometimento e Responsabilidade: Como você organizaria a rotina de manutenção preventiva dos equipamentos da sala de informática para evitar falhas durante as aulas? Cite um procedimento que você já implementou ou proporia para garantir o bom funcionamento dos recursos tecnológicos.",
        answer: "Implementei um checklist semanal para verificar atualizações de software, limpeza física dos computadores e teste de conexão de rede. Por exemplo, reservei 30 minutos toda sexta-feira para desfragmentar discos e excluir arquivos temporários. Isso reduziu falhas em 40% e garantiu que as aulas seguissem sem interrupções. Também criei um mural com dicas para os alunos evitarem downloads desnecessários."
    },
    {
        question: "Comunicação e Expressão: Suponha que um aluno não consiga acessar a plataforma educacional da escola devido a um erro de login. Como você resolveria esse problema?",
        answer: "Primeiro, verificaria se o aluno está digitando o login corretamente (usuário e domínio, ex: aluno@escola.sp.gov.br). Caso o problema persista, resetaria a senha do aluno na Secretaria Escolar Digital (SED) para forçar a sincronização com o Active Directory. Enquanto o sistema atualiza, orientaria o aluno a acessar temporariamente com uma conta genérica de visitante, se disponível, ou forneceria material offline para não prejudicar sua participação na aula."
    },
    {
        question: "Trabalho em Equipe e Relacionamento Interpessoal: Um professor de outra disciplina solicitou ajuda para usar a sala de informática em um projeto. Como você agiria?",
        answer: "Primeiro, entenderia a demanda do professor: qual o objetivo da atividade, quais softwares seriam necessários e o tempo de uso da sala. Em seguida, verificaria a disponibilidade na agenda e confirmaria se os recursos solicitados (programas, internet, periféricos) estão funcionando. Caso algum software não esteja disponível, buscaria alternativas compatíveis ou entraria em contato com o NIT para verificar a viabilidade de instalação. Por fim, marcaria o horário e enviaria um e-mail de confirmação com as orientações técnicas necessárias."
    },
    {
        question: "Disponibilidade e Flexibilidade: Se a internet da escola falhar durante o uso da sala de informática, como você agiria?",
        answer: "Primeiro, verificaria se o problema é local (apenas na sala) ou geral (toda a escola). Reiniciaria os roteadores e switches da sala e testaria a conexão em outro dispositivo. Caso o problema persistisse, acalmaria os alunos e professores, informando que estou verificando a situação. Se não houver solução imediata, entraria em contato com o NIT da Diretoria de Ensino para reportar o problema e solicitar suporte técnico. Enquanto isso, sugeriria atividades offline que não dependam de internet, como edição de documentos já salvos localmente ou exercícios de digitação."
    },
    {
        question: "Atitude e Postura: Você percebeu que os computadores da sala estão lentos devido a arquivos temporários acumulados. Que ação tomaria?",
        answer: "Criaria um script automatizado (com supervisão do NIT) para limpar arquivos temporários semanalmente. Também orientaria os alunos a salvar trabalhos na nuvem ou em pendrives, liberando espaço nos computadores. Essa ação reduziu o tempo de inicialização das máquinas em 50% na escola onde trabalhei anteriormente."
    }
];

/* @tweakable nomes dos avaliadores */
export const evaluators = ["Davi", "Giovanni"];

/* @tweakable pontuação mínima para aprovação do candidato */
export const approvalThreshold = 20;

/* @tweakable chave usada para salvar a seleção do avaliador no localStorage */
export const evaluatorStorageKey = 'competencyEvaluatorSelection';

/* @tweakable define se o avaliador selecionado é lembrado entre as sessões */
export const rememberEvaluator = true;

/* @tweakable tempo em milissegundos que o indicador de sincronização fica visível */
export const syncIndicatorTime = 1000;