/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sparkles, MessageSquare, ArrowRight, CornerDownRight, CheckCircle2, 
  RefreshCw, TrendingUp, AlertOctagon, HelpCircle, FileText, Send, AlertTriangle
} from 'lucide-react';
import { TipoSolicitacao, PrioridadeSolicitacao } from '../types';

interface AiAssistantProps {
  onSolicitacaoCriada: () => void;
}

interface ParsedResult {
  tipoSolicitacao: TipoSolicitacao;
  prioridade: PrioridadeSolicitacao;
  dataEstimada: string;
  origem: string;
  destino: string;
  itens: string[];
  justificativa: string;
  equipeSugerida?: string;
}

interface RelatorioResult {
  resumoExecutivo: string;
  diagnosticoGargalos: {
    area: string;
    gargaloIdentificado: string;
    gravidade: 'Alta' | 'Média' | 'Baixa';
    impacto: string;
  }[];
  sugestoesAlocacao: {
    titulo: string;
    proposta: string;
    recursoNecessario: string;
    resultadoEsperado: string;
  }[];
  conclusaoInstitucional: string;
}

const EXEMPLOS_WHATSAPP = [
  "Vou precisar dos meninos amanhã para finalizar as entregas de cadeiras pro setor de RH no prédio B",
  "Pessoal, Dr. Roberto do anexo II pediu para recolher aquele monte de computador velho e monitor de descarte na quinta-feira",
  "Urgente! O pessoal do abrigo parceiro precisa de 3 berços e as cestas básicas doadas hoje à tarde sem falta",
  "Transferir 15 caixas de arquivo morto do RH para o arquivo geral do Anexo III na sexta-feira de manhã"
];

