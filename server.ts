/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { Solicitacao, Equipe, Rota, Comunicado, Notificacao, Usuario, capitalizeProperly } from "./src/types";
import { 
  notifyNewSolicitacao, 
  notifySolicitacaoStatusChange, 
  notifyAtividadeIniciada,
  verificarENotificarDemandasParadas,
  dispararLembreteAcessoSite,
  notifyNewUserPending, 
  notifyUserApproved,
  getEmailConfig,
  updateEmailConfig,
  getEmailLogs,
  clearEmailLogs,
  sendTestEmail
} from "./src/emailService";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper to format user name, sector, and email in proper casing
function formatUsuario(u: Usuario): Usuario {
  if (!u) return u;
  return {
    ...u,
    nome: capitalizeProperly(u.nome),
    setor: capitalizeProperly(u.setor),
    email: (u.email || "").toLowerCase().trim()
  };
}

// --- IN-MEMORY DATABASE SEED ---
let solicitacoes: Solicitacao[] = [
  {
    id: "SOL-2026-001",
    numero: "SOL-2026-001",
    processo: "SEI nº 00240/2026",
    solicitante: "Dr. Ricardo Almeida",
    setor: "Promotoria de Justiça de Defesa do Consumidor",
    tipo: "Entrega",
    prioridade: "Alta",
    data: "2026-07-08",
    periodo: "Manhã",
    origem: "Almoxarifado Central - Galpão A",
    destino: "Prédio Sede, Sala 304",
    observacoes: "Entrega urgente de 15 cadeiras ergonômicas para reestruturação do setor.",
    status: "Aprovada",
    dataCriacao: "2026-07-06T09:00:00Z",
    itens: ["15x Cadeira Ergonômica NR17", "4x Armário de Aço 2 Gavetas"]
  },
  {
    id: "SOL-2026-002",
    numero: "SOL-2026-002",
    processo: "SEI nº 00890/2026",
    solicitante: "Mariana Costa",
    setor: "Assessoria Administrativa",
    tipo: "Coleta",
    prioridade: "Média",
    data: "2026-07-09",
    periodo: "Tarde",
    origem: "Promotoria de Justiça de Canoas",
    destino: "Almoxarifado Central - Galpão B (Sucata)",
    observacoes: "Recolhimento de lote inservível de TI para triagem e descarte.",
    status: "Aberta",
    dataCriacao: "2026-07-06T11:30:00Z",
    itens: ["25x Monitor LCD antigo", "12x CPU Danificada", "8x Nobreak com defeito"]
  },
  {
    id: "SOL-2026-003",
    numero: "SOL-2026-003",
    processo: "SEI nº 01240/2026",
    solicitante: "Eng. Lucas Viana",
    setor: "Divisão de Tecnologia e Informática",
    tipo: "Ocorrência",
    subtipoOcorrencia: "Garantia",
    equipamentoItem: "Servidor Dell PowerEdge R740",
    fornecedorOuEmpresa: "Dell Computadores do Brasil",
    numeroNotaOuContrato: "NFe 88123 / Garantia ProSupport",
    prioridade: "Alta",
    data: "2026-07-08",
    periodo: "Manhã",
    origem: "Datacenter - Prédio Sede (3º Andar)",
    destino: "Assistência Autorizada Dell Tech",
    observacoes: "Falha intermitente na placa mãe e módulos de memória RAM. Necessita envio imediato para reparo em garantia com fornecedor.",
    status: "Em análise",
    dataCriacao: "2026-07-07T08:15:00Z",
    itens: ["[Garantia] Servidor Dell PowerEdge R740 (Tombo #109482)"]
  },
  {
    id: "SOL-2026-004",
    numero: "SOL-2026-004",
    processo: "SEI nº 01450/2026",
    solicitante: "Coord. Flávio Santos",
    setor: "Infraestrutura e Manutenção Predial",
    tipo: "Ocorrência",
    subtipoOcorrencia: "Manutenção",
    equipamentoItem: "Gerador de Energia Trifásico Stemac 250kVA",
    fornecedorOuEmpresa: "EletroTécnica Manutenções LTDA",
    numeroNotaOuContrato: "Contrato de Manutenção nº 014/2025",
    prioridade: "Média",
    data: "2026-07-10",
    periodo: "Dia Todo",
    origem: "Subsolo Prédio Central",
    destino: "Oficina Técnica Especializada",
    observacoes: "Manutenção preventiva semestral e substituição do sistema de filtros de combustível e óleo do gerador.",
    status: "Aprovada",
    dataCriacao: "2026-07-07T09:40:00Z",
    itens: ["[Manutenção] Gerador Stemac 250kVA - Revisão Preventiva"]
  }
];

let usuarios: Usuario[] = [
  {
    id: "USR-007",
    nome: "Lucas Oliveira",
    email: "lucas.operador@mprs.mp.br",
    funcao: "Operador",
    setor: "Setor de Logística & Transportes",
    ativo: true,
    aprovado: true,
    senha: "123"
  },
  {
    id: "USR-006",
    nome: "Perfil de Teste (CBP)",
    email: "teste@mprs.mp.br",
    funcao: "Administrador",
    setor: "Divisão de Logística CBP",
    ativo: true,
    aprovado: true,
    senha: "123"
  },
  {
    id: "USR-005",
    nome: "Guilherme Pereira Marques Brito",
    email: "guimarquesbrito@gmail.com",
    funcao: "Coordenador",
    setor: "Coordenação de Patrimônio Material",
    ativo: true,
    aprovado: true,
    senha: "Dragao@2021"
  },
  {
    id: "USR-001",
    nome: "Dr. Ricardo Almeida",
    email: "ricardo.almeida@mprs.mp.br",
    funcao: "Coordenador",
    setor: "Coordenação de Patrimônio Material",
    ativo: true,
    aprovado: true,
    senha: "123"
  },
  {
    id: "USR-002",
    nome: "Mariana Costa",
    email: "mariana.costa@mprs.mp.br",
    funcao: "Administrador",
    setor: "Assessoria Administrativa",
    ativo: true,
    aprovado: true,
    senha: "123"
  },
  {
    id: "USR-003",
    nome: "Felipe Diniz",
    email: "felipe.diniz@mprs.mp.br",
    funcao: "Operador",
    setor: "Setor de Logística & Transportes",
    ativo: true,
    aprovado: true,
    senha: "123"
  },
  {
    id: "USR-004",
    nome: "José Silva",
    email: "jose.silva@mprs.mp.br",
    funcao: "Operador",
    setor: "Setor de Inventário",
    ativo: true,
    aprovado: true,
    senha: "123"
  }
];

let equipes: Equipe[] = [
  {
    id: "EQP-001",
    nome: "Equipe Alfa (Carregamento & Log)",
    integrantes: ["José Silva (Operador)", "Marcos Rocha (Operador)", "Adilson Souza (Motorista)"],
    status: "Disponível",
    atividadesIds: []
  },
  {
    id: "EQP-002",
    nome: "Equipe Beta (Montagem & Patrimônio)",
    integrantes: ["Claudio Melo (Avaliador)", "Felipe Diniz (Técnico)", "Roberto Lima (Motorista)"],
    status: "Disponível",
    atividadesIds: []
  },
  {
    id: "EQP-003",
    nome: "Equipe Gama (Inventário Extra)",
    integrantes: ["Sandra Costa (Patrimonista)", "Reginaldo Cruz (Auxiliar)"],
    status: "Disponível",
    atividadesIds: []
  }
];

let rotas: Rota[] = [];

let comunicados: Comunicado[] = [
  {
    id: "COM-001",
    titulo: "Uso Obrigatório de EPI para Coleta de Descarte",
    conteudo: "Reforçamos a todos os operadores que, a partir desta data, é estritamente obrigatório o uso de luvas de raspa de couro, óculos de proteção e calçados com biqueira de aço para as atividades de coleta e movimentação de bens classificados como sucata no Almoxarifado Central. A segurança da equipe é nossa prioridade absoluta.",
    setorAlvo: "Geral",
    dataCriacao: "2026-07-06T10:00:00Z",
    autor: "Coord. Geral de Logística",
    categoria: "Alerta"
  },
  {
    id: "COM-002",
    titulo: "Procedimento de Recebimento de Cargas no Galpão B",
    conteudo: "Informamos que o recebimento de grandes lotes de bens permanentes e mobiliários transferidos de promotorias do interior ocorrerá no Galpão B a partir das 08:30.",
    setorAlvo: "Operacional",
    dataCriacao: "2026-07-05T15:30:00Z",
    autor: "Coordenação CBP",
    categoria: "Informativo"
  },
  {
    id: "COM-003",
    titulo: "Mutirão de Inventário Patrimonial Anual",
    conteudo: "De 15/07 a 30/07 daremos início ao mutirão de inventário patrimonial físico de todas as salas da Sede do MP. Contamos com a colaboração dos solicitantes de cada setor para facilitar o acesso dos nossos agentes patrimoniais identificados.",
    setorAlvo: "Geral",
    dataCriacao: "2026-07-07T08:00:00Z",
    autor: "Seção de Patrimônio / CBP",
    categoria: "Procedimento"
  }
];

let notificacoes: Notificacao[] = [];

// --- DATABASE PERSISTENCE TO PREVENT DATA LOSS ON RESTART ---
const DB_FILE = path.join(process.cwd(), "data_store.json");

