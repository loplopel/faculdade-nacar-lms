export const stores = [
  "Nacar Mega Store",
  "Nacar Motorcycle",
  "Nacar Campinas",
  "Nacar Taubaté",
  "Web Racing",
  "Planet Bike",
  "Super Bike",
  "Toleman",
  "Motosport",
  "Nova Centro",
  "Nova Suzuki",
  "Nova MotoStore",
];

export const userRoles = [
  {
    role: "admin",
    label: "Administrador",
    description: "Acesso total à plataforma, usuários, cursos, provas e relatórios.",
  },
  {
    role: "gestor",
    label: "Gestor",
    description: "Acompanha desempenho da loja, notas, pendências e evolução da equipe.",
  },
  {
    role: "instrutor",
    label: "Instrutor",
    description: "Cria cursos, aulas, materiais, provas e acompanha dúvidas dos alunos.",
  },
  {
    role: "funcionario",
    label: "Funcionário",
    description: "Assiste aulas, faz provas, consulta notas e certificados.",
  },
];

export const courseCategories = [
  "Atendimento",
  "Vendas",
  "Produtos",
  "Garantia",
  "Operacional",
  "Cultura Nacar",
  "Gestão",
  "Marketing",
];

export const initialCourses = [
  {
    id: "atendimento-nacar",
    title: "Atendimento Nacar",
    category: "Atendimento",
    description:
      "Padrão de atendimento, abordagem, pós-venda, relacionamento e experiência premium do cliente.",
    lessons: 8,
    duration: "1h 40min",
    progress: 82,
    required: true,
    status: "Publicado",
  },
  {
    id: "produtos-e-marcas",
    title: "Produtos e Marcas",
    category: "Produtos",
    description:
      "Treinamento sobre capacetes, jaquetas, luvas, botas, acessórios e marcas estratégicas do grupo.",
    lessons: 12,
    duration: "2h 15min",
    progress: 64,
    required: true,
    status: "Publicado",
  },
  {
    id: "garantia-e-processos",
    title: "Garantia e Processos",
    category: "Garantia",
    description:
      "Fluxo de abertura, análise, documentação, acompanhamento e conclusão dos processos de garantia.",
    lessons: 6,
    duration: "55min",
    progress: 41,
    required: true,
    status: "Publicado",
  },
  {
    id: "padrao-de-loja-nacar",
    title: "Padrão de Loja Nacar",
    category: "Cultura Nacar",
    description:
      "Boas práticas de organização, postura, comunicação, processos internos e padrão visual de loja.",
    lessons: 5,
    duration: "45min",
    progress: 0,
    required: false,
    status: "Rascunho",
  },
];

export const initialExams = [
  {
    id: "prova-atendimento",
    title: "Prova Final — Atendimento Nacar",
    course: "Atendimento Nacar",
    questions: 12,
    score: "92%",
    status: "Aprovado",
    minimumScore: "80%",
  },
  {
    id: "avaliacao-produtos",
    title: "Avaliação — Produtos e Marcas",
    course: "Produtos e Marcas",
    questions: 15,
    score: "Pendente",
    status: "Liberada",
    minimumScore: "80%",
  },
  {
    id: "prova-garantia",
    title: "Prova — Garantia e Processos",
    course: "Garantia e Processos",
    questions: 10,
    score: "78%",
    status: "Aprovado",
    minimumScore: "70%",
  },
];

export const initialMaterials = [
  {
    id: "manual-atendimento",
    title: "Manual de Atendimento Nacar",
    type: "PDF",
    area: "Atendimento",
  },
  {
    id: "catalogo-marcas",
    title: "Catálogo de Marcas Estratégicas",
    type: "PDF",
    area: "Produtos",
  },
  {
    id: "venda-consultiva",
    title: "Vídeo — Como conduzir uma venda consultiva",
    type: "Vídeo",
    area: "Vendas",
  },
  {
    id: "checklist-garantia",
    title: "Checklist de Garantia",
    type: "Texto",
    area: "Operacional",
  },
];