export default function AiAssistant({ onSolicitacaoCriada }: AiAssistantProps) {
  const [mensagem, setMensagem] = useState('');
  const [loadingParse, setLoadingParse] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);
  const [relatorioResult, setRelatorioResult] = useState<RelatorioResult | null>(null);

  const [sucessoCriacao, setSucessoCriacao] = useState(false);

  const handleSelectExemplo = (ex: string) => {
    setMensagem(ex);
  };

  const handleParseMensagem = async () => {
    if (!mensagem.trim()) return;
    setLoadingParse(true);
    setParsedResult(null);
    setSucessoCriacao(false);

    try {
      const response = await fetch('/api/ia/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem })
      });
      if (response.ok) {
        const data = await response.json();
        setParsedResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingParse(false);
    }
  };

  const handleGerarSolicitacao = async () => {
    if (!parsedResult) return;
    
    try {
      const response = await fetch('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solicitante: "Conversão IA (Mural WhatsApp)",
          setor: "Coordenação de Patrimônio Material",
          tipo: parsedResult.tipoSolicitacao,
          prioridade: parsedResult.prioridade,
          data: parsedResult.dataEstimada,
          origem: parsedResult.origem,
          destino: parsedResult.destino,
          observacoes: `[IA PARSER WHATSAPP] Justificativa: ${parsedResult.justificativa}\nTexto Original: "${mensagem}"`,
          itens: parsedResult.itens
        })
      });
      
      if (response.ok) {
        setSucessoCriacao(true);
        setMensagem('');
        setParsedResult(null);
        onSolicitacaoCriada();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGerarRelatorio = async () => {
    setLoadingRelatorio(true);
    setRelatorioResult(null);
    
    try {
      const response = await fetch('/api/ia/relatorio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setRelatorioResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRelatorio(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: Message Parser */}
      <div className="lg:col-span-6 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-600">
            <MessageSquare size={22} />
            <h3 className="text-lg font-bold">Leitor de WhatsApp Operacional</h3>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Nossa IA analisa conversas informais de WhatsApp de motoristas, ajudantes ou solicitantes e propõe uma **Solicitação Formal de Bens** estruturada em segundos, eliminando o preenchimento manual burocrático e gerando conformidade pública.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Insira ou Cole a Mensagem do WhatsApp</label>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Ex: Vou precisar dos meninos amanhã para finalizar as entregas de cadeiras pro setor de RH no prédio B..."
              className="w-full h-28 p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder-gray-400"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-gray-500 block">Exemplos Práticos (Clique para testar):</span>
            <div className="flex flex-wrap gap-2">
              {EXEMPLOS_WHATSAPP.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectExemplo(ex)}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 text-left line-clamp-1 max-w-full transition"
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleParseMensagem}
            disabled={loadingParse || !mensagem.trim()}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center justify-center gap-2 transition text-sm shadow-sm"
          >
            {loadingParse ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Analisando Mensagem com Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Interpretar & Estruturar Demanda</span>
              </>
            )}
          </button>
        </div>

        {/* Action / Success Message */}
        {sucessoCriacao && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in">
            <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-emerald-800 text-sm">Demanda Registrada com Sucesso!</h4>
              <p className="text-xs text-emerald-700 mt-1">
                A mensagem do WhatsApp foi interpretada, auditada pela IA e registrada no sistema como uma solicitação formal em status <strong>'Aberta'</strong>. Acesse a lista de solicitações para despachá-la ou planejar a rota.
              </p>
            </div>
          </div>
        )}

        {/* PARSED RESULT BOARD */}
        {parsedResult && (
          <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <Sparkles size={18} />
                <span>Triagem Recomendada por Gemini AI</span>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2.5 py-1 rounded-full border border-emerald-100">
                Acurácia Alta
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs leading-relaxed">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Tipo Sugerido</span>
                <span className="font-bold text-slate-800 text-sm">{parsedResult.tipoSolicitacao}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Prioridade Inferred</span>
                <span className={`font-bold text-sm ${
                  parsedResult.prioridade === 'Urgente' ? 'text-red-600' : 
                  parsedResult.prioridade === 'Alta' ? 'text-amber-600' : 'text-slate-700'
                }`}>{parsedResult.prioridade}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Ponto de Coleta (Origem)</span>
                <span className="font-medium text-slate-700">{parsedResult.origem}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Ponto de Destino</span>
                <span className="font-medium text-slate-700">{parsedResult.destino}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg col-span-2">
                <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Data Estimada</span>
                <span className="font-bold text-slate-800">{parsedResult.dataEstimada}</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
              <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[10px]">Materiais Identificados</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parsedResult.itens.map((item, idx) => (
                  <span key={idx} className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 text-xs font-medium">
                    • {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
              <span className="text-[10px] font-semibold text-amber-800 uppercase block tracking-wider">Justificativa da IA</span>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed italic">
                "{parsedResult.justificativa}"
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setParsedResult(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-medium text-xs transition"
              >
                Rejeitar Sugestão
              </button>
              <button
                onClick={handleGerarSolicitacao}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <CheckCircle2 size={14} />
                Criar Solicitação Formal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: AI Logistical Auditor (Bottleneck Report) */}
      <div className="lg:col-span-6 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-800">
            <TrendingUp size={22} className="text-emerald-500" />
            <h3 className="text-lg font-bold">Logística Inteligente & Auditoria (CNMP)</h3>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Consolide métricas operacionais, identifique equipes sobrecarregadas e tempo de atendimento. Gere pareceres automatizados de governança para auditorias de bens em conformidade com as diretrizes de governança pública.
          </p>

          <button
            onClick={handleGerarRelatorio}
            disabled={loadingRelatorio}
            className="w-full py-3 border-2 border-dashed border-emerald-500 hover:bg-emerald-50 text-emerald-700 font-semibold rounded-xl flex items-center justify-center gap-2 transition text-sm cursor-pointer"
          >
            {loadingRelatorio ? (
              <>
                <RefreshCw size={16} className="animate-spin text-emerald-600" />
                <span>Processando Dados da CBP com Gemini...</span>
              </>
            ) : (
              <>
                <FileText size={16} />
                <span>Auditar Operações & Diagnosticar Gargalos</span>
              </>
            )}
          </button>
        </div>

        {/* AUDIT REPORT DISPLAY */}
        {relatorioResult && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText size={20} className="text-emerald-600" />
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Parecer Técnico de Auditoria CBP</h4>
            </div>

            {/* Resumo Executivo */}
            <div className="space-y-1 text-sm">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Resumo Executivo (Governança)</span>
              <p className="text-gray-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {relatorioResult.resumoExecutivo}
              </p>
            </div>

            {/* Diagnóstico de Gargalos */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Diagnóstico Crítico de Gargalos</span>
              <div className="space-y-3">
                {relatorioResult.diagnosticoGargalos.map((g, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-100 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-amber-500" />
                        {g.area}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        g.gravidade === 'Alta' ? 'bg-red-100 text-red-800' : 
                        g.gravidade === 'Média' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {g.gravidade}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      <strong>Gargalo:</strong> {g.gargaloIdentificado}
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      <strong>Impacto na CBP:</strong> {g.impacto}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sugestões de Alocação e Rotas */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Sugestões de Otimização (Equipes & Rotas)</span>
              <div className="space-y-3">
                {relatorioResult.sugestoesAlocacao.map((s, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 space-y-1.5">
                    <h5 className="text-xs font-bold text-emerald-800">{s.titulo}</h5>
                    <p className="text-xs text-gray-700 leading-relaxed">{s.proposta}</p>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
                      <div>
                        <span className="text-gray-400 font-semibold block uppercase">Recurso Indicado</span>
                        <span className="font-semibold text-slate-700">{s.recursoNecessario}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-semibold block uppercase">Meta Estimada</span>
                        <span className="font-semibold text-emerald-700">{s.resultadoEsperado}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conclusão Institucional */}
            <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
              <span className="font-semibold text-slate-800 uppercase block">Conclusão de Governança (CNMP Compliance)</span>
              <p className="text-gray-600 leading-relaxed italic">
                "{relatorioResult.conclusaoInstitucional}"
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