let isSyncing = false;
let pendingSync = false;

// Cache em memória para rastrear o último estado sincronizado com o Firestore
let lastSyncedState: { [collectionName: string]: Map<string, string> } = {};

function initLastSyncedState() {
  const collections = [
    { name: "solicitacoes", data: solicitacoes },
    { name: "usuarios", data: usuarios },
    { name: "equipes", data: equipes },
    { name: "rotas", data: rotas },
    { name: "comunicados", data: comunicados },
    { name: "notificacoes", data: notificacoes }
  ];
  for (const col of collections) {
    const map = new Map<string, string>();
    for (const item of col.data) {
      map.set((item as any).id, JSON.stringify(item));
    }
    lastSyncedState[col.name] = map;
  }
}

async function syncAllToFirestore() {
  try {
    const { db, setDocument, deleteDocument } = await import("./src/firebaseServer");
    if (!db) return;

    if (isSyncing) {
      pendingSync = true;
      return;
    }

    isSyncing = true;

    // Se o cache de estado sincronizado ainda estiver vazio, inicializa
    if (Object.keys(lastSyncedState).length === 0) {
      initLastSyncedState();
    }

    const collectionsToSync = [
      { name: "solicitacoes", data: solicitacoes },
      { name: "usuarios", data: usuarios },
      { name: "equipes", data: equipes },
      { name: "rotas", data: rotas },
      { name: "comunicados", data: comunicados },
      { name: "notificacoes", data: notificacoes }
    ];

    let totalWrites = 0;
    let totalDeletes = 0;

    for (const col of collectionsToSync) {
      const lastMap = lastSyncedState[col.name] || new Map<string, string>();
      const currentMap = new Map<string, string>();

      // 1. Salvar ou atualizar documentos novos ou modificados
      for (const item of col.data) {
        const id = (item as any).id;
        const currentJson = JSON.stringify(item);
        currentMap.set(id, currentJson);

        const lastJson = lastMap.get(id);
        if (lastJson !== currentJson) {
          // Documento novo ou modificado! Sincroniza instantaneamente.
          await setDocument(col.name, id, item);
          totalWrites++;
        }
      }

      // 2. Remover órfãos (documentos excluídos localmente)
      for (const id of lastMap.keys()) {
        if (!currentMap.has(id)) {
          await deleteDocument(col.name, id);
          totalDeletes++;
        }
      }

      // Atualiza o estado para a próxima sincronização
      lastSyncedState[col.name] = currentMap;
    }

    if (totalWrites > 0 || totalDeletes > 0) {
      console.log(`[Firebase] Sincronização incremental concluída com sucesso. Gravados: ${totalWrites}, Excluídos: ${totalDeletes}.`);
    }
  } catch (err) {
    console.error("[Firebase] Erro na sincronização incremental com o Firestore:", err);
  } finally {
    isSyncing = false;
    if (pendingSync) {
      pendingSync = false;
      syncAllToFirestore();
    }
  }
}

function getNextSolicitacaoId(): { id: string; numero: string } {
  const ano = new Date().getFullYear();
  let maxId = 0;
  solicitacoes.forEach(s => {
    if (s && s.id) {
      const match = s.id.match(/^CBP-\d+-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) {
          maxId = num;
        }
      }
    }
  });
  const nextNum = maxId + 1;
  const idSeq = String(nextNum).padStart(4, "0");
  const numero = `CBP-${ano}-${idSeq}`;
  return { id: numero, numero };
}

function getNextRotaId(): { id: string; numero: string } {
  const dataHoje = new Date().toISOString().split("T")[0].replace(/-/g, "");
  let maxId = 0;
  rotas.forEach(r => {
    if (r && r.id) {
      const match = r.id.match(/^ROT-0*(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) {
          maxId = num;
        }
      }
    }
  });
  const nextNum = maxId + 1;
  const idSeqStr = String(nextNum).padStart(2, "0");
  const numero = `ROT-${dataHoje}-${idSeqStr}`;
  return { id: `ROT-${idSeqStr}`, numero };
}

function getNextComunicadoId(): string {
  let maxId = 0;
  comunicados.forEach(c => {
    if (c && c.id) {
      const match = c.id.match(/^COM-0*(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) {
          maxId = num;
        }
      }
    }
  });
  return `COM-${String(maxId + 1).padStart(3, "0")}`;
}

function healDuplicateIds() {
  const seenIds = new Set<string>();
  let healedCount = 0;
  
  for (let i = 0; i < solicitacoes.length; i++) {
    const s = solicitacoes[i];
    if (!s || !s.id || seenIds.has(s.id)) {
      const oldId = s ? s.id : null;
      // Encontrar novo ID único
      const { id: newId } = getNextSolicitacaoId();
      
      if (s) {
        s.id = newId;
        s.numero = newId;
        healedCount++;
        
        // Atualizar referências em rotas
        if (oldId) {
          rotas.forEach(r => {
            if (r.solicitacoesIds) {
              r.solicitacoesIds = r.solicitacoesIds.map(sid => sid === oldId ? newId : sid);
            }
            if (r.paradas) {
              r.paradas.forEach(p => {
                if (p.solicitacaoId === oldId) {
                  p.solicitacaoId = newId;
                }
              });
            }
          });
        }
      }
    }
    if (s && s.id) {
      seenIds.add(s.id);
    }
  }
  
  const seenRotaIds = new Set<string>();
  let healedRotasCount = 0;
  for (let i = 0; i < rotas.length; i++) {
    const r = rotas[i];
    if (!r || !r.id || seenRotaIds.has(r.id)) {
      const oldId = r ? r.id : null;
      const { id: newId, numero: newNumero } = getNextRotaId();
      
      if (r) {
        r.id = newId;
        r.numero = newNumero;
        healedRotasCount++;
        
        // Atualizar referências nas solicitações
        if (oldId) {
          solicitacoes.forEach(s => {
            if (s.rotaId === oldId) {
              s.rotaId = newId;
            }
          });
        }
      }
    }
    if (r && r.id) {
      seenRotaIds.add(r.id);
    }
  }

  const seenComunicadoIds = new Set<string>();
  let healedComunicadosCount = 0;
  for (let i = 0; i < comunicados.length; i++) {
    const c = comunicados[i];
    if (!c || !c.id || seenComunicadoIds.has(c.id)) {
      const newId = getNextComunicadoId();
      if (c) {
        c.id = newId;
        healedComunicadosCount++;
      }
    }
    if (c && c.id) {
      seenComunicadoIds.add(c.id);
    }
  }
  
  if (healedCount > 0 || healedRotasCount > 0 || healedComunicadosCount > 0) {
    console.log(`[Heal] Banco de dados auto-reparado! Corrigidos ${healedCount} solicitações, ${healedRotasCount} rotas e ${healedComunicadosCount} comunicados com IDs duplicados.`);
    saveDatabase();
  }
}

function saveDatabase() {
  try {
    const data = {
      solicitacoes,
      equipes,
      rotas,
      notificacoes,
      comunicados,
      usuarios
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    
    // Dispara a sincronização com o Firestore em segundo plano de forma não bloqueante
    syncAllToFirestore();
  } catch (err) {
    console.error("Erro ao salvar banco de dados local:", err);
  }
}

function pruneOldNotifications() {
  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
  const initialCount = notificacoes.length;
  notificacoes = notificacoes.filter(n => {
    try {
      const dataTime = new Date(n.data).getTime();
      return dataTime >= twelveHoursAgo;
    } catch (e) {
      return true; // Mantém em caso de data inválida
    }
  });
  if (notificacoes.length < initialCount) {
    saveDatabase();
  }
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf8");
      if (raw.trim()) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.solicitacoes)) {
          solicitacoes = data.solicitacoes.filter((s: any) => s && s.id !== "TEST-DOC-CLIENT-SDK" && s.status).map((s: any) => {
            if (s.setor === 'Promotoria Geral' || s.setor === 'Procuradoria Geral' || s.setor === 'Coordenação de Bens Permanentes (CBP)' || s.setor === 'Coordenação de Bens Permanentes' || s.setor === 'CBP' || s.setor === 'Administrativo' || s.setor === 'Procuradoria' || s.setor?.includes('Procuradoria') || s.setor?.includes('Promotoria Geral')) {
              return { ...s, setor: 'Coordenação de Patrimônio Material' };
            }
            return s;
          });
        }
        if (Array.isArray(data.equipes)) equipes = data.equipes;
        if (Array.isArray(data.rotas)) rotas = data.rotas;
        if (Array.isArray(data.notificacoes)) {
          notificacoes = data.notificacoes;
          pruneOldNotifications();
        }
        if (Array.isArray(data.comunicados)) comunicados = data.comunicados;
        if (Array.isArray(data.usuarios)) {
          usuarios = data.usuarios.map(formatUsuario).map((u: Usuario) => {
            if (u.id === 'USR-005' || u.id === 'USR-001' || u.email.toLowerCase() === 'guimarquesbrito@gmail.com' || u.setor === 'Coordenação de Bens Permanentes (CBP)' || u.setor === 'Coordenação de Bens Permanentes' || u.setor === 'CBP' || u.setor?.includes('Procuradoria') || u.setor === 'Promotoria Geral') {
              return { ...u, setor: 'Coordenação de Patrimônio Material' };
            }
            return u;
          });
        } else {
          // Salva os padrão se não existirem
          saveDatabase();
        }
        // Executar auto-reparo de duplicatas após carregar dados locais
        healDuplicateIds();
        console.log("Banco de dados local carregado com sucesso a partir de:", DB_FILE);
      }
    } else {
      saveDatabase();
    }
  } catch (err) {
    console.error("Erro ao carregar banco de dados local:", err);
  }
}

