import React, { useState } from 'react';
import { Smartphone, Download, Share2, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // Se já estiver rodando instalado no celular em modo tela cheia (standalone), não precisa mostrar o botão
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Botão de Instalação Mobile / Desktop */}
      <button
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setShowGuide(true);
          }
        }}
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs whitespace-nowrap flex-shrink-0"
        title="Instalar como aplicativo no celular ou computador"
      >
        <Smartphone size={13} className="text-emerald-400 animate-pulse flex-shrink-0" />
        <span className="hidden sm:inline">Usar no Celular</span>
        <span className="sm:hidden text-xs">Instalar App</span>
      </button>

      {/* Modal Guia de Instalação Mobile (Android, iPhone e Navegadores) */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 text-white p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Como usar no Celular</h3>
                  <p className="text-[11px] text-slate-400">Instalação direta sem precisar de Play Store ou App Store</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              A <strong>Central Logística CBP</strong> foi construída com tecnologia <em>Progressive Web App (PWA)</em> e design responsivo, permitindo que operadores, motoristas e coordenadores usem o sistema no celular como um aplicativo nativo!
            </p>

            {/* Passo a Passo Android */}
            <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2">
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span>🤖 No Android (Google Chrome):</span>
              </div>
              <ol className="text-xs text-slate-300 space-y-1.5 pl-4 list-decimal leading-relaxed">
                <li>Toque no menu de <strong>três pontinhos (⋮)</strong> no topo do Chrome.</li>
                <li>Selecione <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar aplicativo"</strong>.</li>
                <li>O ícone da Central Logística será fixado na sua tela de apps com abertura instantânea!</li>
              </ol>
            </div>

            {/* Passo a Passo iPhone / iOS */}
            <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2">
              <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <span>🍏 No iPhone / iPad (Safari):</span>
              </div>
              <ol className="text-xs text-slate-300 space-y-1.5 pl-4 list-decimal leading-relaxed">
                <li>Abra este link no navegador <strong>Safari</strong> do iPhone.</li>
                <li>Toque no botão de <strong>Compartilhar <Share2 size={12} className="inline text-sky-400" /></strong> na barra inferior.</li>
                <li>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
                <li>Toque em <strong>"Adicionar"</strong> no canto superior direito.</li>
              </ol>
            </div>

            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
              <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
              <span>Funciona em tela cheia, sem barra de endereços, com sincronização em tempo real.</span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer border border-slate-700"
              >
                Entendi, Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
