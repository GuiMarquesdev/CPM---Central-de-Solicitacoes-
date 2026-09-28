import React, { useState } from 'react';
import { 
  Layers, ShieldCheck, Mail, Lock, User, MapPin, 
  ArrowRight, ShieldAlert, CheckCircle2, RefreshCw, LogOut, Info,
  Eye, EyeOff
} from 'lucide-react';
import { Usuario, capitalizeProperly } from '../types';

interface AuthScreenProps {
  usuarios: Usuario[];
  onLoginSuccess: (user: Usuario) => void;
  onRefreshUsers: () => Promise<void>;
}

export default function AuthScreen({ usuarios, onLoginSuccess, onRefreshUsers }: AuthScreenProps) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  
  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Register states
  const [regNome, setRegNome] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSetor, setRegSetor] = useState('Coordenação de Patrimônio Material');
  const [regSenha, setRegSenha] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Pending user state (after successful registration, or when logging in as pending)
  const [pendingUser, setPendingUser] = useState<Usuario | null>(null);
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginEmail || !loginSenha) {
      setLoginError('Preencha todos os campos.');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, senha: loginSenha })
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Erro na autenticação.');
        return;
      }

      const user: Usuario = data.user;
      
      // Se não for aprovado, impede o login e mostra tela de pendente
      if (!user.aprovado) {
        setPendingUser(user);
        return;
      }

      onLoginSuccess(user);
    } catch (err) {
      setLoginError('Não foi possível conectar ao servidor de autenticação.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regNome || !regEmail || !regSetor || !regSenha) {
      setRegError('Todos os campos são obrigatórios.');
      return;
    }

    try {
      const formattedNome = capitalizeProperly(regNome);
      const formattedSetor = capitalizeProperly(regSetor);
      const formattedEmail = regEmail.toLowerCase().trim();

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formattedNome,
          email: formattedEmail,
          setor: formattedSetor,
          senha: regSenha
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || 'Erro ao realizar o cadastro.');
        return;
      }

      setRegSuccess(true);
      setPendingUser(data.user);
      
      // Sincroniza a lista de usuários no App.tsx
      await onRefreshUsers();

      // Limpa formulário
      setRegNome('');
      setRegEmail('');
      setRegSetor('');
      setRegSenha('');
    } catch (err) {
      setRegError('Não foi possível conectar ao servidor para registrar.');
    }
  };

  // Verifica se o usuário pendente já foi aprovado pelo coordenador
  const handleCheckApproval = async () => {
    if (!pendingUser) return;
    try {
      setIsCheckingApproval(true);
      await onRefreshUsers();
      
      const res = await fetch('/api/usuarios');
      if (res.ok) {
        const usersList: Usuario[] = await res.json();
        const updated = usersList.find(u => u.id === pendingUser.id);
        if (updated) {
          if (updated.aprovado) {
            onLoginSuccess(updated);
          } else {
            // Ainda pendente
            setPendingUser(updated);
            setApprovalNotice('Seu perfil ainda está sob análise. Aguarde a aprovação do Coordenador.');
          }
        } else {
          // Solicitação foi removida ou rejeitada pelo Coordenador
          setPendingUser(null);
          setLoginError('Sua solicitação de cadastro foi rejeitada ou excluída pelo Coordenador.');
        }
      }
    } catch (err) {
      console.error(err);
      setApprovalNotice('Erro ao consultar status no servidor. Tente novamente em alguns instantes.');
    } finally {
      setIsCheckingApproval(false);
    }
  };

  // Se o usuário está cadastrado mas pendente de aprovação
  if (pendingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-3 sm:p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl p-5 sm:p-8 space-y-5 sm:space-y-6 text-center animate-fade-in">
          <div className="h-16 w-16 sm:h-20 sm:w-20 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert size={32} className="animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">Acesso em Análise</h2>
            <div className="bg-slate-50 text-slate-700 px-3.5 py-3 rounded-xl border border-slate-100 text-xs text-left space-y-1.5 font-medium">
              <p><strong className="text-slate-500">Usuário:</strong> {pendingUser.nome}</p>
              <p><strong className="text-slate-500">E-mail:</strong> {pendingUser.email}</p>
              <p><strong className="text-slate-500">Lotação:</strong> {pendingUser.setor}</p>
              <div className="pt-2 border-t border-slate-200/60 mt-2 flex items-center gap-1.5 text-[10px] text-amber-700">
                <Info size={12} className="flex-shrink-0" />
                <span>Regra de Negócio: Depende de aprovação e definição de perfil por um Coordenador.</span>
              </div>
            </div>
          </div>

          {approvalNotice && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold animate-fade-in">
              {approvalNotice}
            </div>
          )}

          <p className="text-xs text-slate-500 leading-relaxed">
            Seu cadastro foi realizado com sucesso, porém o acesso às telas do sistema está **bloqueado** até que o Coordenador aprove e atribua a sua função de privilégio.
          </p>

          <div className="space-y-3 pt-2">
            <button
              onClick={handleCheckApproval}
              disabled={isCheckingApproval}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={15} className={isCheckingApproval ? 'animate-spin' : ''} />
              {isCheckingApproval ? 'Verificando...' : 'Verificar se fui aprovado'}
            </button>

            <button
              onClick={() => {
                setPendingUser(null);
                setRegSuccess(false);
                setIsLoginTab(true);
                setApprovalNotice(null);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <LogOut size={14} />
              Voltar para o Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 font-sans">
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden flex flex-col">
          
          {/* Header Visual */}
          <div className="bg-slate-900 text-white p-8 text-center space-y-3 relative border-b border-slate-800">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30 text-emerald-400 mx-auto shadow-inner">
              <Layers size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Central Logística CBP</h1>
              <p className="text-[11px] text-slate-400">Ministério Público do Estado do Rio Grande do Sul</p>
            </div>
            
            {/* Abas de Login vs Cadastro */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800/80 max-w-[280px] mx-auto mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsLoginTab(true);
                  setLoginError(null);
                  setRegError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                  isLoginTab 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Acessar Conta
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLoginTab(false);
                  setLoginError(null);
                  setRegError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                  !isLoginTab 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cadastrar-se
              </button>
            </div>
          </div>

          <div className="p-8">
            {/* TAB LOGIN */}
            {isLoginTab ? (
              <form onSubmit={handleLoginSubmit} className="space-y-5 animate-fade-in">
                {loginError && (
                  <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-xl text-xs flex items-center gap-2.5">
                    <ShieldAlert size={16} className="text-red-600 flex-shrink-0" />
                    <span className="font-medium">{loginError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">E-mail Institucional</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        placeholder="nome.sobrenome@mprs.mp.br"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Senha de Acesso</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="Sua senha"
                        value={loginSenha}
                        onChange={(e) => setLoginSenha(e.target.value)}
                        className="w-full text-xs pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1"
                        title={showLoginPassword ? "Ocultar senha" : "Visualizar senha"}
                      >
                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer font-bold"
                >
                  Entrar no Sistema
                  <ArrowRight size={14} />
                </button>




              </form>
            ) : (
              /* TAB REGISTRO */
              <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-fade-in">
                {regError && (
                  <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-xl text-xs flex items-center gap-2.5">
                    <ShieldAlert size={16} className="text-red-600 flex-shrink-0" />
                    <span className="font-medium">{regError}</span>
                  </div>
                )}

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ex: Dra. Patrícia Medeiros"
                        value={regNome}
                        onChange={(e) => setRegNome(e.target.value)}
                        className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail Institucional</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        placeholder="patricia.medeiros@mprs.mp.br"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Unidade / Setor de Lotação</label>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ex: Coordenação de Patrimônio Material"
                        value={regSetor}
                        onChange={(e) => setRegSetor(e.target.value)}
                        className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Senha de Acesso</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="Crie sua senha de acesso"
                        value={regSenha}
                        onChange={(e) => setRegSenha(e.target.value)}
                        className="w-full text-xs pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1"
                        title={showRegisterPassword ? "Ocultar senha" : "Visualizar senha"}
                      >
                        {showRegisterPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-[10px] flex gap-2 items-start mt-1">
                  <ShieldCheck size={14} className="text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
                  <p className="leading-relaxed">
                    <strong>Regra do Sistema:</strong> Ao cadastrar-se, seu perfil será salvo como **pendente** e só obterá acesso após o Coordenador aprovar e definir sua atribuição.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer font-bold"
                >
                  Registrar Perfil
                  <ArrowRight size={14} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="py-4 text-center text-[10px] text-slate-400">
        Sistema Integrado de Logística e Gestão de Patrimônio CBP • Ministério Público do Rio Grande do Sul
      </div>
    </div>
  );
}