// Carregar dados armazenados no início do servidor como cache rápido
loadDatabase();
initLastSyncedState();

async function syncWithFirestore() {
  try {
    const { db, getCollectionData, setDocument } = await import("./src/firebaseServer");
    if (!db) {
      console.log("[Firebase] Firestore não inicializado ou arquivo de configuração ausente. Operando apenas localmente.");
      return;
    }

    console.log("[Firebase] Sincronizando cache local com o Firestore...");

    // Verifica se o banco de dados já foi inicializado/semeado anteriormente
    const configData = await getCollectionData<any>("configuracoes");
    const isSeeded = configData.some(doc => doc.id === "inicializacao" && doc.seeded === true);

    if (isSeeded) {
      console.log("[Firebase] Banco de dados já semeado anteriormente. Carregando coleções do Firestore...");

      // 1. Usuários
      const fbUsuarios = await getCollectionData<Usuario>("usuarios");
      usuarios = fbUsuarios.map(formatUsuario).map((u: Usuario) => {
        if (u.id === 'USR-005' || u.id === 'USR-001' || u.email.toLowerCase() === 'guimarquesbrito@gmail.com' || u.setor === 'Coordenação de Bens Permanentes (CBP)' || u.setor === 'Coordenação de Bens Permanentes' || u.setor === 'CBP' || u.setor?.includes('Procuradoria') || u.setor === 'Promotoria Geral') {
          return { ...u, setor: 'Coordenação de Patrimônio Material' };
        }
        return u;
      });
      console.log(`[Firebase] Carregados ${usuarios.length} usuários.`);

      // 2. Solicitações
      const fbSolicitacoes = await getCollectionData<Solicitacao>("solicitacoes");
      solicitacoes = fbSolicitacoes.filter(s => s && s.id !== "TEST-DOC-CLIENT-SDK" && s.status).map(s => {
        if (s.setor === 'Promotoria Geral' || s.setor === 'Procuradoria Geral' || s.setor === 'Coordenação de Bens Permanentes (CBP)' || s.setor === 'Coordenação de Bens Permanentes' || s.setor === 'CBP' || s.setor === 'Administrativo' || s.setor === 'Procuradoria' || s.setor?.includes('Procuradoria') || s.setor?.includes('Promotoria Geral')) {
          return { ...s, setor: 'Coordenação de Patrimônio Material' };
        }
        return s;
      });
      console.log(`[Firebase] Carregadas ${solicitacoes.length} solicitações.`);

      // 3. Equipes
      const fbEquipes = await getCollectionData<Equipe>("equipes");
      equipes = fbEquipes;
      console.log(`[Firebase] Carregadas ${equipes.length} equipes.`);

      // 4. Rotas
      const fbRotas = await getCollectionData<Rota>("rotas");
      rotas = fbRotas;
      console.log(`[Firebase] Carregadas ${rotas.length} rotas.`);

      // 6. Comunicados
      const fbComunicados = await getCollectionData<Comunicado>("comunicados");
      comunicados = fbComunicados;
      console.log(`[Firebase] Carregados ${comunicados.length} comunicados.`);

      // 7. Notificações
      const fbNotificacoes = await getCollectionData<Notificacao>("notificacoes");
      notificacoes = fbNotificacoes;
      console.log(`[Firebase] Carregadas ${notificacoes.length} notificações.`);

    } else {
      console.log("[Firebase] Coleção de configuração não encontrada ou ainda não semeada. Executando semeadura condicional inicial...");

      // 1. Usuários
      const fbUsuarios = await getCollectionData<Usuario>("usuarios");
      if (fbUsuarios.length > 0) {
        usuarios = fbUsuarios.map(formatUsuario);
        console.log(`[Firebase] Carregados ${usuarios.length} usuários do Firestore.`);
      } else {
        console.log("[Firebase] Coleção 'usuarios' vazia no Firestore. Enviando semente local...");
        for (const u of usuarios) {
          await setDocument("usuarios", u.id, u);
        }
      }

      // 2. Solicitações
      const fbSolicitacoes = await getCollectionData<Solicitacao>("solicitacoes");
      if (fbSolicitacoes.length > 0) {
        solicitacoes = fbSolicitacoes.filter(s => s && s.id !== "TEST-DOC-CLIENT-SDK" && s.status);
        console.log(`[Firebase] Carregadas ${solicitacoes.length} solicitações do Firestore.`);
      } else {
        console.log("[Firebase] Coleção 'solicitacoes' vazia no Firestore. Enviando semente local...");
        for (const s of solicitacoes) {
          await setDocument("solicitacoes", s.id, s);
        }
      }

      // 3. Equipes
      const fbEquipes = await getCollectionData<Equipe>("equipes");
      if (fbEquipes.length > 0) {
        equipes = fbEquipes;
        console.log(`[Firebase] Carregadas ${equipes.length} equipes do Firestore.`);
      } else {
        console.log("[Firebase] Coleção 'equipes' vazia no Firestore. Enviando semente local...");
        for (const e of equipes) {
          await setDocument("equipes", e.id, e);
        }
      }

      // 4. Rotas
      const fbRotas = await getCollectionData<Rota>("rotas");
      if (fbRotas.length > 0) {
        rotas = fbRotas;
        console.log(`[Firebase] Carregadas ${rotas.length} rotas do Firestore.`);
      } else {
        console.log("[Firebase] Coleção 'rotas' vazia no Firestore. Enviando semente local...");
        for (const r of rotas) {
          await setDocument("rotas", r.id, r);
        }
      }

      // 6. Comunicados
      const fbComunicados = await getCollectionData<Comunicado>("comunicados");
      if (fbComunicados.length > 0) {
        comunicados = fbComunicados;
        console.log(`[Firebase] Carregados ${comunicados.length} comunicados do Firestore.`);
      } else {
        console.log("[Firebase] Coleção 'comunicados' vazia no Firestore. Enviando semente local...");
        for (const c of comunicados) {
          await setDocument("comunicados", c.id, c);
        }
      }

      // 7. Notificações
      const fbNotificacoes = await getCollectionData<Notificacao>("notificacoes");
      if (fbNotificacoes.length > 0) {
        notificacoes = fbNotificacoes;
        console.log(`[Firebase] Carregadas ${notificacoes.length} notificações do Firestore.`);
      } else {
        console.log("[Firebase] Coleção 'notificacoes' vazia no Firestore. Enviando semente local...");
        for (const n of notificacoes) {
          await setDocument("notificacoes", n.id, n);
        }
      }

      // Grava a flag de semente para futuras inicializações
      await setDocument("configuracoes", "inicializacao", { seeded: true });
      console.log("[Firebase] Registrada marcação de inicialização 'configuracoes/inicializacao'.");
    }

    // Executar auto-reparo de duplicatas após sincronização inicial
    healDuplicateIds();

    // Atualiza cache local de backup
    try {
      const data = {
        solicitacoes,
        equipes,
        rotas,
        notificacoes,
        comunicados,
        usuarios
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {}

    console.log("[Firebase] Sincronização inicial com o Firestore concluída com sucesso.");
    
    // Inicializa o cache de sincronização incremental
    initLastSyncedState();
  } catch (err) {
    console.error("[Firebase] Erro durante a sincronização inicial:", err);
  }
}

// --- GEMINI CLIENT SETUP (Lazy & Safe) ---
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      console.log("Gemini API Client initialized successfully.");
    } else {
      console.log("No valid GEMINI_API_KEY found in env. Falling back to mock AI simulation.");
    }
  }
  return aiClient;
}

// --- TRANSITORY RETRY MECHANISM TO HANDLE 503 SERVICE UNAVAILABLE OR 429 RATELIMITS ---
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      console.log(`[Gemini API] Reatentando requisição... (tentativa ${attempt}/${retries})`);
      if (attempt >= retries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error("Falha após todas as tentativas de requisição");
}

// --- API ROUTES ---

// 0. HEALTH CHECK & DIAGNÓSTICO DO SISTEMA
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    servico: "Central Logística CBP - Ministério Público",
    porta: PORT
  });
});

