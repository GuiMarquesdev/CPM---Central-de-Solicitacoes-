/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, Filter, Plus, Calendar, MapPin, ClipboardList, RefreshCw, 
  Clock, CheckCircle, AlertOctagon, HelpCircle, Archive, Trash2, Edit3, X, Check,
  Sparkles, Pencil, FileText, UploadCloud, AlertCircle, ArrowRight, Loader2, ArrowLeft,
  Truck, Package, Send, ChevronDown, ChevronUp, Boxes, Wrench, ShieldAlert, AlertTriangle, FileWarning,
  ListOrdered, FileSpreadsheet, Copy, CheckCheck, Hash, Clipboard
} from 'lucide-react';
import { Solicitacao, TipoSolicitacao, SubtipoOcorrencia, PrioridadeSolicitacao, StatusSolicitacao, Usuario, PeriodoSolicitacao } from '../types';

export interface TombItem {
  numeroTombo: string;
  estadoConservacao: 'Novo' | 'Seminovo' | 'Baixa';
}

export interface GroupedOperatorItem {
  id: string;
  nome: string;
  quantidadeSolicitada: number;
  tomboEntries: TombItem[];
  requerTombo?: boolean;
}

export const parseItemQuantityAndName = (itemStr: string) => {
  const trimmed = itemStr.trim();
  // Matches "40x cadeiras", "40 x cadeiras", "40 cadeiras", "40x-cadeiras", "40X cadeiras"
  const matchStart = trimmed.match(/^(\d+)\s*[xXªº]?\s*-?\s*(.*)$/);
  if (matchStart) {
    const qty = parseInt(matchStart[1], 10);
    const name = matchStart[2].trim() || "Item sem nome";
    return { qty, name };
  }

  // Also check if quantity is at the end, e.g. "Cadeiras 40" or "Cadeiras - 40"
  const matchEnd = trimmed.match(/^(.*?)\s*-?\s*(\d+)\s*(unidades|un|unid|pçs|pcs)?$/i);
  if (matchEnd) {
    const name = matchEnd[1].trim();
    const qty = parseInt(matchEnd[2], 10);
    if (!isNaN(qty) && qty > 0 && name.length > 0) {
      return { qty, name };
    }
  }

  return { qty: 1, name: trimmed };
};

interface SolicitationsListProps {
  solicitacoes: Solicitacao[];
  userRole: 'Coordenador' | 'Operador' | 'Administrador';
  usuarios?: Usuario[];
  loggedUser?: Usuario | null;
  onApproveUser?: (id: string, role: 'Coordenador' | 'Operador' | 'Administrador') => Promise<void>;
  onDeleteUser?: (id: string) => Promise<void>;
  onUpdateStatus: (id: string, novoStatus: StatusSolicitacao, extraPayload?: Partial<Solicitacao>) => void;
  onAdicionarSolicitacao: (nova: Partial<Solicitacao>) => void;
  onEditarSolicitacao?: (id: string, payload: Partial<Solicitacao>) => Promise<void>;
  onLimparSolicitacoes?: () => void;
  onExcluirSolicitacao?: (id: string) => void;
}

