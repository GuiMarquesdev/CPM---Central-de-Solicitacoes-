import React, { useState } from 'react';
import { 
  UserPlus, Shield, ShieldAlert, Trash2, Mail, MapPin, 
  CheckCircle, AlertCircle, RefreshCw, UserCheck, ShieldCheck, Check
} from 'lucide-react';
import { Usuario, capitalizeProperly } from '../types';

interface UserManagementProps {
  usuarios: Usuario[];
  activeUserId: string;
  onUpdateUserRole: (id: string, newRole: 'Coordenador' | 'Operador' | 'Administrador') => Promise<void>;
  onApproveUser: (id: string, role: 'Coordenador' | 'Operador' | 'Administrador') => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onAddUser: (user: { nome: string; email: string; funcao: 'Coordenador' | 'Operador' | 'Administrador'; setor: string; aprovado?: boolean }) => Promise<void>;
  userRole: 'Coordenador' | 'Operador' | 'Administrador';
}

export default function UserManagement({
  usuarios,
  activeUserId,
  onUpdateUserRole,
  onApproveUser,
  onDeleteUser,
  onAddUser,
  userRole
}: UserManagementProps) {
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoSetor, setNovoSetor] = useState('Coordenação de Patrimônio Material');
  const [novaFuncao, setNovaFuncao] = useState<'Coordenador' | 'Operador' | 'Administrador'>('Operador');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: string; nome: string } | null>(null);
  
  // Controle de funções temporárias escolhidas para usuários pendentes antes da aprovação
  const [pendingRoles, setPendingRoles] = useState<Record<string, 'Coordenador' | 'Operador' | 'Administrador'>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome || !novoEmail || !novoSetor) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      
      const formattedNome = capitalizeProperly(novoNome);
      const formattedSetor = capitalizeProperly(novoSetor);
      const formattedEmail = novoEmail.toLowerCase().trim();

      // Criado pelo coordenador já vai como aprovado
      await onAddUser({
        nome: formattedNome,
        email: formattedEmail,
        funcao: novaFuncao,
        setor: formattedSetor,
        aprovado: true
      });
      setSuccessMsg(`Usuário "${formattedNome}" cadastrado e ativado com sucesso!`);
      setNovoNome('');
      setNovoEmail('');
      setNovoSetor('');
      setNovaFuncao('Operador');
      setFormAberto(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg('Erro ao cadastrar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (id: string, value: 'Coordenador' | 'Operador' | 'Administrador') => {
    try {
      await onUpdateUserRole(id, value);
      setSuccessMsg('Função do usuário atualizada com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg('Erro ao atualizar função do usuário.');
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  const handleApproveClick = async (id: string, nome: string) => {
    const role = pendingRoles[id] || 'Operador';
    try {
      await onApproveUser(id, role);
      setSuccessMsg(`Perfil de "${nome}" aprovado e liberado como "${role}"!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg('Erro ao aprovar o acesso do usuário.');
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  const handleDeleteClick = (id: string, nome: string) => {
    if (id === activeUserId) {
      setErrorMsg('Você não pode excluir o seu próprio perfil ativo!');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    setUserToDelete({ id, nome });
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await onDeleteUser(userToDelete.id);
      setSuccessMsg(`Perfil de "${userToDelete.nome}" excluído com sucesso.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg('Erro ao excluir o perfil.');
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setUserToDelete(null);
    }
  };

  // Se o usuário atual não for Coordenador nem Administrador, mostre acesso negado
  if (userRole !== 'Coordenador' && userRole !== 'Administrador') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-xl mx-auto my-12 shadow-sm">
        <div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
          <ShieldAlert size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Acesso Restrito ao Coordenador e Administrador</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          Apenas usuários com o perfil de <strong>Coordenador</strong> ou <strong>Administrador</strong> têm permissão para acessar o painel de gerenciamento de perfis, alterar atribuições de funções ou aprovar novos acessos do sistema.
        </p>
      </div>
    );
  }

  // Filtragem de aprovados e pendentes
  const usuariosPendentes = usuarios.filter(u => u.aprovado === false);
  const usuariosAtivos = usuarios.filter(u => u.aprovado !== false);

  return (
    <div className="space-y-6">
      {/* HEADER DA ABA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Controle de Perfis & Acessos</h2>
            <p className="text-xs text-slate-500">Aprovação de solicitações de novos perfis e atribuição de papéis do sistema.</p>
          </div>
        </div>

        <button
          onClick={() => setFormAberto(!formAberto)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <UserPlus size={15} />
          {formAberto ? 'Fechar Formulário' : 'Novo Perfil Direto'}
        </button>
      </div>

      {/* FEEDBACKS DE STATUS */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl text-xs flex items-center gap-2.5 animate-fade-in">
          <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-xl text-xs flex items-center gap-2.5 animate-fade-in">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* FORMULÁRIO DE CADASTRO DE NOVO USUÁRIO */}
      {formAberto && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-2">
            <UserPlus size={16} className="text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Criar Novo Perfil de Usuário Direto</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo</label>
              <input
                type="text"
                placeholder="Ex: Dr. Ricardo Almeida"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail Institucional</label>
              <input
                type="email"
                placeholder="Ex: ricardo.almeida@mprs.mp.br"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unidade / Setor de Lotação</label>
              <input
                type="text"
                placeholder="Ex: Coordenação de Patrimônio Material"
                value={novoSetor}
                onChange={(e) => setNovoSetor(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Função / Perfil de Sistema</label>
              <select
                value={novaFuncao}
                onChange={(e) => setNovaFuncao(e.target.value as any)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
              >
                <option value="Operador">Operador (Execução Logística)</option>
                <option value="Administrador">Administrador (Controle & Homologação)</option>
                {userRole === 'Coordenador' && (
                  <option value="Coordenador">Coordenador (Gestor Total)</option>
                )}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setFormAberto(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar & Ativar Perfil'}
            </button>
          </div>
        </form>
      )}

      {/* SEÇÃO 1: SOLICITAÇÕES DE ACESSO PENDENTES */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-1">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Solicitações de Acesso Pendentes ({usuariosPendentes.length})
          </h3>
          {usuariosPendentes.length > 0 && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
          )}
        </div>

        {usuariosPendentes.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 text-center text-xs text-slate-400 font-medium">
            Nenhuma solicitação de acesso aguardando homologação no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {usuariosPendentes.map((usr) => {
              const currentRole = pendingRoles[usr.id] || 'Operador';
              const initials = usr.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
              
              return (
                <div 
                  key={usr.id}
                  className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fade-in"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-700 font-bold text-xs flex items-center justify-center border border-amber-500/20">
                      {initials}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{usr.nome}</span>
                        <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                          Aguardando
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Mail size={12} /> {usr.email}</span>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {usr.setor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Atribuir Função:</span>
                      <select
                        value={currentRole}
                        onChange={(e) => setPendingRoles({
                          ...pendingRoles,
                          [usr.id]: e.target.value as any
                        })}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="Operador">Operador (Logística)</option>
                        <option value="Administrador">Administrador (Controle)</option>
                        {userRole === 'Coordenador' && (
                          <option value="Coordenador">Coordenador (Gestor)</option>
                        )}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApproveClick(usr.id, usr.nome)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
                    >
                      <Check size={14} />
                      Aprovar & Ativar
                    </button>

                    {userRole === 'Coordenador' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(usr.id, usr.nome)}
                        className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-100 cursor-pointer"
                        title="Rejeitar solicitação"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEÇÃO 2: PERFIS ATIVOS E HOMOLOGADOS */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center gap-2 pb-1">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Perfis Ativos & Homologados ({usuariosAtivos.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {usuariosAtivos.map((usr) => {
            const isSelf = usr.id === activeUserId;
            const initials = usr.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            return (
              <div 
                key={usr.id} 
                className={`bg-white rounded-2xl border p-5 flex flex-col justify-between gap-4 shadow-sm transition-all hover:shadow-md ${
                  isSelf ? 'border-emerald-400 ring-1 ring-emerald-400/20 bg-emerald-50/5' : 'border-slate-200/80'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Avatar */}
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm text-white ${
                    usr.funcao === 'Coordenador' 
                      ? 'bg-emerald-500' 
                      : usr.funcao === 'Administrador' 
                        ? 'bg-blue-500' 
                        : 'bg-indigo-500'
                  }`}>
                    {initials}
                  </div>

                  <div className="space-y-1 min-w-0 flex-grow">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm truncate">{usr.nome}</span>
                      {isSelf && (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] px-1.5 py-0.5 rounded-md font-semibold">
                          Você
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                      <Mail size={13} className="text-slate-400 flex-shrink-0" />
                      <span>{usr.email}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                      <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                      <span>{usr.setor}</span>
                    </div>
                  </div>
                </div>

                {/* Ações de Coordenação para o Perfil */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4 mt-1">
                  <div className="flex items-center gap-2 flex-grow">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Função:</span>
                    
                    {/* Seletor de Função para o Coordenador alterar as funções quantas vezes quiser */}
                    <select
                      value={usr.funcao}
                      disabled={usr.funcao === 'Coordenador' && userRole === 'Administrador'}
                      onChange={(e) => handleRoleChange(usr.id, e.target.value as any)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[150px] ${
                        usr.funcao === 'Coordenador' && userRole === 'Administrador' ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                      }`}
                    >
                      <option value="Operador">Operador</option>
                      <option value="Administrador">Administrador</option>
                      {userRole === 'Coordenador' && (
                        <option value="Coordenador">Coordenador</option>
                      )}
                    </select>
                  </div>

                  {/* Botão de Excluir Perfil */}
                  {userRole === 'Coordenador' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(usr.id, usr.nome)}
                      disabled={isSelf}
                      title={isSelf ? 'Você não pode se excluir' : 'Excluir este perfil permanentemente'}
                      className={`p-2 rounded-lg transition-all ${
                        isSelf 
                          ? 'text-slate-300 bg-slate-50 cursor-not-allowed' 
                          : 'text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-100 cursor-pointer'
                      }`}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4 text-center">
            <div className="h-12 w-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center border border-red-100 mx-auto">
              <Trash2 size={22} />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-800">Excluir Perfil</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tem certeza de que deseja remover permanentemente o perfil de <strong className="text-slate-800">{userToDelete.nome}</strong>? Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