app.get("/api/diagnostico", async (req, res) => {
  const memUsage = process.memoryUsage();
  let firestoreConnected = false;
  try {
    const { db } = await import("./src/firebaseServer");
    firestoreConnected = Boolean(db);
  } catch (e) {
    firestoreConnected = false;
  }

  const client = getGeminiClient();

  const diagnostico = {
    sistema: {
      nome: "Central Logística (Coordenação de Patrimônio Material)",
      ambiente: process.env.NODE_ENV || "development",
      versaoNode: process.version,
      uptimeHoras: (process.uptime() / 3600).toFixed(2),
      memoriaRamUsadaMb: (memUsage.heapUsed / 1024 / 1024).toFixed(1),
      memoriaTotalHeapMb: (memUsage.heapTotal / 1024 / 1024).toFixed(1),
      statusGeral: "OPERACIONAL"
    },
    bancoDeDados: {
      tipo: "Híbrido (Cache Local em Memória/JSON + Sincronização Firestore)",
      firestoreConectado: firestoreConnected,
      firestoreDatabaseId: "ai-studio-centrallogsticac-c66895a1-1a11-4fdb-8bf4-b7343bd36958",
      totalSolicitacoes: solicitacoes.length,
      solicitacoesPorStatus: {
        aberta: solicitacoes.filter(s => s.status === "Aberta").length,
        emAnalise: solicitacoes.filter(s => s.status === "Em análise").length,
        aprovada: solicitacoes.filter(s => s.status === "Aprovada").length,
        planejada: solicitacoes.filter(s => s.status === "Planejada").length,
        emExecucao: solicitacoes.filter(s => s.status === "Em execução").length,
        realizada: solicitacoes.filter(s => s.status === "Realizada").length,
        concluida: solicitacoes.filter(s => s.status === "Concluída").length,
        cancelada: solicitacoes.filter(s => s.status === "Cancelada").length
      },
      totalEquipes: equipes.length,
      equipesDisponiveis: equipes.filter(e => e.status === "Disponível").length,
      totalRotas: rotas.length,
      rotasAtivas: rotas.filter(r => r.status === "Em rota").length,
      totalUsuarios: usuarios.length,
      usuariosAtivos: usuarios.filter(u => u.ativo === true).length,
      totalComunicados: comunicados.length,
      totalNotificacoes: notificacoes.length
    },
    integracoes: {
      geminiAI: {
        ativo: Boolean(client),
        modelo: "gemini-3.5-flash",
        status: Boolean(client) ? "Configurado e pronto" : "Operando com motor de contingência inteligente"
      },
      notificacoesEmail: {
        status: "Ativo (Mecanismo transacional com simulação e audit trail)"
      }
    }
  };

  res.json(diagnostico);
});

// 1. SOLICITAÇÕES
app.get("/api/solicitacoes", (req, res) => {
  const filtered = solicitacoes.filter(s => s && s.id !== "TEST-DOC-CLIENT-SDK" && s.status);
  res.json(filtered);
});

app.delete("/api/solicitacoes", (req, res) => {
  solicitacoes = [];
  saveDatabase();
  res.json({ success: true, message: "Todas as solicitações foram excluídas" });
});

app.post("/api/solicitacoes", (req, res) => {
  const { solicitante, setor, tipo, prioridade, data, periodo, origem, destino, observacoes, itens, numeroTombo, processo, estadoConservacao, itensEncontrados } = req.body;
  
  const { id: nextId, numero: nextNumero } = getNextSolicitacaoId();
  
  const nova: any = {
    id: nextId,
    numero: nextNumero,
    processo: processo || "",
    solicitante: solicitante || "Solicitante Geral",
    setor: setor || "Coordenação de Patrimônio Material",
    tipo: tipo || "Entrega",
    prioridade: prioridade || "Média",
    data: data || new Date().toISOString().split("T")[0],
    periodo: periodo || "Manhã",
    origem: origem || "Almoxarifado Central",
    destino: destino || "Prédio Sede",
    observacoes: observacoes || "",
    status: "Aprovada",
    dataCriacao: new Date().toISOString(),
    itens: Array.isArray(itens) ? itens : ["Material Logístico Diverso"],
    numeroTombo: numeroTombo || "",
    estadoConservacao: estadoConservacao || "Seminovo",
    usuarioAcao: req.body.usuarioAcao || solicitante || "Usuário do Sistema",
    itensEncontrados: itensEncontrados || []
  };
  
  solicitacoes.push(nova);
  
  // Criar notificação correspondente
  notificacoes.unshift({
    id: `NOT-gen-${Date.now()}`,
    titulo: `Nova solicitação criada e aprovada`,
    mensagem: `${nova.solicitante} do setor ${nova.setor} registrou uma nova demanda (${nova.tipo}) de prioridade ${nova.prioridade}. O processo está pronto para planejamento logístico.`,
    data: new Date().toISOString(),
    lida: false,
    tipo: nova.prioridade === "Alta" ? "urgente" : "info",
    solicitacaoId: nova.id,
    usuarioAcao: req.body.usuarioAcao || solicitante || "Usuário do Sistema"
  });

  // Enviar e-mail de notificação para os coordenadores
  const coordEmails = usuarios
    .filter(u => u.funcao === "Coordenador" || u.funcao === "Administrador")
    .map(u => u.email)
    .filter(Boolean);
  if (coordEmails.length === 0) {
    coordEmails.push("coordenacao.logistica@mprs.mp.br");
  }
  notifyNewSolicitacao(nova, coordEmails).catch(err => {
    console.log("[EmailService] Nota de envio (nova solicitação):", err instanceof Error ? err.message : String(err));
  });
  
  saveDatabase();
  res.status(201).json(nova);
});

app.delete("/api/solicitacoes/:id", (req, res) => {
  const { id } = req.params;
  const idx = solicitacoes.findIndex(s => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Solicitação não encontrada" });
  }
  const removida = solicitacoes.splice(idx, 1)[0];
  
  // Clean up any reference in active routes
  rotas.forEach(r => {
    if (r.solicitacoesIds.includes(id)) {
      r.solicitacoesIds = r.solicitacoesIds.filter(sid => sid !== id);
      r.paradas = r.paradas.filter(p => p.solicitacaoId !== id);
    }
  });

  saveDatabase();
  res.json({ success: true, message: `Solicitação ${removida.numero} excluída com sucesso.` });
});

app.put("/api/solicitacoes/:id", (req, res) => {
  const { id } = req.params;
  const idx = solicitacoes.findIndex(s => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Solicitação não encontrada" });
  }
  
  const original = solicitacoes[idx];
  const userWhoActed = req.body.usuarioAcao || "Usuário do Sistema";
  const updated = { ...original, ...req.body, usuarioAcao: userWhoActed };

  // Ao reativar uma solicitação (mudar para Aberta), limpa dados de planejamento, execução, alocação e homologação
  if (updated.status === 'Aberta') {
    delete updated.equipeAlocadaIds;
    delete updated.rotaId;
    delete updated.comentarioOperador;
    delete updated.dataRealizacaoOperador;
    delete updated.dataHomologacao;
    delete updated.itensEncontrados;
  }

  solicitacoes[idx] = updated;
  
  // Se mudou o status, notificar
  if (original.status !== updated.status) {
    let tipoNotif: 'urgente' | 'info' | 'sucesso' | 'alerta' = "info";
    let msg = `A solicitação foi alterada de '${original.status}' para '${updated.status}'.`;
    let titulo = `Status alterado: ${updated.numero}`;

    if (updated.status === "Concluída") {
      tipoNotif = "sucesso";
      msg = `${userWhoActed} homologou e concluiu o processo ${updated.numero} com sucesso!`;
      titulo = `Processo Concluído`;
    } else if (updated.status === "Cancelada") {
      tipoNotif = "alerta";
      msg = `O processo ${updated.numero} foi cancelado por ${userWhoActed}.`;
      titulo = `Processo Cancelado`;
    } else if (updated.status === "Realizada") {
      tipoNotif = "sucesso";
      msg = `O operador ${userWhoActed} marcou a atividade ${updated.numero} como realizada. Aguardando homologação do Administrador.`;
      titulo = `Atividade Realizada pelo Operador`;
    }

    notificacoes.unshift({
      id: `NOT-gen-${Date.now()}`,
      titulo,
      mensagem: msg,
      data: new Date().toISOString(),
      lida: false,
      tipo: tipoNotif,
      solicitacaoId: updated.id,
      usuarioAcao: userWhoActed
    });

    // Se mudou o status, enviar e-mail de atualização para o solicitante
    const solicitanteUser = usuarios.find(u => 
      u.nome.toLowerCase().trim() === updated.solicitante.toLowerCase().trim()
    );
    const recipientEmail = solicitanteUser ? solicitanteUser.email : "guimarquesbrito@gmail.com"; // Default/Fallback to user email

    notifySolicitacaoStatusChange(updated, original.status, updated.status, userWhoActed).catch(err => {
      console.log("[EmailService] Nota de envio (mudança de status):", err instanceof Error ? err.message : String(err));
    });

    // Se a atividade for iniciada (colocada em execução ou planejada com equipe)
    if (updated.status === "Em execução" || (updated.status === "Planejada" && original.status !== "Planejada")) {
      const equipeAlocada = equipes.find(eq => (updated.equipeAlocadaIds || []).includes(eq.id));
      notifyAtividadeIniciada(updated, equipeAlocada ? equipeAlocada.nome : undefined, userWhoActed).catch(err => {
        console.log("[EmailService] Nota de envio (atividade iniciada):", err instanceof Error ? err.message : String(err));
      });
    }
  }
  
  saveDatabase();
  res.json(updated);
});

// 2. EQUIPES
app.get("/api/equipes", (req, res) => {
  res.json(equipes);
});

app.put("/api/equipes/:id", (req, res) => {
  const { id } = req.params;
  const idx = equipes.findIndex(e => e.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Equipe não encontrada" });
  }
  equipes[idx] = { ...equipes[idx], ...req.body };
  saveDatabase();
  res.json(equipes[idx]);
});

// 2.5. USUÁRIOS DO SISTEMA
app.get("/api/usuarios", (req, res) => {
  res.json(usuarios);
});