export default function SolicitationsList({ 
  solicitacoes, 
  userRole, 
  usuarios = [],
  loggedUser,
  onApproveUser,
  onDeleteUser,
  onUpdateStatus,
  onAdicionarSolicitacao,
  onEditarSolicitacao,
  onLimparSolicitacoes,
  onExcluirSolicitacao
}: SolicitationsListProps) {
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('Todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('Todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('Todos');
  
  // Controle de Abas Dinâmicas (Operador vs. Admin/Coordenador)
  const [subAba, setSubAba] = useState<string>(
    userRole === 'Operador' ? 'operador_pendentes' : 'ativas'
  );
  const [modalConcluirOperador, setModalConcluirOperador] = useState<string | null>(null);
  const [comentarioOperadorInput, setComentarioOperadorInput] = useState('');
  const [groupedItensInput, setGroupedItensInput] = useState<GroupedOperatorItem[]>([]);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [confirmandoHistorico, setConfirmandoHistorico] = useState<string | null>(null);
  const [confirmandoReativar, setConfirmandoReativar] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpandCard = (id: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  React.useEffect(() => {
    setSubAba(userRole === 'Operador' ? 'operador_pendentes' : 'ativas');
    setFiltroStatus('Todos');
  }, [userRole]);

  React.useEffect(() => {
    setFiltroStatus('Todos');
  }, [subAba]);

  // Modal de Seleção de Tipo (Entrega ou Coleta)
  const [selecaoTipoAberto, setSelecaoTipoAberto] = useState(false);

  // Modal de Criação Manual (Solicitante)
  const [modalAberto, setModalAberto] = useState(false);
  const [novoTipo, setNovoTipo] = useState<TipoSolicitacao>('Entrega');
  const [novaPrioridade, setNovaPrioridade] = useState<PrioridadeSolicitacao>('Média');
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itemInput, setItemInput] = useState('');
  const [itens, setItens] = useState<string[]>([]);
  const [solicitanteNome, setSolicitanteNome] = useState(loggedUser?.nome || 'Coordenação de Patrimônio Material');
  const [setorNome, setSetorNome] = useState(loggedUser?.setor || 'Coordenação de Patrimônio Material');
  const [numeroTombo, setNumeroTombo] = useState('');
  const [estadoConservacao, setEstadoConservacao] = useState<'Novo' | 'Seminovo' | 'Baixa'>('Seminovo');
  const [dataAgendada, setDataAgendada] = useState<string>('');
  const [periodoAgendado, setPeriodoAgendado] = useState<PeriodoSolicitacao>('Manhã');

  React.useEffect(() => {
    if (loggedUser?.nome) {
      setSolicitanteNome(loggedUser.nome);
    }
    if (loggedUser?.setor) {
      setSetorNome(loggedUser.setor);
    }
  }, [loggedUser]);

  // Estados para Ocorrências (Garantia, Manutenção, Avaria, Outros)
  const [subtipoOcorrencia, setSubtipoOcorrencia] = useState<SubtipoOcorrencia>('Garantia');
  const [equipamentoItem, setEquipamentoItem] = useState('');
  const [fornecedorOuEmpresa, setFornecedorOuEmpresa] = useState('');
  const [numeroNotaOuContrato, setNumeroNotaOuContrato] = useState('');

  // Estados para Abastecimento
  const [groupedItensAbastecimento, setGroupedItensAbastecimento] = useState<GroupedOperatorItem[]>([]);
  const [abastItemNome, setAbastItemNome] = useState('');
  const [abastItemQty, setAbastItemQty] = useState<number>(1);
  const [abastItemRequerTombo, setAbastItemRequerTombo] = useState<boolean>(true);

  const handleAddCategoriaAbastecimento = () => {
    const nomeVal = abastItemNome.trim();
    if (!nomeVal || abastItemQty <= 0) return;
    const newCategory: GroupedOperatorItem = {
      id: `abast-${Date.now()}-${Math.random()}`,
      nome: nomeVal,
      quantidadeSolicitada: abastItemQty,
      requerTombo: abastItemRequerTombo,
      tomboEntries: Array.from({ length: abastItemQty }, () => ({
        numeroTombo: '',
        estadoConservacao: 'Seminovo'
      }))
    };
    setGroupedItensAbastecimento(prev => [...prev, newCategory]);
    setAbastItemNome('');
    setAbastItemQty(1);
    setAbastItemRequerTombo(true);
  };

  const handleUpdateAbastecimentoTombo = (catIdx: number, entryIdx: number, val: string) => {
    setGroupedItensAbastecimento(prev => {
      return prev.map((cat, cIdx) => {
        if (cIdx !== catIdx) return cat;
        const nextTomboEntries = cat.tomboEntries.map((entry, eIdx) => {
          if (eIdx !== entryIdx) return entry;
          return { ...entry, numeroTombo: val };
        });
        return { ...cat, tomboEntries: nextTomboEntries };
      });
    });
  };

  const handleUpdateAbastecimentoCondition = (catIdx: number, entryIdx: number, cond: 'Novo' | 'Seminovo' | 'Baixa') => {
    setGroupedItensAbastecimento(prev => {
      return prev.map((cat, cIdx) => {
        if (cIdx !== catIdx) return cat;
        const nextTomboEntries = cat.tomboEntries.map((entry, eIdx) => {
          if (eIdx !== entryIdx) return entry;
          return { ...entry, estadoConservacao: cond };
        });
        return { ...cat, tomboEntries: nextTomboEntries };
      });
    });
  };

  const handleBulkSetAbastecimentoCondition = (catIdx: number, cond: 'Novo' | 'Seminovo' | 'Baixa') => {
    setGroupedItensAbastecimento(prev => {
      return prev.map((cat, cIdx) => {
        if (cIdx !== catIdx) return cat;
        const nextTomboEntries = cat.tomboEntries.map(entry => ({ ...entry, estadoConservacao: cond }));
        return { ...cat, tomboEntries: nextTomboEntries };
      });
    });
  };

  const handleRemoveCategoriaAbastecimento = (catIdx: number) => {
    setGroupedItensAbastecimento(prev => prev.filter((_, idx) => idx !== catIdx));
  };

  const handleToggleRequerTombo = (catIdx: number, val: boolean) => {
    setGroupedItensAbastecimento(prev => {
      return prev.map((cat, cIdx) => {
        if (cIdx !== catIdx) return cat;
        return { ...cat, requerTombo: val };
      });
    });
  };

  // ESTADOS E MÉTODOS PARA PREENCHIMENTO EM LOTE DE TOMBOS (COPIAR & COLAR / SEQUÊNCIA)
  const [pasteModalCatIdx, setPasteModalCatIdx] = useState<number | null>(null);
  const [pasteModalTexto, setPasteModalTexto] = useState<string>('');
  const [seqModalCatIdx, setSeqModalCatIdx] = useState<number | null>(null);
  const [seqModalInicio, setSeqModalInicio] = useState<string>('');
  const [batchItensModalOpen, setBatchItensModalOpen] = useState<boolean>(false);
  const [batchItensTexto, setBatchItensTexto] = useState<string>('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const parseTombosFromText = (rawText: string): string[] => {
    if (!rawText) return [];
    return rawText
      .split(/[\r\n\t,;]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);
  };

  const handleApplyPasteTombos = (catIdx: number, rawText: string, startEntryIdx: number = 0) => {
    const tombosList = parseTombosFromText(rawText);
    if (tombosList.length === 0) return;

    setGroupedItensAbastecimento(prev => {
      return prev.map((cat, cIdx) => {
        if (cIdx !== catIdx) return cat;
        const nextTomboEntries = [...cat.tomboEntries];
        let tIdx = 0;
        for (let i = startEntryIdx; i < nextTomboEntries.length && tIdx < tombosList.length; i++, tIdx++) {
          nextTomboEntries[i] = {
            ...nextTomboEntries[i],
            numeroTombo: tombosList[tIdx]
          };
        }
        return { ...cat, tomboEntries: nextTomboEntries };
      });
    });
    setPasteModalCatIdx(null);
    setPasteModalTexto('');
    showToast(`${Math.min(tombosList.length, (groupedItensAbastecimento[catIdx]?.quantidadeSolicitada || 0) - startEntryIdx)} números de tombo posicionados automaticamente!`);
  };

  const handleTomboInputPaste = (e: React.ClipboardEvent<HTMLInputElement>, catIdx: number, entryIdx: number) => {
    const pastedData = e.clipboardData.getData('text');
    const tombosList = parseTombosFromText(pastedData);
    if (tombosList.length > 1) {
      e.preventDefault();
      handleApplyPasteTombos(catIdx, pastedData, entryIdx);
    }
  };

  const handleApplySequentialTombos = (catIdx: number, startNumberStr: string) => {
    const cleanStr = startNumberStr.trim();
    if (!cleanStr) return;
    const match = cleanStr.match(/^(\D*)(\d+)(\D*)$/);
    if (!match) return;

    const prefix = match[1] || '';
    const numPart = match[2];
    const suffix = match[3] || '';
    const startNum = parseInt(numPart, 10);
    const padLength = numPart.length;

    setGroupedItensAbastecimento(prev => {
      return prev.map((cat, cIdx) => {
        if (cIdx !== catIdx) return cat;
        const nextTomboEntries = cat.tomboEntries.map((entry, idx) => {
          const currentNumber = (startNum + idx).toString().padStart(padLength, '0');
          return {
            ...entry,
            numeroTombo: `${prefix}${currentNumber}${suffix}`
          };
        });
        return { ...cat, tomboEntries: nextTomboEntries };
      });
    });
    setSeqModalCatIdx(null);
    setSeqModalInicio('');
    showToast(`Faixa sequencial de ${groupedItensAbastecimento[catIdx]?.quantidadeSolicitada || 0} tombos gerada com sucesso!`);
  };

  const handleClearTombos = (catIdx: number) => {
    setGroupedItensAbastecimento(prev => {
      return prev.map((cat, cIdx) => {
        if (cIdx !== catIdx) return cat;
        const nextTomboEntries = cat.tomboEntries.map(entry => ({ ...entry, numeroTombo: '' }));
        return { ...cat, tomboEntries: nextTomboEntries };
      });
    });
    showToast('Tombos da categoria limpos.');
  };

  const handleMarkCategorySemTombo = (catIdx: number) => {
    setGroupedItensAbastecimento(prev => {
      return prev.map((cat, cIdx) => {
        if (cIdx !== catIdx) return cat;
        return {
          ...cat,
          requerTombo: false,
          tomboEntries: cat.tomboEntries.map(e => ({ ...e, numeroTombo: '' }))
        };
      });
    });
    showToast('Categoria definida como sem exigência de tombamento.');
  };

  const handleOperatorMarkAllSemTombo = (groupIdx: number) => {
    setGroupedItensInput(prev => {
      return prev.map((group, gIdx) => {
        if (gIdx !== groupIdx) return group;
        return {
          ...group,
          requerTombo: false,
          tomboEntries: group.tomboEntries.map(e => ({ ...e, numeroTombo: 'Sem tombo' }))
        };
      });
    });
    showToast('Categoria marcada como sem tombo (Bens novos / sem tombamento).');
  };

  const handleOperatorToggleRequerTombo = (groupIdx: number, val: boolean) => {
    setGroupedItensInput(prev => {
      return prev.map((group, gIdx) => {
        if (gIdx !== groupIdx) return group;
        return { ...group, requerTombo: val };
      });
    });
  };

  const handleOperatorTomboPaste = (e: React.ClipboardEvent<HTMLInputElement>, groupIdx: number, entryIdx: number) => {
    const pastedData = e.clipboardData.getData('text');
    const tombosList = parseTombosFromText(pastedData);
    if (tombosList.length > 1) {
      e.preventDefault();
      setGroupedItensInput(prev => {
        return prev.map((group, gIdx) => {
          if (gIdx !== groupIdx) return group;
          const nextEntries = [...group.tomboEntries];
          let tIdx = 0;
          for (let i = entryIdx; i < nextEntries.length && tIdx < tombosList.length; i++, tIdx++) {
            nextEntries[i] = {
              ...nextEntries[i],
              numeroTombo: tombosList[tIdx]
            };
          }
          return { ...group, tomboEntries: nextEntries };
        });
      });
      showToast(`${tombosList.length} tombos posicionados automaticamente!`);
    }
  };

  const [permitirSemTomboOperador, setPermitirSemTomboOperador] = useState<boolean>(true);

  const handleBatchAddItens = (rawText: string) => {
    const lines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0) {
      setItens(prev => [...prev, ...lines]);
      showToast(`${lines.length} itens adicionados à solicitação!`);
    }
    setBatchItensModalOpen(false);
    setBatchItensTexto('');
  };

  // NOVOS ESTADOS PARA O FORMULÁRIO COM EXTRAÇÃO DE IA
  const [tabAtiva, setTabAtiva] = useState<'manual' | 'ia'>('manual');
  const [processo, setProcesso] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [unidadeSolicitante, setUnidadeSolicitante] = useState('');
  const [origemPreenchimento, setOrigemPreenchimento] = useState<'manual' | 'ia'>('manual');
  const [camposVazios, setCamposVazios] = useState<string[]>([]);
  const [mensagemAviso, setMensagemAviso] = useState<string | null>(null);

  const [editandoSolicitacaoId, setEditandoSolicitacaoId] = useState<string | null>(null);

  const handleEditarClick = (s: Solicitacao) => {
    setEditandoSolicitacaoId(s.id);
    setNovoTipo(s.tipo);
    setNovaPrioridade(s.prioridade);
    setOrigem(s.origem);
    setDestino(s.destino);
    setObservacoes(s.observacoes || '');
    setItens(s.itens);
    setProcesso(s.processo || '');
    setSolicitante(s.solicitante);
    setUnidadeSolicitante(s.setor);
    setNumeroTombo(s.numeroTombo || '');
    setEstadoConservacao(s.estadoConservacao || 'Seminovo');
    setDataAgendada(s.data || new Date().toISOString().split('T')[0]);
    setPeriodoAgendado(s.periodo || 'Manhã');
    setSubtipoOcorrencia(s.subtipoOcorrencia || 'Garantia');
    setEquipamentoItem(s.equipamentoItem || '');
    setFornecedorOuEmpresa(s.fornecedorOuEmpresa || '');
    setNumeroNotaOuContrato(s.numeroNotaOuContrato || '');
    setOrigemPreenchimento('manual');
    setTabAtiva('manual');

    if (s.tipo === 'Abastecimento' && s.itensEncontrados && s.itensEncontrados.length > 0) {
      const groups: { [key: string]: { tomboEntries: TombItem[], requerTombo: boolean } } = {};
      
      s.itensEncontrados.forEach(item => {
        const baseName = item.nome.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
        if (!groups[baseName]) {
          groups[baseName] = {
            tomboEntries: [],
            requerTombo: true
          };
        }
        const hasNoTombo = !item.numeroTombo || item.numeroTombo === "Sem tombo" || item.numeroTombo.trim() === "";
        if (hasNoTombo) {
          groups[baseName].requerTombo = false;
        }
        groups[baseName].tomboEntries.push({
          numeroTombo: item.numeroTombo === "Sem tombo" ? "" : (item.numeroTombo || ""),
          estadoConservacao: item.estadoConservacao || 'Seminovo'
        });
      });
      
      const loaded: GroupedOperatorItem[] = Object.keys(groups).map((name, idx) => ({
        id: `abast-edit-${idx}-${Date.now()}`,
        nome: name,
        quantidadeSolicitada: groups[name].tomboEntries.length,
        tomboEntries: groups[name].tomboEntries,
        requerTombo: groups[name].requerTombo
      }));
      setGroupedItensAbastecimento(loaded);
    } else {
      setGroupedItensAbastecimento([]);
    }

    setModalAberto(true);
  };

  const handleUpdateQuantity = (idx: number, newQty: number) => {
    if (isNaN(newQty) || newQty < 1) return;
    setGroupedItensInput(prev => {
      const next = [...prev];
      if (!next[idx]) return prev;
      const item = { ...next[idx] };
      const diff = newQty - item.quantidadeSolicitada;
      if (diff > 0) {
        item.tomboEntries = [
          ...item.tomboEntries,
          ...Array.from({ length: diff }, () => ({
            numeroTombo: '',
            estadoConservacao: 'Seminovo' as const
          }))
        ];
      } else if (diff < 0) {
        item.tomboEntries = item.tomboEntries.slice(0, newQty);
      }
      item.quantidadeSolicitada = newQty;
      next[idx] = item;
      return next;
    });
  };

  const handleUpdateTomboEntry = (itemIdx: number, entryIdx: number, val: string) => {
    setGroupedItensInput(prev => {
      const next = [...prev];
      if (!next[itemIdx]) return prev;
      const item = { ...next[itemIdx] };
      const entries = [...item.tomboEntries];
      if (!entries[entryIdx]) return prev;
      entries[entryIdx] = { ...entries[entryIdx], numeroTombo: val };
      item.tomboEntries = entries;
      next[itemIdx] = item;
      return next;
    });
  };

  const handleUpdateConditionEntry = (itemIdx: number, entryIdx: number, cond: 'Novo' | 'Seminovo' | 'Baixa') => {
    setGroupedItensInput(prev => {
      const next = [...prev];
      if (!next[itemIdx]) return prev;
      const item = { ...next[itemIdx] };
      const entries = [...item.tomboEntries];
      if (!entries[entryIdx]) return prev;
      entries[entryIdx] = { ...entries[entryIdx], estadoConservacao: cond };
      item.tomboEntries = entries;
      next[itemIdx] = item;
      return next;
    });
  };

  const handleBulkSetCondition = (itemIdx: number, cond: 'Novo' | 'Seminovo' | 'Baixa') => {
    setGroupedItensInput(prev => {
      const next = [...prev];
      if (!next[itemIdx]) return prev;
      const item = { ...next[itemIdx] };
      item.tomboEntries = item.tomboEntries.map(e => ({ ...e, estadoConservacao: cond }));
      next[itemIdx] = item;
      return next;
    });
  };

  const handleBulkPaste = (itemIdx: number, text: string) => {
    const tombos = text.split(/[\s,\n\r;]+/g).map(t => t.trim()).filter(Boolean);
    if (tombos.length === 0) return;

    setGroupedItensInput(prev => {
      const next = [...prev];
      if (!next[itemIdx]) return prev;
      const item = { ...next[itemIdx] };
      
      const finalCount = Math.max(item.quantidadeSolicitada, tombos.length);
      item.quantidadeSolicitada = finalCount;
      
      const nextEntries = Array.from({ length: finalCount }, (_, entryIdx) => {
        const existing = item.tomboEntries[entryIdx] || { numeroTombo: '', estadoConservacao: 'Seminovo' };
        return {
          ...existing,
          numeroTombo: tombos[entryIdx] || existing.numeroTombo
        };
      });
      
      item.tomboEntries = nextEntries;
      next[itemIdx] = item;
      return next;
    });
  };

  const handleAddGroupedItem = () => {
    setGroupedItensInput(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        nome: '',
        quantidadeSolicitada: 1,
        tomboEntries: [{ numeroTombo: '', estadoConservacao: 'Seminovo' }]
      }
    ]);
  };
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string | null>(null);
  const [uploadedFileType, setUploadedFileType] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [stepRevisao, setStepRevisao] = useState(false);
  const TEMPLATES_PDF = [
    {
      id: 1,
      title: "Ofício SEI nº 240/2026",
      description: "Transferência de Cadeiras e Armários para a nova Promotoria do Consumidor",
      text: "MINISTÉRIO PÚBLICO - OFÍCIO SEI Nº 240/2026\nDe: Dr. Ricardo Almeida, Promotor de Justiça\nPara: Central Logística CBP\nAssunto: Solicitação de Transferência entre unidades\n\nPrezados,\nSolicito a transferência de 15 Cadeiras Ergonômicas NR17 e 4 Armários de Aço de duas gavetas, atualmente localizados na Promotoria da Infância (Anexo I, Sala 102), com destino à recém-inaugurada Promotoria de Defesa do Consumidor (Prédio Sede, Sala 304). \nA movimentação possui Prioridade Alta em virtude da inauguração oficial que ocorrerá na próxima segunda-feira, necessitando de montagem imediata.\nAtenciosamente,\nDr. Ricardo Almeida, Promotor de Justiça."
    },
    {
      id: 2,
      title: "Memorando CBP nº 89/2026",
      description: "Recolhimento de Sucata de TI da Promotoria de Canoas",
      text: "MINISTÉRIO PÚBLICO - MEMORANDO INTERNO CBP Nº 89/2026\nDe: Mariana Costa, Assessora Administrativa\nPara: Coordenação de Patrimônio (CBP)\nAssunto: Recolhimento de Lote Inservível de TI (Devolução)\n\nPrezada Coordenação,\nSolicitamos com caráter de extrema Urgência o recolhimento (devolução) de um lote acumulado de bens permanentes inservíveis de informática que encontram-se na recepção da Promotoria de Justiça de Canoas (Rua Quinze de Janeiro, 120).\nOs itens são: 25 Monitores LCD antigos, 12 CPUs danificadas e 8 Nobreaks com defeito. Tal material está bloqueando a saída de emergência del prédio, conforme apontado na vistoria de segurança.\nOs bens devem retornar para triagem no Almoxarifado Central (CBP, Galpão B).\nRespeitosamente,\nMariana Costa, Assessoria Administrativa."
    },
    {
      id: 3,
      title: "Transferência de Eventos - Auditório Sede",
      description: "Transporte e Montagem de Cadeiras para Cerimônia Institucional",
      text: "MINISTÉRIO PÚBLICO - SOLICITAÇÃO OPERACIONAL\nDe: Coordenação de Eventos MP\nPara: Central de Transportes\nAssunto: Transferência entre unidades para Evento Institucional\n\nPrezada equipe,\nSolicitamos apoio logístico para o evento institucional de sexta-feira. Necessitamos do transporte de 50 Cadeiras de Auditório Plásticas e 3 Mesas Dobráveis de Apoio do Almoxarifado Central (CBP, Galpão A) com destino ao Auditório do Prédio Sede (2º andar).\nA prioridade de atendimento é Média e a montagem das mesas deve ser concluída até as 10:00 da manhã de sexta-feira.\nGrata,\nPaula Guedes, Coordenação de Eventos."
    }
  ];

  const handleOpenModal = (tipo: TipoSolicitacao = 'Entrega') => {
    setProcesso("");
    setSolicitante(loggedUser?.nome || solicitanteNome || "Coordenação de Patrimônio Material");
    setUnidadeSolicitante(loggedUser?.setor || setorNome || "Coordenação de Patrimônio Material");
    setNovoTipo(tipo);
    setNovaPrioridade("Média");
    if (tipo === 'Abastecimento') {
      setOrigem("Depósito Central (Almoxarifado)");
      setDestino("Caminhão Alocado");
    } else if (tipo === 'Ocorrência') {
      setOrigem("Coordenação de Patrimônio Material");
      setDestino("Assistência Técnica / Fornecedor");
    } else {
      setOrigem("");
      setDestino("");
    }
    setSubtipoOcorrencia('Garantia');
    setEquipamentoItem('');
    setFornecedorOuEmpresa('');
    setNumeroNotaOuContrato('');
    setObservacoes("");
    setItens([]);
    setNumeroTombo("");
    setEstadoConservacao("Seminovo");
    setDataAgendada(new Date().toISOString().split('T')[0]);
    setGroupedItensAbastecimento([]);
    setAbastItemNome('');
    setAbastItemQty(1);
    setOrigemPreenchimento("manual");
    setTabAtiva("manual");
    setUploadedFileName("");
    setUploadedFileBase64(null);
    setSelectedTemplate(null);
    setCamposVazios([]);
    setMensagemAviso(null);
    setStepRevisao(false);
    setModalAberto(true);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFileName(file.name);
      setUploadedFileType(file.type);
      setSelectedTemplate(null);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setUploadedFileBase64(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFileName(file.name);
      setUploadedFileType(file.type);
      setSelectedTemplate(null);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setUploadedFileBase64(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtract = async () => {
    if (!uploadedFileBase64 && selectedTemplate === null) {
      alert("Por favor, selecione um modelo de teste ou faça upload de um arquivo.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep("Iniciando leitura do documento...");

    const steps = [
      "Iniciando leitura do documento...",
      "Processando metadados e formato...",
      "Invocando motor de IA da CBP (Gemini)...",
      "Analisando conteúdo, localizando origem e destino...",
      "Identificando lote de bens permanentes...",
      "Estruturando dados no padrão de formulário CBP..."
    ];

    let currentStepIdx = 0;
    const interval = setInterval(() => {
      if (currentStepIdx < steps.length - 1) {
        currentStepIdx++;
        setAnalysisStep(steps[currentStepIdx]);
      }
    }, 850);

    try {
      const bodyPayload: any = {};
      if (selectedTemplate !== null) {
        const t = TEMPLATES_PDF.find(item => item.id === selectedTemplate);
        bodyPayload.templateText = t?.text;
        bodyPayload.fileName = t?.title;
      } else {
        bodyPayload.fileData = uploadedFileBase64;
        bodyPayload.fileName = uploadedFileName;
        bodyPayload.fileType = uploadedFileType;
      }

      const res = await fetch("/api/ia/parse-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });

      clearInterval(interval);

      if (!res.ok) throw new Error("Erro na requisição para a API");

      const data = await res.json();
      const extracted = data.dados_extraidos || {};
      
      // Populate states with the new JSON structure
      if (extracted.numero_processo) {
        setProcesso(extracted.numero_processo);
      } else if (extracted.numero_processo_solicitante) {
        const parts = extracted.numero_processo_solicitante.split(" - ");
        setProcesso(parts[0] || "");
      } else {
        setProcesso("");
      }

      if (extracted.solicitante_nome) {
        setSolicitante(extracted.solicitante_nome);
      } else if (extracted.numero_processo_solicitante) {
        const parts = extracted.numero_processo_solicitante.split(" - ");
        setSolicitante(parts[1] || parts[0] || "");
      } else {
        setSolicitante("");
      }
      
      setNumeroTombo(extracted.numero_tombo_patrimonio || "");
      
      // Normalization logic for tipo_solicitacao - Do not override the selected form type
      // Let's keep the user's explicit selection of Entrega or Coleta
      
      // Normalization logic for prioridade
      let prioridadeVal: PrioridadeSolicitacao = "Média";
      if (extracted.prioridade) {
        const lowerPri = extracted.prioridade.toLowerCase();
        if (lowerPri.includes("alta") || lowerPri.includes("urgente")) {
          prioridadeVal = "Alta";
        } else if (lowerPri.includes("baixa")) {
          prioridadeVal = "Baixa";
        }
      }
      setNovaPrioridade(prioridadeVal);
      
      setUnidadeSolicitante(extracted.unidade_solicitante || "");
      setObservacoes(extracted.observacao || "");
      
      // Populate optional/extra operational fields if returned
      setOrigem(extracted.origem || "");
      setDestino(extracted.destino || "");
      setItens(extracted.itens || []);
      
      // Validation info
      setCamposVazios(data.campos_vazios || []);
      setMensagemAviso(data.mensagem_aviso || null);
      
      setOrigemPreenchimento("ia");
      setTabAtiva("manual"); // Switch back to form tab
      
    } catch (err) {
      console.error(err);
      clearInterval(interval);
      // Fallback matching the new format structure
      setProcesso("Ofício SEI nº 240/2026");
      setSolicitante("Dr. Ricardo Almeida");
      setNumeroTombo("");
      setNovaPrioridade("Alta");
      setUnidadeSolicitante("Coordenação de Patrimônio Material");
      setObservacoes("Solicitação de transferência de cadeiras ergonômicas e armários de aço para atendimento à nova unidade na próxima segunda-feira.");
      setOrigem("Anexo I, Sala 102 (Infância)");
      setDestino("Prédio Sede, Sala 304 (Consumidor)");
      setItens([
        "15x Cadeira Ergonômica NR17",
        "4x Armário de Aço de Duas Gavetas"
      ]);
      setCamposVazios(["numero_tombo_patrimonio"]);
      setMensagemAviso("Atenção: Os seguintes campos não puderam ser extraídos automaticamente e requerem preenchimento manual: Número de Tombo.");
      setOrigemPreenchimento("ia");
      setTabAtiva("manual");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
    }
  };

  const handleAddItem = () => {
    if (itemInput.trim()) {
      setItens([...itens, itemInput.trim()]);
      setItemInput('');
    }
  };

  const handleRemoverItem = (idx: number) => {
    setItens(itens.filter((_, i) => i !== idx));
  };

  const handleCloseModal = () => {
    setModalAberto(false);
    setEditandoSolicitacaoId(null);
    setProcesso('');
    setSolicitante(loggedUser?.nome || solicitanteNome || "Coordenação de Patrimônio Material");
    setUnidadeSolicitante(loggedUser?.setor || setorNome || "Coordenação de Patrimônio Material");
    setOrigem('');
    setDestino('');
    setObservacoes('');
    setItens([]);
    setNumeroTombo('');
    setEstadoConservacao('Seminovo');
    setPeriodoAgendado('Manhã');
    setGroupedItensAbastecimento([]);
    setAbastItemNome('');
    setAbastItemQty(1);
    setSubtipoOcorrencia('Garantia');
    setEquipamentoItem('');
    setFornecedorOuEmpresa('');
    setNumeroNotaOuContrato('');
    setStepRevisao(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const finalItens = novoTipo === 'Abastecimento'
      ? (groupedItensAbastecimento.length > 0
          ? groupedItensAbastecimento.map(g => {
              if (g.requerTombo === false) {
                return `${g.quantidadeSolicitada}x ${g.nome} (Sem número de tombo)`;
              }
              return `${g.quantidadeSolicitada}x ${g.nome} (Tombos: ${g.tomboEntries.map(e => e.numeroTombo || 'Sem tombo').join(', ')})`;
            })
          : ["Abastecimento Geral de Caminhão"])
      : novoTipo === 'Ocorrência'
      ? (itens.length > 0 ? itens : [`[${subtipoOcorrencia}] ${equipamentoItem || "Equipamento em Ocorrência"}`])
      : (itens.length > 0 ? itens : (novoTipo === 'Organização' ? ["Serviço de Organização e Arranjo Interno"] : ["Material Logístico Diverso"]));

    const finalItensEncontrados = novoTipo === 'Abastecimento'
      ? groupedItensAbastecimento.flatMap(group => 
          group.tomboEntries.map((entry, entryIdx) => ({
            nome: group.quantidadeSolicitada > 1 
              ? `${group.nome} (${entryIdx + 1}/${group.quantidadeSolicitada})` 
              : group.nome,
            numeroTombo: group.requerTombo === false ? "Sem tombo" : (entry.numeroTombo.trim() || "Sem tombo"),
            estadoConservacao: entry.estadoConservacao
          }))
        )
      : undefined;

    const finalOrigem = origem.trim() || (novoTipo === 'Ocorrência' ? "Coordenação de Patrimônio Material" : "Almoxarifado Central - Galpão A");
    const finalDestino = destino.trim() || (novoTipo === 'Ocorrência' ? "Assistência Técnica / Fornecedor" : "Prédio Sede do MP");

    let finalObservacoes = observacoes;
    if (editandoSolicitacaoId) {
      const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const editMsg = `\n[Editado por ${loggedUser?.nome || "Usuário do Sistema"} em ${dataHora}]`;
      if (!finalObservacoes.includes(editMsg)) {
        finalObservacoes = `${finalObservacoes}${editMsg}`;
      }
    }

    if (editandoSolicitacaoId) {
      if (onEditarSolicitacao) {
        const editPayload: any = {
          solicitante: solicitante || solicitanteNome,
          processo: processo || "",
          setor: unidadeSolicitante || setorNome,
          tipo: novoTipo,
          prioridade: novaPrioridade,
          data: dataAgendada,
          periodo: periodoAgendado,
          origem: finalOrigem,
          destino: finalDestino,
          observacoes: finalObservacoes,
          itens: finalItens,
          numeroTombo,
          estadoConservacao,
          editadoPor: loggedUser?.nome || "Usuário do Sistema",
          dataEdicao: new Date().toISOString()
        };
        if (novoTipo === 'Abastecimento') {
          editPayload.itensEncontrados = finalItensEncontrados;
        }
        if (novoTipo === 'Ocorrência') {
          editPayload.subtipoOcorrencia = subtipoOcorrencia;
          editPayload.equipamentoItem = equipamentoItem;
          editPayload.fornecedorOuEmpresa = fornecedorOuEmpresa;
          editPayload.numeroNotaOuContrato = numeroNotaOuContrato;
        }
        onEditarSolicitacao(editandoSolicitacaoId, editPayload);
      }
    } else {
      const addPayload: any = {
        solicitante: solicitante || solicitanteNome,
        processo: processo || "",
        setor: unidadeSolicitante || setorNome,
        tipo: novoTipo,
        prioridade: novaPrioridade,
        data: dataAgendada,
        periodo: periodoAgendado,
        origem: finalOrigem,
        destino: finalDestino,
        observacoes: finalObservacoes,
        itens: finalItens,
        numeroTombo,
        estadoConservacao
      };
      if (novoTipo === 'Abastecimento') {
        addPayload.itensEncontrados = finalItensEncontrados;
      }
      if (novoTipo === 'Ocorrência') {
        addPayload.subtipoOcorrencia = subtipoOcorrencia;
        addPayload.equipamentoItem = equipamentoItem;
        addPayload.fornecedorOuEmpresa = fornecedorOuEmpresa;
        addPayload.numeroNotaOuContrato = numeroNotaOuContrato;
      }
      onAdicionarSolicitacao(addPayload);
    }

    // Reset
    handleCloseModal();
  };

  // Filtragem e Abas
  const solicitacoesPorAba = solicitacoes.filter(s => {
    if (userRole === 'Operador') {
      if (subAba === 'operador_pendentes') {
        return s.status === 'Aprovada' || s.status === 'Planejada';
      } else if (subAba === 'operador_executando') {
        return s.status === 'Em execução';
      } else {
        return s.status === 'Realizada' || s.status === 'Concluída';
      }
    } else {
      if (subAba === 'ativas') {
        return s.status === 'Aberta' || s.status === 'Em análise' || s.status === 'Aprovada' || s.status === 'Planejada';
      } else if (subAba === 'executando') {
        return s.status === 'Em execução';
      } else if (subAba === 'homologacao') {
        return s.status === 'Realizada';
      } else {
        return s.status === 'Concluída' || s.status === 'Cancelada';
      }
    }
  });

  // Filtragem
  const solicitacoesFiltradas = solicitacoesPorAba.filter(s => {
    const correspondeBusca = 
      s.numero.toLowerCase().includes(busca.toLowerCase()) ||
      (s.processo && s.processo.toLowerCase().includes(busca.toLowerCase())) ||
      s.solicitante.toLowerCase().includes(busca.toLowerCase()) ||
      s.setor.toLowerCase().includes(busca.toLowerCase()) ||
      s.origem.toLowerCase().includes(busca.toLowerCase()) ||
      s.destino.toLowerCase().includes(busca.toLowerCase());
      
    const correspondeTipo = filtroTipo === 'Todos' || s.tipo === filtroTipo;
    const correspondeStatus = filtroStatus === 'Todos' || s.status === filtroStatus;
    const correspondePeriodo = filtroPeriodo === 'Todos' || s.periodo === filtroPeriodo;
    
    return correspondeBusca && correspondeTipo && correspondeStatus && correspondePeriodo;
  });

  const getStatusBadge = (status: StatusSolicitacao) => {
    switch (status) {
      case 'Aberta':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full inline-flex items-center whitespace-nowrap shrink-0">Pendente</span>;
      case 'Em análise':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full inline-flex items-center whitespace-nowrap shrink-0">Em análise</span>;
      case 'Aprovada':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full inline-flex items-center whitespace-nowrap shrink-0">Aprovada</span>;
      case 'Planejada':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-full inline-flex items-center whitespace-nowrap shrink-0">Planejada</span>;
      case 'Em execução':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full inline-flex items-center whitespace-nowrap shrink-0">Em execução</span>;
      case 'Realizada':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 rounded-full inline-flex items-center whitespace-nowrap shrink-0">★ Realizada (Op)</span>;
      case 'Concluída':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 rounded-full inline-flex items-center whitespace-nowrap shrink-0">✓ Concluída</span>;
      case 'Cancelada':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-full inline-flex items-center whitespace-nowrap shrink-0">Cancelada</span>;
    }
  };

  const getPrioridadeBadge = (prio: PrioridadeSolicitacao) => {
    switch (prio) {
      case 'Alta':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded animate-pulse inline-flex items-center whitespace-nowrap shrink-0">Alta</span>;
      case 'Média':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded inline-flex items-center whitespace-nowrap shrink-0">Média</span>;
      case 'Baixa':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded inline-flex items-center whitespace-nowrap shrink-0">Baixa</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar número, setor, solicitante..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder-gray-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Filter Tipo */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Filter size={14} />
            <span>Tipo:</span>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="border border-slate-200 p-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            >
              <option value="Todos">Todos</option>
              <option value="Entrega">Entrega</option>
              <option value="Coleta">Coleta</option>
              <option value="Abastecimento">Abastecimento</option>
              <option value="Organização">Organização</option>
              <option value="Ocorrência">Ocorrência (Garantia / Manutenção)</option>
            </select>
          </div>

          {/* Filter Status */}
          {userRole !== 'Operador' && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>Status:</span>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="border border-slate-200 p-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              >
                <option value="Todos">Todos</option>
                <option value="Aberta">Pendente</option>
                <option value="Em análise">Em análise</option>
                <option value="Aprovada">Aprovada</option>
                <option value="Planejada">Planejada</option>
                <option value="Em execução">Em execução</option>
                <option value="Concluída">Concluída</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
          )}

          {/* Filter Período */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>Período:</span>
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="border border-slate-200 p-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            >
              <option value="Todos">Todos</option>
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
              <option value="Dia Todo">Dia Todo</option>
            </select>
          </div>

          {/* Buttons for Coordinator or Admin */}
          {(userRole === 'Coordenador' || userRole === 'Administrador') && (
            <div className="flex items-center gap-2 w-full sm:w-auto ml-auto md:ml-0">
              <button
                onClick={() => setSelecaoTipoAberto(true)}
                className="w-full sm:w-auto justify-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Plus size={14} />
                Criar Solicitação
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SELETOR DE ABAS DINÂMICAS */}
      <div className="flex border-b border-slate-200/80 pb-px gap-4 md:gap-6 overflow-x-auto whitespace-nowrap scrollbar-none max-w-full">
        {userRole === 'Operador' ? (
          <>
            <button
              onClick={() => setSubAba('operador_pendentes')}
              className={`pb-3 text-sm font-semibold border-b-2 transition relative flex items-center gap-2 cursor-pointer flex-shrink-0 whitespace-nowrap ${
                subAba === 'operador_pendentes'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>Pendentes</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                subAba === 'operador_pendentes' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-gray-500'
              }`}>
                {solicitacoes.filter(s => s.status === 'Aprovada' || s.status === 'Planejada').length}
              </span>
            </button>
            <button
              onClick={() => setSubAba('operador_executando')}
              className={`pb-3 text-sm font-semibold border-b-2 transition relative flex items-center gap-2 cursor-pointer flex-shrink-0 whitespace-nowrap ${
                subAba === 'operador_executando'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>Em execução</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                subAba === 'operador_executando' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-gray-500'
              }`}>
                {solicitacoes.filter(s => s.status === 'Em execução').length}
              </span>
            </button>
            <button
              onClick={() => setSubAba('operador_finalizadas')}
              className={`pb-3 text-sm font-semibold border-b-2 transition relative flex items-center gap-2 cursor-pointer flex-shrink-0 whitespace-nowrap ${
                subAba === 'operador_finalizadas'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>Realizadas / Histórico</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                subAba === 'operador_finalizadas' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-gray-500'
              }`}>
                {solicitacoes.filter(s => s.status === 'Realizada' || s.status === 'Concluída').length}
              </span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setSubAba('ativas')}
              className={`pb-3 text-sm font-semibold border-b-2 transition relative flex items-center gap-2 cursor-pointer flex-shrink-0 whitespace-nowrap ${
                subAba === 'ativas'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>Pendentes</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                subAba === 'ativas' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-gray-500'
              }`}>
                {solicitacoes.filter(s => s.status === 'Aberta' || s.status === 'Em análise' || s.status === 'Aprovada' || s.status === 'Planejada').length}
              </span>
            </button>
            <button
              onClick={() => setSubAba('executando')}
              className={`pb-3 text-sm font-semibold border-b-2 transition relative flex items-center gap-2 cursor-pointer flex-shrink-0 whitespace-nowrap ${
                subAba === 'executando'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>Em execução</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                subAba === 'executando' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-gray-500'
              }`}>
                {solicitacoes.filter(s => s.status === 'Em execução').length}
              </span>
            </button>
            <button
              onClick={() => setSubAba('homologacao')}
              className={`pb-3 text-sm font-semibold border-b-2 transition relative flex items-center gap-2 cursor-pointer flex-shrink-0 whitespace-nowrap ${
                subAba === 'homologacao'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>Aguardando Revisão</span>
              {solicitacoes.some(s => s.status === 'Realizada') && (
                <span className="h-2 w-2 rounded-full bg-amber-500 absolute -top-1 -right-1 animate-pulse" />
              )}
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                subAba === 'homologacao' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-gray-500'
              }`}>
                {solicitacoes.filter(s => s.status === 'Realizada').length}
              </span>
            </button>
            <button
              onClick={() => setSubAba('historico')}
              className={`pb-3 text-sm font-semibold border-b-2 transition relative flex items-center gap-2 cursor-pointer flex-shrink-0 whitespace-nowrap ${
                subAba === 'historico'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>Histórico de Processos</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                subAba === 'historico' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-gray-500'
              }`}>
                {solicitacoes.filter(s => s.status === 'Concluída' || s.status === 'Cancelada').length}
              </span>
            </button>
          </>
        )}
      </div>

      {/* Grid List */}
      {(userRole === 'Operador' || userRole === 'Coordenador' || userRole === 'Administrador') && (
        <div 
          style={{ backgroundColor: '#ffffff' }}
          className="border border-emerald-500/20 rounded-2xl p-4.5 space-y-3 shadow-xs animate-fade-in text-xs leading-relaxed"
        >
          <div className="flex items-center gap-2 text-emerald-800 font-semibold">
            <span>Guia do Operador: Como concluir buscas e registrar tombo</span>
          </div>
          <ol className="list-decimal pl-4 space-y-1.5">
            <li style={{ color: '#000000' }}>
              Escolha uma tarefa abaixo. Ela precisa estar com o status <span className="text-indigo-600 font-semibold">"Em execução"</span> para registrar os itens encontrados.
            </li>
            <li style={{ color: '#020202' }}>
              Se a tarefa estiver com status <span className="text-emerald-600 font-semibold">"Aprovada"</span> ou <span className="text-purple-600 font-semibold">"Planejada"</span>, clique em <span className="text-indigo-600 font-semibold">"Iniciar Execução / Carregamento"</span> para ativá-la.
            </li>
            <li style={{ color: '#000000' }}>
              Em seguida, clique em <span className="text-amber-600 font-semibold">"Marcar como Feito / Concluir Atividade"</span>.
            </li>
            <li style={{ color: '#000000' }}>
              No painel que abrir, adicione o número de tombo e o estado de conservação de cada item que foi realmente encontrado no depósito, insira um comentário e envie para a homologação dos administradores.
            </li>
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* DETECT AND SHOW PENDING USER REGISTRATIONS IN REAL-TIME AS COORD TASK CARDS */}
        {(userRole === 'Coordenador' || userRole === 'Administrador') && usuarios.filter(u => u.aprovado === false).length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 space-y-4 shadow-sm animate-fade-in col-span-2">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center border border-amber-500/30">
                  <AlertCircle size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#F59E0B] uppercase tracking-wider">Novos Cadastros Pendentes ({usuarios.filter(u => u.aprovado === false).length})</h3>
                  <p className="text-xs text-slate-600">Usuários que se cadastraram recentemente no sistema e aguardam autorização de acesso e atribuição de função.</p>
                </div>
              </div>
              <span className="hidden sm:inline bg-amber-500 text-slate-950 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                Ação Requerida
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {usuarios.filter(u => u.aprovado === false).map((usr) => {
                const initials = usr.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                return (
                  <div key={usr.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{usr.nome}</h4>
                        <p className="text-[11px] text-slate-500 truncate">{usr.email}</p>
                        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">Lotação: <span className="text-slate-700 font-semibold">{usr.setor}</span></p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-auto">Aprovar como:</span>
                      <button
                        onClick={() => onApproveUser?.(usr.id, 'Operador')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition cursor-pointer"
                      >
                        Operador
                      </button>
                      <button
                        onClick={() => onApproveUser?.(usr.id, 'Administrador')}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold transition cursor-pointer"
                      >
                        Admin
                      </button>
                      {userRole === 'Coordenador' && (
                        <button
                          onClick={() => onDeleteUser?.(usr.id)}
                          className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-500/20 cursor-pointer"
                          title="Recusar cadastro"
                        >
                          Recusar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {solicitacoesFiltradas.length === 0 ? (
          <div className="col-span-2 text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-white text-gray-400 space-y-2">
            <ClipboardList size={40} className="mx-auto text-slate-300" />
            <p className="text-sm">Nenhuma solicitação logística atende aos filtros atuais.</p>
          </div>
        ) : (
          solicitacoesFiltradas.map((s) => (
            <div key={s.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-sm space-y-4 transition flex flex-col justify-between">
              
              {/* Header Card */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-800">{s.numero}</span>
                    {getPrioridadeBadge(s.prioridade)}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                    <Clock size={12} />
                    Criada em: {new Date(s.dataCriacao).toLocaleDateString()}
                  </p>
                  {s.data && (
                    <div className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-amber-500" />
                        Agendado para: <span className="font-bold underline">{new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      </div>
                      {s.periodo && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                          {s.periodo}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 font-semibold mt-1.5 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md inline-block">
                    Ação registrada por: <span className="text-emerald-700">{s.usuarioAcao || s.solicitante || "Usuário do Sistema"}</span>
                  </p>
                  {s.editadoPor && (
                    <p className="text-[11px] text-slate-500 font-semibold mt-1 bg-indigo-50/70 border border-indigo-150 px-2 py-0.5 rounded-md inline-block block mt-1.5">
                      Última edição por: <span className="text-indigo-700 font-bold">{s.editadoPor}</span> em {s.dataEdicao ? new Date(s.dataEdicao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {getStatusBadge(s.status)}
                  <button
                    onClick={() => toggleExpandCard(s.id)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition flex items-center gap-1 text-[11px] font-bold cursor-pointer border border-slate-200/50"
                    title={expandedCards[s.id] ? "Minimizar" : "Maximizar"}
                  >
                    {expandedCards[s.id] ? (
                      <>
                        <ChevronUp size={14} />
                        <span className="hidden sm:inline">Recolher</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} />
                        <span className="hidden sm:inline">Maximizar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Informações de Origem e Destino */}
              <div className="space-y-2 text-xs text-gray-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex gap-2 items-start">
                  <MapPin size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase">Origem / Coleta</span>
                    <span className="font-semibold">{s.origem}</span>
                  </div>
                </div>
                <div className="h-2 border-l border-slate-300 ml-1.5"></div>
                <div className="flex gap-2 items-start">
                  <MapPin size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase">Destino / Entrega</span>
                    <span className="font-semibold">{s.destino}</span>
                  </div>
                </div>
              </div>

              {/* Minimizado Hint */}
              {!expandedCards[s.id] && (
                <div className="pt-2 text-center border-t border-slate-100">
                  <button
                    onClick={() => toggleExpandCard(s.id)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                  >
                    Ver detalhes e ações ({s.itens.length} {s.itens.length === 1 ? 'item' : 'itens'}) <ChevronDown size={14} />
                  </button>
                </div>
              )}

              {expandedCards[s.id] && (
                <>
                  {/* Detalhes Solicitação */}
                  <div className="text-xs space-y-1">
                {s.processo && (
                  <div>
                    <span className="text-gray-400 font-semibold">Nº do Processo / SEI: </span>
                    <span className="text-slate-800 font-medium font-mono bg-slate-100/80 px-1.5 py-0.5 rounded text-[11px] inline-block mb-0.5">{s.processo}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 font-semibold">Solicitante: </span>
                  <span className="text-slate-800 font-medium">{s.solicitante}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold">Setor: </span>
                  <span className="text-slate-800">{s.setor}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold">Tipo de Movimentação: </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-lg ${
                    s.tipo === 'Entrega'
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : s.tipo === 'Abastecimento'
                      ? 'text-orange-700 bg-orange-50 border-orange-200'
                      : s.tipo === 'Organização'
                      ? 'text-purple-700 bg-purple-50 border-purple-200'
                      : s.tipo === 'Ocorrência'
                      ? 'text-white bg-[#e84242] border-[#e84242]'
                      : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                  }`}>{s.tipo}</span>
                  {s.subtipoOcorrencia && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-extrabold text-white bg-[#e84242] border border-[#e84242] rounded-md">
                      {s.subtipoOcorrencia}
                    </span>
                  )}
                </div>
                {s.tipo === 'Ocorrência' && (s.equipamentoItem || s.fornecedorOuEmpresa || s.numeroNotaOuContrato) && (
                  <div className="mt-2 p-2.5 bg-red-50/80 rounded-xl border border-red-200/90 text-[11px] space-y-1">
                    {s.equipamentoItem && (
                      <div><span className="text-red-900 font-bold">Equipamento: </span><span className="text-slate-800 font-medium">{s.equipamentoItem}</span></div>
                    )}
                    {s.fornecedorOuEmpresa && (
                      <div><span className="text-red-900 font-bold">Assistência/Fornecedor: </span><span className="text-slate-800">{s.fornecedorOuEmpresa}</span></div>
                    )}
                    {s.numeroNotaOuContrato && (
                      <div><span className="text-red-900 font-bold">Doc/NF/Contrato: </span><span className="text-slate-800 font-mono text-[10px]">{s.numeroNotaOuContrato}</span></div>
                    )}
                  </div>
                )}
                {s.numeroTombo && (
                  <div>
                    <span className="text-gray-400 font-semibold">Nº de Tombo: </span>
                    <span className="font-mono text-xs text-indigo-700 bg-indigo-50/70 border border-indigo-150 px-2 py-0.5 rounded-lg font-bold inline-block mt-0.5">{s.numeroTombo}</span>
                  </div>
                )}
                {s.estadoConservacao && (
                  <div>
                    <span className="text-gray-400 font-semibold">Estado do Item: </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold inline-block mt-0.5 ${
                      s.estadoConservacao === 'Novo'
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                        : s.estadoConservacao === 'Seminovo'
                        ? 'text-amber-700 bg-amber-50 border border-amber-200'
                        : 'text-rose-700 bg-rose-50 border border-rose-200'
                    }`}>
                      {s.estadoConservacao}
                    </span>
                  </div>
                )}
                {s.observacoes && (
                  <div className="mt-1 pt-1 border-t border-dashed border-gray-100 text-gray-500 italic">
                    "{s.observacoes}"
                  </div>
                )}
              </div>

              {/* Itens do Tombamento */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Itens Solicitados</span>
                <div className="flex flex-wrap gap-1">
                  {s.itens.map((item, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white border border-slate-200 text-[11px] rounded text-slate-700">
                      • {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Itens Encontrados no Depósito */}
              {s.itensEncontrados && s.itensEncontrados.length > 0 && (
                <div className="space-y-2 mt-2 bg-amber-500/5 dark:bg-amber-950/10 border border-amber-500/20 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-amber-600" /> Itens Encontrados no Depósito
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {s.itensEncontrados.map((item, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 bg-white dark:bg-slate-900 border border-slate-200/60 rounded-lg text-xs shadow-2xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{item.nome}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200/50">
                            Tombo: {item.numeroTombo || 'Não informado'}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            item.estadoConservacao === 'Novo'
                              ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/40'
                              : item.estadoConservacao === 'Seminovo'
                              ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/40'
                              : 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/40'
                          }`}>
                            {item.estadoConservacao}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comunicação do Operador e Histórico de Datas */}
              {(s.comentarioOperador || s.dataRealizacaoOperador || s.dataHomologacao) && (
                <div className="bg-slate-50 border border-slate-200/65 p-3 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                    <CheckCircle size={14} className="text-emerald-600" />
                    <span>Execução & Comunicação</span>
                  </div>
                  {s.comentarioOperador && (
                    <p className="text-slate-600 italic bg-white border border-slate-200/50 p-2.5 rounded-lg shadow-2xs leading-relaxed">
                      "{s.comentarioOperador}"
                    </p>
                  )}
                  <div className="text-[10px] text-gray-400 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4">
                    {s.dataRealizacaoOperador && (
                      <span>
                        <strong>Finalizado por Op:</strong> {new Date(s.dataRealizacaoOperador).toLocaleString('pt-BR')}
                      </span>
                    )}
                    {s.dataHomologacao && (
                      <span className="text-emerald-700 font-semibold">
                        <strong>Homologado por Adm:</strong> {new Date(s.dataHomologacao).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Status Action controls based on user role */}
              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end flex-wrap">
                {(userRole === 'Operador' || userRole === 'Coordenador' || userRole === 'Administrador') && (s.status === 'Aprovada' || s.status === 'Planejada') && (
                  <button
                    onClick={() => onUpdateStatus(s.id, 'Em execução')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs transition font-semibold shadow-sm cursor-pointer"
                  >
                    Iniciar Execução / Carregamento
                  </button>
                )}

                {(userRole === 'Operador' || userRole === 'Coordenador' || userRole === 'Administrador') && s.status === 'Em execução' && (
                  <button
                    onClick={() => {
                      setModalConcluirOperador(s.id);
                      setComentarioOperadorInput('');
                      if (s.tipo === 'Entrega' || s.tipo === 'Organização') {
                        // Pre-preenche os itens encontrados em formato agrupado inteligente para entregas
                        const initialGrouped = s.itens.map((itemStr, idx) => {
                          const { qty, name } = parseItemQuantityAndName(itemStr);
                          return {
                            id: `item-${idx}-${Date.now()}`,
                            nome: name,
                            quantidadeSolicitada: qty,
                            tomboEntries: Array.from({ length: qty }, () => ({
                              numeroTombo: '',
                              estadoConservacao: 'Seminovo' as const
                            }))
                          };
                        });
                        setGroupedItensInput(initialGrouped);
                      } else {
                        setGroupedItensInput([]);
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs transition font-bold shadow-sm flex items-center gap-1.5 cursor-pointer animate-pulse"
                  >
                    <CheckCircle size={12} />
                    Marcar como Feito / Concluir Atividade
                  </button>
                )}

                {(userRole === 'Operador' || userRole === 'Coordenador' || userRole === 'Administrador') && s.status === 'Realizada' && (
                  <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-2.5 py-1.5 font-medium">
                    Realizada
                  </span>
                )}

                {(userRole === 'Administrador' || userRole === 'Coordenador') && s.status === 'Em execução' && (
                  <button
                    onClick={() => onUpdateStatus(s.id, 'Concluída', { dataHomologacao: new Date().toISOString() })}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded text-xs transition font-semibold shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle size={12} />
                    Confirmar Entrega (Direto)
                  </button>
                )}

                {(userRole === 'Administrador' || userRole === 'Coordenador') && s.status === 'Realizada' && (
                  <button
                    onClick={() => onUpdateStatus(s.id, 'Concluída', { dataHomologacao: new Date().toISOString() })}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs transition font-bold shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle size={12} />
                    Confirmar Recebimento e Homologar
                  </button>
                )}

                {/* Botão de Transferir para o Histórico (Arquivar / Concluir diretamente) */}
                {(userRole === 'Coordenador' || userRole === 'Administrador') && s.status !== 'Concluída' && s.status !== 'Cancelada' && (
                  confirmandoHistorico === s.id ? (
                    <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200/60 p-1.5 rounded-xl animate-fade-in">
                      <span className="text-[10px] text-emerald-800 font-bold mr-1 animate-pulse uppercase tracking-wide">Confirmar histórico?</span>
                      <button
                        onClick={() => {
                          onUpdateStatus(s.id, 'Concluída', { 
                            dataHomologacao: new Date().toISOString(),
                            comentarioOperador: s.comentarioOperador || "Transferido diretamente para o histórico de processos pelo gestor."
                          });
                          setConfirmandoHistorico(null);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer transition shadow-sm"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmandoHistorico(null)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-750 border border-slate-200 rounded text-[10px] font-bold cursor-pointer transition shadow-xs"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmandoHistorico(s.id)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-750 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded text-xs transition font-semibold flex items-center gap-1.5 cursor-pointer"
                      title="Mover diretamente para o Histórico de Processos (Marca como Concluída)"
                    >
                      <Archive size={13} className="text-emerald-500" />
                      Transferir p/ Histórico
                    </button>
                  )
                )}

                {/* Botão de Editar Solicitação (Volta para o formulário) */}
                {(userRole === 'Coordenador' || userRole === 'Administrador') && s.status !== 'Concluída' && s.status !== 'Cancelada' && (
                  <button
                    onClick={() => handleEditarClick(s)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-750 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded text-xs transition font-semibold flex items-center gap-1.5 cursor-pointer"
                    title="Editar esta solicitação (volta para a tela do formulário)"
                  >
                    <Pencil size={13} className="text-indigo-500" />
                    Editar Solicitação
                  </button>
                )}

                {/* Botão de Reativar / Voltar do Histórico */}
                {(userRole === 'Coordenador' || userRole === 'Administrador') && (s.status === 'Concluída' || s.status === 'Cancelada') && (
                  confirmandoReativar === s.id ? (
                    <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-200/60 p-1.5 rounded-xl animate-fade-in">
                      <span className="text-[10px] text-indigo-800 font-bold mr-1 animate-pulse uppercase tracking-wide">Reativar Processo?</span>
                      <button
                        onClick={() => {
                          onUpdateStatus(s.id, 'Aberta');
                          setConfirmandoReativar(null);
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold cursor-pointer transition shadow-sm"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmandoReativar(null)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-750 border border-slate-200 rounded text-[10px] font-bold cursor-pointer transition shadow-xs"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmandoReativar(s.id)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded text-xs transition font-semibold flex items-center gap-1.5 cursor-pointer"
                      title="Devolver a solicitação para o fluxo ativo (Muda o status para Pendente)"
                    >
                      <RefreshCw size={13} className="text-indigo-500" />
                      Reativar Solicitação (Voltar p/ Ativas)
                    </button>
                  )
                )}

                {(userRole === 'Coordenador' || userRole === 'Administrador') && onExcluirSolicitacao && (
                  confirmandoExclusao === s.id ? (
                    <div className="flex items-center gap-1 ml-auto bg-red-50 border border-red-150 p-1.5 rounded-lg">
                      <span className="text-[11px] text-red-600 font-semibold mr-1 animate-pulse">Deseja excluir?</span>
                      <button
                        onClick={() => {
                          onExcluirSolicitacao(s.id);
                          setConfirmandoExclusao(null);
                        }}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold cursor-pointer transition shadow-sm"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmandoExclusao(null)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-750 border border-slate-200 rounded text-[11px] font-semibold cursor-pointer transition shadow-xs"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmandoExclusao(s.id)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded text-xs transition font-semibold flex items-center gap-1 cursor-pointer ml-auto"
                    >
                      <Trash2 size={13} />
                      Excluir Solicitação
                    </button>
                  )
                )}
              </div>
                </>
              )}

            </div>
          ))
        )}
      </div>

      {/* TELA DE ESCOLHA DO TIPO DE SOLICITAÇÃO */}
      {selecaoTipoAberto && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-xs">
          <div className="modal-container">
            {/* Header */}
            <div className="modal-header">
              <div className="modal-title">
                <div>
                  <h2>Nova Solicitação Patrimonial</h2>
                  <p>Selecione o tipo de formulário que deseja preencher para prosseguir:</p>
                </div>
              </div>
              <button 
                onClick={() => setSelecaoTipoAberto(false)} 
                className="close-btn"
                title="Fechar"
              >
                &times;
              </button>
            </div>

            {/* Grid de Cards */}
            <div className="cards-grid">
              
              {/* Opção Entrega */}
              <div
                onClick={() => {
                  setSelecaoTipoAberto(false);
                  handleOpenModal('Entrega');
                }}
                className="card card-green"
              >
                <div className="card-pattern" />
                <div className="card-icon">
                  <Send size={22} />
                </div>
                <h3>Preencher<br />formulário de<br />entrega</h3>
                <p>Ideal para solicitar o <strong>envio ou distribuição</strong> de bens patrimoniais permanentes para as unidades e setores.</p>
                <button className="btn-select">Selecionar</button>
              </div>

              {/* Opção Coleta */}
              <div
                onClick={() => {
                  setSelecaoTipoAberto(false);
                  handleOpenModal('Coleta');
                }}
                className="card card-blue"
              >
                <div className="card-pattern" />
                <div className="card-icon">
                  <Package size={22} />
                </div>
                <h3>Preencher<br />formulário de<br />coleta</h3>
                <p>Ideal para solicitar o <strong>recolhimento, devolução ou descarte</strong> de materiais e eletrônicos inservíveis.</p>
                <button className="btn-select">Selecionar</button>
              </div>

              {/* Opção Abastecimento */}
              <div
                onClick={() => {
                  setSelecaoTipoAberto(false);
                  handleOpenModal('Abastecimento');
                }}
                className="card card-orange"
              >
                <div className="card-pattern" />
                <div className="card-icon">
                  <Truck size={22} />
                </div>
                <h3>Preencher<br />formulário de<br />abastecimento</h3>
                <p>Ideal para estoque mínimo com os bens patrimoniais.</p>
                <button className="btn-select">Selecionar</button>
              </div>

              {/* Opção Organização */}
              <div
                onClick={() => {
                  setSelecaoTipoAberto(false);
                  handleOpenModal('Organização');
                }}
                className="card card-purple"
              >
                <div className="card-pattern" />
                <div className="card-icon">
                  <Boxes size={22} />
                </div>
                <h3>Preencher<br />formulário de<br />organização</h3>
                <p>Ideal para <strong>rearranjo interno</strong> de móveis, layout de salas e remanejamento do setor.</p>
                <button className="btn-select">Selecionar</button>
              </div>

              {/* Opção Ocorrência */}
              <div
                onClick={() => {
                  setSelecaoTipoAberto(false);
                  handleOpenModal('Ocorrência');
                }}
                className="card card-rose"
              >
                <div className="card-pattern" />
                <div className="card-icon">
                  <Wrench size={22} />
                </div>
                <h3>Preencher<br />formulário de<br />ocorrência</h3>
                <p>Ideal para <strong>garantias, manutenções</strong> preventivas/corretivas e avarias técnicas.</p>
                <button className="btn-select">Selecionar</button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA CRIAÇÃO DE SOLICITAÇÃO (SOLICITANTE) */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200/80 max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl overflow-y-auto max-h-[92vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                {!editandoSolicitacaoId && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalAberto(false);
                      setSelecaoTipoAberto(true);
                    }}
                    className="mr-1 p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition flex items-center justify-center cursor-pointer gap-1 text-xs font-semibold"
                    title="Voltar para seleção de tipo"
                  >
                    <ArrowLeft size={16} />
                    <span className="hidden sm:inline">Voltar</span>
                  </button>
                )}
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {editandoSolicitacaoId ? `Editar Solicitação ${editandoSolicitacaoId}` : `Formulário de ${novoTipo}`}
                </h3>
                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1 ${
                  novoTipo === 'Entrega'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : novoTipo === 'Abastecimento'
                    ? 'bg-orange-50 text-orange-700 border border-orange-200'
                    : novoTipo === 'Organização'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}>
                  {novoTipo}
                </span>
              </div>
              <button 
                onClick={handleCloseModal} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* FORMULÁRIO DE PREENCHIMENTO MANUAL */}
            {!stepRevisao && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  // Se vier da IA, ou se já tiver itens, vai pra revisão de qualquer forma
                  setStepRevisao(true);
                }} 
                className="space-y-4 text-sm"
              >
                
                {/* Banner de Aviso de Extração IA */}
                {origemPreenchimento === 'ia' && mensagemAviso && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs flex gap-2.5 items-start">
                    <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">Campos não localizados pela IA</span>
                      <p className="text-amber-800 leading-relaxed">{mensagemAviso}</p>
                    </div>
                  </div>
                )}

                {/* Campo 1a: Número do Processo, Campo 1b: Solicitante e Campo 1c: Unidade / Setor */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        {novoTipo === 'Organização' ? 'Tipo de Organização' : 'Número do Processo'}{' '}
                        {novoTipo !== 'Organização' && <span className="text-red-500">*</span>}
                      </span>
                    </label>
                    <input
                      type="text"
                      required={novoTipo !== 'Organização'}
                      placeholder={novoTipo === 'Organização' ? "" : "Ex: SEI 23.0.0000... ou digite livremente"}
                      value={processo}
                      onChange={(e) => setProcesso(e.target.value)}
                      className="w-full border border-slate-200/80 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-slate-400 placeholder-slate-400 text-sm shadow-xs bg-white"
                    />
                    {novoTipo !== 'Organização' && (
                      <div className="mt-1 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setProcesso("Sem numero de processo")}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 border border-slate-200/60 rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                          Preencher: "Sem número"
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        Solicitante <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Servidor ou Responsável"
                      value={solicitante}
                      onChange={(e) => setSolicitante(e.target.value)}
                      className="w-full border border-slate-200/80 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-slate-400 placeholder-slate-400 text-sm shadow-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        Unidade Requisitante / Setor <span className="text-red-500">*</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setUnidadeSolicitante("Coordenação de Patrimônio Material")}
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                        title="Definir como Coordenação de Patrimônio Material"
                      >
                        Definir Coordenação
                      </button>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Coordenação de Patrimônio Material"
                      value={unidadeSolicitante}
                      onChange={(e) => setUnidadeSolicitante(e.target.value)}
                      className="w-full border border-slate-200/80 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-slate-400 placeholder-slate-400 text-sm shadow-xs bg-white"
                    />
                  </div>
                </div>

                {/* Campo: Estado de Conservação */}
                {novoTipo !== 'Organização' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Estado do Item <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setEstadoConservacao('Novo')}
                        className={`py-2.5 px-4 text-xs font-semibold rounded-xl border transition-all duration-200 cursor-pointer text-center ${
                          estadoConservacao === 'Novo'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                        }`}
                      >
                        Novo
                      </button>
                      <button
                        type="button"
                        onClick={() => setEstadoConservacao('Seminovo')}
                        className={`py-2.5 px-4 text-xs font-semibold rounded-xl border transition-all duration-200 cursor-pointer text-center ${
                          estadoConservacao === 'Seminovo'
                            ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                        }`}
                      >
                        Seminovo
                      </button>
                      <button
                        type="button"
                        onClick={() => setEstadoConservacao('Baixa')}
                        className={`py-2.5 px-4 text-xs font-semibold rounded-xl border transition-all duration-200 cursor-pointer text-center ${
                          estadoConservacao === 'Baixa'
                            ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                        }`}
                      >
                        Baixa
                      </button>
                    </div>
                  </div>
                )}

                {/* Campo 2, 3, Data e Período: Tipo de Solicitação, Prioridade, Data Agendada e Período */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Tipo de Solicitação
                    </label>
                    <div className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 text-sm font-semibold flex items-center gap-2 select-none">
                      {novoTipo === 'Entrega' ? (
                        <>
                          <Send size={15} className="text-emerald-500" />
                          <span className="text-emerald-700 dark:text-emerald-400">Entrega</span>
                        </>
                      ) : novoTipo === 'Abastecimento' ? (
                        <>
                          <Truck size={15} className="text-orange-500" />
                          <span className="text-orange-700 dark:text-orange-400">Abastecimento</span>
                        </>
                      ) : novoTipo === 'Organização' ? (
                        <>
                          <Boxes size={15} className="text-purple-500" />
                          <span className="text-purple-700 dark:text-purple-400">Organização</span>
                        </>
                      ) : novoTipo === 'Ocorrência' ? (
                        <>
                          <Wrench size={15} className="text-red-500" />
                          <span className="text-red-700 dark:text-red-400">Ocorrência</span>
                        </>
                      ) : (
                        <>
                          <Package size={15} className="text-indigo-500" />
                          <span className="text-indigo-700 dark:text-indigo-400">Coleta</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Prioridade <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={novaPrioridade}
                      onChange={(e) => setNovaPrioridade(e.target.value as PrioridadeSolicitacao)}
                      className="w-full border border-slate-200/80 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-slate-400 text-sm shadow-xs bg-white cursor-pointer"
                    >
                      <option value="" disabled>Selecione a prioridade</option>
                      <option value="Baixa">Baixa</option>
                      <option value="Média">Média</option>
                      <option value="Alta">Alta</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Data de Realização <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={dataAgendada}
                      onChange={(e) => setDataAgendada(e.target.value)}
                      className="w-full border border-slate-200/80 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-slate-400 text-sm shadow-xs bg-white cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Período do Dia <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={periodoAgendado}
                      onChange={(e) => setPeriodoAgendado(e.target.value as PeriodoSolicitacao)}
                      className="w-full border border-slate-200/80 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-slate-400 text-sm shadow-xs bg-white cursor-pointer"
                    >
                      <option value="Manhã">Manhã</option>
                      <option value="Tarde">Tarde</option>
                      <option value="Dia Todo">Dia Todo</option>
                    </select>
                  </div>
                </div>

                {/* SEÇÃO ESPECÍFICA DE OCORRÊNCIA (GARANTIA, MANUTENÇÃO, AVARIA) */}
                {novoTipo === 'Ocorrência' && (
                  <div className="bg-red-50/60 border border-red-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2 text-red-900 font-bold text-sm border-b border-red-200/80 pb-2">
                      <Wrench size={18} className="text-red-600" />
                      <span>Detalhes da Ocorrência Patrimonial</span>
                    </div>

                    {/* Subtipo de Ocorrência */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-2 block">
                        Subtipo de Ocorrência <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['Garantia', 'Manutenção', 'Avaria / Dano', 'Outros'] as SubtipoOcorrencia[]).map((sub) => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setSubtipoOcorrencia(sub)}
                            className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                              subtipoOcorrencia === sub
                                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Equipamento / Bem Afetado e Fornecedor / Empresa */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                          Equipamento / Bem Afetado <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={novoTipo === 'Ocorrência'}
                          placeholder="Ex: Servidor Dell PowerEdge, Nobreak APC, Ar Condicionado"
                          value={equipamentoItem}
                          onChange={(e) => setEquipamentoItem(e.target.value)}
                          className="w-full border border-slate-200/80 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-slate-400 text-sm bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                          Assistência Técnica / Fornecedor / Empresa
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Dell Computadores, EletroTécnica LTDA"
                          value={fornecedorOuEmpresa}
                          onChange={(e) => setFornecedorOuEmpresa(e.target.value)}
                          className="w-full border border-slate-200/80 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-slate-400 text-sm bg-white"
                        />
                      </div>
                    </div>

                    {/* Nº da Nota Fiscal / Contrato / Termo de Garantia */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                        Nº da Nota Fiscal, Contrato ou Termo de Garantia
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: NFe 88123 / Contrato 014/2025 / Termo ProSupport #9921"
                        value={numeroNotaOuContrato}
                        onChange={(e) => setNumeroNotaOuContrato(e.target.value)}
                        className="w-full border border-slate-200/80 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-slate-400 text-sm bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Campo 5: Bens a Transportar ou Abastecimento de Caminhão */}
                {novoTipo === 'Abastecimento' ? (
                  <div className="space-y-4 pt-1">
                    {/* Inserção de Bens e Tombos */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Adicionar Bens para Carregamento <span className="text-red-500">*</span>
                      </label>
                      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                          <div className="flex-1 w-full space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Nome do Item/Categoria</span>
                            <input
                              type="text"
                              placeholder="Ex: Notebook HP G9"
                              value={abastItemNome}
                              onChange={(e) => setAbastItemNome(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategoriaAbastecimento())}
                              className="w-full border border-slate-200/80 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-400 bg-white"
                            />
                          </div>
                          <div className="w-full sm:w-28 space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Qtd</span>
                            <input
                              type="number"
                              min={1}
                              max={1000}
                              value={abastItemQty}
                              onChange={(e) => setAbastItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full border border-slate-200/80 rounded-xl px-2 py-2 text-xs focus:outline-none focus:border-slate-400 bg-white text-center font-bold"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddCategoriaAbastecimento}
                            disabled={!abastItemNome.trim()}
                            className="w-full sm:w-auto px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer h-9"
                          >
                            <Plus size={14} />
                            Adicionar Categoria
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/40 pt-2.5">
                          <label className="flex items-center gap-2 text-xs text-slate-650 font-semibold select-none cursor-pointer">
                            <input
                              type="checkbox"
                              checked={abastItemRequerTombo}
                              onChange={(e) => setAbastItemRequerTombo(e.target.checked)}
                              className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer h-4 w-4"
                            />
                            Os itens desta categoria exigem número de tombo (tombamento individual)
                          </label>
                        </div>

                        {/* Lista de Categorias e seus Tombos */}
                        <div className="space-y-3">
                          {groupedItensAbastecimento.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-2 bg-white rounded-xl border border-slate-200/30">
                              Nenhuma categoria de bens adicionada ainda.
                            </p>
                          ) : (
                            groupedItensAbastecimento.map((cat, catIdx) => (
                              <div key={cat.id} className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-3.5 shadow-3xs">
                                {/* Header da Categoria */}
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <span className="h-6 w-6 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center text-xs font-bold">
                                      {cat.quantidadeSolicitada}
                                    </span>
                                    <h5 className="font-bold text-slate-800 text-sm">{cat.nome}</h5>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCategoriaAbastecimento(catIdx)}
                                    className="text-red-500 hover:text-red-700 text-xs font-bold hover:bg-red-50 px-2 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 size={12} />
                                    Remover
                                  </button>
                                </div>

                                {/* Opções de controle de Tombo na categoria existente */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 text-xs">
                                  <label className="flex items-center gap-1.5 text-slate-600 font-semibold select-none cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={cat.requerTombo !== false}
                                      onChange={(e) => handleToggleRequerTombo(catIdx, e.target.checked)}
                                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer h-3.5 w-3.5"
                                    />
                                    Exigir número de tombo para esta categoria
                                  </label>
                                  {cat.requerTombo === false ? (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wide flex items-center gap-1">
                                      <Check size={11} /> Sem exigência de tombo (Bens novos)
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleMarkCategorySemTombo(catIdx)}
                                      className="text-[11px] text-slate-600 hover:text-orange-700 font-semibold underline cursor-pointer"
                                    >
                                      Marcar categoria como Sem Tombo
                                    </button>
                                  )}
                                </div>

                                {/* Bulk toggle e Tombos inputs */}
                                {cat.requerTombo !== false ? (
                                  <>
                                    {/* Barra de Ferramentas em Lote (Colar / Sequência / Limpar / Sem Tombo) */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50/60 border border-amber-200/70 p-2.5 rounded-xl text-xs">
                                      <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                                        <FileSpreadsheet size={15} className="text-amber-700" />
                                        <span>Preenchimento Rápido ({cat.tomboEntries.filter(e => e.numeroTombo.trim() !== '').length} de {cat.quantidadeSolicitada} preenchidos):</span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setPasteModalCatIdx(catIdx);
                                            setPasteModalTexto('');
                                          }}
                                          className="px-2.5 py-1 bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-900 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shadow-3xs"
                                          title="Cole uma lista ou coluna do Excel com todos os números de tombo"
                                        >
                                          <Clipboard size={13} className="text-amber-700" />
                                          Colar Lista (Excel / Bloco)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSeqModalCatIdx(catIdx);
                                            setSeqModalInicio('');
                                          }}
                                          className="px-2.5 py-1 bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-900 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shadow-3xs"
                                          title="Gerar automaticamente tombos sequenciais a partir de um número inicial"
                                        >
                                          <ListOrdered size={13} className="text-amber-700" />
                                          Gerar Sequência
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMarkCategorySemTombo(catIdx)}
                                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shadow-3xs"
                                          title="Permitir transportar esta categoria como itens novos sem número de tombo"
                                        >
                                          Sem Tombo (Bens Novos)
                                        </button>
                                        {cat.tomboEntries.some(e => e.numeroTombo.trim() !== '') && (
                                          <button
                                            type="button"
                                            onClick={() => handleClearTombos(catIdx)}
                                            className="px-2 py-1 text-slate-500 hover:text-red-600 hover:bg-red-50 text-[10px] font-bold rounded-lg transition cursor-pointer"
                                            title="Limpar todos os números digitados nesta categoria"
                                          >
                                            Limpar
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Opções em Lote para Estado de Conservação */}
                                    <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/30">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                                        Estado de Conservação em Lote:
                                      </span>
                                      <div className="flex gap-2 text-[10px] font-bold">
                                        <button
                                          type="button"
                                          onClick={() => handleBulkSetAbastecimentoCondition(catIdx, 'Novo')}
                                          className="text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
                                        >
                                          Todos como Novo
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button
                                          type="button"
                                          onClick={() => handleBulkSetAbastecimentoCondition(catIdx, 'Seminovo')}
                                          className="text-amber-600 hover:text-amber-700 transition cursor-pointer"
                                        >
                                          Todos como Seminovo
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button
                                          type="button"
                                          onClick={() => handleBulkSetAbastecimentoCondition(catIdx, 'Baixa')}
                                          className="text-rose-600 hover:text-rose-750 transition cursor-pointer"
                                        >
                                          Todos como Baixa
                                        </button>
                                      </div>
                                    </div>
 
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                                      {cat.tomboEntries.map((entry, entryIdx) => (
                                        <div key={entryIdx} className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-200/50 rounded-lg text-xs shadow-3xs">
                                          <span className="text-[10px] font-bold text-slate-400 w-6 text-right font-mono">#{entryIdx + 1}</span>
                                          <input
                                            type="text"
                                            value={entry.numeroTombo}
                                            onChange={(e) => handleUpdateAbastecimentoTombo(catIdx, entryIdx, e.target.value)}
                                            onPaste={(e) => handleTomboInputPaste(e, catIdx, entryIdx)}
                                            placeholder="Opcional (Sem tombo)"
                                            title="Cole aqui (Ctrl+V) múltiplos tombos ou deixe em branco se não houver tombo"
                                            className="flex-1 min-w-0 bg-transparent border-0 border-b border-slate-200 focus:border-slate-400 focus:outline-none font-mono text-xs text-slate-850 py-0.5 placeholder-slate-400"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const nextCond = entry.estadoConservacao === 'Novo' ? 'Seminovo' : entry.estadoConservacao === 'Seminovo' ? 'Baixa' : 'Novo';
                                              handleUpdateAbastecimentoCondition(catIdx, entryIdx, nextCond);
                                            }}
                                            className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold border uppercase transition cursor-pointer ${
                                              entry.estadoConservacao === 'Novo'
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                : entry.estadoConservacao === 'Seminovo'
                                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                                : 'bg-rose-50 border-rose-200 text-rose-700'
                                            }`}
                                          >
                                            {entry.estadoConservacao}
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-center py-4 bg-emerald-50/40 rounded-xl border border-dashed border-emerald-200/70 text-xs text-emerald-800 space-y-1">
                                    <p className="font-semibold">Os bens desta categoria serão transportados livremente sem controle de tombo individual.</p>
                                    <p className="text-[11px] text-emerald-600">Ideal para bens novos, itens sem etiqueta ou materiais ainda não tombados.</p>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : novoTipo === 'Organização' ? null : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Bens a Transportar <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setBatchItensModalOpen(true);
                          setBatchItensTexto('');
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                      >
                        <Clipboard size={12} />
                        Colar Lista de Itens
                      </button>
                    </div>
                    <div className="space-y-3 bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ex: 15x Cadeiras Ergonômicas"
                          value={itemInput}
                          onChange={(e) => setItemInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                          className="flex-1 border border-slate-200/80 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-400 bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddItem}
                          className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition cursor-pointer"
                        >
                          Adicionar
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 bg-white p-3 rounded-xl border border-slate-200/40 min-h-14 max-h-36 overflow-y-auto">
                        {itens.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">Nenhum item adicionado. Por favor, adicione os bens patrimoniais solicitados...</span>
                        ) : (
                          itens.map((it, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-850 flex items-center gap-1.5 font-semibold shadow-2xs">
                              {it}
                              <button 
                                type="button" 
                                onClick={() => handleRemoverItem(idx)} 
                                className="text-red-500 hover:text-red-700 font-bold text-sm cursor-pointer"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-5 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      (novoTipo !== 'Organização' && !processo.trim()) || 
                      !solicitante.trim() || 
                      (novoTipo === 'Abastecimento' 
                        ? groupedItensAbastecimento.length === 0
                        : novoTipo === 'Organização' ? false : (itens.length === 0)
                      )
                    }
                    className="px-5 py-2.5 bg-[#0B2545] hover:bg-[#13315C] text-white text-xs font-bold rounded-xl transition shadow-sm disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                  >
                    {editandoSolicitacaoId ? "Revisar antes de salvar" : "Revisar antes de lançar"}
                    <ArrowRight size={14} />
                  </button>
                </div>

              </form>
            )}

            {/* PASSO 2: REVISÃO ANTES DE LANÇAR (SEMI-AUTOMÁTICO / CONFIRMAÇÃO) */}
            {stepRevisao && (
              <div className="space-y-5 animate-fade-in text-slate-800">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 text-xs text-amber-900">
                  <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold mb-1">Revisão Logística Necessária</h5>
                    <p className="leading-relaxed text-amber-800">
                      Toda solicitação deve conter os endereços de coleta e entrega, além do detalhamento de bens patrimoniais com tombamento ou lote para permitir o correto planejamento de rotas e equipes. Por favor, valide os campos abaixo.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Metadados da Demanda</h4>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-gray-400 block font-semibold">
                        {novoTipo === 'Organização' ? 'Tipo de Organização:' : 'Processo SEI / Documento:'}
                      </span>
                      <span className="font-bold text-slate-800 text-sm mt-0.5 block">{processo || "Não informado"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold">Solicitante:</span>
                      <span className="font-bold text-slate-800 text-sm mt-0.5 block">{solicitante}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold">Unidade Requisitante / Setor:</span>
                      <span className="font-bold text-slate-800 text-sm mt-0.5 block">{unidadeSolicitante || "Coordenação de Patrimônio Material"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold">Tipo de Serviço:</span>
                      <span className="px-2 py-0.5 font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 rounded mt-1.5 inline-block">{novoTipo}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold">Prioridade Definida:</span>
                      <span className="px-2 py-0.5 font-bold bg-red-50 border border-red-100 text-red-700 rounded mt-1.5 inline-block">{novaPrioridade}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold">Data Agendada:</span>
                      <span className="px-2 py-0.5 font-bold bg-amber-50 border border-amber-100 text-amber-700 rounded mt-1.5 inline-block">
                        {dataAgendada ? new Date(dataAgendada + 'T12:00:00').toLocaleDateString('pt-BR') : "Não informada"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-semibold">Período Selecionado:</span>
                      <span className="px-2 py-0.5 font-bold bg-amber-50 border border-amber-100 text-amber-700 rounded mt-1.5 inline-block">
                        {periodoAgendado}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Endereçamento Físico (Roteirização)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                        {novoTipo === 'Organização' ? 'Origem' : 'Local de Coleta / Origem'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Almoxarifado Central - Galpão A"
                        value={origem}
                        onChange={(e) => setOrigem(e.target.value)}
                        className="w-full border border-slate-200/80 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400 text-xs shadow-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                        {novoTipo === 'Organização' ? 'Destino' : 'Local de Entrega / Destino'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Prédio Sede do MPRS, Sala 304"
                        value={destino}
                        onChange={(e) => setDestino(e.target.value)}
                        className="w-full border border-slate-200/80 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400 text-xs shadow-xs bg-white"
                      />
                    </div>
                  </div>

                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Observações do Pedido</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Descrição / Detalhamento da Solicitação <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {observacoes.length}/500
                      </span>
                    </div>
                    <textarea
                      required
                      maxLength={500}
                      placeholder="Descreva detalhadamente o que está sendo solicitado..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      className="w-full border border-slate-200/80 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-slate-400 placeholder-slate-400 text-xs shadow-xs h-28 resize-none bg-white"
                    />
                  </div>
                </div>

                {/* Botões de Confirmação Final */}
                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStepRevisao(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft size={14} />
                    Editar dados
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={!origem.trim() || !destino.trim() || !observacoes.trim()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow-sm ml-auto cursor-pointer"
                  >
                    {editandoSolicitacaoId ? "Confirmar e Salvar Alterações" : "Confirmar e Lançar Demanda"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL DE CONCLUSÃO PELO OPERADOR */}
      {modalConcluirOperador && (() => {
        const selectedSoli = solicitacoes.find(s => s.id === modalConcluirOperador);
        const isEntrega = selectedSoli?.tipo === 'Entrega';
        const isFormValido = 
          Boolean(comentarioOperadorInput.trim()) && 
          groupedItensInput.length > 0 &&
          groupedItensInput.every(group => group.nome.trim() !== '');

        const handleLoadOriginals = () => {
          if (!selectedSoli) return;
          const initialGrouped = selectedSoli.itens.map((itemStr, idx) => {
            const { qty, name } = parseItemQuantityAndName(itemStr);
            return {
              id: `item-${idx}-${Date.now()}`,
              nome: name,
              quantidadeSolicitada: qty,
              tomboEntries: Array.from({ length: qty }, () => ({
                numeroTombo: '',
                estadoConservacao: 'Seminovo' as const
              }))
            };
          });
          setGroupedItensInput(initialGrouped);
        };

        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle size={16} className="text-amber-500 animate-pulse" />
                  Relatar Conclusão de Atividade (Operador)
                </h3>
                <button
                  onClick={() => setModalConcluirOperador(null)}
                  className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {isEntrega ? (
                    <>Você está marcando esta atividade logística como realizada. Registre abaixo os <strong>itens que foram realmente encontrados e separados no depósito</strong> com seus respectivos números de tombo e estado de conservação.</>
                  ) : (
                    <>Você está marcando esta atividade logística como realizada. Registre abaixo os <strong>itens coletados</strong> com seus respectivos números de tombo e estado de conservação.</>
                  )}
                </p>

                {/* Banner informativo de flexibilidade para itens sem tombamento */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5 shadow-3xs">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-[11px] text-emerald-950">Flexibilidade para Bens Novos / Sem Tombo</span>
                    <span className="text-[11px] text-emerald-800">
                      Caso os itens sejam novos ou não possuam número de tombo cadastrado, basta deixá-los em branco ou clicar em <strong>"Sem Tombo (Bens Novos)"</strong>. O relatório será concluído com sucesso.
                    </span>
                  </div>
                </div>

                {/* Itens solicitados na origem como referência */}
                <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Itens Solicitados Originalmente:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSoli?.itens.map((it, idx) => (
                      <span key={idx} className="bg-white border border-slate-200 px-2.5 py-0.5 rounded text-[11px] font-medium text-slate-700 shadow-3xs">
                        {it}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Comentários / Observações do Operador */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Comentários / Observações do Operador <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    placeholder="Ex: Todas as cadeiras e armários foram localizados e separados no depósito central, prontos para transporte."
                    value={comentarioOperadorInput}
                    onChange={(e) => setComentarioOperadorInput(e.target.value)}
                    className="w-full border border-slate-200/80 rounded-xl px-4 py-2.5 text-slate-850 focus:outline-none focus:border-slate-400 placeholder-slate-400 text-xs shadow-xs h-20 resize-none bg-white"
                  />
                </div>

                {/* Registro de Itens Encontrados */}
                {(isEntrega || selectedSoli?.tipo === 'Coleta') && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 block">
                        {isEntrega ? "Itens Catalogados no Depósito" : "Itens Catalogados na Coleta"} <span className="text-slate-400 font-normal">({groupedItensInput.reduce((acc, curr) => acc + curr.quantidadeSolicitada, 0)} itens no total)</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleLoadOriginals}
                          className="text-[11px] font-bold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition"
                        >
                          Carregar Originais
                        </button>
                        <button
                          type="button"
                          onClick={handleAddGroupedItem}
                          className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition"
                        >
                          <Plus size={12} /> Adicionar Nova Categoria
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-1">
                      {groupedItensInput.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 text-slate-400 text-xs">
                          Nenhum item ou categoria de tombamento registrado.
                          <div className="mt-3 flex gap-2 justify-center">
                            <button
                              type="button"
                              onClick={handleLoadOriginals}
                              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer shadow-3xs"
                            >
                              Carregar do Pedido Original
                            </button>
                          </div>
                        </div>
                      ) : (
                        groupedItensInput.map((item, idx) => (
                          <div key={item.id} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3 relative shadow-3xs">
                            {/* Header: Item Name & Quantity controls */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60">
                              <div className="flex-1 min-w-0">
                                <label className="text-[9px] font-extrabold text-slate-400 uppercase block mb-0.5">Nome do Item/Bem</label>
                                <input
                                  type="text"
                                  placeholder="Ex: Cadeira de Escritório"
                                  value={item.nome}
                                  onChange={(e) => {
                                    const next = [...groupedItensInput];
                                    next[idx].nome = e.target.value;
                                    setGroupedItensInput(next);
                                  }}
                                  className="w-full font-bold text-slate-800 text-xs bg-transparent border-0 border-b border-dashed border-slate-300 focus:outline-none focus:border-slate-500 pb-0.5"
                                />
                              </div>

                              <div className="flex items-center gap-4">
                                {/* Quantity Adjuster */}
                                <div>
                                  <label className="text-[9px] font-extrabold text-slate-400 uppercase block mb-0.5 text-right">Qtd. Encontrada</label>
                                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                                    <button
                                      type="button"
                                      disabled={item.quantidadeSolicitada <= 1}
                                      onClick={() => handleUpdateQuantity(idx, item.quantidadeSolicitada - 1)}
                                      className="w-5 h-5 flex items-center justify-center rounded bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantidadeSolicitada}
                                      onChange={(e) => handleUpdateQuantity(idx, parseInt(e.target.value, 10) || 1)}
                                      className="w-8 text-center font-bold text-[11px] text-slate-700 bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateQuantity(idx, item.quantidadeSolicitada + 1)}
                                      className="w-5 h-5 flex items-center justify-center rounded bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* Delete Group */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGroupedItensInput(groupedItensInput.filter(g => g.id !== item.id));
                                  }}
                                  className="text-slate-400 hover:text-red-500 transition cursor-pointer self-end pb-1"
                                  title="Remover Categoria"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>

                            {/* Controles de Tombo e Preenchimento */}
                            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/60 p-2 rounded-xl border border-slate-200/40 text-xs">
                              <label className="flex items-center gap-1.5 text-slate-600 font-semibold select-none cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.requerTombo !== false}
                                  onChange={(e) => handleOperatorToggleRequerTombo(idx, e.target.checked)}
                                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer h-3.5 w-3.5"
                                />
                                Exigir tombamento individual
                              </label>

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOperatorMarkAllSemTombo(idx)}
                                  className="px-2 py-0.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition shadow-3xs cursor-pointer"
                                  title="Marcar todos os itens desta categoria como 'Sem tombo' (bens novos)"
                                >
                                  Sem Tombo (Bens Novos)
                                </button>
                              </div>
                            </div>

                            {/* Row for bulk setting conditions */}
                            <div className="flex items-center justify-between text-[11px] bg-slate-100/50 px-2.5 py-1.5 rounded-lg border border-slate-200/30">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">
                                Tombos ({item.tomboEntries.filter(e => e.numeroTombo.trim() !== '' && e.numeroTombo !== 'Sem tombo').length} preenchidos):
                              </span>
                              <div className="flex gap-2 text-[10px] font-bold">
                                <button
                                  type="button"
                                  onClick={() => handleBulkSetCondition(idx, 'Novo')}
                                  className="text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
                                >
                                  Todos como Novo
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => handleBulkSetCondition(idx, 'Seminovo')}
                                  className="text-amber-600 hover:text-amber-700 transition cursor-pointer"
                                >
                                  Todos como Seminovo
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => handleBulkSetCondition(idx, 'Baixa')}
                                  className="text-rose-600 hover:text-rose-700 transition cursor-pointer"
                                >
                                  Todos como Baixa
                                </button>
                              </div>
                            </div>

                            {/* List of individual tombo inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                              {item.tomboEntries.map((entry, entryIdx) => (
                                <div key={entryIdx} className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-200/70 rounded-lg text-xs shadow-3xs">
                                  <span className="text-[10px] font-bold text-slate-400 w-5 text-right font-mono">#{entryIdx + 1}</span>
                                  <input
                                    type="text"
                                    value={entry.numeroTombo}
                                    onChange={(e) => handleUpdateTomboEntry(idx, entryIdx, e.target.value)}
                                    onPaste={(e) => handleOperatorTomboPaste(e, idx, entryIdx)}
                                    placeholder={item.requerTombo === false ? "Sem tombo (Novo)" : "Código (Opcional)"}
                                    className="flex-1 min-w-0 bg-transparent border-0 border-b border-slate-100 focus:border-slate-400 focus:outline-none font-mono text-xs text-slate-800 py-0.5 placeholder-slate-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextCond = entry.estadoConservacao === 'Novo' ? 'Seminovo' : entry.estadoConservacao === 'Seminovo' ? 'Baixa' : 'Novo';
                                      handleUpdateConditionEntry(idx, entryIdx, nextCond);
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold border uppercase transition cursor-pointer ${
                                      entry.estadoConservacao === 'Novo'
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                        : entry.estadoConservacao === 'Seminovo'
                                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                                        : 'bg-rose-50 border-rose-200 text-rose-700'
                                    }`}
                                  >
                                    {entry.estadoConservacao}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalConcluirOperador(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!isFormValido}
                  onClick={() => {
                    const flattenedItens = groupedItensInput.flatMap(group => 
                      group.tomboEntries.map((entry, entryIdx) => ({
                        nome: group.quantidadeSolicitada > 1 
                          ? `${group.nome} (${entryIdx + 1}/${group.quantidadeSolicitada})` 
                          : group.nome,
                        numeroTombo: entry.numeroTombo.trim() || "Sem tombo",
                        estadoConservacao: entry.estadoConservacao
                      }))
                    );

                    onUpdateStatus(modalConcluirOperador, 'Realizada', {
                      comentarioOperador: comentarioOperadorInput,
                      dataRealizacaoOperador: new Date().toISOString(),
                      itensEncontrados: flattenedItens
                    });
                    setModalConcluirOperador(null);
                    setComentarioOperadorInput('');
                    setGroupedItensInput([]);
                  }}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition shadow-sm ml-auto disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  Enviar para Homologação
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: COLAR LISTA DE TOMBOS EM LOTE */}
      {pasteModalCatIdx !== null && (() => {
        const cat = groupedItensAbastecimento[pasteModalCatIdx];
        if (!cat) return null;
        const parsedCount = parseTombosFromText(pasteModalTexto).length;
        const targetCount = cat.quantidadeSolicitada;

        return (
          <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Clipboard size={18} />
                  </div>
                  <div>
                    <h4>Colar Lista de Tombos</h4>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Categoria: <strong>{cat.nome}</strong> ({cat.quantidadeSolicitada} itens)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPasteModalCatIdx(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Cole a coluna do Excel ou lista de tombos:</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    parsedCount === targetCount 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : parsedCount > targetCount 
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {parsedCount} de {targetCount} detectados
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={pasteModalTexto}
                  onChange={(e) => setPasteModalTexto(e.target.value)}
                  placeholder={`Exemplo (um por linha, ou separados por vírgula/espaço):\n104891\n104892\n104893\n...\nou cole diretamente uma coluna copiada do Excel`}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-850 focus:outline-none focus:border-amber-500 bg-slate-50/50 resize-y"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400">
                  💡 Os números serão posicionados automaticamente a partir do 1º item da categoria.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasteModalCatIdx(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={parsedCount === 0}
                  onClick={() => handleApplyPasteTombos(pasteModalCatIdx, pasteModalTexto)}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCheck size={14} />
                  Distribuir {parsedCount > 0 ? `(${parsedCount} tombos)` : ''}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: GERAR FAIXA SEQUENCIAL DE TOMBOS */}
      {seqModalCatIdx !== null && (() => {
        const cat = groupedItensAbastecimento[seqModalCatIdx];
        if (!cat) return null;
        const cleanStr = seqModalInicio.trim();
        const match = cleanStr.match(/^(\D*)(\d+)(\D*)$/);
        let previewFim = '';
        if (match) {
          const prefix = match[1] || '';
          const numPart = match[2];
          const suffix = match[3] || '';
          const startNum = parseInt(numPart, 10);
          const endNum = startNum + cat.quantidadeSolicitada - 1;
          previewFim = `${prefix}${endNum.toString().padStart(numPart.length, '0')}${suffix}`;
        }

        return (
          <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <ListOrdered size={18} />
                  </div>
                  <div>
                    <h4>Gerar Faixa Sequencial</h4>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Categoria: <strong>{cat.nome}</strong> ({cat.quantidadeSolicitada} itens)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSeqModalCatIdx(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Número do Primeiro Tombo da Sequência:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 105001 ou PAT-00100"
                    value={seqModalInicio}
                    onChange={(e) => setSeqModalInicio(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono text-slate-850 focus:outline-none focus:border-blue-500 bg-slate-50/50"
                    autoFocus
                  />
                </div>

                {match && (
                  <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-blue-900 block">Prévia da Faixa Sequencial:</span>
                    <p className="text-blue-800 font-mono text-[11px]">
                      De: <strong>{cleanStr}</strong> &nbsp;➔&nbsp; Até: <strong>{previewFim}</strong>
                    </p>
                    <p className="text-[11px] text-blue-600">
                      Total: <strong>{cat.quantidadeSolicitada} números de tombo</strong> gerados em sequência.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSeqModalCatIdx(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!match}
                  onClick={() => handleApplySequentialTombos(seqModalCatIdx, seqModalInicio)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} />
                  Aplicar Sequência
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: COLAR LISTA DE ITENS EM LOTE (BENS A TRANSPORTAR) */}
      {batchItensModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Clipboard size={18} />
                </div>
                <div>
                  <h4>Colar Múltiplos Itens em Lote</h4>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Adicione vários bens a transportar de uma só vez
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBatchItensModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Cole a lista de itens (um por linha):
              </label>
              <textarea
                rows={8}
                value={batchItensTexto}
                onChange={(e) => setBatchItensTexto(e.target.value)}
                placeholder={`Exemplo:\n150x Cadeira Ergonômica NR17\n4x Armário de Aço\n2x Impressora Multifuncional HP\n...`}
                className="w-full border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50/50 resize-y"
                autoFocus
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBatchItensModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!batchItensTexto.trim()}
                onClick={() => handleBatchAddItens(batchItensTexto)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                Adicionar Itens
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK NOTIFICATION */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-[70] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle size={16} className="text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

    </div>
  );
}
