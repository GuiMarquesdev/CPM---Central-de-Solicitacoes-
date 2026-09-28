/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Route, ClipboardList, CheckCircle2, AlertTriangle, 
  TrendingUp, BarChart2, PieChart, Activity, ShieldCheck, UserCheck, RefreshCw, Calendar,
  Mail, Send, Trash2, Eye, ChevronRight, ChevronDown, ChevronUp, Check
} from 'lucide-react';
import { Solicitacao, Equipe, Rota, Comunicado, Notificacao, Usuario } from '../types';

interface CoordinatorDashboardProps {
  solicitacoes: Solicitacao[];
  equipes: Equipe[];
  rotas: Rota[];
  usuarios?: Usuario[];
  onApproveUser?: (id: string, role: 'Coordenador' | 'Operador' | 'Administrador') => Promise<void>;
  onDeleteUser?: (id: string) => Promise<void>;
  userRole?: 'Coordenador' | 'Operador' | 'Administrador';
}

export default function CoordinatorDashboard({
  solicitacoes,
  equipes,
  rotas,
  usuarios = [],
  onApproveUser,
  onDeleteUser,
  userRole
}: CoordinatorDashboardProps) {
  const [activeChartTab, setActiveChartTab] = useState<'geral' | 'setores' | 'status'>('geral');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [isAuditExpanded, setIsAuditExpanded] = useState<boolean>(true);

  // ==========================================
  // 1. CALCULATING CORE KPI METRICS FOR COORD
  // ==========================================
  const totalTasks = solicitacoes.length;
  
  const completionRate = useMemo(() => {
    if (totalTasks === 0) return 0;
    const completed = solicitacoes.filter(s => s.status === 'Concluída').length;
    return Math.round((completed / totalTasks) * 100);
  }, [solicitacoes, totalTasks]);

  const activeRoutesPercent = useMemo(() => {
    if (rotas.length === 0) return 0;
    const active = rotas.filter(r => r.status === 'Em rota').length;
    return Math.round((active / rotas.length) * 100);
  }, [rotas]);

  const teamsAllocationRate = useMemo(() => {
    if (equipes.length === 0) return 0;
    const allocated = equipes.filter(e => e.status === 'Em rota').length;
    return Math.round((allocated / equipes.length) * 100);
  }, [equipes]);

  // ==========================================
  // 2. DATA PROCESSING FOR COLUMNS CHART (Sectors comparison)
  // ==========================================
  const sectorData = useMemo(() => {
    const counts: Record<string, number> = {};
    solicitacoes.forEach(s => {
      const sector = s.setor || 'Outros';
      counts[sector] = (counts[sector] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // top 5 sectors
  }, [solicitacoes]);

  const maxSectorValue = useMemo(() => {
    if (sectorData.length === 0) return 10;
    return Math.max(...sectorData.map(d => d.value), 5);
  }, [sectorData]);

  // ==========================================
  // 3. DATA PROCESSING FOR LINE CHART (Volume Trend - last 7 days)
  // ==========================================
  const trendData = useMemo(() => {
    // Generate last 7 days in YYYY-MM-DD
    const daysList: string[] = [];
    const formattedLabels: string[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      daysList.push(dateStr);
      
      // Label in DD/MM format
      formattedLabels.push(`${dd}/${mm}`);
    }

    const counts: Record<string, number> = {};
    const completedCounts: Record<string, number> = {};

    daysList.forEach(day => {
      counts[day] = 0;
      completedCounts[day] = 0;
    });

    solicitacoes.forEach(s => {
      // Extract YYYY-MM-DD from either scheduled date or fallback to creation date
      let targetDate = s.data || (s.dataCriacao ? s.dataCriacao.split('T')[0] : '');
      if (counts[targetDate] !== undefined) {
        counts[targetDate]++;
      }
      if (s.status === 'Concluída' && counts[targetDate] !== undefined) {
        // Assume concluded on that day for visualization trend
        completedCounts[targetDate]++;
      }
    });

    return daysList.map((day, idx) => ({
      date: day,
      label: formattedLabels[idx],
      novas: counts[day],
      concluidas: completedCounts[day]
    }));
  }, [solicitacoes]);

  const maxTrendValue = useMemo(() => {
    const maxVal = Math.max(...trendData.map(d => Math.max(d.novas, d.concluidas)), 2);
    return Math.ceil(maxVal * 1.2); // Add 20% headroom
  }, [trendData]);

  // ==========================================
  // 4. DATA PROCESSING FOR DONUT CHART (Status proportion)
  // ==========================================
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      'Abertas / Em Análise': solicitacoes.filter(s => s.status === 'Aberta' || s.status === 'Em análise').length,
      'Em Execução': solicitacoes.filter(s => s.status === 'Aprovada' || s.status === 'Em execução').length,
      'Planejadas': solicitacoes.filter(s => s.status === 'Planejada').length,
      'Concluídas': solicitacoes.filter(s => s.status === 'Concluída' || s.status === 'Realizada').length,
      'Canceladas': solicitacoes.filter(s => s.status === 'Cancelada').length,
    };

    const colors = [
      '#3b82f6', // blue
      '#f59e0b', // amber
      '#8b5cf6', // purple
      '#10b981', // emerald
      '#ef4444', // red
    ];

    return Object.entries(counts)
      .map(([name, value], idx) => ({
        name,
        value,
        color: colors[idx]
      }))
      .filter(d => d.value > 0);
  }, [solicitacoes]);

  const totalStatusCount = useMemo(() => {
    return statusData.reduce((acc, curr) => acc + curr.value, 0);
  }, [statusData]);

  // Polar to Cartesian for Donut Chart
  const donutArcs = useMemo(() => {
    let accumulatedPercent = 0;
    return statusData.map((d) => {
      const percent = totalStatusCount > 0 ? (d.value / totalStatusCount) * 100 : 0;
      const startAngle = (accumulatedPercent / 100) * 360;
      accumulatedPercent += percent;
      const endAngle = (accumulatedPercent / 100) * 360;
      return {
        ...d,
        percent,
        startAngle,
        endAngle
      };
    });
  }, [statusData, totalStatusCount]);

  function describeDonutArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    // Helper to map angles
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  }

  // ==========================================
  // 5. AUDIT LOG GENERATION (System workflow actions)
  // ==========================================
  const auditLogs = useMemo(() => {
    const logs: { id: string; time: string; user: string; role: 'Operador' | 'Administrador' | 'Coordenador' | 'Solicitante'; action: string; icon: any; color: string }[] = [];

    // 1. Solicitations activity
    solicitacoes.forEach(s => {
      const formattedTime = s.dataCriacao ? new Date(s.dataCriacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "09:00";
      
      if (s.status === 'Aberta' || s.status === 'Em análise') {
        logs.push({
          id: `sol-open-${s.id}`,
          time: formattedTime,
          user: s.solicitante || "Solicitante",
          role: "Solicitante",
          action: `Criou a solicitação #${s.numero} (${s.tipo}) para o setor ${s.setor}`,
          icon: ClipboardList,
          color: "text-blue-700 bg-blue-50 border border-blue-200/60"
        });
      } else if (s.status === 'Aprovada') {
        logs.push({
          id: `sol-appr-${s.id}`,
          time: formattedTime,
          user: s.usuarioAcao || "Coordenação",
          role: "Coordenador",
          action: `Aprovou a solicitação #${s.numero} (${s.tipo}) - Setor: ${s.setor}`,
          icon: CheckCircle2,
          color: "text-emerald-700 bg-emerald-50 border border-emerald-200/60"
        });
      } else if (s.status === 'Em execução' || s.status === 'Planejada') {
        logs.push({
          id: `sol-exec-${s.id}`,
          time: formattedTime,
          user: s.usuarioAcao || "Operador Logístico",
          role: "Operador",
          action: `Iniciou execução/embarque da solicitação #${s.numero}`,
          icon: TrendingUp,
          color: "text-purple-700 bg-purple-50 border border-purple-200/60"
        });
      } else if (s.status === 'Concluída' || s.status === 'Realizada') {
        logs.push({
          id: `sol-conc-${s.id}`,
          time: formattedTime,
          user: s.usuarioAcao || "Equipe de Campo",
          role: "Operador",
          action: `Concluiu o atendimento da solicitação #${s.numero}`,
          icon: CheckCircle2,
          color: "text-emerald-700 bg-emerald-50 border border-emerald-200/60"
        });
      }
    });

    // 2. Route planning actions
    rotas.forEach(r => {
      logs.push({
        id: `rot-create-${r.id}`,
        time: "10:15",
        user: "Operador de Tráfego",
        role: "Operador",
        action: `Planejou e roteirizou Rota #${r.numero} contendo ${r.solicitacoesIds.length} paradas`,
        icon: Route,
        color: "text-indigo-700 bg-indigo-50 border border-indigo-200/60"
      });

      if (r.status === 'Em rota') {
        logs.push({
          id: `rot-active-${r.id}`,
          time: "11:00",
          user: "Operador de Despacho",
          role: "Operador",
          action: `Despachou comboio em rota ativa: Rota #${r.numero}`,
          icon: TrendingUp,
          color: "text-purple-700 bg-purple-50 border border-purple-200/60"
        });
      }
    });

    // 3. Team statuses
    equipes.forEach(e => {
      logs.push({
        id: `eq-status-${e.id}`,
        time: "07:30",
        user: "Gestor do RH",
        role: "Administrador",
        action: `Equipe ${e.nome} (${e.integrantes.length} integrantes) - Status: ${e.status}`,
        icon: Users,
        color: e.status === 'Disponível' ? "text-emerald-700 bg-emerald-50 border border-emerald-200/60" : "text-slate-600 bg-slate-100 border border-slate-200"
      });
    });

    return logs.slice(0, 10);
  }, [solicitacoes, rotas, equipes]);

  // ==========================================

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION FOR COORDINATOR AUDIT BOARD */}
      <div className="bg-white text-slate-800 p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              Painel de Auditoria e Gestão
            </span>
            <span className="text-[11px] text-slate-400">• Coordenação CBP</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Visão Geral de Governança Logística
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhamento de tendências, distribuição de demandas e conformidade de ações dos Operadores e Administradores.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-xs">
            <p className="font-semibold text-slate-800">Sincronização Ativa</p>
            <p className="text-[10px] text-slate-500">Dados consolidados do servidor local</p>
          </div>
        </div>
      </div>

      {/* DETECT AND SHOW PENDING USER REGISTRATIONS IN REAL-TIME */}
      {usuarios.filter(u => u.aprovado === false).length > 0 && (
        <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-6 space-y-4 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-300">
                <UserCheck size={18} className="text-amber-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider">Novos Cadastros Pendentes ({usuarios.filter(u => u.aprovado === false).length})</h3>
                <p className="text-xs text-amber-800/80">Usuários que se cadastraram recentemente no sistema e aguardam autorização de acesso e atribuição de função.</p>
              </div>
            </div>
            <span className="hidden sm:inline bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Ação Recomendada
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {usuarios.filter(u => u.aprovado === false).map((usr) => {
              const initials = usr.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
              return (
                <div key={usr.id} className="bg-white border border-amber-200/80 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{usr.nome}</h4>
                      <p className="text-[11px] text-slate-500 truncate">{usr.email}</p>
                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">Lotação: <span className="text-slate-700 font-semibold">{usr.setor}</span></p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-auto">Aprovar como:</span>
                    <button
                      onClick={() => onApproveUser?.(usr.id, 'Operador')}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold transition cursor-pointer"
                    >
                      Operador
                    </button>
                    <button
                      onClick={() => onApproveUser?.(usr.id, 'Administrador')}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold transition cursor-pointer"
                    >
                      Admin
                    </button>
                    {userRole === 'Coordenador' && (
                      <button
                        onClick={() => onDeleteUser?.(usr.id)}
                        className="px-2 py-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md border border-transparent hover:border-red-200 text-[11px] font-medium transition cursor-pointer"
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



      {/* METRIC CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: LINE & BAR CHARTS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* CHART 1: LINE CHART (TENDÊNCIA AO LONGO DO TEMPO) */}
          <div className="bg-white text-slate-800 p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Métrica Temporal</span>
                <h3 className="text-sm font-bold text-slate-900">
                  Evolução de Solicitações Logísticas (Últimos 7 Dias)
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Novas Solicitações
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Concluídas
                </span>
              </div>
            </div>

            {totalTasks > 0 ? (
              <div className="w-full overflow-x-auto">
                <div className="min-w-[500px] h-56 relative pr-2">
                  <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines and tick labels */}
                    {[0, 1, 2, 3, 4].map((i) => {
                      const value = Math.round(((maxTrendValue || 5) / 4) * i);
                      const y = 160 - (i * 130) / 4;
                      return (
                        <g key={i} className="opacity-80">
                          <line
                            x1="45"
                            y1={y}
                            x2="580"
                            y2={y}
                            stroke="#e2e8f0"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                          />
                          <text
                            x="35"
                            y={y + 4}
                            fill="#94a3b8"
                            fontSize="9"
                            fontFamily="monospace"
                            textAnchor="end"
                          >
                            {value}
                          </text>
                        </g>
                      );
                    })}

                    {/* Area under curves */}
                    {(() => {
                      const xCoords = trendData.map((_, i) => 45 + (i * 535) / 6);
                      const getY = (val: number) => 160 - (val / (maxTrendValue || 5)) * 130;
                      
                      let pathNovasStr = "";
                      let pathConcluidasStr = "";
                      
                      trendData.forEach((d, i) => {
                        const x = xCoords[i];
                        const yN = getY(d.novas);
                        const yC = getY(d.concluidas);
                        if (i === 0) {
                          pathNovasStr = `M ${x} ${yN}`;
                          pathConcluidasStr = `M ${x} ${yC}`;
                        } else {
                          pathNovasStr += ` L ${x} ${yN}`;
                          pathConcluidasStr += ` L ${x} ${yC}`;
                        }
                      });

                      const areaNovasStr = pathNovasStr + ` L ${xCoords[6]} 160 L ${xCoords[0]} 160 Z`;
                      const areaConcluidasStr = pathConcluidasStr + ` L ${xCoords[6]} 160 L ${xCoords[0]} 160 Z`;

                      return (
                        <>
                          <path d={areaNovasStr} fill="url(#blueGrad)" />
                          <path d={areaConcluidasStr} fill="url(#greenGrad)" />
                          
                          <path d={pathNovasStr} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d={pathConcluidasStr} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                          {trendData.map((d, i) => (
                            <g key={i}>
                              <circle
                                cx={xCoords[i]}
                                cy={getY(d.novas)}
                                r="4.5"
                                fill="#ffffff"
                                stroke="#3b82f6"
                                strokeWidth="2.5"
                                className="cursor-pointer hover:r-6"
                              />
                              <circle
                                cx={xCoords[i]}
                                cy={getY(d.concluidas)}
                                r="4.5"
                                fill="#ffffff"
                                stroke="#10b981"
                                strokeWidth="2.5"
                                className="cursor-pointer hover:r-6"
                              />
                              <text
                                x={xCoords[i]}
                                y="185"
                                fill="#64748b"
                                fontSize="10"
                                fontWeight="600"
                                textAnchor="middle"
                              >
                                {d.label}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-center text-xs text-slate-400">
                Nenhuma variação no volume de demandas registrada no período.
              </div>
            )}
          </div>

          {/* CHART 2: COLUMN (BAR) CHART (COMPARAÇÃO ENTRE SETORES DEMANDANTES) */}
          <div className="bg-white text-slate-800 p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Consumo por Setor</span>
                <h3 className="text-sm font-bold text-slate-900">
                  Solicitações por Setor Solicitante (Top 5 Setores)
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Setores Solicitantes</span>
            </div>

            {sectorData.length > 0 ? (
              <div className="space-y-4 py-2">
                {sectorData.map((item, idx) => {
                  const percent = maxSectorValue > 0 ? (item.value / maxSectorValue) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          {item.name}
                        </span>
                        <span className="text-amber-700 font-mono font-bold">
                          {item.value} {item.value === 1 ? 'solicitação' : 'solicitações'}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-center text-xs text-slate-400">
                Nenhuma solicitação registrada por setor no período.
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: DONUT PIE CHART & TIMELINE OF ACTIONS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* CHART 3: DONUT PIE CHART (PROPORÇÃO DO TODO) */}
          <div className="bg-white text-slate-800 p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <PieChart size={16} className="text-slate-400" />
                Status Geral das Solicitações
              </h3>
            </div>

            {totalStatusCount > 0 ? (
              <div className="flex flex-col gap-5 justify-center py-2">
                <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                    {donutArcs.map((arc, index) => {
                      if (arc.percent === 100) {
                        return (
                          <circle
                            key={index}
                            cx="60"
                            cy="60"
                            r="45"
                            fill="none"
                            stroke={arc.color}
                            strokeWidth="12"
                          />
                        );
                      }
                      const pathData = describeDonutArc(60, 60, 45, arc.startAngle, arc.endAngle);
                      return (
                        <path
                          key={index}
                          d={pathData}
                          fill="none"
                          stroke={arc.color}
                          strokeWidth="12"
                          strokeLinecap="round"
                          className="transition-all duration-300 hover:stroke-[14px]"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold font-mono text-slate-900">{totalTasks}</span>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Solicitações</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  {donutArcs.map((arc, index) => (
                    <div key={index} className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: arc.color }} />
                        <span className="text-slate-700 truncate font-medium">{arc.name}</span>
                      </div>
                      <span className="text-slate-500 font-bold font-mono ml-2">
                        {arc.value} ({Math.round(arc.percent)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-center text-xs text-slate-400">
                Nenhuma solicitação ativa para categorização de status no momento.
              </div>
            )}
          </div>

          {/* AUDIT TIMELINE OF OTHER ROLES */}
          <div className="bg-white text-slate-800 p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Oversight de Perfis</span>
                <h3 className="text-sm font-bold text-slate-900">
                  Fluxo de Ações do Sistema
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-2 py-0.5 rounded font-bold">Histórico Vivo</span>
                <button
                  type="button"
                  onClick={() => setIsAuditExpanded(!isAuditExpanded)}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-slate-200"
                  title={isAuditExpanded ? "Recolher painel" : "Expandir painel"}
                >
                  {isAuditExpanded ? (
                    <>
                      <span>Recolher</span>
                      <ChevronUp size={14} />
                    </>
                  ) : (
                    <>
                      <span>Expandir</span>
                      <ChevronDown size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {isAuditExpanded && (
              <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1 transition-all duration-300">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    Nenhuma atividade registrada no fluxo de trabalho hoje.
                  </div>
                ) : (
                  auditLogs.map((log) => {
                    return (
                      <div key={log.id} className="pb-2 border-b border-slate-100 last:border-b-0 space-y-0.5 min-w-0">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-bold uppercase tracking-wider ${
                            log.role === 'Administrador' ? 'text-amber-700' : 
                            log.role === 'Coordenador' ? 'text-emerald-700' :
                            log.role === 'Solicitante' ? 'text-sky-700' : 'text-indigo-700'
                          }`}>
                            {log.role} ({log.user})
                          </span>
                          <span className="text-slate-400 font-mono">{log.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-normal truncate-2-lines">
                          {log.action}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