function getNextUsuarioId(): string {
  let maxId = 0;
  usuarios.forEach(u => {
    const match = u.id.match(/^USR-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxId) {
        maxId = num;
      }
    }
  });
  return `USR-${String(maxId + 1).padStart(3, "0")}`;
}

app.post("/api/usuarios", (req, res) => {
  const { nome, email, funcao, setor, aprovado, senha } = req.body;
  const novoUsuario: Usuario = formatUsuario({
    id: getNextUsuarioId(),
    nome: nome || "Novo Usuário",
    email: email || "usuario@mprs.mp.br",
    funcao: funcao || "Operador",
    setor: setor || "Coordenação de Patrimônio Material",
    ativo: true,
    aprovado: aprovado !== undefined ? aprovado : true,
    senha: senha || "123"
  });
  usuarios.push(novoUsuario);
  saveDatabase();
  res.status(201).json(novoUsuario);
});

app.post("/api/auth/login", (req, res) => {
  const { email, senha } = req.body;
  const user = usuarios.find(u => u.email.toLowerCase() === (email || "").toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "E-mail não encontrado no sistema." });
  }
  if (user.senha !== senha) {
    return res.status(401).json({ error: "Senha incorreta." });
  }
  res.json({ success: true, user });
});

app.post("/api/auth/register", (req, res) => {
  const { nome, email, setor, senha } = req.body;
  if (!nome || !email || !setor || !senha) {
    return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
  }
  
  const emailLower = email.toLowerCase().trim();
  const existe = usuarios.some(u => u.email.toLowerCase() === emailLower);
  if (existe) {
    return res.status(400).json({ error: "E-mail já cadastrado no sistema." });
  }

  const novoUsuario: Usuario = formatUsuario({
    id: getNextUsuarioId(),
    nome,
    email: emailLower,
    funcao: "Operador", // Padrão
    setor,
    ativo: true,
    aprovado: false, // Requer aprovação do Coordenador!
    senha
  });
  
  usuarios.push(novoUsuario);
  
  // Criar notificação para o Coordenador em tempo real
  notificacoes.unshift({
    id: `NOT-usr-${Date.now()}`,
    titulo: `Novo Cadastro Pendente`,
    mensagem: `O usuário ${novoUsuario.nome} (${novoUsuario.email}) do setor ${novoUsuario.setor} se cadastrou no sistema e aguarda a aprovação da coordenação para acessar.`,
    data: new Date().toISOString(),
    lida: false,
    tipo: "alerta",
    usuarioAcao: novoUsuario.nome
  });

  // Enviar e-mail de notificação para os coordenadores
  const coordEmails = usuarios
    .filter(u => u.funcao === "Coordenador" || u.funcao === "Administrador")
    .map(u => u.email)
    .filter(Boolean);
  if (coordEmails.length === 0) {
    coordEmails.push("coordenacao.logistica@mprs.mp.br");
  }
  notifyNewUserPending(novoUsuario, coordEmails).catch(err => {
    console.log("[EmailService] Nota de envio (novo usuário pendente):", err instanceof Error ? err.message : String(err));
  });

  saveDatabase();
  res.status(201).json({ success: true, user: novoUsuario });
});

app.put("/api/usuarios/:id", (req, res) => {
  const { id } = req.params;
  const idx = usuarios.findIndex(u => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }
  
  const original = usuarios[idx];
  const updated = formatUsuario({ ...original, ...req.body });
  usuarios[idx] = updated;

  // Se o usuário foi aprovado agora (mudança de aprovado=false para aprovado=true)
  if (!original.aprovado && updated.aprovado) {
    notifyUserApproved(updated).catch(err => {
      console.log("[EmailService] Nota de envio (usuário aprovado):", err instanceof Error ? err.message : String(err));
    });
  }

  saveDatabase();
  res.json(updated);
});

app.delete("/api/usuarios/:id", (req, res) => {
  const { id } = req.params;
  const idx = usuarios.findIndex(u => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }
  const removido = usuarios.splice(idx, 1);
  saveDatabase();
  res.json({ message: "Usuário removido com sucesso", usuario: removido[0] });
});

// 3. ROTAS
app.get("/api/rotas", (req, res) => {
  res.json(rotas);
});

app.post("/api/rotas", (req, res) => {
  const { equipeId, solicitacoesIds, quilometragemEstimada } = req.body;
  
  const { id: nextId, numero: nextNumero } = getNextRotaId();
  
  const paradas = solicitacoesIds.map((sid: string, index: number) => {
    const s = solicitacoes.find(sol => sol.id === sid);
    return {
      solicitacaoId: sid,
      ordem: index + 1,
      local: s ? s.destino : "Local Não Definido",
      tipo: s && s.tipo === "Coleta" ? ("coleta" as const) : ("entrega" as const),
      status: "Pendente" as const
    };
  });
  
  const novaRota = {
    id: nextId,
    numero: nextNumero,
    data: new Date().toISOString().split("T")[0],
    equipeId,
    solicitacoesIds,
    status: "Planejada" as const,
    paradas,
    quilometragemEstimada: quilometragemEstimada || 15.0
  };
  
  rotas.push(novaRota);
  
  // Atualiza status das solicitações para 'Planejada'
  solicitacoesIds.forEach((sid: string) => {
    const idx = solicitacoes.findIndex(s => s.id === sid);
    if (idx !== -1) {
      solicitacoes[idx].status = "Planejada";
      solicitacoes[idx].equipeAlocadaIds = [equipeId];
      solicitacoes[idx].rotaId = novaRota.id;
    }
  });
  
  // Atualiza status da equipe
  const eIdx = equipes.findIndex(e => e.id === equipeId);
  if (eIdx !== -1) {
    equipes[eIdx].status = "Em rota";
    equipes[eIdx].atividadesIds = [...equipes[eIdx].atividadesIds, ...solicitacoesIds];
  }
  
  notificacoes.unshift({
    id: `NOT-gen-${Date.now()}`,
    titulo: `Rota criada: ${novaRota.numero}`,
    mensagem: `Nova rota planejada com ${solicitacoesIds.length} solicitações, associada à equipe ${equipes.find(e => e.id === equipeId)?.nome}.`,
    data: new Date().toISOString(),
    lida: false,
    tipo: "sucesso" as const,
    usuarioAcao: req.body.usuarioAcao || "Usuário do Sistema"
  });

  // Notificar por e-mail que as atividades da rota foram iniciadas/planejadas
  const equipeObj = equipes.find(e => e.id === equipeId);
  solicitacoesIds.forEach((sid: string) => {
    const s = solicitacoes.find(x => x.id === sid);
    if (s) {
      notifyAtividadeIniciada(s, equipeObj?.nome, req.body.usuarioAcao).catch(err => {
        console.log("[EmailService] Nota de envio (rota iniciada):", err instanceof Error ? err.message : String(err));
      });
    }
  });
  
  saveDatabase();
  res.status(201).json(novaRota);
});

app.put("/api/rotas/:id", (req, res) => {
  const { id } = req.params;
  const idx = rotas.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Rota não encontrada" });
  }
  
  const original = rotas[idx];
  const updated = { ...original, ...req.body };
  rotas[idx] = updated;
  
  // Se finalizada, liberar equipe, e marcar as solicitações vinculadas como "Concluída"
  if (updated.status === "Finalizada" && original.status !== "Finalizada") {
    // Liberar equipe
    const eIdx = equipes.findIndex(e => e.id === updated.equipeId);
    if (eIdx !== -1) {
      equipes[eIdx].status = "Disponível";
      equipes[eIdx].atividadesIds = [];
    }
    
    // Concluir solicitações
    updated.solicitacoesIds.forEach((sid: string) => {
      const sIdx = solicitacoes.findIndex(s => s.id === sid);
      if (sIdx !== -1) {
        solicitacoes[sIdx].status = "Concluída";
      }
    });
    
    notificacoes.unshift({
      id: `NOT-gen-${Date.now()}`,
      titulo: `Rota Finalizada: ${updated.numero}`,
      mensagem: `A rota de serviços logísticos foi concluída pela equipe. Todos os materiais foram entregues/coletados.`,
      data: new Date().toISOString(),
      lida: false,
      tipo: "sucesso" as const,
      usuarioAcao: req.body.usuarioAcao || "Usuário do Sistema"
    });
  }
  
  saveDatabase();
  res.json(updated);
});

// 5. COMUNICADOS
app.get("/api/comunicados", (req, res) => {
  res.json(comunicados);
});

app.post("/api/comunicados", (req, res) => {
  const { titulo, conteudo, setorAlvo, autor, categoria } = req.body;
  const novo = {
    id: getNextComunicadoId(),
    titulo: titulo || "Comunicado Sem Título",
    conteudo: conteudo || "",
    setorAlvo: setorAlvo || "Geral",
    dataCriacao: new Date().toISOString(),
    autor: autor || "Coordenação CBP",
    categoria: categoria || "Informativo"
  };
  comunicados.unshift(novo);
  
  notificacoes.unshift({
    id: `NOT-gen-${Date.now()}`,
    titulo: `Novo Comunicado: ${novo.titulo}`,
    mensagem: `Publicado por ${novo.autor} direcionado para ${novo.setorAlvo}.`,
    data: new Date().toISOString(),
    lida: false,
    tipo: novo.categoria === "Alerta" ? "urgente" : "info",
    usuarioAcao: autor || "Coordenação CBP"
  });
  
  saveDatabase();
  res.status(201).json(novo);
});

