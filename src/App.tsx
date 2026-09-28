/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardList, Users, Truck, Route, Bell, Megaphone, CheckCircle2, 
  AlertTriangle, HelpCircle, User, Award, ShieldAlert, Plus, Calendar, Settings,
  Sparkles, FileText, LayoutDashboard, Database, RefreshCw, Layers, Sun, Moon, LogOut,
  Mail
} from 'lucide-react';
import { Solicitacao, Equipe, Rota, Comunicado, Notificacao, StatusSolicitacao, Usuario } from './types';
import Dashboard from './components/Dashboard';
import SolicitationsList from './components/SolicitationsList';
import ArchitectureHub from './components/ArchitectureHub';
import UserManagement from './components/UserManagement';
import AuthScreen from './components/AuthScreen';
import OutlookNotificationHub from './components/OutlookNotificationHub';
import { PWAInstallButton } from './components/PWAInstallButton';

const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First tone (pleasant warm ping)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc1.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
    
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.4);

    // Second tone slightly delayed
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc2.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.15); // C6
        
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.5);
      } catch (err) {
        console.error("Audio error 2:", err);
      }
    }, 80);
  } catch (error) {
    console.error("Audio playback error:", error);
  }
};

export default function App() {
  // Controle de Autenticação do Usuário
  const [loggedUser, setLoggedUser] = useState<Usuario | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('loggedUser');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed;
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });

  // Roles de usuário e Controle de Usuários do Sistema
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [activeUserId, setActiveUserId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('loggedUser');
      if (saved) {
        try {
          return JSON.parse(saved).id;
        } catch (e) {}
      }
    }
    return '';
  });
  const [userRole, setUserRole] = useState<'Coordenador' | 'Operador' | 'Administrador'>('Coordenador');

  // Tema light mode por padrão
  const isDarkMode = false;
  
  // Tab principal ativa
  const [activeTab, setActiveTab] = useState<'dashboard' | 'solicitacoes' | 'notificacoes_email' | 'arquitetura' | 'usuarios'>('dashboard');

  // Dados centrais
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  // Refs para evitar "stale closures" no polling assíncrono (setInterval)
  const solicitacoesRef = useRef<Solicitacao[]>([]);
  const rotasRef = useRef<Rota[]>([]);
  const comunicadosRef = useRef<Comunicado[]>([]);
  const usuariosRef = useRef<Usuario[]>([]);
  const notificacoesRef = useRef<Notificacao[]>([]);
  const isLoadedRef = useRef(false);

  useEffect(() => { solicitacoesRef.current = solicitacoes; }, [solicitacoes]);
  useEffect(() => { rotasRef.current = rotas; }, [rotas]);
  useEffect(() => { comunicadosRef.current = comunicados; }, [comunicados]);
  useEffect(() => { usuariosRef.current = usuarios; }, [usuarios]);
  useEffect(() => { notificacoesRef.current = notificacoes; }, [notificacoes]);

  const fetchAllData = async () => {
    try {
      const fetchJson = async (url: string) => {
        try {
          const res = await fetch(url);
          if (res.ok) {
            return await res.json();
          }
        } catch (e) {
          // Silent fallback or standard debug log to avoid triggering console warning alerts
          console.log(`Fetch to ${url} status: offline/connecting`);
        }
        return null;
      };

      const [soli, eq, rot, com, not, usr] = await Promise.all([
        fetchJson('/api/solicitacoes'),
        fetchJson('/api/equipes'),
        fetchJson('/api/rotas'),
        fetchJson('/api/comunicados'),
        fetchJson('/api/notificacoes'),
        fetchJson('/api/usuarios')
      ]);

      let shouldPlaySound = false;

      if (isLoadedRef.current) {
        // 1. Verificação de Solicitações (Novas ou Alteração de Status)
        if (soli) {
          const filteredSoli = soli.filter((s: any) => s && s.id !== 'TEST-DOC-CLIENT-SDK' && s.status);
          if (filteredSoli.length !== solicitacoesRef.current.length) {
            shouldPlaySound = true;
          } else {
            const currentMap = new Map(solicitacoesRef.current.map((s: any) => [s.id, s.status]));
            for (const s of filteredSoli) {
              if (currentMap.get(s.id) !== s.status) {
                shouldPlaySound = true;
                break;
              }
            }
          }
        }

        // 2. Verificação de Rotas (Novas ou Alteração de Status)
        if (rot && !shouldPlaySound) {
          if (rot.length !== rotasRef.current.length) {
            shouldPlaySound = true;
          } else {
            const currentMap = new Map(rotasRef.current.map((r: any) => [r.id, r.status]));
            for (const r of rot) {
              if (r && currentMap.get(r.id) !== r.status) {
                shouldPlaySound = true;
                break;
              }
            }
          }
        }

        // 3. Verificação de Comunicados (Novos ou Removidos)
        if (com && !shouldPlaySound) {
          if (com.length !== comunicadosRef.current.length) {
            shouldPlaySound = true;
          }
        }

        // 4. Verificação de Usuários (Aprovação ou Mudança de Cargo)
        if (usr && !shouldPlaySound) {
          if (usr.length !== usuariosRef.current.length) {
            shouldPlaySound = true;
          } else {
            const currentMap = new Map(usuariosRef.current.map((u: any) => [u.id, `${u.aprovado}-${u.funcao}`]));
            for (const u of usr) {
              if (u && currentMap.get(u.id) !== `${u.aprovado}-${u.funcao}`) {
                shouldPlaySound = true;
                break;
              }
            }
          }
        }

        // 5. Verificação de Notificações (Novas ou Removidas)
        if (not && !shouldPlaySound) {
          if (not.length !== notificacoesRef.current.length) {
            shouldPlaySound = true;
          }
        }
      }

      if (shouldPlaySound) {
        playNotificationSound();
      }

      if (soli) {
        const filteredSoli = soli.filter((s: any) => s && s.id !== 'TEST-DOC-CLIENT-SDK' && s.status);
        setSolicitacoes(filteredSoli);
      }
      if (eq) setEquipes(eq);
      if (rot) setRotas(rot);
      if (com) setComunicados(com);
      if (not) setNotificacoes(not);
      if (usr) {
        setUsuarios(usr);
      }
    } catch (err) {
      console.log("Erro ao sincronizar dados com o servidor (silenciado):", err);
    } finally {
      setLoading(false);
      isLoadedRef.current = true;
    }
  };

  useEffect(() => {
    fetchAllData();
    // Poll notifications/data periodically (every 5 seconds) to simulate live-sync without heavy WebSockets
    const interval = setInterval(fetchAllData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Sincroniza o usuário ativo com a sessão logada e vice-versa
  useEffect(() => {
    if (!loggedUser) return; // Se não houver usuário logado, não faz login automático nem sincroniza nada!

    if (usuarios.length > 0) {
      // REGRA DE SEGURANÇA: Se o perfil do usuário logado foi removido/excluído do sistema, desconecta-o imediatamente!
      const isLoggedUserStillValid = usuarios.some(u => u.id === loggedUser.id);
      if (!isLoggedUserStillValid) {
        alert('Seu perfil de acesso foi removido do sistema pelo Coordenador. Você será desconectado.');
        handleLogout();
        return;
      }

      const currentUser = usuarios.find(u => u.id === activeUserId);
      if (currentUser) {
        if (userRole !== currentUser.funcao) {
          setUserRole(currentUser.funcao);
        }
        if (JSON.stringify(loggedUser) !== JSON.stringify(currentUser)) {
          setLoggedUser(currentUser);
          localStorage.setItem('loggedUser', JSON.stringify(currentUser));
        }
      } else {
        // Se o usuário ativo selecionado não existe mais mas o logado ainda é válido, reverte para o logado
        setActiveUserId(loggedUser.id);
        setUserRole(loggedUser.funcao);
      }
    }
  }, [activeUserId, usuarios, loggedUser, userRole]);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  useEffect(() => {
    const isAuthHub = !!loggedUser && (
      loggedUser.email.toLowerCase() === 'guimarquesbrito@gmail.com' ||
      loggedUser.email.toLowerCase() === 'odilonbarross@gmail.com'
    );
    if (activeTab === 'usuarios' && userRole !== 'Coordenador' && userRole !== 'Administrador') {
      setActiveTab('dashboard');
    }
    if (activeTab === 'arquitetura' && !isAuthHub) {
      setActiveTab('dashboard');
    }
  }, [userRole, activeTab, loggedUser]);

  const handleLogout = () => {
    setLoggedUser(null);
    localStorage.removeItem('loggedUser');
  };

  // Handlers para Gestão de Usuários (Exclusivo do Coordenador)
  const handleUpdateUserRole = async (id: string, newRole: 'Coordenador' | 'Operador' | 'Administrador') => {
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funcao: newRole })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Erro ao atualizar função do usuário:", err);
    }
  };

  const handleApproveUser = async (id: string, role: 'Coordenador' | 'Operador' | 'Administrador') => {
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aprovado: true, funcao: role })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Erro ao aprovar usuário:", err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Erro ao excluir usuário:", err);
    }
  };

  const handleAddUser = async (newUser: { nome: string; email: string; funcao: 'Coordenador' | 'Operador' | 'Administrador'; setor: string }) => {
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Erro ao adicionar usuário:", err);
    }
  };

  const handleUpdateStatus = async (id: string, novoStatus: StatusSolicitacao, extraPayload?: Partial<Solicitacao>) => {
    try {
      const res = await fetch(`/api/solicitacoes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: novoStatus, 
          usuarioAcao: loggedUser?.nome || "Usuário do Sistema",
          ...extraPayload 
        })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdicionarSolicitacao = async (nova: Partial<Solicitacao>) => {
    try {
      const res = await fetch('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nova,
          usuarioAcao: loggedUser?.nome || "Usuário do Sistema"
        })
      });
      if (res.ok) {
        fetchAllData();
        setActiveTab('solicitacoes');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditarSolicitacao = async (id: string, payload: Partial<Solicitacao>) => {
    try {
      const res = await fetch(`/api/solicitacoes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          usuarioAcao: loggedUser?.nome || "Usuário do Sistema"
        })
      });
      if (res.ok) {
        fetchAllData();
        setActiveTab('solicitacoes');
      }
    } catch (err) {
      console.error("Erro ao editar solicitação:", err);
    }
  };

  const handleLimparSolicitacoes = async () => {
    try {
      const res = await fetch('/api/solicitacoes', {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Erro ao excluir as solicitações:", err);
    }
  };

  const handleExcluirSolicitacao = async (id: string) => {
    try {
      const res = await fetch(`/api/solicitacoes/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Erro ao excluir solicitação:", err);
    }
  };

  const handleCriarRota = async (payload: {
    equipeId: string;
    solicitacoesIds: string[];
    quilometragemEstimada?: number;
  }) => {
    try {
      const res = await fetch('/api/rotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          usuarioAcao: loggedUser?.nome || "Usuário do Sistema"
        })
      });
      if (res.ok) {
        fetchAllData();
        setActiveTab('rotas');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinalizarRota = async (id: string) => {
    try {
      const res = await fetch(`/api/rotas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Finalizada',
          usuarioAcao: loggedUser?.nome || "Usuário do Sistema"
        })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdicionarComunicado = async (payload: { titulo: string; conteudo: string; categoria: string }) => {
    try {
      const res = await fetch('/api/comunicados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          autor: loggedUser?.nome || "Usuário do Sistema"
        })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExcluirComunicado = async (id: string) => {
    try {
      const res = await fetch(`/api/comunicados/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!loggedUser) {
    return (
      <AuthScreen 
        usuarios={usuarios} 
        onLoginSuccess={(u) => { 
          setLoggedUser(u); 
          setActiveUserId(u.id); 
        }} 
        onRefreshUsers={fetchAllData} 
      />
    );
  }

  const isAuthorizedHubUser = !!loggedUser && (
    loggedUser.email.toLowerCase() === 'guimarquesbrito@gmail.com' ||
    loggedUser.email.toLowerCase() === 'odilonbarross@gmail.com'
  );

  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-200 ${
      isDarkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* GLOBAL HEADER */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-850">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="h-9 w-9 sm:h-10 sm:w-10" aria-label="Logo Ministério Público">
                <defs>
                  <linearGradient id="silverGradientHeader" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F8FAFC" />
                    <stop offset="40%" stopColor="#E2E8F0" />
                    <stop offset="70%" stopColor="#CBD5E1" />
                    <stop offset="100%" stopColor="#94A3B8" />
                  </linearGradient>
                  <linearGradient id="flameGradientHeader" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F87171" />
                  </linearGradient>
                </defs>
                <path d="M 15 30 C 15 18, 25 12, 25 25 L 25 55 C 25 67, 15 73, 15 60 Z" fill="url(#silverGradientHeader)" stroke="#1E293B" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M 27 30 C 27 18, 37 12, 37 25 L 37 55 C 37 67, 27 73, 27 60 Z" fill="url(#silverGradientHeader)" stroke="#1E293B" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M 39 30 C 39 18, 49 12, 49 25 L 49 55 C 49 67, 39 73, 39 60 Z" fill="url(#silverGradientHeader)" stroke="#1E293B" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M 51 30 C 51 18, 61 12, 61 25 C 76 22, 88 28, 88 40 C 88 52, 76 58, 61 55 L 61 72 C 61 84, 51 90, 51 77 Z M 61 32 C 70 30, 78 33, 78 40 C 78 47, 70 50, 61 48 Z" fill="url(#silverGradientHeader)" fillRule="evenodd" stroke="#1E293B" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M 65 46 C 62 42, 63 36, 67 33 C 65 37, 68 40, 70 39 C 69 34, 73 30, 75 28 C 76 33, 74 37, 72 40 C 75 37, 79 38, 79 42 C 79 47, 72 48, 65 46 Z" fill="url(#flameGradientHeader)" stroke="#7F1D1D" strokeWidth="0.8" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white truncate">Central Logística CBP</h1>
                <span className="bg-emerald-500/20 text-emerald-400 text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded border border-emerald-500/20 flex-shrink-0 whitespace-nowrap">
                  Ministério Público
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">Coordenação de Patrimônio Material • Logística & Distribuição</p>
            </div>
          </div>

          {/* USER SELECTOR & LOGOUT */}
          <div className="flex items-center gap-2 sm:gap-2.5 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-800 p-1.5 px-2.5 sm:px-3 rounded-xl border border-slate-700/50 text-white min-w-0 flex-1 md:flex-initial">
              <User size={13} className="text-emerald-400 flex-shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline flex-shrink-0">Usuário Ativo:</span>
              
              {loggedUser.email.toLowerCase() === 'guimarquesbrito@gmail.com' ? (
                <select
                  value={activeUserId}
                  onChange={(e) => setActiveUserId(e.target.value)}
                  className="bg-slate-900 text-xs font-semibold rounded-lg px-2 py-1 border border-slate-700 text-slate-200 focus:outline-none cursor-pointer w-full md:w-auto md:max-w-[240px] truncate"
                >
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                      {u.nome} ({u.funcao})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-semibold text-slate-200 px-2 py-1 select-none truncate">
                  {loggedUser.nome} ({loggedUser.funcao})
                </span>
              )}
            </div>

            <div className="flex-shrink-0">
              <PWAInstallButton />
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-red-950/40 hover:text-red-300 border border-slate-700/50 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm hover:border-red-500/20 flex-shrink-0"
              title="Sair do sistema e voltar à tela de login"
            >
              <LogOut size={13} className="text-red-400" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>

        </div>
      </header>

      {/* SUB-NAVBAR TABS */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 flex items-center justify-between">
          <nav className="flex space-x-1 sm:space-x-2 py-1 overflow-x-auto whitespace-nowrap scrollbar-none max-w-full">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs font-semibold tracking-wide border-b-2 transition flex-shrink-0 whitespace-nowrap ${
                activeTab === 'dashboard' 
                  ? 'border-emerald-500 text-emerald-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutDashboard size={14} className="flex-shrink-0" />
              <span className="whitespace-nowrap">Painel Geral</span>
            </button>
            
            <button
              onClick={() => setActiveTab('solicitacoes')}
              className={`flex items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs font-semibold tracking-wide border-b-2 transition flex-shrink-0 whitespace-nowrap ${
                activeTab === 'solicitacoes' 
                  ? 'border-emerald-500 text-emerald-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <ClipboardList size={14} className="flex-shrink-0" />
              <span className="whitespace-nowrap">Tarefas</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'solicitacoes' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {
                  userRole === 'Operador'
                    ? solicitacoes.filter(s => s.status === 'Aprovada' || s.status === 'Planejada' || s.status === 'Em execução').length
                    : solicitacoes.filter(s => s.status && s.status !== 'Concluída' && s.status !== 'Cancelada' && s.id !== 'TEST-DOC-CLIENT-SDK').length
                }
              </span>
            </button>

            {isAuthorizedHubUser && (
              <button
                onClick={() => setActiveTab('arquitetura')}
                className={`flex items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs font-semibold tracking-wide border-b-2 transition flex-shrink-0 whitespace-nowrap ${
                  activeTab === 'arquitetura' 
                    ? 'border-emerald-500 text-emerald-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Database size={14} className="flex-shrink-0" />
                <span className="whitespace-nowrap">Arquitetura Hub</span>
              </button>
            )}

            {(userRole === 'Coordenador' || userRole === 'Administrador') && (
              <button
                onClick={() => setActiveTab('notificacoes_email')}
                className={`flex items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs font-semibold tracking-wide border-b-2 transition flex-shrink-0 whitespace-nowrap ${
                  activeTab === 'notificacoes_email' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mail size={14} className="flex-shrink-0" />
                <span className="whitespace-nowrap">Notificações Outlook</span>
              </button>
            )}

            {(userRole === 'Coordenador' || userRole === 'Administrador') && (
              <button
                onClick={() => setActiveTab('usuarios')}
                className={`flex items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs font-semibold tracking-wide border-b-2 transition flex-shrink-0 whitespace-nowrap ${
                  activeTab === 'usuarios' 
                    ? 'border-emerald-500 text-emerald-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users size={14} className="flex-shrink-0" />
                <span className="whitespace-nowrap">Gestão de Usuários</span>
                {usuarios.filter(u => u.aprovado === false).length > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full animate-pulse leading-none">
                    {usuarios.filter(u => u.aprovado === false).length}
                  </span>
                )}
              </button>
            )}
          </nav>

          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 font-mono">
            <span>Servidor:</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">ONLINE</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <RefreshCw className="animate-spin text-emerald-600" size={32} />
            <p className="text-sm text-gray-500 font-medium">Sincronizando com a Central Logística CBP...</p>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {activeTab === 'dashboard' && (
              <Dashboard
                userRole={userRole}
                solicitacoes={solicitacoes}
                equipes={equipes}
                rotas={rotas}
                comunicados={comunicados}
                notificacoes={notificacoes}
                usuarios={usuarios}
                onApproveUser={handleApproveUser}
                onDeleteUser={handleDeleteUser}
                onAdicionarComunicado={handleAdicionarComunicado}
                onExcluirComunicado={handleExcluirComunicado}
              />
            )}

            {activeTab === 'solicitacoes' && (
              <SolicitationsList
                solicitacoes={solicitacoes}
                userRole={userRole}
                usuarios={usuarios}
                loggedUser={loggedUser}
                onApproveUser={handleApproveUser}
                onDeleteUser={handleDeleteUser}
                onUpdateStatus={handleUpdateStatus}
                onAdicionarSolicitacao={handleAdicionarSolicitacao}
                onEditarSolicitacao={handleEditarSolicitacao}
                onLimparSolicitacoes={handleLimparSolicitacoes}
                onExcluirSolicitacao={handleExcluirSolicitacao}
              />
            )}

            {activeTab === 'arquitetura' && isAuthorizedHubUser && (
              <ArchitectureHub />
            )}

            {activeTab === 'notificacoes_email' && (userRole === 'Coordenador' || userRole === 'Administrador') && (
              <OutlookNotificationHub
                loggedUser={loggedUser}
                onRefreshData={fetchAllData}
              />
            )}

            {activeTab === 'usuarios' && (userRole === 'Coordenador' || userRole === 'Administrador') && (
              <UserManagement
                usuarios={usuarios}
                activeUserId={activeUserId}
                onUpdateUserRole={handleUpdateUserRole}
                onApproveUser={handleApproveUser}
                onDeleteUser={handleDeleteUser}
                onAddUser={handleAddUser}
                userRole={userRole}
              />
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{ color: '#0f172b' }} className="bg-slate-100 border-t border-slate-200 py-6 text-center text-xs flex flex-col items-center justify-center gap-3">
        <div>
          <p>© 2026 Ministério Público - Coordenação de Patrimônio Material. Todos os direitos reservados.</p>
          <p className="mt-1">Governança Patrimonial em conformidade com as diretrizes do CNMP.</p>
        </div>
      </footer>

    </div>
  );
}
