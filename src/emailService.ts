import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { Solicitacao, Usuario, EmailConfig, EmailLog } from "./types";

const CONFIG_FILE = path.join(process.cwd(), "email_config.json");
const LOGS_FILE = path.join(process.cwd(), "email_logs.json");

// Default configuration with pre-filled Outlook M365 settings
let currentConfig: EmailConfig = {
  smtpHost: process.env.SMTP_HOST || "smtp.office365.com",
  smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpSecure: process.env.SMTP_SECURE === "true",
  senderName: process.env.SMTP_FROM_NAME || "Central Logística CBP - Coordenação de Patrimônio",
  senderEmail: process.env.SMTP_FROM || "central.logistica@mprs.mp.br",
  destinatarios: [
    "guimarquesbrito@gmail.com",
    "coordenacao.patrimonio@mprs.mp.br"
  ],
  ativo: true,
  notificarNovasDemandas: true,
  notificarMudancaStatus: true,
  notificarOcorrenciasUrgentes: true,
  notificarAtividadeIniciada: true,
  notificarAtividadeParadaSemana: true,
  diasAtividadeParada: 7,
  notificarLembreteAcesso: true,
  lembreteAcessoSiteDias: 4,
  modoEnvio: "outlook_m365"
};

let emailLogs: EmailLog[] = [];

// Load config from disk if available
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    currentConfig = { ...currentConfig, ...parsed };
  }
} catch (e) {
  console.error("[EmailService] Erro ao carregar email_config.json:", e);
}

// Load logs from disk if available
try {
  if (fs.existsSync(LOGS_FILE)) {
    const rawLogs = fs.readFileSync(LOGS_FILE, "utf-8");
    emailLogs = JSON.parse(rawLogs);
    if (!Array.isArray(emailLogs)) emailLogs = [];
  }
} catch (e) {
  console.error("[EmailService] Erro ao carregar email_logs.json:", e);
}

function saveConfigToDisk() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), "utf-8");
  } catch (e) {
    console.error("[EmailService] Falha ao salvar email_config.json:", e);
  }
}

function saveLogsToDisk() {
  try {
    // Keep max 50 recent email logs
    const trimmed = emailLogs.slice(0, 50);
    fs.writeFileSync(LOGS_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
  } catch (e) {
    console.error("[EmailService] Falha ao salvar email_logs.json:", e);
  }
}

export function getEmailConfig(): EmailConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      currentConfig = { ...currentConfig, ...parsed };
    }
  } catch (e) {}

  if (Array.isArray(currentConfig.destinatarios)) {
    currentConfig.destinatarios = filterOutlookRecipients(currentConfig.destinatarios);
  }

  // Return copy with password masked for frontend security
  return {
    ...currentConfig,
    destinatarios: filterOutlookRecipients(currentConfig.destinatarios || []),
    smtpPass: currentConfig.smtpPass ? "********" : "",
    hasCustomPassword: Boolean(currentConfig.smtpPass && currentConfig.smtpPass.length > 0 && currentConfig.smtpPass !== "cbp_logistica")
  };
}

export function updateEmailConfig(update: Partial<EmailConfig>): EmailConfig {
  const previousPass = currentConfig.smtpPass;
  currentConfig = {
    ...currentConfig,
    ...update
  };
  // Ensure Gmail recipients are always filtered out - Outlook only
  if (Array.isArray(currentConfig.destinatarios)) {
    currentConfig.destinatarios = filterOutlookRecipients(currentConfig.destinatarios);
  }
  // If the frontend passed masked string "********" or empty without explicit clearing, keep existing password
  if (update.smtpPass === "********" || (update.smtpPass === "" && update.hasCustomPassword)) {
    currentConfig.smtpPass = previousPass;
  }
  saveConfigToDisk();
  return getEmailConfig();
}

export function getEmailLogs(): EmailLog[] {
  return emailLogs;
}

export function clearEmailLogs(): void {
  emailLogs = [];
  saveLogsToDisk();
}

export const DEFAULT_APP_URL = process.env.APP_URL || process.env.VITE_APP_URL || "https://ais-pre-xmczww2mupa7kyvhhbrh5w-35758496924.us-west1.run.app";

/**
 * Generates an Outlook-compatible HTML email with inline CSS and table layout.
 */