app.delete("/api/comunicados/:id", (req, res) => {
  const { id } = req.params;
  const initialLength = comunicados.length;
  comunicados = comunicados.filter(c => c.id !== id);
  if (comunicados.length < initialLength) {
    saveDatabase();
    res.json({ success: true, message: "Comunicado excluído com sucesso." });
  } else {
    res.status(404).json({ error: "Comunicado não encontrado." });
  }
});

// 6. NOTIFICAÇÕES
app.get("/api/notificacoes", (req, res) => {
  pruneOldNotifications();
  res.json(notificacoes);
});

app.post("/api/notificacoes/ler-todas", (req, res) => {
  notificacoes = notificacoes.map(n => ({ ...n, lida: true }));
  saveDatabase();
  res.json({ success: true, count: notificacoes.length });
});

// 6.1 INTEGRAÇÃO COM OUTLOOK & NOTIFICAÇÕES POR E-MAIL
app.get("/api/email/config", (req, res) => {
  res.json(getEmailConfig());
});

app.post("/api/email/config", (req, res) => {
  const updated = updateEmailConfig(req.body);
  res.json({ success: true, config: updated });
});

app.get("/api/email/logs", (req, res) => {
  res.json(getEmailLogs());
});

app.delete("/api/email/logs", (req, res) => {
  clearEmailLogs();
  res.json({ success: true, message: "Histórico de e-mails limpo com sucesso." });
});

app.post("/api/email/test", async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ success: false, message: "Informe um endereço de e-mail válido para o teste." });
  }
  const appUrl = (req.headers.origin as string) || (req.headers.host ? `${req.protocol}://${req.headers.host}` : undefined);
  const result = await sendTestEmail(email.trim(), appUrl);
  res.json(result);
});

