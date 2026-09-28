/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TipoSolicitacao = 'Entrega' | 'Coleta' | 'Abastecimento' | 'Organização' | 'Ocorrência';
export type SubtipoOcorrencia = 'Garantia' | 'Manutenção' | 'Avaria / Dano' | 'Outros';
export type PrioridadeSolicitacao = 'Alta' | 'Média' | 'Baixa';
export type StatusSolicitacao = 'Aberta' | 'Em análise' | 'Aprovada' | 'Planejada' | 'Em execução' | 'Realizada' | 'Concluída' | 'Cancelada';
export type PeriodoSolicitacao = 'Manhã' | 'Tarde' | 'Dia Todo';

export interface Solicitacao {
  id: string;
  numero: string;
  processo?: string;
  solicitante: string;
  setor: string;
  tipo: TipoSolicitacao;
  subtipoOcorrencia?: SubtipoOcorrencia;
  equipamentoItem?: string;
  fornecedorOuEmpresa?: string;
  numeroNotaOuContrato?: string;
  prioridade: PrioridadeSolicitacao;
  data: string; // YYYY-MM-DD
  periodo?: PeriodoSolicitacao; // 'Manhã' | 'Tarde'
  origem: string;
  destino: string;
  observacoes: string;
  status: StatusSolicitacao;
  dataCriacao: string;
  itens: string[];
  numeroTombo?: string;
  estadoConservacao?: 'Novo' | 'Seminovo' | 'Baixa';
  equipeAlocadaIds?: string[];
  rotaId?: string;
  comentarioOperador?: string;
  dataRealizacaoOperador?: string;
  dataHomologacao?: string;
  itensEncontrados?: { nome: string; numeroTombo: string; estadoConservacao: 'Novo' | 'Seminovo' | 'Baixa' }[];
  usuarioAcao?: string;
  editadoPor?: string;
  dataEdicao?: string;
  ultimaNotificacaoParadaEm?: string;
}

export interface Equipe {
  id: string;
  nome: string;
  integrantes: string[];
  status: 'Disponível' | 'Em rota' | 'Ausente' | 'Folga';
  atividadesIds: string[];
}

export interface Rota {
  id: string;
  numero: string;
  data: string;
  equipeId: string;
  solicitacoesIds: string[];
  status: 'Planejada' | 'Em rota' | 'Finalizada' | 'Cancelada';
  paradas: {
    solicitacaoId: string;
    ordem: number;
    local: string;
    tipo: 'coleta' | 'entrega';
    status: 'Pendente' | 'Concluído' | 'Problema';
    ocorrencia?: string;
  }[];
  quilometragemEstimada?: number;
}

export interface Comunicado {
  id: string;
  titulo: string;
  conteudo: string;
  setorAlvo: string; // 'Geral' or specific sector name
  dataCriacao: string;
  autor: string;
  categoria: 'Informativo' | 'Alerta' | 'Procedimento' | 'Urgente';
}

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  data: string;
  lida: boolean;
  tipo: 'urgente' | 'info' | 'sucesso' | 'alerta';
  solicitacaoId?: string;
  usuarioAcao?: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  funcao: 'Coordenador' | 'Operador' | 'Administrador';
  setor: string;
  ativo: boolean;
  aprovado: boolean;
  senha?: string;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass?: string;
  hasCustomPassword?: boolean;
  smtpSecure: boolean;
  senderName: string;
  senderEmail: string;
  destinatarios: string[];
  ativo: boolean;
  notificarNovasDemandas: boolean;
  notificarMudancaStatus: boolean;
  notificarOcorrenciasUrgentes: boolean;
  notificarAtividadeIniciada: boolean;
  notificarAtividadeParadaSemana: boolean;
  diasAtividadeParada: number;
  notificarLembreteAcesso: boolean;
  lembreteAcessoSiteDias: number;
  ultimoLembreteAcessoEm?: string;
  modoEnvio: 'outlook_m365' | 'smtp_personalizado' | 'simulado';
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  html: string;
  sentAt: string;
  status: 'enviado' | 'simulado' | 'falha';
  errorMsg?: string;
  solicitacaoId?: string;
  solicitacaoNumero?: string;
  tipo?: string;
}

export function capitalizeProperly(text: string): string {
  if (!text) return '';
  const lowercasePrepositions = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'por', 'a', 'o', 'as', 'os', 'ao', 'aos'];
  const knownAcronyms = ['mp', 'mprs', 'cbp', 'sei', 'pj', 'gp', 'epi', 'rs', 'sc', 'pr', 'sp', 'rj', 'mg', 'df', 'util'];
  
  return text
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      // If the word has characters, format them safely while preserving punctuation
      return word.replace(/([A-Za-zÀ-ÖØ-öø-ÿ]+)/g, (match) => {
        const matchLower = match.toLowerCase();
        if (lowercasePrepositions.includes(matchLower) && index !== 0) {
          return matchLower;
        }
        if (knownAcronyms.includes(matchLower)) {
          return match.toUpperCase();
        }
        return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
      });
    })
    .join(' ');
}