export function generateOutlookDemandTemplate(solicitacao: Solicitacao, appUrl?: string): string {
  const baseUrl = appUrl || DEFAULT_APP_URL;
  const priorityColor = 
    solicitacao.prioridade === "Alta" ? "#dc2626" : 
    solicitacao.prioridade === "Média" ? "#d97706" : "#2563eb";
  
  const priorityBg = 
    solicitacao.prioridade === "Alta" ? "#fef2f2" : 
    solicitacao.prioridade === "Média" ? "#fffbeb" : "#eff6ff";

  const itensList = Array.isArray(solicitacao.itens) && solicitacao.itens.length > 0
    ? solicitacao.itens.map(item => `<li style="margin-bottom: 4px; color: #1e293b;">${item}</li>`).join("")
    : "<li style=\"color: #64748b;\">Material logístico diverso informado no processo.</li>";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Central Logística] Nova Demanda ${solicitacao.numero}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header Institucional MPRS -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 30px; text-align: left; border-bottom: 3px solid #059669;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; color: #34d399; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                      Ministério Público • Central Logística CBP
                    </div>
                    <div style="font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 2px;">
                      Coordenação de Patrimônio Material
                    </div>
                    <div style="font-size: 13px; color: #94a3b8;">
                      Aviso Oficial de Nova Demanda Logística
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: ${priorityBg}; border: 1px solid ${priorityColor}; color: ${priorityColor}; font-weight: 700; font-size: 11px; padding: 6px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Prioridade ${solicitacao.prioridade}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Notification Banner -->
          <tr>
            <td style="padding: 24px 30px 10px 30px;">
              <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #0f172a;">
                  Uma nova tarefa foi registrada no sistema e aguarda acompanhamento da equipe de logística.
                </p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">
                  Chamado <strong>${solicitacao.numero}</strong> • Processo <strong>${solicitacao.processo || "Não informado"}</strong>
                </p>
              </div>

              <!-- Main Details Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; width: 35%; border-bottom: 1px solid #e2e8f0;">Tipo de Demanda:</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    ${solicitacao.tipo} ${solicitacao.subtipoOcorrencia ? `(${solicitacao.subtipoOcorrencia})` : ""}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Unidade Requisitante:</td>
                  <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    <strong>${solicitacao.setor || "Coordenação de Patrimônio Material"}</strong>
                  </td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Solicitante:</td>
                  <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    ${solicitacao.solicitante || "Não especificado"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Data Prevista / Período:</td>
                  <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    ${solicitacao.data || "Imediato"} • <strong>${solicitacao.periodo || "Manhã"}</strong>
                  </td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Origem:</td>
                  <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    📍 ${solicitacao.origem || "Almoxarifado Central"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Destino:</td>
                  <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    🎯 ${solicitacao.destino || "Prédio Sede"}
                  </td>
                </tr>
                ${solicitacao.numeroTombo ? `
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Nº Tombo Patrimonial:</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    🏷️ ${solicitacao.numeroTombo} (${solicitacao.estadoConservacao || "Seminovo"})
                  </td>
                </tr>` : ""}
                ${solicitacao.fornecedorOuEmpresa ? `
                <tr>
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Fornecedor / Assistência:</td>
                  <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    🏢 ${solicitacao.fornecedorOuEmpresa} ${solicitacao.numeroNotaOuContrato ? `(${solicitacao.numeroNotaOuContrato})` : ""}
                  </td>
                </tr>` : ""}
              </table>

              <!-- Bens e Itens -->
              <div style="margin-bottom: 20px;">
                <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                  Itens e Materiais Relacionados:
                </div>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 18px;">
                  <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
                    ${itensList}
                  </ul>
                </div>
              </div>

              ${solicitacao.observacoes ? `
              <!-- Observações -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                  Observações e Instruções:
                </div>
                <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #92400e; line-height: 1.5;">
                  ${solicitacao.observacoes}
                </div>
              </div>` : ""}

              <!-- Call to Action Button for Outlook -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 10px; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${baseUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 8px; box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3); letter-spacing: 0.3px;">
                      Abrir Chamado na Central Logística →
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <p style="margin: 0; font-size: 11px; color: #64748b;">
                      Link direto para acesso ao site: <a href="${baseUrl}" target="_blank" style="color: #059669; text-decoration: underline; font-weight: 600; word-break: break-all;">${baseUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                Este e-mail é uma notificação automática gerada pela Central Logística CBP.<br>
                Coordenação de Patrimônio Material • Ministério Público Estadual.<br>
                Em caso de dúvidas operacionais, acesse o painel web ou contate o administrador.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Generates an Outlook-compatible HTML email for status change.
 */
export function generateStatusChangeTemplate(solicitacao: Solicitacao, statusAnterior: string, novoStatus: string, usuarioAcao?: string, appUrl?: string): string {
  const baseUrl = appUrl || DEFAULT_APP_URL;
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Atualização de Status: ${solicitacao.numero}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; overflow: hidden;" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background-color: #0f172a; padding: 20px 28px; border-bottom: 3px solid #2563eb;">
              <div style="font-size: 11px; font-weight: 700; color: #60a5fa; text-transform: uppercase;">Central Logística CBP • Atualização de Demanda</div>
              <div style="font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 4px;">Demanda ${solicitacao.numero} atualizada</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 28px;">
              <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 0 6px 6px 0; margin-bottom: 18px;">
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e3a8a;">
                  O status da demanda foi modificado para <strong>${novoStatus}</strong>.
                </p>
                ${usuarioAcao ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #3b82f6;">Ação executada por: ${usuarioAcao}</p>` : ""}
              </div>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px; font-size: 13px;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; width: 35%;">Processo SEI:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${solicitacao.processo || "N/A"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Setor:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${solicitacao.setor}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Tipo:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${solicitacao.tipo}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Origem / Destino:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${solicitacao.origem} → ${solicitacao.destino}</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 10px; margin-bottom: 16px;">
                <tr>
                  <td align="center">
                    <a href="${baseUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 6px;">
                      Visualizar Demanda no Painel
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <p style="margin: 0; font-size: 11px; color: #64748b;">
                      Link direto para acesso ao site: <a href="${baseUrl}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 600; word-break: break-all;">${baseUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 14px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b;">
              Central Logística CBP • Coordenação de Patrimônio Material
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Generates an Outlook test message.
 */
export function generateTestTemplate(destinatario: string, serverName: string, appUrl?: string): string {
  const baseUrl = appUrl || DEFAULT_APP_URL;
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Teste de Conexão Outlook</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding: 30px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background-color: #0f172a; padding: 22px 30px; border-bottom: 3px solid #10b981;">
              <div style="font-size: 11px; font-weight: 700; color: #34d399; text-transform: uppercase;">Central Logística CBP • Ministério Público</div>
              <div style="font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 4px;">✅ Conexão com o Outlook Confirmada</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 26px 30px;">
              <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
                Prezado(a) Coordenador(a),
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                Este e-mail confirma que o <strong>mecanismo de notificações para o Microsoft Outlook</strong> está operando com sucesso na Central Logística CBP.
              </p>
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 600;">
                  Destinatário de Teste: ${destinatario}
                </p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #15803d;">
                  Servidor / Modo: ${serverName} • Enviado em: ${new Date().toLocaleString("pt-BR")}
                </p>
              </div>
              <p style="font-size: 13px; line-height: 1.6; color: #64748b;">
                A partir de agora, qualquer nova demanda cadastrada para a <strong>Coordenação de Patrimônio Material</strong> ou demais setores gerará um alerta formatado para sua caixa de entrada no Outlook.
              </p>

              <!-- Link direto para acesso ao site -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 24px; margin-bottom: 12px;">
                <tr>
                  <td align="center">
                    <a href="${baseUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 13px 28px; border-radius: 8px; box-shadow: 0 2px 6px rgba(5, 150, 105, 0.25); letter-spacing: 0.3px;">
                      Acessar Central Logística CBP →
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <p style="margin: 0; font-size: 11px; color: #64748b;">
                      Link direto para acesso ao site: <a href="${baseUrl}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 600; word-break: break-all;">${baseUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 30px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b;">
              Coordenação de Patrimônio Material • Central Logística CBP
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Generates an Outlook-compatible HTML email when an activity is started / in execution.
 */
export function generateAtividadeIniciadaTemplate(solicitacao: Solicitacao, equipeNome?: string, responsavel?: string, appUrl?: string): string {
  const baseUrl = appUrl || DEFAULT_APP_URL;
  const itensList = Array.isArray(solicitacao.itens) && solicitacao.itens.length > 0
    ? solicitacao.itens.map(item => `<li style="margin-bottom: 4px; color: #1e293b;">${item}</li>`).join("")
    : "<li style=\"color: #64748b;\">Material logístico diverso informado no processo.</li>";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Central Logística] Atividade Iniciada: ${solicitacao.numero}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.06);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0369a1; padding: 24px 30px; border-bottom: 4px solid #38bdf8;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: #0284c7; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 10px; border-radius: 4px; border: 1px solid #38bdf8;">
                      🚀 ATIVIDADE INICIADA • EM ANDAMENTO
                    </span>
                    <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 8px 0 0 0; line-height: 1.3;">
                      Atividade Logística ${solicitacao.numero} Iniciada
                    </h1>
                    <p style="color: #e0f2fe; font-size: 13px; margin: 4px 0 0 0;">
                      Coordenação de Patrimônio Material • Central Logística CBP
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px 30px;">
              <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px 18px; margin-bottom: 22px;">
                <p style="margin: 0; font-size: 14px; color: #0369a1; font-weight: 600; line-height: 1.5;">
                  A execução da demanda foi formalmente iniciada pela equipe de logística e está em andamento.
                </p>
                ${responsavel ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #0284c7;">Ação iniciada por: <strong>${responsavel}</strong></p>` : ""}
              </div>

              <!-- Information Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; width: 36%; border-bottom: 1px solid #e2e8f0;">Número da Demanda:</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 700; color: #0369a1; border-bottom: 1px solid #e2e8f0;">
                    ${solicitacao.numero} ${solicitacao.processo ? `<span style="font-weight: 400; color: #64748b;">(${solicitacao.processo})</span>` : ""}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Tipo de Operação:</td>
                  <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    ${solicitacao.tipo} (Prioridade: ${solicitacao.prioridade})
                  </td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Equipe Designada:</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    🚚 ${equipeNome || "Equipe Operacional CBP"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Solicitante & Setor:</td>
                  <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    ${solicitacao.solicitante} • ${solicitacao.setor}
                  </td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Trajeto Físico:</td>
                  <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    <strong>De:</strong> ${solicitacao.origem}<br>
                    <strong>Para:</strong> ${solicitacao.destino}
                  </td>
                </tr>
                ${solicitacao.numeroTombo ? `
                <tr>
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Tombo Patrimonial:</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    🏷️ ${solicitacao.numeroTombo} (${solicitacao.estadoConservacao || "Seminovo"})
                  </td>
                </tr>` : ""}
              </table>

              <!-- Itens -->
              <div style="margin-bottom: 20px;">
                <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                  Bens e Materiais Sendo Movimentados:
                </div>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 18px;">
                  <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
                    ${itensList}
                  </ul>
                </div>
              </div>

              <!-- Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 14px; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${baseUrl}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 8px; box-shadow: 0 2px 6px rgba(2, 132, 199, 0.3); letter-spacing: 0.3px;">
                      Acompanhar Execução no Portal Central Logística →
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <p style="margin: 0; font-size: 11px; color: #64748b;">
                      Link direto para acesso ao site: <a href="${baseUrl}" target="_blank" style="color: #0284c7; text-decoration: underline; font-weight: 600; word-break: break-all;">${baseUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                Notificação automática gerada pela Central Logística CBP.<br>
                Coordenação de Patrimônio Material • Ministério Público Estadual.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Generates an Outlook-compatible HTML email when an activity is stagnant for more than 7 days.
 */
export function generateDemandaParadaTemplate(solicitacao: Solicitacao, diasParada: number, appUrl?: string): string {
  const baseUrl = appUrl || DEFAULT_APP_URL;
  const dataCriacaoFormatada = solicitacao.dataCriacao ? new Date(solicitacao.dataCriacao).toLocaleDateString("pt-BR") : "Data não informada";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Lembrete CBP] Demanda ${solicitacao.numero} parada há ${diasParada} dias</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; border: 1px solid #ea580c; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.06);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header Warning -->
          <tr>
            <td style="background-color: #9a3412; padding: 24px 30px; border-bottom: 4px solid #ea580c;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: #c2410c; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 10px; border-radius: 4px; border: 1px solid #fdba74;">
                      ⚠️ ATIVIDADE PARADA HÁ MAIS DE ${diasParada} DIAS
                    </span>
                    <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 8px 0 0 0; line-height: 1.3;">
                      Lembrete: Atividade ${solicitacao.numero} Aguarda Andamento
                    </h1>
                    <p style="color: #ffedd5; font-size: 13px; margin: 4px 0 0 0;">
                      Central Logística CBP • Coordenação de Patrimônio Material
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px 30px;">
              
              <!-- Warning Banner -->
              <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; border-top: 1px solid #ffedd5; border-right: 1px solid #ffedd5; border-bottom: 1px solid #ffedd5; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 22px;">
                <p style="margin: 0; font-size: 14px; color: #9a3412; font-weight: 700; line-height: 1.5;">
                  Esta atividade está registrada há ${diasParada} dias corridos e ainda não foi concluída.
                </p>
                <p style="margin: 6px 0 0 0; font-size: 13px; color: #c2410c; line-height: 1.5;">
                  Status atual: <strong>${solicitacao.status}</strong> (desde ${dataCriacaoFormatada}). Pedimos a gentileza de revisar esta pendência para dar continuidade à execução ou registrar a homologação/conclusão.
                </p>
              </div>

              <!-- Demand Details -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; width: 36%; border-bottom: 1px solid #e2e8f0;">Código / Processo:</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 700; color: #c2410c; border-bottom: 1px solid #e2e8f0;">
                    ${solicitacao.numero} ${solicitacao.processo ? `<span style="font-weight: 400; color: #64748b;">(${solicitacao.processo})</span>` : ""}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Tipo & Prioridade:</td>
                  <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    ${solicitacao.tipo} • Prioridade: <strong>${solicitacao.prioridade}</strong>
                  </td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Setor Solicitante:</td>
                  <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    ${solicitacao.solicitante} (${solicitacao.setor})
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Origem e Destino:</td>
                  <td style="padding: 10px 16px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    ${solicitacao.origem} → ${solicitacao.destino}
                  </td>
                </tr>
                ${solicitacao.observacoes ? `
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Observações:</td>
                  <td style="padding: 10px 16px; font-size: 13px; color: #475569; border-bottom: 1px solid #e2e8f0;">
                    ${solicitacao.observacoes}
                  </td>
                </tr>` : ""}
              </table>

              <!-- Call to action button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 14px; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${baseUrl}" target="_blank" style="display: inline-block; background-color: #ea580c; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 8px; box-shadow: 0 2px 6px rgba(234, 88, 12, 0.3); letter-spacing: 0.3px;">
                      Acessar e Dar Andamento à Demanda →
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <p style="margin: 0; font-size: 11px; color: #64748b;">
                      Link direto para acesso ao site: <a href="${baseUrl}" target="_blank" style="color: #ea580c; text-decoration: underline; font-weight: 600; word-break: break-all;">${baseUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                Este lembrete automático é enviado a cada 7 dias para atividades não finalizadas.<br>
                Coordenação de Patrimônio Material • Central Logística CBP.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Generates an Outlook-compatible HTML email sent every 4 days reminding users to access the platform.
 */
export function generateLembreteAcessoSiteTemplate(
  metricas: { totalAbertas: number; emExecucao: number; concluidasMes: number; paradas: number },
  appUrl?: string
): string {
  const baseUrl = appUrl || DEFAULT_APP_URL;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Central Logística CBP] Lembrete Operacional: Acesse o sistema e acompanhe suas atividades</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.06);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0f766e; padding: 26px 30px; border-bottom: 4px solid #14b8a6;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: #115e59; color: #ccfbf1; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 10px; border-radius: 4px; border: 1px solid #2dd4bf;">
                      📢 LEMBRETE OPERACIONAL (A CADA 4 DIAS)
                    </span>
                    <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 8px 0 0 0; line-height: 1.3;">
                      Acesse a Central Logística CBP
                    </h1>
                    <p style="color: #ccfbf1; font-size: 13px; margin: 4px 0 0 0;">
                      Coordenação de Patrimônio Material • Gestão Operacional de Bens e Transportes
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px 30px;">
              <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
                Prezados(as) colegas e servidores do Ministério Público,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                Este é o seu <strong>lembrete periódico de uso da Central Logística CBP</strong>. Manter as atividades patrimoniais e de transporte atualizadas no sistema garante agilidade no atendimento e transparência no controle de bens públicos.
              </p>

              <!-- KPI Dashboard Cards in Email (Outlook friendly table) -->
              <table role="presentation" width="100%" cellspacing="6" cellpadding="0" border="0" style="margin: 20px 0;">
                <tr>
                  <td width="50%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 800; color: #16a34a;">${metricas.emExecucao}</div>
                    <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; margin-top: 2px;">Em Execução</div>
                  </td>
                  <td width="50%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 800; color: #2563eb;">${metricas.totalAbertas}</div>
                    <div style="font-size: 11px; font-weight: 700; color: #1e40af; text-transform: uppercase; margin-top: 2px;">Aguardando / Abertas</div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 14px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 800; color: #ea580c;">${metricas.paradas}</div>
                    <div style="font-size: 11px; font-weight: 700; color: #9a3412; text-transform: uppercase; margin-top: 2px;">Paradas (+7 dias)</div>
                  </td>
                  <td width="50%" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 800; color: #0f172a;">${metricas.concluidasMes}</div>
                    <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-top: 2px;">Concluídas</div>
                  </td>
                </tr>
              </table>

              <!-- Best Practices Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                  📌 Dicas para manter sua rotina logística em dia:
                </div>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                  <li><strong>Acompanhe o status:</strong> Veja se suas solicitações de material ou transporte já estão na rota de entrega.</li>
                  <li><strong>Homologue o recebimento:</strong> Ao receber os itens em sua sala/promotoria, confirme a conclusão no sistema.</li>
                  <li><strong>Cadastre novas demandas:</strong> Precisa movimentar mobiliário ou equipamentos? Abra uma nova solicitação em poucos cliques.</li>
                </ul>
              </div>

              <!-- Big CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 10px; margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <a href="${baseUrl}" target="_blank" style="display: inline-block; background-color: #0f766e; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 15px 32px; border-radius: 8px; box-shadow: 0 3px 8px rgba(15, 118, 110, 0.3); letter-spacing: 0.3px;">
                      Acessar Central Logística CBP Agora →
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <p style="margin: 0; font-size: 11px; color: #64748b;">
                      Link direto para acesso ao site: <a href="${baseUrl}" target="_blank" style="color: #0f766e; text-decoration: underline; font-weight: 600; word-break: break-all;">${baseUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                Este lembrete automático é enviado a cada 4 dias para todos os usuários cadastrados.<br>
                Coordenação de Patrimônio Material • Central Logística CBP.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Filtra destinatários para aceitar somente contas corporativas/Outlook,
 * ignorando expressamente contas @gmail.com e @googlemail.com.
 */
export function filterOutlookRecipients(emails: (string | undefined | null)[]): string[] {
  return emails
    .filter((e): e is string => Boolean(e && typeof e === "string"))
    .map(e => e.trim())
    .filter(e => {
      const lower = e.toLowerCase();
      if (lower.endsWith("@gmail.com") || lower.endsWith("@googlemail.com")) {
        return false;
      }
      return true;
    });
}

/**
 * Core dispatcher to send real or simulated email.
 */
export async function sendOutlookEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  solicitacaoId?: string;
  solicitacaoNumero?: string;
  tipo?: string;
}): Promise<{ success: boolean; status: "enviado" | "simulado" | "falha"; errorMsg?: string }> {
  const rawRecipients = Array.isArray(params.to) ? params.to : [params.to];
  const recipientsList = filterOutlookRecipients(rawRecipients);
  const toClean = recipientsList.join(", ");

  if (!toClean) {
    console.log("[EmailService] Envio ignorado: contas Gmail descartadas (envio restrito a contas Outlook/institucionais).");
    return {
      success: true,
      status: "simulado",
      errorMsg: "Envio cancelado: destinatários pertencem ao domínio Gmail. Sistema configurado para disparar exclusivamente para contas Outlook/institucionais."
    };
  }

  const logId = `EML-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      currentConfig = { ...currentConfig, ...parsed };
    }
  } catch (e) {}

  // Check if real SMTP credentials are provided
  const hasCredentials = Boolean(
    currentConfig.smtpUser && 
    currentConfig.smtpPass && 
    currentConfig.smtpHost && 
    !currentConfig.smtpHost.includes("cbp_logistica") &&
    currentConfig.smtpUser !== "cbp_logistica" &&
    currentConfig.smtpPass !== "cbp_logistica"
  );

  if (hasCredentials) {
    try {
      const transporter = nodemailer.createTransport({
        host: currentConfig.smtpHost,
        port: currentConfig.smtpPort,
        secure: currentConfig.smtpSecure, // false for port 587
        requireTLS: !currentConfig.smtpSecure,
        auth: {
          user: currentConfig.smtpUser,
          pass: currentConfig.smtpPass
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const senderAddress = (currentConfig.smtpHost.includes("office365") || currentConfig.smtpHost.includes("outlook") || currentConfig.smtpHost.includes("gmail"))
        ? currentConfig.smtpUser
        : (currentConfig.senderEmail || currentConfig.smtpUser);

      await transporter.sendMail({
        from: `"${currentConfig.senderName}" <${senderAddress}>`,
        to: toClean,
        subject: params.subject,
        html: params.html
      });

      const logItem: EmailLog = {
        id: logId,
        to: toClean,
        subject: params.subject,
        html: params.html,
        sentAt: new Date().toISOString(),
        status: "enviado",
        solicitacaoId: params.solicitacaoId,
        solicitacaoNumero: params.solicitacaoNumero,
        tipo: params.tipo || "Notificação de Demanda"
      };

      emailLogs.unshift(logItem);
      saveLogsToDisk();
      return { success: true, status: "enviado" };
    } catch (err: any) {
      console.error("[EmailService] Erro ao enviar e-mail real via SMTP Outlook:", err);
      const errMsg = err?.message || String(err);

      // Record failure in logs
      const logItem: EmailLog = {
        id: logId,
        to: toClean,
        subject: params.subject,
        html: params.html,
        sentAt: new Date().toISOString(),
        status: "falha",
        errorMsg: errMsg,
        solicitacaoId: params.solicitacaoId,
        solicitacaoNumero: params.solicitacaoNumero,
        tipo: params.tipo || "Notificação de Demanda"
      };

      emailLogs.unshift(logItem);
      saveLogsToDisk();
      return { success: false, status: "falha", errorMsg: errMsg };
    }
  } else {
    // Mode: Simulated / Preview (Audit Logged)
    // Logs the full, ready-to-inspect email in system without blocking, allowing inspection in UI!
    const logItem: EmailLog = {
      id: logId,
      to: toClean,
      subject: params.subject,
      html: params.html,
      sentAt: new Date().toISOString(),
      status: "simulado",
      solicitacaoId: params.solicitacaoId,
      solicitacaoNumero: params.solicitacaoNumero,
      tipo: params.tipo || "Notificação de Demanda"
    };

    emailLogs.unshift(logItem);
    saveLogsToDisk();
    return { success: true, status: "simulado" };
  }
}

/**
 * Triggers notification for newly created demand.
 */
export async function notifyNewSolicitacao(solicitacao: Solicitacao, extraRecipients: string[] = []): Promise<void> {
  if (!currentConfig.ativo || !currentConfig.notificarNovasDemandas) {
    return;
  }

  // Combine configured default recipients with any extra emails passed (e.g. coordinators)
  const combined = Array.from(new Set([
    ...(currentConfig.destinatarios || []),
    ...extraRecipients
  ])).filter(Boolean);

  if (combined.length === 0) return;

  const subject = `[Central Logística] Nova Demanda ${solicitacao.numero} - ${solicitacao.setor || "Coordenação de Patrimônio Material"} (Prioridade: ${solicitacao.prioridade})`;
  const html = generateOutlookDemandTemplate(solicitacao);

  await sendOutlookEmail({
    to: combined,
    subject,
    html,
    solicitacaoId: solicitacao.id,
    solicitacaoNumero: solicitacao.numero,
    tipo: `Nova Demanda (${solicitacao.tipo})`
  });
}

/**
 * Triggers notification for status change.
 */
export async function notifySolicitacaoStatusChange(
  solicitacao: Solicitacao,
  statusAnterior: string,
  novoStatus: string,
  usuarioAcao?: string
): Promise<void> {
  if (!currentConfig.ativo || !currentConfig.notificarMudancaStatus) {
    return;
  }

  const combined = (currentConfig.destinatarios || []).filter(Boolean);
  if (combined.length === 0) return;

  const subject = `[Central Logística] Demanda ${solicitacao.numero} atualizada: ${novoStatus}`;
  const html = generateStatusChangeTemplate(solicitacao, statusAnterior, novoStatus, usuarioAcao);

  await sendOutlookEmail({
    to: combined,
    subject,
    html,
    solicitacaoId: solicitacao.id,
    solicitacaoNumero: solicitacao.numero,
    tipo: `Atualização de Status: ${novoStatus}`
  });
}

/**
 * Tests connection by sending an immediate email.
 */
export async function sendTestEmail(targetEmail: string, appUrl?: string): Promise<{ success: boolean; status: "enviado" | "simulado" | "falha"; message: string }> {
  const cleanTarget = targetEmail.trim().toLowerCase();
  if (cleanTarget.endsWith("@gmail.com") || cleanTarget.endsWith("@googlemail.com")) {
    return {
      success: false,
      status: "falha",
      message: "Envios para contas Gmail estão desativados por solicitação do usuário. Utilize um e-mail do Microsoft Outlook / institucional (ex: guilherme.brito.ter@mpba.mp.br)."
    };
  }

  const serverDesc = currentConfig.smtpUser 
    ? `${currentConfig.smtpHost}:${currentConfig.smtpPort} (${currentConfig.smtpUser})` 
    : "Simulação de Entrega Outlook (Insira as credenciais de SMTP para envio direto)";
  
  const baseUrl = appUrl || DEFAULT_APP_URL;
  const html = generateTestTemplate(targetEmail, serverDesc, baseUrl);
  const subject = `[Central Logística] Teste de Conexão com Microsoft Outlook • ${new Date().toLocaleTimeString("pt-BR")}`;

  const res = await sendOutlookEmail({
    to: targetEmail,
    subject,
    html,
    tipo: "Teste de Conexão"
  });

  if (res.status === "enviado") {
    return {
      success: true,
      status: "enviado",
      message: `E-mail de teste enviado com sucesso via SMTP para ${targetEmail}!`
    };
  } else if (res.status === "simulado") {
    return {
      success: true,
      status: "simulado",
      message: `E-mail gerado com sucesso em modo de demonstração/auditoria! Para receber na sua caixa real do Outlook, configure o usuário/senha do Microsoft 365 na aba de Configurações.`
    };
  } else {
    return {
      success: false,
      status: "falha",
      message: `Erro ao enviar e-mail via servidor SMTP: ${res.errorMsg}`
    };
  }
}

/**
 * Triggers notification when a new user registers and is pending approval.
 */
export async function notifyNewUserPending(usuario: Usuario, emailsCoordenadores: string[], appUrl?: string): Promise<void> {
  if (!currentConfig.ativo) return;
  const baseUrl = appUrl || DEFAULT_APP_URL;
  const combined = Array.from(new Set([...(currentConfig.destinatarios || []), ...emailsCoordenadores])).filter(Boolean);
  if (combined.length === 0) return;

  const subject = `[Central Logística] Novo Usuário Pendente: ${usuario.nome} (${usuario.setor})`;
  const html = `
  <div style="font-family: 'Segoe UI', Tahoma, sans-serif; padding: 24px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; max-width: 580px; margin: 0 auto;">
    <div style="font-size: 11px; font-weight: 700; color: #d97706; text-transform: uppercase; margin-bottom: 6px;">Central Logística CBP • Ministério Público</div>
    <h3 style="color: #0f172a; margin-top: 0; font-size: 18px;">Novo Cadastro de Acesso Pendente</h3>
    <p style="font-size: 14px; color: #334155; line-height: 1.5;">
      O servidor <strong>${usuario.nome}</strong> (<code>${usuario.email}</code>) do setor <strong>${usuario.setor}</strong> solicitou acesso à Central com o perfil <strong>${usuario.funcao}</strong>.
    </p>
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      Acesse o módulo de <em>Gestão de Usuários</em> na Central Logística CBP para aprovar ou ajustar o cadastro.
    </p>
    <div style="text-align: center; margin-top: 20px;">
      <a href="${baseUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 11px 24px; border-radius: 6px;">
        Acessar Gestão de Usuários no Sistema →
      </a>
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #64748b;">
        Link direto para acesso ao site: <a href="${baseUrl}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 600; word-break: break-all;">${baseUrl}</a>
      </p>
    </div>
  </div>`;

  await sendOutlookEmail({
    to: combined,
    subject,
    html,
    tipo: "Novo Usuário Pendente"
  });
}

/**
 * Triggers notification to user once approved.
 */
export async function notifyUserApproved(usuario: Usuario, appUrl?: string): Promise<void> {
  if (!currentConfig.ativo || !usuario.email) return;
  const baseUrl = appUrl || DEFAULT_APP_URL;

  const subject = `[Central Logística] Seu acesso ao sistema foi aprovado!`;
  const html = `
  <div style="font-family: 'Segoe UI', Tahoma, sans-serif; padding: 24px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; max-width: 580px; margin: 0 auto;">
    <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; margin-bottom: 6px;">Central Logística CBP • Ministério Público</div>
    <h3 style="color: #166534; margin-top: 0; font-size: 18px;">Acesso Aprovado com Sucesso!</h3>
    <p style="font-size: 14px; color: #166534; line-height: 1.5;">
      Olá, <strong>${usuario.nome}</strong>. Seu acesso à Central Logística CBP foi homologado e ativado.
    </p>
    <p style="font-size: 13px; color: #15803d; line-height: 1.5;">
      Você já pode se autenticar na plataforma utilizando seu e-mail funcional cadastrado.
    </p>
    <div style="text-align: center; margin-top: 20px;">
      <a href="${baseUrl}" target="_blank" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 11px 24px; border-radius: 6px;">
        Entrar na Central Logística Agora →
      </a>
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #15803d;">
        Link direto para acesso ao site: <a href="${baseUrl}" target="_blank" style="color: #15803d; text-decoration: underline; font-weight: 600; word-break: break-all;">${baseUrl}</a>
      </p>
    </div>
  </div>`;

  await sendOutlookEmail({
    to: usuario.email,
    subject,
    html,
    tipo: "Usuário Aprovado"
  });
}

/**
 * Triggers notification when an activity is started / in execution.
 */
export async function notifyAtividadeIniciada(
  solicitacao: Solicitacao,
  equipeNome?: string,
  responsavel?: string,
  extraRecipients: string[] = []
): Promise<void> {
  if (!currentConfig.ativo || !currentConfig.notificarAtividadeIniciada) {
    return;
  }

  const combined = Array.from(new Set([
    ...(currentConfig.destinatarios || []),
    ...extraRecipients
  ])).filter(Boolean);

  if (combined.length === 0) return;

  const subject = `🚀 [Central Logística] Atividade Iniciada: ${solicitacao.numero} - ${solicitacao.tipo} em Andamento`;
  const html = generateAtividadeIniciadaTemplate(solicitacao, equipeNome, responsavel);

  await sendOutlookEmail({
    to: combined,
    subject,
    html,
    solicitacaoId: solicitacao.id,
    solicitacaoNumero: solicitacao.numero,
    tipo: `Atividade Iniciada (${solicitacao.tipo})`
  });
}

/**
 * Checks for activities stagnant / stopped for more than X days (default 7 days / 1 week)
 * and dispatches reminder emails to responsible parties.
 */
export async function verificarENotificarDemandasParadas(
  solicitacoes: Solicitacao[],
  usuarios: Usuario[] = []
): Promise<{ notificadas: number; detalhes: string[] }> {
  if (!currentConfig.ativo || !currentConfig.notificarAtividadeParadaSemana) {
    return { notificadas: 0, detalhes: [] };
  }

  const diasLimite = currentConfig.diasAtividadeParada || 7;
  const agora = Date.now();
  const limiteMs = diasLimite * 24 * 60 * 60 * 1000;
  const vinteQuatroHorasMs = 24 * 60 * 60 * 1000;

  const detalhes: string[] = [];
  let notificadas = 0;

  for (const sol of solicitacoes) {
    // Only check active demands that are NOT concluded or canceled
    if (sol.status === "Concluída" || sol.status === "Realizada" || sol.status === "Cancelada") {
      continue;
    }

    const dataRefStr = sol.dataEdicao || sol.dataCriacao;
    if (!dataRefStr) continue;

    const dataRefTime = new Date(dataRefStr).getTime();
    if (isNaN(dataRefTime)) continue;

    const diffMs = agora - dataRefTime;
    if (diffMs >= limiteMs) {
      const diasParada = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Avoid re-alerting if we already sent a stagnant reminder within the last 24h
      if (sol.ultimaNotificacaoParadaEm) {
        const lastNotifTime = new Date(sol.ultimaNotificacaoParadaEm).getTime();
        if (agora - lastNotifTime < vinteQuatroHorasMs) {
          continue;
        }
      }

      // Find solicitante email if available (apenas contas Outlook / corporativas)
      const solUser = usuarios.find(u => 
        u.nome && sol.solicitante && u.nome.toLowerCase().trim() === sol.solicitante.toLowerCase().trim()
      );
      const userEmail = solUser?.email;

      const combined = filterOutlookRecipients(Array.from(new Set([
        ...(currentConfig.destinatarios || []),
        userEmail
      ])));

      if (combined.length > 0) {
        const subject = `⚠️ [Lembrete CBP] Demanda ${sol.numero} parada há mais de ${diasParada} dias (${sol.tipo})`;
        const html = generateDemandaParadaTemplate(sol, diasParada);

        await sendOutlookEmail({
          to: combined,
          subject,
          html,
          solicitacaoId: sol.id,
          solicitacaoNumero: sol.numero,
          tipo: `Alerta: Demanda Parada (${diasParada} dias)`
        });

        sol.ultimaNotificacaoParadaEm = new Date().toISOString();
        notificadas++;
        detalhes.push(`Demanda ${sol.numero} (${sol.tipo}) parada há ${diasParada} dias -> Notificada para ${combined.join(", ")}`);
      }
    }
  }

  return { notificadas, detalhes };
}

/**
 * Sends periodic reminder every 4 days to remind users to access the platform.
 */
export async function dispararLembreteAcessoSite(
  solicitacoes: Solicitacao[],
  usuarios: Usuario[] = [],
  forcar: boolean = false
): Promise<{ enviado: boolean; motivo?: string; totalDestinatarios?: number }> {
  if (!currentConfig.ativo || (!currentConfig.notificarLembreteAcesso && !forcar)) {
    return { enviado: false, motivo: "Notificação de lembrete de acesso desativada nas configurações." };
  }

  const intervalDias = currentConfig.lembreteAcessoSiteDias || 4;
  const agora = Date.now();

  if (!forcar && currentConfig.ultimoLembreteAcessoEm) {
    const ultimoEnvio = new Date(currentConfig.ultimoLembreteAcessoEm).getTime();
    if (!isNaN(ultimoEnvio)) {
      const diffDias = (agora - ultimoEnvio) / (1000 * 60 * 60 * 24);
      if (diffDias < intervalDias) {
        return { 
          enviado: false, 
          motivo: `Intervalo de ${intervalDias} dias ainda não transcorreu (último envio há ${diffDias.toFixed(1)} dias).` 
        };
      }
    }
  }

  // Calculate system metrics
  const totalAbertas = solicitacoes.filter(s => s.status === "Aberta" || s.status === "Em análise" || s.status === "Aprovada").length;
  const emExecucao = solicitacoes.filter(s => s.status === "Em execução" || s.status === "Planejada").length;
  const concluidasMes = solicitacoes.filter(s => s.status === "Concluída" || s.status === "Realizada").length;
  const diasLimite = currentConfig.diasAtividadeParada || 7;
  const paradas = solicitacoes.filter(s => {
    if (s.status === "Concluída" || s.status === "Realizada" || s.status === "Cancelada") return false;
    const ref = s.dataEdicao || s.dataCriacao;
    if (!ref) return false;
    const diff = (agora - new Date(ref).getTime()) / (1000 * 60 * 60 * 24);
    return diff >= diasLimite;
  }).length;

  const metricas = { totalAbertas, emExecucao, concluidasMes, paradas };

  const userEmails = filterOutlookRecipients(usuarios.map(u => u.email));
  const combined = Array.from(new Set([
    ...filterOutlookRecipients(currentConfig.destinatarios || []),
    ...userEmails
  ])).filter(Boolean);

  if (combined.length === 0) {
    return { enviado: false, motivo: "Nenhum destinatário Outlook/institucional cadastrado para o lembrete." };
  }

  const subject = `📢 [Central Logística CBP] Lembrete Operacional: Acesse o sistema e acompanhe suas atividades`;
  const html = generateLembreteAcessoSiteTemplate(metricas);

  await sendOutlookEmail({
    to: combined,
    subject,
    html,
    tipo: "Lembrete Periódico de Uso (4 dias)"
  });

  currentConfig.ultimoLembreteAcessoEm = new Date().toISOString();
  saveConfigToDisk();

  return { enviado: true, totalDestinatarios: combined.length };
}

