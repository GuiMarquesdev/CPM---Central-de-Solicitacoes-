/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Database, Shield, Layers, Calendar, ListTodo, AlertTriangle, 
  ChevronRight, Copy, Check, Info, ArrowRight, UserCheck, Code
} from 'lucide-react';

export default function ArchitectureHub() {
  const [activeTab, setActiveTab] = useState<'reqs' | 'db' | 'apis' | 'flows' | 'roadmap' | 'risks'>('reqs');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1. REQUISITOS REFINADOS & FUNCIONALIDADES FALTANTES
  const renderReqs = () => (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4 py-1">
        <h3 className="text-xl font-semibold text-gray-800">Refinamento de Requisitos - Ministério Público</h3>
        <p className="text-sm text-gray-500 mt-1">Conformidade com a Administração Pública e Governança de Bens Patrimoniais.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 font-medium">
            <ListTodo size={20} />
            <h4>Requisitos Funcionais Adicionados (Refinamento Técnico)</h4>
          </div>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Integração com Sistema SEI (Sistema Eletrônico de Informações):</strong> Permite importar as autorizações e termos de transferência de bens diretamente do processo administrativo do SEI para preenchimento automático.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Termo de Recebimento Digital com Assinatura Eletrônica:</strong> Operadores e motoristas colhem assinatura digital do responsável pelo setor recebedor na tela do tablet/smartphone, gerando o Termo de Recebimento PDF assinado.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Controle de Tombamento de Bens (Leitura de QR Code/Código de Barras):</strong> O operador logístico escaneia as plaquetas de patrimônio de metal no momento da coleta e entrega, garantindo rastreabilidade unitária e 0% de extravio.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Checklist de Saída e Retorno de Veículos:</strong> Checklist eletrônico para motoristas antes de iniciar a rota (nível de combustível, avarias, quilometragem, estepe).</span>
            </li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 font-medium">
            <Shield size={20} />
            <h4>Requisitos Não-Funcionais Críticos (Governo)</h4>
          </div>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Segurança & Autenticação Única:</strong> Integração com LDAP / Active Directory do Ministério Público e segurança via Single Sign-On (SSO) do governo.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Conformidade com a LGPD:</strong> Criptografia de dados pessoais de servidores (solicitantes e motoristas) em trânsito e em repouso. Logs de auditoria imutáveis para cada movimentação patrimonial.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Arquitetura Mobile Offline-First:</strong> O aplicativo para operadores logísticos e motoristas deve funcionar sem internet nos depósitos fechados e subsolos das promotorias, sincronizando dados ao recuperar conexão.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Alta Disponibilidade:</strong> Tempo de atividade de 99.9% para garantir que os caminhões de distribuição não parem suas operações diárias.</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-3">
        <h4 className="font-semibold text-slate-800 flex items-center gap-2">
          <Info size={18} className="text-blue-500" />
          A Relevância do Refinamento Patrimonial no Setor Público
        </h4>
        <p className="text-sm text-slate-600 leading-relaxed">
          Diferente da logística comercial comum, a movimentação de bens no Ministério Público rege-se pelos princípios da Administração Pública. Cada cadeira, computador ou arquivo transferido é um bem de posse do Estado. Portanto, a introdução de controles de **Tombamento Patrimonial**, **Integração com Processos do SEI**, e **Termo de Recebimento PDF assinado** transforma o sistema de uma simples ferramenta de despacho em um sistema de auditoria e conformidade fiscal e patrimonial.
        </p>
      </div>
    </div>
  );

  // 2. ARQUITETURA DE BANCO DE DADOS (ERD & SCHEMA)
  const renderDb = () => (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4 py-1">
        <h3 className="text-xl font-semibold text-gray-800">Arquitetura de Banco de Dados Relacional</h3>
        <p className="text-sm text-gray-500 mt-1">Modelagem PostgreSQL otimizada para consistência, auditoria e LGPD.</p>
      </div>

      {/* ERD VISUAL SIMULATOR */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
        <h4 className="font-medium text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wider">
          <Database size={16} className="text-emerald-600" />
          Diagrama Entidade-Relacionamento (Relational Schemas)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Table 1 */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 text-xs">
            <div className="bg-slate-800 text-white p-2 font-mono font-semibold flex justify-between">
              <span>tb_solicitacoes</span>
              <span className="text-emerald-400">[Fato]</span>
            </div>
            <div className="p-3 space-y-1 font-mono">
              <div className="text-emerald-600 font-bold">🔑 id (UUID) [PK]</div>
              <div>• numero (VARCHAR) [UNIQUE]</div>
              <div>• solicitante_id (UUID) [FK]</div>
              <div>• tipo (VARCHAR / ENUM)</div>
              <div>• prioridade (VARCHAR / ENUM)</div>
              <div>• status (VARCHAR / ENUM)</div>
              <div>• data_agendamento (DATE)</div>
              <div>• origem (VARCHAR)</div>
              <div>• destino (VARCHAR)</div>
              <div>• observacoes (TEXT)</div>
              <div>• rota_id (UUID) [FK]</div>
              <div className="text-gray-400">• criado_em (TIMESTAMP)</div>
            </div>
          </div>

          {/* Table 2 */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 text-xs">
            <div className="bg-slate-800 text-white p-2 font-mono font-semibold flex justify-between">
              <span>tb_itens_solicitados</span>
              <span className="text-amber-400">[Relacional]</span>
            </div>
            <div className="p-3 space-y-1 font-mono">
              <div className="text-emerald-600 font-bold">🔑 id (UUID) [PK]</div>
              <div className="text-blue-600 font-bold">🔗 solicitacao_id (UUID) [FK]</div>
              <div>• descricao (VARCHAR)</div>
              <div>• quantidade (INTEGER)</div>
              <div>• tombamento_patrimonio (VARCHAR)</div>
              <div>• conferido (BOOLEAN)</div>
            </div>
          </div>

          {/* Table 3 */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 text-xs">
            <div className="bg-slate-800 text-white p-2 font-mono font-semibold flex justify-between">
              <span>tb_rotas</span>
              <span className="text-emerald-400">[Fato]</span>
            </div>
            <div className="p-3 space-y-1 font-mono">
              <div className="text-emerald-600 font-bold">🔑 id (UUID) [PK]</div>
              <div>• numero_rota (VARCHAR)</div>
              <div className="text-blue-600 font-bold">🔗 equipe_id (UUID) [FK]</div>
              <div>• status (VARCHAR)</div>
              <div>• km_estimado (DECIMAL)</div>
              <div>• km_realizado (DECIMAL)</div>
              <div className="text-gray-400">• iniciado_em (TIMESTAMP)</div>
              <div className="text-gray-400">• finalizado_em (TIMESTAMP)</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 text-xs">
            <div className="bg-slate-800 text-white p-2 font-mono font-semibold flex justify-between">
              <span>tb_comunicados</span>
              <span className="text-purple-400">[Operacional]</span>
            </div>
            <div className="p-3 space-y-1 font-mono">
              <div className="text-emerald-600 font-bold">🔑 id (UUID) [PK]</div>
              <div>• titulo (VARCHAR)</div>
              <div>• conteudo (TEXT)</div>
              <div>• categoria (VARCHAR)</div>
              <div>• autor (VARCHAR)</div>
              <div>• setor_alvo (VARCHAR)</div>
              <div className="text-gray-400">• data_criacao (TIMESTAMP)</div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 text-xs">
            <div className="bg-slate-800 text-white p-2 font-mono font-semibold flex justify-between">
              <span>tb_logs_auditoria (Auditoria MP)</span>
              <span className="text-red-400">[Conformidade]</span>
            </div>
            <div className="p-3 space-y-1 font-mono">
              <div className="text-emerald-600 font-bold">🔑 id (UUID) [PK]</div>
              <div>• usuario_id (UUID)</div>
              <div>• acao (VARCHAR) (ex: 'ALT_STATUS')</div>
              <div>• tabela_afetada (VARCHAR)</div>
              <div>• id_registro_afetado (UUID)</div>
              <div>• dados_anteriores (JSONB)</div>
              <div>• dados_novos (JSONB)</div>
              <div className="text-gray-400">• timestamp (TIMESTAMP)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 text-slate-100 p-6 rounded-xl font-mono text-xs relative">
        <div className="absolute top-4 right-4 flex gap-2">
          <button 
            onClick={() => copyToClipboard(drizzleSchema, 'drizzle')}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Copiar código Drizzle ORM Schema"
          >
            {copiedId === 'drizzle' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
        <div className="flex items-center gap-2 mb-3 text-emerald-400 font-semibold border-b border-slate-800 pb-2">
          <Code size={14} />
          <span>TypeScript Drizzle ORM Definition (tb_solicitacoes)</span>
        </div>
        <pre className="overflow-x-auto whitespace-pre">{drizzleSchema}</pre>
      </div>
    </div>
  );

  // 3. DEFINIÇÃO DE APIS (SWAGGER / REST ENDPOINTS)
  const renderApis = () => (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4 py-1">
        <h3 className="text-xl font-semibold text-gray-800">Definição das APIs Corporativas (RESTful)</h3>
        <p className="text-sm text-gray-500 mt-1">Especificação técnica dos contratos de dados e integração.</p>
      </div>

      <div className="space-y-4">
        {/* API 1 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-800">POST</span>
              <code className="text-sm font-mono font-semibold text-gray-800">/api/v1/solicitacoes</code>
            </div>
            <span className="text-xs text-gray-500 font-mono">Registra nova solicitação formal logistica</span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <div className="text-gray-500 font-semibold mb-1 uppercase tracking-wider">Payload Exemplo (Request)</div>
              <pre className="bg-slate-50 p-3 rounded border border-slate-200 overflow-x-auto text-gray-700 leading-relaxed">
{`{
  "solicitante": "Dr. Arthur Costa",
  "setor_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "tipo": "Entrega",
  "prioridade": "Alta",
  "origem": "Almoxarifado Central",
  "destino": "Promotoria da Saúde - Sala 12",
  "itens": [
    { "descricao": "Cadeira Diretor", "quantidade": 2 },
    { "descricao": "Arquivo de Aço", "quantidade": 1 }
  ],
  "observacoes": "Processo administrativo SEI 19.0.0123.44"
}`}
              </pre>
            </div>
            <div>
              <div className="text-gray-500 font-semibold mb-1 uppercase tracking-wider">Resposta Esperada (201 Created)</div>
              <pre className="bg-slate-50 p-3 rounded border border-slate-200 overflow-x-auto text-gray-700 leading-relaxed">
{`{
  "id": "c61b17a1-8d2b-4fa8-bc02-4d5fe6b6db3d",
  "numero": "CBP-2026-0341",
  "status": "Aberta",
  "criado_em": "2026-07-07T12:15:30Z",
  "link_sei": "https://sei.mp.br/processo=190012344"
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* API 2 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 text-xs font-bold rounded bg-blue-100 text-blue-800">POST</span>
              <code className="text-sm font-mono font-semibold text-gray-800">/api/v1/ia/parse-whatsapp</code>
            </div>
            <span className="text-xs text-gray-500 font-mono">Processamento de Linguagem Natural (LLM)</span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <div className="text-gray-500 font-semibold mb-1 uppercase tracking-wider">Request (Mensagem de WhatsApp do Coordenador)</div>
              <pre className="bg-slate-50 p-3 rounded border border-slate-200 overflow-x-auto text-gray-700 leading-relaxed">
{`{
  "mensagem": "Vou precisar dos meninos amanhã cedinho para recolher aquela sucata de eletrônico velha na promotoria de Canoas para trazer pro depósito"
}`}
              </pre>
            </div>
            <div>
              <div className="text-gray-500 font-semibold mb-1 uppercase tracking-wider">Response estruturado do Gemini (200 OK)</div>
              <pre className="bg-slate-50 p-3 rounded border border-slate-200 overflow-x-auto text-gray-700 leading-relaxed">
{`{
  "tipoSolicitacao": "Coleta",
  "prioridade": "Média",
  "dataEstimada": "2026-07-08",
  "origem": "Promotoria de Justiça de Canoas",
  "destino": "Depósito Central CBP - Galpão B",
  "itens": [
    "Lote de Eletrônicos Inservíveis",
    "Material Eletrônico Velho (Sucata)"
  ],
  "justificativa": "Identificada necessidade de coleta de sucatas de computadores baseado nos termos 'recolher', 'sucata de eletrônico velha' e 'Canoas'.",
  "equipeSugerida": "EQP-001 (Logística)"
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 4. MODELOS DE NEGÓCIOS & FLUXOS (PROCESS FLOW)
  const renderFlows = () => (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4 py-1">
        <h3 className="text-xl font-semibold text-gray-800">Fluxos de Negócio & Rastreabilidade</h3>
        <p className="text-sm text-gray-500 mt-1">Mapeamento visual do processo operacional da CBP.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          <Layers size={18} className="text-emerald-600" />
          Fluxo de Vida de uma Solicitação (WhatsApp vs. Central)
        </h4>

        <div className="relative pl-6 border-l border-slate-200 space-y-6 text-sm">
          {/* Step 1 */}
          <div className="relative">
            <span className="absolute -left-9 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-white font-mono text-xs font-bold shadow-sm">1</span>
            <div>
              <h5 className="font-semibold text-gray-800">Criação / Conversão via IA</h5>
              <p className="text-xs text-gray-500 mt-0.5">Responsável: Solicitante (Formal) ou Coordenador (Via Mensagem Whatsapp + IA)</p>
              <p className="text-gray-600 mt-1">O solicitante preenche o formulário ou o coordenador cola a mensagem informal do WhatsApp. O motor inteligente (Gemini) analisa e padroniza a solicitação, registrando-a como <strong>'Aberta'</strong>.</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <span className="absolute -left-9 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-white font-mono text-xs font-bold shadow-sm">2</span>
            <div>
              <h5 className="font-semibold text-gray-800">Análise e Aprovação Patrimonial</h5>
              <p className="text-xs text-gray-500 mt-0.5">Responsável: Coordenador de Bens Permanentes (CBP)</p>
              <p className="text-gray-600 mt-1">A coordenação avalia a legalidade e necessidade (confronta com o inventário do setor e processo SEI). Ao aprovar, o status passa para <strong>'Aprovada'</strong>.</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <span className="absolute -left-9 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-white font-mono text-xs font-bold shadow-sm">3</span>
            <div>
              <h5 className="font-semibold text-gray-800">Otimização de Rota & Despacho</h5>
              <p className="text-xs text-gray-500 mt-0.5">Responsável: Coordenador / Planejador de Rotas</p>
              <p className="text-gray-600 mt-1">A coordenação agrupa múltiplas solicitações aprovadas que pertencem ao mesmo quadrante geográfico. Associa uma equipe, veículo apto e despacha a rota. Status: <strong>'Planejada'</strong>.</p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative">
            <span className="absolute -left-9 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-white font-mono text-xs font-bold shadow-sm">4</span>
            <div>
              <h5 className="font-semibold text-gray-800">Execução de Rota em Campo</h5>
              <p className="text-xs text-gray-500 mt-0.5">Responsável: Motorista & Operadores</p>
              <p className="text-gray-600 mt-1">Em trânsito, o motorista inicia a rota. Operadores escaneiam os tombamentos de cada móvel e colhem assinatura eletrônica do responsável no destino. Status: <strong>'Em execução'</strong>.</p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="relative">
            <span className="absolute -left-9 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-white font-mono text-xs font-bold shadow-sm">5</span>
            <div>
              <h5 className="font-semibold text-gray-800">Finalização de Termos & Fechamento</h5>
              <p className="text-xs text-gray-500 mt-0.5">Responsável: Coordenador / Sistema Integrado</p>
              <p className="text-gray-600 mt-1">A rota é concluída, os termos PDF são integrados aos processos SEI correspondentes. Status final: <strong>'Concluída'</strong>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 5. ROADMAP DO PRODUTO & MVP REALISTA
  const renderRoadmap = () => (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4 py-1">
        <h3 className="text-xl font-semibold text-gray-800">Roadmap do Produto & Proposta de MVP Realista</h3>
        <p className="text-sm text-gray-500 mt-1">Metodologia ágil de implantação dentro do Ministério Público para garantir adesão rápida.</p>
      </div>

      <div className="space-y-6 text-sm text-gray-600">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
          <Info className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="font-semibold text-amber-800">Abordagem MP-MVP (Foco na Simplicidade e Rastreabilidade)</h4>
            <p className="text-xs text-amber-700 mt-1">
              Para evitar rejeição cultural dos colaboradores que usam apenas WhatsApp, propomos implantar o MVP em <strong>Fases Progressivas</strong>. A primeira fase foca em centralizar solicitações e rotas básicas, operando em paralelo com os grupos de mensagens através do assistente de IA, sem burocracia exagerada inicialmente.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Phase 1 */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2 py-1 bg-emerald-100 text-emerald-800 rounded">FASE 1 - Centralização</span>
              <span className="font-mono text-xs text-gray-400">Mês 1 a 2</span>
            </div>
            <h4 className="font-semibold text-gray-800 text-base">MVP Operacional Core</h4>
            <p className="text-xs text-gray-500">Objetivo: Eliminar o descontrole operacional primário.</p>
            <ul className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-50">
              <li>• Portal Web de Solicitação para os Setores do MP</li>
              <li>• Triagem de solicitações na Coordenação</li>
              <li>• Painel de controle de Equipes e Veículos ativos</li>
              <li>• **Conversor de Mensagem de WhatsApp em Solicitação (IA)**</li>
              <li>• Mural de Comunicados eletrônico</li>
            </ul>
          </div>

          {/* Phase 2 */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded">FASE 2 - Campo & Rotas</span>
              <span className="font-mono text-xs text-gray-400">Mês 3 a 4</span>
            </div>
            <h4 className="font-semibold text-gray-800 text-base">Aplicativo do Operador e Motorista</h4>
            <p className="text-xs text-gray-500">Objetivo: Controlar a execução fora do prédio sede.</p>
            <ul className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-50">
              <li>• Módulo Mobile responsivo para Motoristas e Operadores</li>
              <li>• Planejador de Rotas otimizado com rotas geográficas</li>
              <li>• Leitura de Código de Placa de Patrimônio em campo</li>
              <li>• Assinatura digital direta na tela de entrega</li>
              <li>• Registro de intercorrências fotográficas (pneus furados, etc.)</li>
            </ul>
          </div>

          {/* Phase 3 */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2 py-1 bg-purple-100 text-purple-800 rounded">FASE 3 - Integração</span>
              <span className="font-mono text-xs text-gray-400">Mês 5 a 6</span>
            </div>
            <h4 className="font-semibold text-gray-800 text-base">Ecossistema Corporativo</h4>
            <p className="text-xs text-gray-500">Objetivo: Automação administrativa governamental plena.</p>
            <ul className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-50">
              <li>• Integração bidirecional com o Sistema SEI via API</li>
              <li>• Relatório Gerencial Automatizado com IA (Gargalos e KPI)</li>
              <li>• Sincronização automatizada com o banco de dados patrimonial</li>
              <li>• Dashboard de BI interativo para Auditorias Internas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  // 6. RISCOS DO PROJETO & MITIGAÇÃO
  const renderRisks = () => (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4 py-1">
        <h3 className="text-xl font-semibold text-gray-800">Matriz de Riscos & Plano de Mitigação</h3>
        <p className="text-sm text-gray-500 mt-1">Mapeamento preventivo de segurança, cultura governamental e falhas técnicas.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden text-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider font-mono">
              <th className="p-4">Risco Identificado</th>
              <th className="p-4">Gravidade / Probabilidade</th>
              <th className="p-4">Impacto Operacional</th>
              <th className="p-4">Mitigação Planejada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-600">
            <tr>
              <td className="p-4 font-semibold text-gray-800">Rejeição Cultural (Dependência do WhatsApp)</td>
              <td className="p-4">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">Alta</span>
              </td>
              <td className="p-4">Operadores ignorarem o sistema e continuarem combinando saídas logísticas via mensagens informais.</td>
              <td className="p-4">Adotar o assistente de IA da Central Logística. O coordenador pode simplesmente copiar a mensagem do WhatsApp e jogar na IA do sistema, gerando a solicitação em 1 clique sem burocracia manual excessiva.</td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-gray-800">Instabilidade de Sinal em Subsolos e Depósitos</td>
              <td className="p-4">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">Média</span>
              </td>
              <td className="p-4">Impossibilidade de dar saída ou baixa de entrega no smartphone no ato da movimentação de bens.</td>
              <td className="p-4">Desenvolvimento utilizando arquitetura **Offline-First (PWA/SQLite)**. As conferências são armazenadas localmente no aparelho e enviadas automaticamente em segundo plano ao detectar conexão.</td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-gray-800">Segurança da Informação e LGPD</td>
              <td className="p-4">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">Alta</span>
              </td>
              <td className="p-4">Vazamento de dados funcionais de promotores/servidores ou rastreamento geográfico indevido de motoristas fora do horário de expediente.</td>
              <td className="p-4">Autenticação centralizada SSO, criptografia em banco de dados, e limite de georreferenciamento exclusivo ao horário de serviço atrelado às rotas despachadas.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const drizzleSchema = `import { pgTable, uuid, varchar, text, timestamp, integer, boolean, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Tabela Principal de Solicitações Logísticas
export const solicitacoes = pgTable("tb_solicitacoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  numero: varchar("numero", { length: 50 }).notNull().unique(),
  solicitanteId: uuid("solicitante_id").notNull(),
  setor: varchar("setor", { length: 255 }).notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(), // 'Entrega' | 'Coleta' | 'Transferência' | 'Inventário' | 'Apoio'
  prioridade: varchar("prioridade", { length: 50 }).notNull(), // 'Urgente' | 'Alta' | 'Média' | 'Baixa'
  status: varchar("status", { length: 50 }).notNull().default("Aberta"), // 'Aberta' | 'Em análise' ...
  dataAgendamento: date("data_agendamento").notNull(),
  origem: varchar("origem", { length: 255 }).notNull(),
  destino: varchar("destino", { length: 255 }).notNull(),
  observacoes: text("observacoes"),
  rotaId: uuid("rota_id"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow()
});

// 2. Tabela de Itens Vinculados (Tombamento Patrimonial)
export const itensSolicitados = pgTable("tb_itens_solicitados", {
  id: uuid("id").primaryKey().defaultRandom(),
  solicitacaoId: uuid("solicitacao_id")
    .notNull()
    .references(() => solicitacoes.id, { onDelete: "cascade" }),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  quantidade: integer("quantidade").notNull().default(1),
  tombamentoPatrimonio: varchar("tombamento_patrimonio", { length: 100 }), // Plaqueta de metal do MP
  conferido: boolean("conferido").notNull().default(false)
});

// 3. Relacionamentos Drizzle
export const solicitacoesRelations = relations(solicitacoes, ({ many, one }) => ({
  itens: many(itensSolicitados),
  rota: one(rotas, {
    fields: [solicitacoes.rotaId],
    references: [rotas.id]
  })
}));`;

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
      <div className="bg-slate-950 text-white p-6">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Technical & Architectural Hub</h2>
            <p className="text-xs text-slate-400">Definições Técnicas de Nível Governamental para o Ministério Público</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 flex overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('reqs')}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex-shrink-0 ${
            activeTab === 'reqs' 
              ? 'border-emerald-500 text-emerald-600 bg-emerald-50/10' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ListTodo size={16} />
          Requisitos Refinados
        </button>
        <button
          onClick={() => setActiveTab('db')}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex-shrink-0 ${
            activeTab === 'db' 
              ? 'border-emerald-500 text-emerald-600 bg-emerald-50/10' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Database size={16} />
          Arquitetura DB (PostgreSQL)
        </button>
        <button
          onClick={() => setActiveTab('apis')}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex-shrink-0 ${
            activeTab === 'apis' 
              ? 'border-emerald-500 text-emerald-600 bg-emerald-50/10' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Code size={16} />
          APIs & Contratos
        </button>
        <button
          onClick={() => setActiveTab('flows')}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex-shrink-0 ${
            activeTab === 'flows' 
              ? 'border-emerald-500 text-emerald-600 bg-emerald-50/10' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layers size={16} />
          Mapeamento de Fluxos
        </button>
        <button
          onClick={() => setActiveTab('roadmap')}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex-shrink-0 ${
            activeTab === 'roadmap' 
              ? 'border-emerald-500 text-emerald-600 bg-emerald-50/10' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar size={16} />
          MVP & Roadmap MP
        </button>
        <button
          onClick={() => setActiveTab('risks')}
          className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex-shrink-0 ${
            activeTab === 'risks' 
              ? 'border-emerald-500 text-emerald-600 bg-emerald-50/10' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <AlertTriangle size={16} />
          Matriz de Riscos
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'reqs' && renderReqs()}
        {activeTab === 'db' && renderDb()}
        {activeTab === 'apis' && renderApis()}
        {activeTab === 'flows' && renderFlows()}
        {activeTab === 'roadmap' && renderRoadmap()}
        {activeTab === 'risks' && renderRisks()}
      </div>
    </div>
  );
}
