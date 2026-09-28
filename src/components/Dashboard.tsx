/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ClipboardList, Users, Route, Bell, Megaphone, CheckCircle2, 
  AlertTriangle, Play, HelpCircle, User, Award, ShieldAlert, Plus, Calendar, Settings,
  LayoutDashboard, ShieldCheck, Trash2
} from 'lucide-react';
import { Solicitacao, Equipe, Rota, Comunicado, Notificacao, Usuario } from '../types';
import CoordinatorDashboard from './CoordinatorDashboard';

interface DashboardProps {
  userRole: 'Coordenador' | 'Operador' | 'Administrador';
  solicitacoes: Solicitacao[];
  equipes: Equipe[];
  rotas: Rota[];
  comunicados: Comunicado[];
  notificacoes: Notificacao[];
  usuarios?: Usuario[];
  onApproveUser?: (id: string, role: 'Coordenador' | 'Operador' | 'Administrador') => Promise<void>;
  onDeleteUser?: (id: string) => Promise<void>;
  onAdicionarComunicado: (payload: { titulo: string; conteudo: string; categoria: 'Informativo' | 'Alerta' | 'Procedimento' }) => void;
  onExcluirComunicado?: (id: string) => void;
}

export default function Dashboard({
  userRole,
  solicitacoes,
  equipes,
  rotas,
  comunicados,
  notificacoes,
  usuarios = [],
  onApproveUser,
  onDeleteUser,
  onAdicionarComunicado,
  onExcluirComunicado
}: DashboardProps) {
  const [modalComunicado, setModalComunicado] = useState(false);
  const [comTitulo, setComTitulo] = useState('');
  const [comConteudo, setComConteudo] = useState('');
  const [comCat, setComCat] = useState<'Informativo' | 'Alerta' | 'Procedimento'>('Informativo');
  const [viewMode, setViewMode] = useState<'operacional' | 'gestao'>('gestao');

  // Metricas
  const totalSoli = solicitacoes.length;
  const soliAbertas = solicitacoes.filter(s => s.status === 'Aberta' || s.status === 'Em análise').length;
  const soliAndamento = solicitacoes.filter(s => s.status === 'Em execução' || s.status === 'Planejada' || s.status === 'Aprovada').length;
  const soliConcluidas = solicitacoes.filter(s => s.status === 'Concluída').length;

  const equipesDisponiveis = equipes.filter(e => e.status === 'Disponível').length;
  const equipesAtivas = equipes.filter(e => e.status === 'Em rota').length;

  const urgentCount = solicitacoes.filter(s => s.prioridade === 'Alta' && s.status !== 'Concluída' && s.status !== 'Cancelada').length;

  const handleSalvarComunicado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comTitulo.trim() || !comConteudo.trim()) return;
    
    if (comunicados.length >= 20) {
      alert("O limite de 20 avisos foi alcançado! Para publicar novos avisos, remova os comunicados mais antigos.");
      return;
    }

    onAdicionarComunicado({
      titulo: comTitulo,
      conteudo: comConteudo,
      categoria: comCat
    });

    setComTitulo('');
    setComConteudo('');
    setComCat('Informativo');
    setModalComunicado(false);
  };

  const getCatColor = (cat: string) => {
    switch (cat) {
      case 'Urgente': return 'bg-red-100 text-red-800 border-red-200';
      case 'Alerta': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Procedimento': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* SELETOR DE VISÃO PARA COORDENADOR */}
      {userRole === 'Coordenador' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#F8FAFC] dark:bg-slate-900 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="text-xs font-bold text-[#0F172B] dark:text-slate-300">Controles da Coordenação:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button
              onClick={() => setViewMode('gestao')}
              className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer whitespace-nowrap ${
                viewMode === 'gestao'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck size={14} className="flex-shrink-0" />
              <span>Painel de Gestão</span>
            </button>
            <button
              onClick={() => setViewMode('operacional')}
              className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer whitespace-nowrap ${
                viewMode === 'operacional'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                  : 'text-[#0F172B] dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard size={14} className="flex-shrink-0" />
              <span>Mural Operacional</span>
            </button>
          </div>
        </div>
      )}

      {userRole === 'Coordenador' && viewMode === 'gestao' ? (
        <CoordinatorDashboard
          solicitacoes={solicitacoes}
          equipes={equipes}
          rotas={rotas}
          usuarios={usuarios}
          onApproveUser={onApproveUser}
          onDeleteUser={onDeleteUser}
          userRole={userRole}
        />
      ) : (
        <>
          {/* 1. SEÇÃO DE METRICAS PRINCIPAIS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1">
            <span className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider block truncate">Pendentes</span>
            <span className="text-xl sm:text-2xl font-bold text-slate-800 font-mono">{soliAbertas}</span>
            <span className="text-[10px] text-gray-400 block truncate">Abertas ou Análise</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1">
            <span className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider block truncate">Em Execução</span>
            <span className="text-xl sm:text-2xl font-bold text-slate-800 font-mono">{soliAndamento}</span>
            <span className="text-[10px] text-gray-400 block truncate">Andamento/Rotas</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1">
            <span className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider block truncate">Concluídas</span>
            <span className="text-xl sm:text-2xl font-bold text-slate-800 font-mono">{soliConcluidas}</span>
            <span className="text-[10px] text-emerald-600 block font-semibold truncate">100% Rastreável</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1">
            <span className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider block truncate">Urgentes</span>
            <span className={`text-xl sm:text-2xl font-bold font-mono ${urgentCount > 0 ? 'text-red-600 animate-pulse' : 'text-slate-800'}`}>
              {urgentCount}
            </span>
            <span className="text-[10px] text-gray-400 block truncate">Prioritárias</span>
          </div>
        </div>
      </div>

      {/* 2. LAYOUT GRID FOR MURAL AND ACTIVE FLEET/TEAMS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* MURAL DE COMUNICADOS (Replaces Whatsapp Notices) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-800">
              <Megaphone size={20} className="text-emerald-500" />
              <h3 className="text-base font-bold">Mural de Comunicados CBP</h3>
            </div>
            
            {/* Somente Coordenador e Administrador publicam comunicados */}
            {(userRole === 'Coordenador' || userRole === 'Administrador') && (
              <button
                onClick={() => setModalComunicado(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition cursor-pointer"
              >
                <Plus size={12} />
                Publicar Comunicado
              </button>
            )}
          </div>

          {/* Warning banner when notice limit is reached */}
          {comunicados.length >= 20 && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex flex-col gap-1">
              <span className="font-bold flex items-center gap-1">
                <AlertTriangle size={14} className="text-amber-500" />
                Limite de 20 avisos alcançado!
              </span>
              <span>Dica: Para cadastrar novos avisos, exclua os comunicados mais antigos clicando no ícone de lixeira.</span>
            </div>
          )}

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {comunicados.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                  <Megaphone size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">Nenhum comunicado publicado</p>
                  <p className="text-[11px] text-slate-500 max-w-[240px] mx-auto">
                    {userRole === 'Coordenador' || userRole === 'Administrador' 
                      ? 'Nenhum aviso oficial foi cadastrado ainda. Seja o primeiro a criar uma comunicação importante para a equipe.' 
                      : 'Não há comunicados oficiais no mural no momento. Avisos importantes da coordenação aparecerão aqui.'}
                  </p>
                </div>
                {(userRole === 'Coordenador' || userRole === 'Administrador') && (
                  <button
                    onClick={() => setModalComunicado(true)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus size={11} />
                    Criar Comunicação
                  </button>
                )}
              </div>
            ) : (
              comunicados.map((c) => (
                <div key={c.id} className="p-4 border border-slate-200/60 bg-white rounded-xl space-y-2 relative group shadow-none">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${getCatColor(c.categoria)}`}>
                        {c.categoria}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 mt-1">{c.titulo}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(c.dataCriacao).toLocaleDateString()}
                      </span>
                      {(userRole === 'Coordenador' || userRole === 'Administrador') && onExcluirComunicado && (
                        <button
                          onClick={() => onExcluirComunicado(c.id)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition cursor-pointer"
                          title="Excluir comunicado"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {c.conteudo}
                  </p>
                  <div className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 border border-emerald-100/60 px-2.5 py-1 rounded-md mt-2 flex items-center justify-between">
                    <span>Postado por: <strong className="text-emerald-900 font-bold">{c.autor || "Coordenação CBP"}</strong></span>
                    <span className="text-[10px] text-emerald-700/80 font-normal">Setor Alvo: {c.setorAlvo}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* NOTIFICAÇÕES E STATUS DE FROTA / EQUIPE (RIGHT) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Notificações Operacionais Recentes */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  Notificações Recentes
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Excluídas permanentemente após 12h</p>
              </div>
              <span className="text-[10px] bg-slate-100 font-semibold text-slate-600 px-2 py-0.5 rounded-full">
                {notificacoes.filter(n=>!n.lida).length} novas
              </span>
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {notificacoes.slice(0, 4).map((n) => (
                <div key={n.id} className={`p-2.5 rounded-lg text-xs leading-normal flex items-start gap-2 ${
                  n.lida ? 'bg-slate-50 text-slate-600' : 'bg-emerald-50/30 text-slate-800 border border-emerald-100'
                }`}>
                  <span className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${
                    n.tipo === 'urgente' ? 'bg-red-500' : 
                    n.tipo === 'sucesso' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <h5 className="font-bold">{n.titulo}</h5>
                    <p className="text-[11px] text-gray-500 mt-0.5">{n.mensagem}</p>
                    <div className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-md mt-1.5 inline-block">
                      Ação por: {n.usuarioAcao || "Sistema Logístico"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
      </>
      )}

      {/* CREATE NEW COMUNICADO MODAL */}
      {modalComunicado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800">Publicar Novo Comunicado Oficial</h3>
            
            {comunicados.length >= 20 && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs space-y-1.5">
                <p className="font-bold flex items-center gap-1 text-red-700">
                  <AlertTriangle size={14} className="text-red-500" />
                  Limite máximo de 20 comunicados alcançado!
                </p>
                <p>Para publicar este ou outros avisos, você precisa primeiro excluir os comunicados mais antigos clicando no ícone de lixeira (<Trash2 size={11} className="inline" />) no Mural de Comunicados.</p>
              </div>
            )}

            <form onSubmit={handleSalvarComunicado} className="space-y-4 text-sm">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Título do Comunicado</label>
                <input
                  type="text"
                  required
                  disabled={comunicados.length >= 20}
                  placeholder="Ex: Novo Procedimento de Movimentação de Bens"
                  value={comTitulo}
                  onChange={(e) => setComTitulo(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Categoria</label>
                <select
                  disabled={comunicados.length >= 20}
                  value={comCat}
                  onChange={(e: any) => setComCat(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="Informativo">Informativo Geral</option>
                  <option value="Alerta">Alerta de Segurança</option>
                  <option value="Procedimento">Procedimento Logístico</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Conteúdo do Aviso</label>
                <textarea
                  required
                  disabled={comunicados.length >= 20}
                  placeholder="Descreva o comunicado em detalhes para os motoristas, ajudantes e solicitantes..."
                  value={comConteudo}
                  onChange={(e) => setComConteudo(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs h-28 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalComunicado(false)}
                  className="flex-1 py-2 text-xs border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold"
                >
                  {comunicados.length >= 20 ? "Fechar" : "Cancelar"}
                </button>
                {comunicados.length < 20 && (
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-slate-950 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition"
                  >
                    Confirmar e Publicar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