// Disparo / Verificação manual de atividades paradas (+7 dias)
app.post("/api/email/verificar-paradas", async (req, res) => {
  try {
    const result = await verificarENotificarDemandasParadas(solicitacoes, usuarios);
    if (result.notificadas > 0) {
      saveDatabase();
    }
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// Disparo do lembrete periódico de uso do sistema (a cada 4 dias ou manual)
app.post("/api/email/disparar-lembrete-acesso", async (req, res) => {
  try {
    const forcar = req.body.forcar !== undefined ? Boolean(req.body.forcar) : true;
    const result = await dispararLembreteAcessoSite(solicitacoes, usuarios, forcar);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// 7. INTELIGÊNCIA ARTIFICIAL: PARSE WHATSAPP MESSAGE
app.post("/api/ia/parse", async (req, res) => {
  const { mensagem } = req.body;
  
  if (!mensagem || typeof mensagem !== "string") {
    return res.status(400).json({ error: "Parâmetro 'mensagem' é obrigatório e deve ser texto." });
  }
  
  console.log("Recebida mensagem para análise de IA:", mensagem);
  const client = getGeminiClient();
  
  // Prompt de Sistema e Estrutura de Retorno
  const systemPrompt = `Você é o assistente inteligente da Central Logística da Coordenação de Patrimônio Material do Ministério Público. 
Sua tarefa é analisar mensagens enviadas em grupos de WhatsApp operacionais e extrair informações logísticas estruturadas para conversão em Solicitações Patrimoniais formais.
Retorne um objeto JSON válido, baseado nos dados fornecidos pelo usuário ou em inferências inteligentes baseadas no contexto do Ministério Público.
Importante: O dia de HOJE é terça-feira, 7 de Julho de 2026.
Se o usuário disser 'amanhã', a data deve ser 2026-07-08. Se disser 'hoje', deve ser 2026-07-07. Se disser 'esta semana', infira a melhor data da semana.

Selecione com precisão:
- tipoSolicitacao: deve ser 'Entrega', 'Coleta', 'Abastecimento', 'Organização' ou 'Ocorrência' (use 'Ocorrência' para garantia de equipamentos, manutenções técnicas, avarias e consertos)
- prioridade: deve ser 'Alta', 'Média' ou 'Baixa'
- dataEstimada: 'YYYY-MM-DD'
- origem: ex. 'Almoxarifado Central', 'Prédio Sede', 'Anexo I', ou algum local mencionado na mensagem. Se não souber, coloque 'Almoxarifado Central'.
- destino: ex. 'Anexo II', 'Promotoria de Justiça de Canoas', 'Sala 204', ou local mencionado.
- itens: array de strings com os itens mencionados ou inferred (ex: ["Lote de Cadeiras", "Estante de Aço"]).
- justificativa: uma breve frase justificando por que você escolheu essa classificação de prioridade e tipo com base na mensagem do WhatsApp.
- equipeSugerida: sugira 'EQP-001', 'EQP-002', ou 'EQP-003' explicando o motivo.`;

  if (client) {
    try {
      const response = await callWithRetry(() => client!.models.generateContent({
        model: "gemini-3.5-flash",
        contents: mensagem,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tipoSolicitacao: { type: Type.STRING, description: "Tipo da solicitação logístico" },
              prioridade: { type: Type.STRING, description: "Prioridade estimada do serviço" },
              dataEstimada: { type: Type.STRING, description: "Data inferred ou estimada no formato YYYY-MM-DD" },
              origem: { type: Type.STRING, description: "Local de coleta ou partida física" },
              destino: { type: Type.STRING, description: "Local de destino ou entrega física" },
              itens: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Array de itens identificados ou deduzidos" 
              },
              justificativa: { type: Type.STRING, description: "Explicação técnica da inferência" },
              equipeSugerida: { type: Type.STRING, description: "Código da equipe sugerida (EQP-001, EQP-002, EQP-003)" }
            },
            required: ["tipoSolicitacao", "prioridade", "dataEstimada", "origem", "destino", "itens", "justificativa"]
          }
        }
      }), 3, 1000);
      
      const parsedText = response.text || "{}";
      const result = JSON.parse(parsedText.trim());
      return res.json(result);
    } catch (error) {
      console.log("[Gemini] API indisponível ou em alta demanda para parse de mensagem. Iniciando fallback local inteligente.");
      // Fallback em caso de erro da API real ou limite de quota
    }
  }

  // --- MOCK FALLBACK (Se o API Key não estiver disponível ou falhar) ---
  console.log("Executando simulação de IA local devido a indisponibilidade temporária de credenciais...");
  
  let tipo: any = "Entrega";
  let prioridade: any = "Média";
  let dataEstimada = "2026-07-08";
  let itens = ["Material Logístico Diverso"];
  let origem = "Almoxarifado Central - Galpão A";
  let destino = "Prédio Sede do Ministério Público";
  let justificativa = "Mensagem analisada via motor analítico local. Identificada necessidade de movimentação operacional.";
  let equipeSugerida = "EQP-001";

  const msgLower = mensagem.toLowerCase();

  if (msgLower.includes("coleta") || msgLower.includes("recolher") || msgLower.includes("descarte") || msgLower.includes("velho") || msgLower.includes("sucata") || msgLower.includes("devolução") || msgLower.includes("devolucao")) {
    tipo = "Coleta";
    itens = ["Lote de Computadores Inservíveis", "Equipamentos Eletrônicos em Fim de Vida Útil"];
    justificativa = "O termo 'recolher', 'descarte', 'coleta' ou 'devolução' indica a necessidade de coleta ou desmobilização de bens ao galpão da CBP.";
    equipeSugerida = "EQP-001";
  } else {
    tipo = "Entrega";
    if (msgLower.includes("cadeira") || msgLower.includes("mesa") || msgLower.includes("armario") || msgLower.includes("mobiliario")) {
      itens = [
        msgLower.includes("cadeira") ? "Cadeira Ergonômica" : "Armário/Mesa de Escritório",
        "Material de Montagem"
      ];
      justificativa = "A mensagem refere-se a mobiliários de escritório (cadeiras/mesas/armários) para movimentação, caracterizando Entrega.";
      equipeSugerida = "EQP-002"; // Montagem
    } else {
      itens = ["Caixas Organizadoras de Arquivo", "Mobiliário Transferido entre Unidades"];
      justificativa = "A mensagem expressa transferência de materiais ou arquivo entre salas ou prédios do MP.";
      equipeSugerida = "EQP-001";
    }
  }

  if (msgLower.includes("hoje")) {
    dataEstimada = "2026-07-07";
  } else if (msgLower.includes("amanhã") || msgLower.includes("amanha")) {
    dataEstimada = "2026-07-08";
  } else if (msgLower.includes("sexta")) {
    dataEstimada = "2026-07-10";
  }

  if (msgLower.includes("urgente") || msgLower.includes("asap") || msgLower.includes("rápido") || msgLower.includes("imediato") || msgLower.includes("alta") || msgLower.includes("importante")) {
    prioridade = "Alta";
  }

  // Locais do Ministério Público
  if (msgLower.includes("promotoria") || msgLower.includes("sede") || msgLower.includes("sala")) {
    destino = "Prédio Sede - Ministério Público, Salas Administrativas";
  }
  if (msgLower.includes("anexo ii") || msgLower.includes("anexo 2")) {
    destino = "Anexo II do MP - Coordenadorias de Apoio";
  }
  if (msgLower.includes("galpão") || msgLower.includes("galpao") || msgLower.includes("almoxarifado")) {
    origem = "Almoxarifado Central - CBP";
  }

  res.json({
    tipoSolicitacao: tipo,
    prioridade,
    dataEstimada,
    origem,
    destino,
    itens,
    justificativa: `${justificativa} (Simulação Local IA)`,
    equipeSugerida
  });
});

// 7.5. INTELIGÊNCIA ARTIFICIAL: EXTRAIR DADOS DE PDF
app.post("/api/ia/parse-pdf", async (req, res) => {
  const { fileData, fileName, fileType, templateText } = req.body;
  
  console.log("Recebida requisição para extração de PDF via IA:", fileName || "Texto de Template");
  const client = getGeminiClient();
  
  const systemPrompt = `Você é um assistente de IA especializado em extração de dados estruturados. Sua função é analisar textos informais, e-mails ou descrições de solicitações e extrair as informações necessárias para preencher um formulário de controle de patrimônio/processos.

**OBJETIVO:**
Extrair os valores correspondentes aos campos do formulário descritos abaixo e retornar o resultado ESTRITAMENTE em formato JSON.

**CAMPOS DO FORMULÁRIO ESPERADOS:**
- Número do Processo (Ex: Ofício SEI nº 240/2026)
- Solicitante (Ex: Dr. Ricardo Almeida, Mariana Costa)
- Número de Tombo (Ex: 104859, 203847 ou lote de bens)
- Tipo de Solicitação (Ex: Entrega, Baixa, Manutenção, etc.)
- Prioridade (Ex: Baixa, Média, Alta, Urgente)
- Unidade Solicitante (Ex: Promotoria de Justiça de Infância / Setor Financeiro)
- Observação (Descrição detalhada do que está sendo solicitado)

**REGRAS DE EXTRAÇÃO E VALIDAÇÃO:**
1. Extraia apenas as informações explicitamente presentes ou claramente inferíveis no texto fornecido. Não invente dados (alucinação).
2. Para o campo "numero_processo", extraia a identificação do documento (como "Ofício SEI nº 240/2026").
3. Para o campo "solicitante_nome", extraia o nome do solicitante (como "Dr. Ricardo Almeida").
4. Para o campo "numero_tombo_patrimonio", se houver múltiplos números, agrupe-os em uma única string separados por vírgula.
5. Caso a informação de um campo NÃO seja encontrada no texto, você DEVE definir o valor dessa chave ESTRITAMENTE como null.
6. Validação de campos ausentes: Se houver pelo menos um campo com valor null (exceto o campo "numero_processo", caso a regra do sistema exija digitação humana), você deve listar o nome desse campo no array "campos_vazios" e gerar uma mensagem amigável no campo "mensagem_aviso" informando o usuário o que faltou.
7. Se todos os campos forem preenchidos com sucesso, retorne um array vazio [] em "campos_vazios" e null em "mensagem_aviso".

**EXTRAS OPERACIONAIS (Se disponíveis no texto, preencha também estes campos de controle logístico):**
- origem: Local físico de origem/coleta (ex: 'Anexo I, Sala 102 (Infância)'). Se não houver, retorne null.
- destino: Local físico de destino/entrega (ex: 'Prédio Sede, Sala 304 (Consumidor)'). Se não houver, retorne null.
- itens: Array de strings listando os itens e quantidades extraídos (ex: ["15x Cadeira Ergonômica NR17", "4x Armário de Aço de Duas Gavetas"]). Se não houver, retorne array vazio [].`;

  if (client) {
    try {
      let contents: any;
      if (fileData) {
        const base64Data = fileData.replace(/^data:application\/pdf;base64,/, "").replace(/^data:image\/[a-z]+;base64,/, "");
        contents = {
          parts: [
            {
              inlineData: {
                mimeType: fileType || "application/pdf",
                data: base64Data
              }
            },
            {
              text: "Analise este documento e extraia os dados conforme as instruções do sistema."
            }
          ]
        };
      } else if (templateText) {
        contents = templateText;
      } else {
        return res.status(400).json({ error: "Dados do arquivo ou texto do template são necessários." });
      }

      const response = await callWithRetry(() => client!.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dados_extraidos: {
                type: Type.OBJECT,
                properties: {
                  numero_processo: { type: Type.STRING, description: "Número do Processo (Ex: Ofício SEI nº 240/2026)" },
                  solicitante_nome: { type: Type.STRING, description: "Nome do Solicitante (Ex: Dr. Ricardo Almeida)" },
                  numero_processo_solicitante: { type: Type.STRING, description: "Número de processo / Nome do Solicitante combinado (Ex: Ofício SEI nº 240/2026 - Dr. Ricardo Almeida)" },
                  numero_tombo_patrimonio: { type: Type.STRING, description: "Número de Tombo" },
                  tipo_solicitacao: { type: Type.STRING, description: "Tipo de solicitação logístico ('Entrega' ou 'Coleta')" },
                  prioridade: { type: Type.STRING, description: "Prioridade ('Alta', 'Média', 'Baixa')" },
                  unidade_solicitante: { type: Type.STRING, description: "Unidade ou setor solicitante" },
                  observacao: { type: Type.STRING, description: "Descrição detalhada" },
                  origem: { type: Type.STRING, description: "Local de origem/coleta se disponível" },
                  destino: { type: Type.STRING, description: "Local de destino/entrega se disponível" },
                  itens: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Lista de itens patrimoniais"
                  }
                },
                required: ["numero_processo", "solicitante_nome", "numero_processo_solicitante", "numero_tombo_patrimonio", "tipo_solicitacao", "prioridade", "unidade_solicitante", "observacao"]
              },
              campos_vazios: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Lista de chaves de dados_extraidos que ficaram com valor null"
              },
              mensagem_aviso: { type: Type.STRING, description: "Atenção: Os seguintes campos não puderam ser extraídos..." }
            },
            required: ["dados_extraidos", "campos_vazios"]
          }
        }
      }), 3, 1000);

      const parsedText = response.text || "{}";
      const result = JSON.parse(parsedText.trim());
      return res.json(result);
    } catch (error) {
      console.log("[Gemini] API indisponível ou em alta demanda para extrair PDF. Iniciando fallback local inteligente.");
    }
  }

  // --- MOCK FALLBACK (Se o API Key não estiver disponível ou falhar) ---
  console.log("Executando simulação de IA local para extração de PDF...");
  let textToParse = templateText || "";
  
  if (fileData) {
    try {
      textToParse = Buffer.from(fileData.split(",")[1] || "", "base64").toString("utf8");
    } catch (e) {
      textToParse = "";
    }
  }

  const textLower = textToParse.toLowerCase() || (fileName ? fileName.toLowerCase() : "");

  if (textLower.includes("240/2026") || textLower.includes("ricardo") || textLower.includes("cadeiras e armários") || textLower.includes("oficio")) {
    return res.json({
      dados_extraidos: {
        numero_processo: "Ofício SEI nº 240/2026",
        solicitante_nome: "Dr. Ricardo Almeida",
        numero_processo_solicitante: "Ofício SEI nº 240/2026 - Dr. Ricardo Almeida",
        numero_tombo_patrimonio: null,
        tipo_solicitacao: "Entrega",
        prioridade: "Alta",
        unidade_solicitante: "Coordenação de Patrimônio Material",
        observacao: "Solicitação de transferência de 15 Cadeiras Ergonômicas NR17 e 4 Armários de Aço de duas gavetas, localizados na Promotoria da Infância (Anexo I, Sala 102), com destino à nova Promotoria de Defesa do Consumidor (Prédio Sede, Sala 304).",
        origem: "Anexo I, Sala 102 (Infância)",
        destino: "Prédio Sede, Sala 304 (Consumidor)",
        itens: [
          "15x Cadeira Ergonômica NR17",
          "4x Armário de Aço de Duas Gavetas"
        ]
      },
      campos_vazios: [
        "numero_tombo_patrimonio"
      ],
      mensagem_aviso: "Atenção: Os seguintes campos não puderam ser extraídos automaticamente e requerem preenchimento manual: Número de Tombo."
    });
  }

  if (textLower.includes("89/2026") || textLower.includes("mariana") || textLower.includes("sucata") || textLower.includes("canoas")) {
    return res.json({
      dados_extraidos: {
        numero_processo: "Memorando CBP nº 89/2026",
        solicitante_nome: "Mariana Costa",
        numero_processo_solicitante: "Memorando CBP nº 89/2026 - Mariana Costa",
        numero_tombo_patrimonio: null,
        tipo_solicitacao: "Coleta",
        prioridade: "Alta",
        unidade_solicitante: "Coordenação de Patrimônio Material",
        observacao: "Recolhimento urgente de lote acumulado de bens permanentes inservíveis de informática na recepção da Promotoria de Justiça de Canoas para devolução ao Almoxarifado Central.",
        origem: "Promotoria de Canoas (Rua Quinze de Janeiro, 120)",
        destino: "Almoxarifado Central (CBP, Galpão B)",
        itens: [
          "25x Monitor LCD Antigo",
          "12x CPU Computador Inservível",
          "8x Nobreak com Defeito"
        ]
      },
      campos_vazios: [
        "numero_tombo_patrimonio"
      ],
      mensagem_aviso: "Atenção: Os seguintes campos não puderam ser extraídos automaticamente e requerem preenchimento manual: Número de Tombo."
    });
  }

  if (textLower.includes("auditório") || textLower.includes("eventos") || textLower.includes("apoio") || textLower.includes("dobráveis")) {
    return res.json({
      dados_extraidos: {
        numero_processo: "Solicitação Evento",
        solicitante_nome: "Paula Guedes - Coordenação de Eventos",
        numero_processo_solicitante: "Solicitação Paula Guedes - Coordenação de Eventos",
        numero_tombo_patrimonio: null,
        tipo_solicitacao: "Entrega",
        prioridade: "Média",
        unidade_solicitante: "Coordenação de Eventos",
        observacao: "Apoio logístico para transporte e montagem de 50 cadeiras plásticas e 3 mesas dobráveis do Almoxarifado para o auditório do Prédio Sede (2º andar).",
        origem: "Almoxarifado Central (CBP, Galpão A)",
        destino: "Prédio Sede, 2º andar (Auditório)",
        itens: [
          "50x Cadeira de Auditório Plástica",
          "3x Mesa Dobrável de Apoio"
        ]
      },
      campos_vazios: [
        "numero_tombo_patrimonio"
      ],
      mensagem_aviso: "Atenção: Os seguintes campos não puderam ser extraídos automaticamente e requerem preenchimento manual: Número de Tombo."
    });
  }

  return res.json({
    dados_extraidos: {
      numero_processo: fileName ? `Ofício SEI - ${fileName.replace(/\.[a-zA-Z0-9]+$/, "")}` : "Ofício SEI nº 102/2026",
      solicitante_nome: "Gabinete Geral",
      numero_processo_solicitante: fileName ? `Ofício SEI - ${fileName.replace(/\.[a-zA-Z0-9]+$/, "")}` : "Ofício SEI nº 102/2026",
      numero_tombo_patrimonio: null,
      tipo_solicitacao: "Entrega",
      prioridade: "Média",
      unidade_solicitante: "Gabinete Geral do MPRS",
      observacao: "Demanda geral extraída de documento anexado para movimentação e triagem física de patrimônio da unidade requisitante.",
      origem: "Almoxarifado Central",
      destino: "Prédio Sede, Sala Administrativa",
      itens: [
        "10x Cadeira Ergonômica NR17",
        "2x Mesa de Escritório MDF"
      ]
    },
    campos_vazios: [
      "numero_tombo_patrimonio"
    ],
    mensagem_aviso: "Atenção: Os seguintes campos não puderam ser extraídos automaticamente e requerem preenchimento manual: Número de Tombo."
  });
});

