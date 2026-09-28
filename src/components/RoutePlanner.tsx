/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Route, Users, MapPin, CheckCircle, Navigation, 
  ChevronRight, Calendar, ArrowRight, Activity
} from 'lucide-react';
import { Solicitacao, Equipe, Rota } from '../types';

interface RoutePlannerProps {
  solicitacoes: Solicitacao[];
  equipes: Equipe[];
  rotas: Rota[];
  onCriarRota: (payload: {
    equipeId: string;
    solicitacoesIds: string[];
    quilometragemEstimada?: number;
  }) => void;
  onFinalizarRota: (id: string) => void;
  userRole: 'Coordenador' | 'Operador' | 'Administrador';
}

export default function RoutePlanner({
  solicitacoes,
  equipes,
  rotas,
  onCriarRota,
  onFinalizarRota,
  userRole
}: RoutePlannerProps) {
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [equipeSelecionada, setEquipeSelecionada] = useState('');

  // Filtra as solicitações aprovadas que ainda não têm rota vinculada
  const aprovadasSemRota = solicitacoes.filter(
    s => s.status === 'Aprovada' && !s.rotaId
  );

  const equipesDisponiveis = equipes.filter(e => e.status === 'Disponível');

  const handleToggleSelecao = (sid: string) => {
    if (selecionados.includes(sid)) {
      setSelecionados(selecionados.filter(id => id !== sid));
    } else {
      setSelecionados([...selecionados, sid]);
    }
  };

  const handleCriarRota = (e: React.FormEvent) => {
    e.preventDefault();
    if (selecionados.length === 0 || !equipeSelecionada) return;

    onCriarRota({
      equipeId: equipeSelecionada,
      solicitacoesIds: selecionados
    });

    // Reset form
    setSelecionados([]);
    setEquipeSelecionada('');
  };

  const getEquipeNome = (id: string) => {
    const eq = equipes.find(e => e.id === id);
    return eq ? eq.nome : 'Equipe Desconhecida';
  };

  const getEquipeIntegrantes = (id: string) => {
    const eq = equipes.find(e => e.id === id);
    return eq && eq.integrantes ? eq.integrantes.join(', ') : '';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* 1. SECTOR OF PLANNING (LEFT COLUMN) */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-600">
            <Route size={22} />
            <h3 className="text-lg font-bold">Agrupamento de Serviços & Despacho de Equipes</h3>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Selecione as demandas formalmente aprovadas abaixo para agrupá-las em um roteiro logístico e despachar a equipe operacional responsável.
          </p>

          <form onSubmit={handleCriarRota} className="space-y-4">
            
            {/* Solicitações Aprovadas Sem Rota */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">1. Selecione as Demandas Aprovadas ({aprovadasSemRota.length})</label>
              
              {aprovadasSemRota.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 bg-slate-50 rounded-xl text-center text-xs text-gray-400">
                  Não há solicitações em estado 'Aprovada' prontas para planejamento de rotas hoje.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {aprovadasSemRota.map((s) => (
                    <div 
                      key={s.id}
                      onClick={() => handleToggleSelecao(s.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        selecionados.includes(s.id)
                          ? 'border-emerald-500 bg-emerald-50/10 shadow-sm'
                          : 'border-slate-150 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={selecionados.includes(s.id)} 
                        onChange={() => {}} // -> handled by div click
                        className="mt-1 flex-shrink-0" 
                      />
                      <div className="flex-1 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-800">{s.numero}</span>
                          <div className="flex items-center gap-1.5">
                            {s.periodo && (
                              <span className="px-1.5 py-0.5 font-bold bg-amber-100 text-amber-800 rounded text-[10px] uppercase">
                                {s.periodo}
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 font-bold bg-slate-100 rounded text-[10px] text-slate-700">{s.tipo}</span>
                          </div>
                        </div>
                        <div className="text-gray-600 font-medium">{s.solicitante} | {s.setor}</div>
                        <div className="text-gray-500 flex items-center gap-1">
                          <MapPin size={12} className="text-emerald-500" />
                          <span>Destino: {s.destino}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alocação de Equipe */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">2. Alocar Equipe Operacional</label>
              <select
                required
                value={equipeSelecionada}
                onChange={(e) => setEquipeSelecionada(e.target.value)}
                className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">-- Selecionar Equipe Responsável --</option>
                {equipesDisponiveis.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.nome} {eq.integrantes && eq.integrantes.length > 0 ? `(${eq.integrantes.join(', ')})` : ''}
                  </option>
                ))}
              </select>
              {equipesDisponiveis.length === 0 && (
                <span className="text-[10px] text-red-500 block">⚠️ Todas as equipes de carregamento e logística estão em atividade no momento.</span>
              )}
            </div>

            <button
              type="submit"
              disabled={selecionados.length === 0 || !equipeSelecionada}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition text-sm shadow-sm cursor-pointer"
            >
              <Navigation size={16} />
              <span>Despachar Equipe & Iniciar Itinerário ({selecionados.length} {selecionados.length === 1 ? 'demanda' : 'demandas'})</span>
            </button>

          </form>
        </div>
      </div>

      {/* 2. ROTAS ATIVAS (RIGHT COLUMN) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-800">
            <Activity size={22} className="text-emerald-500" />
            <h3 className="text-lg font-bold">Rastreabilidade de Roteiros Ativos ({rotas.filter(r=>r.status!=='Finalizada').length})</h3>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Painel de despacho atual em tempo real. Acompanhe o atendimento, paradas e liberação das equipes.
          </p>

          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
            {rotas.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-xs text-gray-400">
                Nenhum roteiro ativo lançado no momento.
              </div>
            ) : (
              rotas.map((r) => (
                <div key={r.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-800">{r.numero}</span>
                      <p className="text-[10px] text-gray-400">Roteiro de Atendimento Logístico</p>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      r.status === 'Finalizada' ? 'bg-slate-200 text-slate-700' :
                      r.status === 'Em rota' ? 'bg-indigo-100 text-indigo-800 animate-pulse' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <Users size={14} className="text-emerald-600" />
                      <span>{getEquipeNome(r.equipeId)}</span>
                    </div>
                    {getEquipeIntegrantes(r.equipeId) && (
                      <p className="text-[11px] text-gray-500 pl-5">
                        Integrantes: {getEquipeIntegrantes(r.equipeId)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Paradas Vinculadas</span>
                    <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-150">
                      {r.paradas.map((parada, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] text-gray-600">
                          <span className="truncate max-w-[180px]">• {parada.local}</span>
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded uppercase font-semibold text-slate-500">{parada.tipo}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions for route lifecycle */}
                  {r.status !== 'Finalizada' && (userRole === 'Coordenador' || userRole === 'Operador' || userRole === 'Administrador') && (
                    <button
                      onClick={() => onFinalizarRota(r.id)}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                    >
                      <CheckCircle size={12} />
                      Concluir Roteiro / Liberar Equipe
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
