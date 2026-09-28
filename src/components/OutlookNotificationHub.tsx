import React, { useState, useEffect } from 'react';
import { 
  Mail, Send, CheckCircle2, AlertCircle, RefreshCw, Server, 
  ShieldCheck, Eye, Trash2, Sliders, BellRing, UserCheck, 
  ExternalLink, Key, HelpCircle, ArrowRight, X, Clock, Inbox
} from 'lucide-react';
import { EmailConfig, EmailLog, Usuario } from '../types';

interface OutlookNotificationHubProps {
  loggedUser?: Usuario | null;
  onRefreshData?: () => void;
}

export default function OutlookNotificationHub({ loggedUser, onRefreshData }: OutlookNotificationHubProps) {
  const [config, setConfig] = useState<EmailConfig>({
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    smtpSecure: false,
    senderName: 'Central Logística CBP - Coordenação de Patrimônio',
    senderEmail: 'central.logistica@mprs.mp.br',
    destinatarios: ['guilherme.brito.ter@mpba.mp.br'],
    ativo: true,
    notificarNovasDemandas: true,
    notificarMudancaStatus: true,
    notificarOcorrenciasUrgentes: true,
    notificarAtividadeIniciada: true,
    notificarAtividadeParadaSemana: true,
    diasAtividadeParada: 7,
    notificarLembreteAcesso: true,
    lembreteAcessoSiteDias: 4,
    modoEnvio: 'outlook_m365'
  });

  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clearingLogs, setClearingLogs] = useState(false);

  // Verification & Reminder States
  const [verifyingParadas, setVerifyingParadas] = useState(false);
  const [paradasResult, setParadasResult] = useState<{ success: boolean; notificadas: number; detalhes: string[]; error?: string } | null>(null);

  const [sendingLembreteAcesso, setSendingLembreteAcesso] = useState(false);
  const [lembreteAcessoResult, setLembreteAcessoResult] = useState<{ success: boolean; enviado: boolean; motivo?: string; totalDestinatarios?: number } | null>(null);

  // Test Email state (Outlook / Corporativo)
  const defaultTestEmail = (loggedUser?.email && !loggedUser.email.toLowerCase().endsWith('@gmail.com') && !loggedUser.email.toLowerCase().endsWith('@googlemail.com'))
    ? loggedUser.email
    : 'guilherme.brito.ter@mpba.mp.br';
  const [testEmailAddress, setTestEmailAddress] = useState(defaultTestEmail);
  const [testingSend, setTestingSend] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; status?: string } | null>(null);

  // New recipient input state
  const [newRecipient, setNewRecipient] = useState('');

  // Password edit state
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  // Preview Email modal state
  const [previewEmail, setPreviewEmail] = useState<EmailLog | null>(null);

  // Active Tab
  const [hubTab, setHubTab] = useState<'config' | 'logs' | 'guide'>('config');

  const fetchEmailData = async () => {
    try {
      setLoading(true);
      const [resConfig, resLogs] = await Promise.all([
        fetch('/api/email/config'),
        fetch('/api/email/logs')
      ]);

      if (resConfig.ok) {
        const data = await resConfig.json();
        setConfig(data);
      }
      if (resLogs.ok) {
        const dataLogs = await resLogs.json();
        setLogs(dataLogs);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do serviço de e-mail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailData();
  }, []);

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const payload: Partial<EmailConfig> = {
        ...config,
        ...(newPassword ? { smtpPass: newPassword } : {})
      };

      const res = await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Falha ao salvar as configurações.');

      const data = await res.json();
      setConfig(data.config);
      setNewPassword('');
      setShowPasswordInput(false);
      setSuccessMsg('Configurações do Outlook salvas e ativadas com sucesso!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmailAddress.trim()) {
      setErrorMsg('Por favor informe um endereço de e-mail para o teste.');
      return;
    }
    const cleanTarget = testEmailAddress.trim().toLowerCase();
    if (cleanTarget.endsWith('@gmail.com') || cleanTarget.endsWith('@googlemail.com')) {
      setErrorMsg('Envios para contas Gmail foram desativados por solicitação. Utilize uma conta corporativa / Outlook (ex: guilherme.brito.ter@mpba.mp.br).');
      return;
    }
    try {
      setTestingSend(true);
      setTestResult(null);
      setErrorMsg(null);

      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanTarget })
      });

      const data = await res.json();
      setTestResult(data);
      // Refresh logs to show this test email immediately
      const logsRes = await fetch('/api/email/logs');
      if (logsRes.ok) {
        const updatedLogs = await logsRes.json();
        setLogs(updatedLogs);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erro ao disparar e-mail de teste.'
      });
    } finally {
      setTestingSend(false);
    }
  };

  const handleAddRecipient = () => {
    const clean = newRecipient.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setErrorMsg('Informe um endereço de e-mail válido.');
      setTimeout(() => setErrorMsg(null), 3500);
      return;
    }
    if (clean.endsWith('@gmail.com') || clean.endsWith('@googlemail.com')) {
      setErrorMsg('O envio para contas Gmail foi desativado. Cadastre apenas e-mails do Outlook ou institucionais (ex: @mpba.mp.br, @outlook.com).');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    if (config.destinatarios.includes(clean)) {
      setErrorMsg('Este e-mail já está na lista.');
      setTimeout(() => setErrorMsg(null), 3500);
      return;
    }
    setConfig({
      ...config,
      destinatarios: [...config.destinatarios, clean]
    });
    setNewRecipient('');
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    setConfig({
      ...config,
      destinatarios: config.destinatarios.filter(e => e !== emailToRemove)
    });
  };

  const handleClearLogs = async () => {
    try {
      setClearingLogs(true);
      setErrorMsg(null);
      const res = await fetch('/api/email/logs', { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
        setSuccessMsg('Histórico de e-mails limpo com sucesso.');
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setErrorMsg('Erro ao tentar limpar o histórico de e-mails no servidor.');
      }
    } catch (err: any) {
      console.error('Erro ao limpar histórico:', err);
      setErrorMsg('Erro de conexão ao tentar limpar o histórico.');
    } finally {
      setClearingLogs(false);
    }
  };

  const handleVerificarParadas = async () => {
    try {
      setVerifyingParadas(true);
      setParadasResult(null);
      const res = await fetch('/api/email/verificar-paradas', { method: 'POST' });
      const data = await res.json();
      setParadasResult(data);
      const logsRes = await fetch('/api/email/logs');
      if (logsRes.ok) setLogs(await logsRes.json());
    } catch (err: any) {
      setParadasResult({ success: false, notificadas: 0, detalhes: [], error: err.message });
    } finally {
      setVerifyingParadas(false);
    }
  };

  const handleDispararLembreteAcesso = async () => {
    try {
      setSendingLembreteAcesso(true);
      setLembreteAcessoResult(null);
      const res = await fetch('/api/email/disparar-lembrete-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forcar: true })
      });
      const data = await res.json();
      setLembreteAcessoResult(data);
      const logsRes = await fetch('/api/email/logs');
      if (logsRes.ok) setLogs(await logsRes.json());
    } catch (err: any) {
      setLembreteAcessoResult({ success: false, enviado: false, motivo: err.message });
    } finally {
      setSendingLembreteAcesso(false);
    }
  };

  const applyOffice365Preset = () => {
    setConfig({
      ...config,
      smtpHost: 'smtp.office365.com',
      smtpPort: 587,
      smtpSecure: false,
      modoEnvio: 'outlook_m365'
    });
  };

  const applyGmailPreset = () => {
    setConfig({
      ...config,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpSecure: false,
      modoEnvio: 'smtp_personalizado'
    });
  };

  return (
    <div className="space-y-6">
      
      {/* TOP BANNER & STATS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 text-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                <Mail size={22} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                Integração Direta Microsoft Outlook
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Notificações de Tarefas no Outlook
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Disparo automático de e-mails estruturados para a <strong>Coordenação de Patrimônio Material</strong> e operadores, sem depender de Power Automate ou regras manuais.
            </p>
          </div>

          {/* Quick status pill */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/60 p-3.5 px-4 rounded-xl flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${config.ativo ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Status do Serviço</div>
                <div className="text-xs font-bold text-white">
                  {config.ativo ? (config.hasCustomPassword ? 'Conectado (Envio Real)' : 'Modo Demonstração / Auditoria') : 'Desativado'}
                </div>
              </div>
            </div>

            <button
              onClick={fetchEmailData}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 px-3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Atualizar dados"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Sincronizar</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Destinatários Ativos</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{config.destinatarios.length} contas</div>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">E-mails Gerados</div>
            <div className="text-lg font-bold text-blue-400 mt-0.5">{logs.length} disparos</div>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Servidor SMTP</div>
            <div className="text-xs font-bold text-slate-200 mt-1 truncate" title={config.smtpHost}>
              {config.smtpHost}:{config.smtpPort}
            </div>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Novas Demandas</div>
            <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} />
              <span>Alerta Automático Ativo</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 overflow-x-auto whitespace-nowrap scrollbar-none max-w-full pb-0.5">
        <button
          onClick={() => setHubTab('config')}
          className={`flex items-center gap-2 pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition cursor-pointer flex-shrink-0 ${
            hubTab === 'config'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sliders size={15} />
          Configurações do Outlook & SMTP
        </button>

        <button
          onClick={() => setHubTab('logs')}
          className={`flex items-center gap-2 pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition cursor-pointer flex-shrink-0 ${
            hubTab === 'logs'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Inbox size={15} />
          Histórico de Envios & Auditoria
          {logs.length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {logs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setHubTab('guide')}
          className={`flex items-center gap-2 pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition cursor-pointer flex-shrink-0 ${
            hubTab === 'guide'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <HelpCircle size={15} />
          Instruções & Ajuda
        </button>
      </div>

      {/* ALERTS */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: CONFIGURAÇÃO */}
      {hubTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUNA ESQUERDA: FORMULÁRIO DE CONFIGURAÇÃO */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveConfig} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Server size={18} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    Parâmetros do Servidor de Envio (SMTP)
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={applyOffice365Preset}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
                  >
                    Preset Microsoft 365 / Outlook
                  </button>
                </div>
              </div>

              {/* Informative banner about real delivery vs simulation */}
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs space-y-1 text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
                  <span>Por que o e-mail não chega diretamente na caixa sem autenticação?</span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  Para proteger contra fraudes e spam, os servidores de correio (Gmail, Microsoft 365, MPRS) <strong>rejeitam sumariamente</strong> qualquer e-mail enviado pela internet se o remetente não autenticar com <strong>Usuário e Senha/Senha de App</strong>.
                  Enquanto a senha não for preenchida, o sistema opera em <em>Modo de Demonstração e Auditoria</em> (você pode ver o e-mail completo na aba <em>Histórico</em>). Para receber na sua caixa física real, informe seu login e senha de aplicativo abaixo!
                </p>
              </div>

              {/* Status geral do serviço */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">Ativar envio de e-mails para o Outlook</div>
                  <div className="text-[11px] text-slate-500">Habilita ou suspende temporariamente os disparos automáticos.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.ativo}
                    onChange={(e) => setConfig({ ...config, ativo: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Servidor e Porta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                    Servidor SMTP (Host)
                  </label>
                  <input
                    type="text"
                    value={config.smtpHost}
                    onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                    placeholder="smtp.office365.com"
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Padrão Outlook M365: <code>smtp.office365.com</code></p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                    Porta
                  </label>
                  <input
                    type="number"
                    value={config.smtpPort}
                    onChange={(e) => setConfig({ ...config, smtpPort: parseInt(e.target.value, 10) || 587 })}
                    placeholder="587"
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400">587 (STARTTLS)</p>
                </div>
              </div>

              {/* Usuário e Senha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                    Usuário / E-mail de Envio (Login Outlook)
                  </label>
                  <input
                    type="text"
                    value={config.smtpUser}
                    onChange={(e) => setConfig({ ...config, smtpUser: e.target.value })}
                    placeholder="ex: central.logistica@mprs.mp.br"
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                      Senha / Senha de Aplicativo
                    </label>
                    {config.hasCustomPassword && !showPasswordInput && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Salva
                      </span>
                    )}
                  </div>

                  {showPasswordInput || !config.hasCustomPassword ? (
                    <div className="relative">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={config.hasCustomPassword ? "Digite a nova senha..." : "Senha de app do Microsoft 365"}
                        className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <span className="text-xs font-mono text-slate-500">••••••••••••</span>
                      <button
                        type="button"
                        onClick={() => setShowPasswordInput(true)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Alterar senha
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400">Recomendado: Senha de aplicativo gerada na conta Microsoft.</p>
                </div>
              </div>

              {/* Nome e E-mail de Exibição */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                    Nome de Exibição do Remetente
                  </label>
                  <input
                    type="text"
                    value={config.senderName}
                    onChange={(e) => setConfig({ ...config, senderName: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                    E-mail do Remetente (From Header)
                  </label>
                  <input
                    type="email"
                    value={config.senderEmail}
                    onChange={(e) => setConfig({ ...config, senderEmail: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* DESTINATÁRIOS FIXOS */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                    Contas de Notificação no Outlook / Institucional
                  </label>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    (Gmail desativado)
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Todas as demandas criadas no sistema serão enviadas exclusivamente para os endereços Outlook/institucionais abaixo:
                </p>

                {/* Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {config.destinatarios.map((dest) => (
                    <span 
                      key={dest} 
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-800"
                    >
                      <Mail size={12} className="text-blue-500" />
                      {dest}
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(dest)}
                        className="text-blue-400 hover:text-red-500 transition cursor-pointer ml-1"
                        title="Remover destinatário"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add new recipient */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="email"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddRecipient(); } }}
                    placeholder="ex: guilherme.brito.ter@mpba.mp.br ou setor@mpba.mp.br"
                    className="flex-grow text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddRecipient}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* GATILHOS DE DISPARO E REGRAS DE ENVIO */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Regras e Gatilhos de Envio de E-mails
                  </label>
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                    Gatilhos Automáticos
                  </span>
                </div>

                <div className="space-y-3">
                  {/* 1. Atividade Iniciada */}
                  <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/70 space-y-1.5 transition-colors">
                    <label className="flex items-center gap-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={config.notificarAtividadeIniciada}
                        onChange={(e) => setConfig({ ...config, notificarAtividadeIniciada: e.target.checked })}
                        className="rounded text-slate-700 dark:text-slate-300 focus:ring-slate-500 border-slate-300 dark:border-slate-600"
                      />
                      <span className="flex items-center gap-2">
                        <Send size={14} className="text-slate-600 dark:text-slate-400 flex-shrink-0" />
                        <span><strong>Início de Atividades:</strong> Enviar e-mail imediatamente sempre que uma atividade for iniciada / colocada em execução.</span>
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                      Alerta a equipe operacional, solicitante e coordenação com detalhes da rota, equipe alocada e bens a movimentar.
                    </p>
                  </div>

                  {/* 2. Atividades Paradas há mais de 1 semana */}
                  <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/70 space-y-2 transition-colors">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="flex items-center gap-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer font-semibold">
                        <input
                          type="checkbox"
                          checked={config.notificarAtividadeParadaSemana}
                          onChange={(e) => setConfig({ ...config, notificarAtividadeParadaSemana: e.target.checked })}
                          className="rounded text-slate-700 dark:text-slate-300 focus:ring-slate-500 border-slate-300 dark:border-slate-600"
                        />
                        <span className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-600 dark:text-slate-400 flex-shrink-0" />
                          <span><strong>Cobrança de Atividades Paradas (+1 semana):</strong> Relembrar responsáveis sobre tarefas paradas sem conclusão.</span>
                        </span>
                      </label>
                      <div className="flex items-center gap-1.5 pl-6 sm:pl-0 text-xs text-slate-600 dark:text-slate-300">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Limite de dias:</span>
                        <input
                          type="number"
                          min="1"
                          max="90"
                          value={config.diasAtividadeParada || 7}
                          onChange={(e) => setConfig({ ...config, diasAtividadeParada: parseInt(e.target.value, 10) || 7 })}
                          className="w-14 text-center font-semibold text-xs py-1 px-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                        />
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">dias</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                      Identifica chamados abertos ou em andamento sem movimentação há 7 dias ou mais e dispara um e-mail de alerta de cobrança com botão de acesso direto.
                    </p>
                  </div>

                  {/* 3. Lembrete de Uso do Site a cada 4 dias */}
                  <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/70 space-y-2 transition-colors">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="flex items-center gap-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer font-semibold">
                        <input
                          type="checkbox"
                          checked={config.notificarLembreteAcesso}
                          onChange={(e) => setConfig({ ...config, notificarLembreteAcesso: e.target.checked })}
                          className="rounded text-slate-700 dark:text-slate-300 focus:ring-slate-500 border-slate-300 dark:border-slate-600"
                        />
                        <span className="flex items-center gap-2">
                          <BellRing size={14} className="text-slate-600 dark:text-slate-400 flex-shrink-0" />
                          <span><strong>Lembrete de Uso do Site (A cada 4 dias):</strong> Enviar resumo com link incentivando o uso do portal.</span>
                        </span>
                      </label>
                      <div className="flex items-center gap-1.5 pl-6 sm:pl-0 text-xs text-slate-600 dark:text-slate-300">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Frequência: a cada</span>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={config.lembreteAcessoSiteDias || 4}
                          onChange={(e) => setConfig({ ...config, lembreteAcessoSiteDias: parseInt(e.target.value, 10) || 4 })}
                          className="w-14 text-center font-semibold text-xs py-1 px-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                        />
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">dias</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                      Dispara periodicamente aos servidores cadastrados com indicadores do sistema (demandas abertas, em execução e dicas operacionais).
                    </p>
                  </div>

                  {/* 4. Demais notificações */}
                  <div className="pt-1 space-y-2 pl-1">
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.notificarNovasDemandas}
                        onChange={(e) => setConfig({ ...config, notificarNovasDemandas: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span><strong>Novas Demandas Criadas:</strong> Notificar no momento exato em que um solicitante cadastra um chamado.</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.notificarMudancaStatus}
                        onChange={(e) => setConfig({ ...config, notificarMudancaStatus: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span><strong>Conclusões e Homologações:</strong> Notificar quando um chamado for homologado ou finalizado.</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.notificarOcorrenciasUrgentes}
                        onChange={(e) => setConfig({ ...config, notificarOcorrenciasUrgentes: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span><strong>Ocorrências Patrimoniais:</strong> Destacar avarias, consertos e garantias técnicas de equipamentos.</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm flex items-center gap-2"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>{saving ? 'Salvando...' : 'Salvar e Aplicar Configurações'}</span>
                </button>
              </div>

            </form>
          </div>

          {/* COLUNA DIREITA: TESTE IMEDIATO & GUIA RÁPIDO */}
          <div className="space-y-6">
            
            {/* CARD DE DISPARO DE TESTE */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-800 dark:text-white">
                <Send size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold">Testar Envio no Outlook</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dispare um e-mail de demonstração agora mesmo para conferir o layout e validar o recebimento.
              </p>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                  E-mail de Destino para Teste
                </label>
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="guilherme.brito.ter@mpba.mp.br ou institucional"
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSendTest}
                disabled={testingSend}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                {testingSend ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-blue-400" />
                    <span>Disparando para o Outlook...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} className="text-blue-400" />
                    <span>Enviar E-mail de Teste Agora</span>
                  </>
                )}
              </button>

              {testResult && (
                <div className={`p-3 rounded-xl border text-xs leading-relaxed animate-fade-in ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
                    : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300'
                }`}>
                  <div className="flex items-start gap-2">
                    {testResult.success ? (
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">
                        {testResult.status === 'enviado' ? 'Envio Concluído com Sucesso!' : testResult.status === 'simulado' ? 'Demonstração Gerada!' : 'Aviso de Envio'}
                      </div>
                      <div className="mt-0.5">{testResult.message}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CARD DE AUTOMAÇÕES E GATILHOS PERIÓDICOS */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-800 dark:text-white">
                <BellRing size={16} className="text-amber-600" />
                <h3 className="text-sm font-bold">Disparos & Automações Periódicas</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                O servidor verifica automaticamente em segundo plano. Você também pode disparar e testar as automações manualmente a qualquer momento:
              </p>

              {/* Ação 1: Verificar Atividades Paradas (+7 dias) */}
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <span>⚠️</span> Tarefas Paradas (+7 dias)
                  </span>
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold px-2 py-0.5 rounded-full">
                    A cada 1 semana
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  Varre as solicitações não concluídas com mais de 7 dias de criação/edição e envia e-mail de alerta de cobrança para os responsáveis.
                </p>
                <button
                  type="button"
                  onClick={handleVerificarParadas}
                  disabled={verifyingParadas}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {verifyingParadas ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Verificando pendências...</span>
                    </>
                  ) : (
                    <>
                      <Clock size={13} />
                      <span>Verificar e Notificar Paradas Agora</span>
                    </>
                  )}
                </button>

                {paradasResult && (
                  <div className="p-2.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-amber-600" />
                      <span>{paradasResult.notificadas} demanda(s) parada(s) identificada(s) e notificada(s)!</span>
                    </div>
                    {paradasResult.detalhes && paradasResult.detalhes.length > 0 && (
                      <ul className="list-disc pl-4 text-[10px] space-y-0.5 text-slate-600 dark:text-slate-400">
                        {paradasResult.detalhes.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Ação 2: Disparar Lembrete de Uso (4 dias) */}
              <div className="p-3 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <span>📢</span> Lembrete Periódico (4 dias)
                  </span>
                  <span className="text-[10px] bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-bold px-2 py-0.5 rounded-full">
                    A cada 4 dias
                  </span>
                </div>
                <p className="text-[11px] text-teal-800 dark:text-teal-300 leading-relaxed">
                  Envia um boletim com indicadores e lembrete para todos os usuários cadastrados utilizarem e atualizarem o portal da Central Logística.
                </p>
                <button
                  type="button"
                  onClick={handleDispararLembreteAcesso}
                  disabled={sendingLembreteAcesso}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {sendingLembreteAcesso ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Disparando lembretes...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Disparar Lembrete Periódico Agora</span>
                    </>
                  )}
                </button>

                {lembreteAcessoResult && (
                  <div className="p-2.5 bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 rounded-lg text-[11px] text-teal-900 dark:text-teal-200">
                    {lembreteAcessoResult.enviado ? (
                      <div className="font-bold flex items-center gap-1 text-teal-700 dark:text-teal-300">
                        <CheckCircle2 size={13} className="text-teal-600" />
                        <span>Lembrete periódico disparado com sucesso para {lembreteAcessoResult.totalDestinatarios || 1} destinatário(s)!</span>
                      </div>
                    ) : (
                      <div className="text-amber-800 dark:text-amber-300 font-medium">
                        {lembreteAcessoResult.motivo}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* CARD DE VANTAGENS DO OUTLOOK */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-white">
                <ShieldCheck size={16} className="text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Vantagens Operacionais</h4>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>Sem Power Automate:</strong> O sistema cuida da geração e disparo direto para o correio corporativo.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>Rastreabilidade:</strong> Histórico formal de e-mails recebidos para comprovação de chamados.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>Acesso Rápido ao Portal:</strong> Todos os e-mails incluem botão e link direto para o site da Central Logística, permitindo abrir demandas em 1 clique.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>Regras de Caixa:</strong> Permite criar pasta *"Central Logística"* no Outlook para arquivamento limpo.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: HISTÓRICO DE ENVIOS (LOGS) */}
      {hubTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Registro de Disparos para o Outlook
              </h3>
              <p className="text-xs text-slate-500">
                Auditoria de todas as mensagens geradas e enviadas pelo sistema.
              </p>
            </div>
            
            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                disabled={clearingLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 rounded-lg transition cursor-pointer border border-red-200 dark:border-red-900 disabled:opacity-60"
                title="Limpar todos os registros de histórico de e-mails"
              >
                {clearingLogs ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                <span>{clearingLogs ? 'Limpando...' : 'Limpar Histórico'}</span>
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Mail size={36} className="mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-500">Nenhum e-mail registrado ainda.</p>
              <p className="text-[11px]">Crie uma nova solicitação ou envie um e-mail de teste para visualizar aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => (
                <div key={log.id} className="p-4 sm:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-1 min-w-[240px] flex-grow">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        log.status === 'enviado'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : log.status === 'simulado'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {log.status === 'enviado' ? '✓ Enviado (SMTP)' : log.status === 'simulado' ? 'Demonstração' : 'Falha'}
                      </span>

                      {log.solicitacaoNumero && (
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {log.solicitacaoNumero}
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(log.sentAt).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-800 dark:text-white">
                      {log.subject}
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <span>Destino:</span>
                      <strong className="text-slate-700 dark:text-slate-300">{log.to}</strong>
                    </div>

                    {log.errorMsg && (
                      <div className="text-[11px] text-red-600 bg-red-50 p-1.5 rounded border border-red-200 mt-1">
                        Erro retornado: {log.errorMsg}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewEmail(log)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                      title="Visualizar corpo do e-mail como no Outlook"
                    >
                      <Eye size={13} />
                      <span>Visualizar E-mail</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* TAB 3: GUIA & INSTRUÇÕES */}
      {hubTab === 'guide' && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Guia de Integração com o Microsoft Outlook & Exchange
            </h3>
            <p className="text-xs text-slate-500">
              Instruções detalhadas para configurar contas institucionais do Ministério Público ou Microsoft 365.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Opção 1 */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
                <span className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">1</span>
                <span>Configuração com Microsoft 365 (Nuvem)</span>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc list-inside">
                <li><strong>Host SMTP:</strong> <code>smtp.office365.com</code></li>
                <li><strong>Porta:</strong> <code>587</code> (STARTTLS)</li>
                <li><strong>Usuário:</strong> Seu e-mail funcional (ex: <code>usuario@mprs.mp.br</code>)</li>
                <li>
                  <strong>Senha de Aplicativo:</strong> Em contas corporativas com duplo fator (MFA/2FA), acesse seu perfil Microsoft em <a href="https://mysignins.microsoft.com/security-info" target="_blank" rel="noreferrer" className="text-blue-600 underline">mysignins.microsoft.com</a> e crie uma <em>"Senha de Aplicativo"</em> exclusiva para a Central Logística.
                </li>
              </ul>
            </div>

            {/* Opção 2 */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                <span className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">2</span>
                <span>Relay SMTP Interno do Ministério Público</span>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc list-inside">
                <li>Caso a Divisão de TI (DTI) possua um servidor de correio interno ou relay institucional (ex.: <code>smtp.mprs.mp.br</code>), basta informar o endereço do host e a porta (25 ou 587).</li>
                <li>Em muitos casos de rede governamental, o relay interno não requer senha quando a origem é autorizada.</li>
              </ul>
            </div>

          </div>

          {/* Dica do Outlook */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 space-y-2">
            <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
              <Mail size={14} /> Dica de Produtividade no Outlook Desktop & Web:
            </h4>
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              Você pode criar uma <strong>Regra de Mensagem no Outlook</strong> para mover e-mails com assunto iniciado por <code>[Central Logística]</code> para uma pasta dedicada chamada <strong>"Demandas Logísticas / Patrimônio"</strong>. Dessa forma, suas tarefas ficam categorizadas e você pode configurar notificações sonoras prioritárias para chamados de urgência!
            </p>
          </div>
        </div>
      )}

      {/* MODAL DE PREVIEW DO E-MAIL DO OUTLOOK */}
      {previewEmail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-4 px-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold">Visualização Fiel do E-mail (Layout Outlook)</h3>
                  <p className="text-[11px] text-slate-400">{previewEmail.subject}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEmail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Email Meta Info */}
            <div className="p-3 px-6 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-slate-500">Para:</span> <strong>{previewEmail.to}</strong>
              </div>
              <div className="text-slate-500">
                Disparado em: {new Date(previewEmail.sentAt).toLocaleString('pt-BR')}
              </div>
            </div>

            {/* Email HTML Body Render */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-grow bg-slate-100 dark:bg-slate-950">
              <div 
                className="outlook-email-frame bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"
                dangerouslySetInnerHTML={{ __html: previewEmail.html }}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-3 px-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewEmail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