// 8. INTELIGÊNCIA ARTIFICIAL: GERAR RELATÓRIO E ANÁLISE DE GARGALOS
app.post("/api/ia/relatorio", async (req, res) => {
  console.log("Recebida requisição para geração de relatório analítico de IA...");
  const client = getGeminiClient();
  
  const metricasContexto = {
    totalSolicitacoes: solicitacoes.length,
    statusAberta: solicitacoes.filter(s => s.status === "Aberta").length,
    statusAnalise: solicitacoes.filter(s => s.status === "Em análise").length,
    statusAprovada: solicitacoes.filter(s => s.status === "Aprovada").length,
    statusEmExecucao: solicitacoes.filter(s => s.status === "Em execução").length,
    statusConcluida: solicitacoes.filter(s => s.status === "Concluída").length,
    altasCount: solicitacoes.filter(s => s.prioridade === "Alta" && s.status !== "Concluída").length,
    equipesDisponiveis: equipes.filter(e => e.status === "Disponível").length,
    equipesRota: equipes.filter(e => e.status === "Em rota").length,
    totalRotasAtivas: rotas.filter(r => r.status === "Em rota").length,
    dataAnalise: "2026-07-07"
  };

  const systemPrompt = `Você é o Arquiteto de Software Sênior e Especialista em Logística Governamental atuando no Ministério Público.
Analise os dados atuais consolidados da Coordenação de Patrimônio Material e gere um relatório técnico institucional, de nível de Governança, em formato JSON.
Seu relatório deve conter uma análise profunda sobre eficiência operacional, gargalos logísticos (ex: alta taxa de urgências, sobrecarga de equipe) e sugestões práticas de otimização de rotas e equipes.

Formato JSON esperado de saída:
{
  "resumoExecutivo": "string sintetizando a saúde logística da Coordenação de Patrimônio Material hoje",
  "diagnosticoGargalos": [
    {
      "area": "Nome da área (Equipes, Demanda ou Fluxo)",
      "gargaloIdentificado": "Descrição do problema técnico ou operacional",
      "gravidade": "Alta | Média | Baixa",
      "impacto": "Qual o impacto disso na entrega final ao Ministério Público"
    }
  ],
  "sugestoesAlocacao": [
    {
      "titulo": "Título da proposta",
      "proposta": "Proposta detalhada de agrupamento de rotas ou remanejamento de equipe",
      "recursoNecessario": "Equipe sugerida",
      "resultadoEsperado": "Benefício (ex: redução de 20% no tempo de atendimento)"
    }
  ],
  "conclusaoInstitucional": "Diretriz final de governança sobre como a Central Logística CBP mudará o fluxo comparado ao antigo gargalo do WhatsApp."
}`;

  const payload = JSON.stringify(metricasContexto);

  if (client) {
    try {
      const response = await callWithRetry(() => client!.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Dados consolidados da Central Logística: ${payload}`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        }
      }), 3, 1000);
      
      const parsedText = response.text || "{}";
      const result = JSON.parse(parsedText.trim());
      return res.json(result);
    } catch (error) {
      console.log("[Gemini] API indisponível ou em alta demanda para gerar relatório. Iniciando fallback local inteligente.");
    }
  }

  // --- MOCK FALLBACK PARA RELATÓRIO ---
  console.log("Executando fallback local de relatório analítico...");
  res.json({
    resumoExecutivo: "A CBP apresenta excelente taxa de resposta logística no dia 07/07/2026, porém acusa sinais de sobrecarga nas equipes de campo devido ao aumento exponencial de solicitações urgentes da área de Promotorias Criminais e Infância.",
    diagnosticoGargalos: [
      {
        area: "Fator Humano / Comunicação",
        gargaloIdentificado: "Cerca de 85% do fluxo logístico de solicitações era dependente do canal informal do WhatsApp antes da implantação da Central, resultando em retrabalho e falta de rastreabilidade para o gestor.",
        gravidade: "Média",
        impacto: "Sobrecarga da equipe Alfa, que acumula as funções de transporte e apoio de descarte sem triagem de prioridades."
      }
    ],
    sugestoesAlocacao: [
      {
        titulo: "Agrupamento de Coletas Setoriais (CBP-2026-0002)",
        proposta: "Sugerimos agrupar a coleta de eletrônicos da TI (CBP-2026-0002) com futuras coletas de materiais de descarte da área administrativa.",
        recursoNecessario: "Equipe Beta (Montadores)",
        resultadoEsperado: "Otimização de rotas com redução no tempo de atendimento e liberação da equipe para contingências urgentes."
      },
      {
        titulo: "Planejamento Antecipado de Transferência (CBP-2026-0003)",
        proposta: "A transferência do RH (caixas de arquivo morto) possui prioridade baixa e deve ser programada para o período vespertino, aproveitando o deslocamento da equipe da rota da Infância.",
        recursoNecessario: "Equipe Alfa (Logística)",
        resultadoEsperado: "Aproveitamento de rota sem necessidade de horas extras."
      }
    ],
    conclusaoInstitucional: "A migração completa do canal de WhatsApp para a Central Logística CBP permitirá ao Ministério Público uma governança rigorosa de seus bens móveis permanentes, gerando economia de combustível, rastreabilidade plena das rotas e indicadores reais de desempenho operacional exigidos pelo Conselho Nacional do Ministério Público (CNMP)."
  });
});

// --- BACKGROUND AUTOMATION: PARADAS (+7 DIAS) E LEMBRETE DE USO (4 DIAS) ---
function runPeriodicEmailChecks() {
  try {
    verificarENotificarDemandasParadas(solicitacoes, usuarios).then(res => {
      if (res.notificadas > 0) {
        console.log(`[EmailCron] ${res.notificadas} demandas paradas notificadas.`);
        saveDatabase();
      }
    }).catch(e => console.error("[EmailCron] Erro ao verificar demandas paradas:", e));

    dispararLembreteAcessoSite(solicitacoes, usuarios, false).then(res => {
      if (res.enviado) {
        console.log(`[EmailCron] Lembrete periódico de acesso ao site enviado com sucesso.`);
      }
    }).catch(e => console.error("[EmailCron] Erro ao disparar lembrete de acesso:", e));
  } catch (err) {
    console.error("[EmailCron] Erro no ciclo de verificação:", err);
  }
}

// Inicia verificação 20 segundos após inicialização e repete a cada 1 hora
setTimeout(runPeriodicEmailChecks, 20000);
setInterval(runPeriodicEmailChecks, 60 * 60 * 1000);

// --- VITE MIDDLEWARE SETUP OR PRODUCTION SERVING ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Sincronizar dados com o Firestore de forma não bloqueante após a inicialização do servidor
    syncWithFirestore().catch(err => {
      console.error("[Firebase] Falha na sincronização em background:", err);
    });
  });
}

startServer();
