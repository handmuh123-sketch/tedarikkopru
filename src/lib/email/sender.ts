import "server-only";

import nodemailer from "nodemailer";

import { emailConfig } from "@/lib/email/config";
import { logger } from "@/lib/logging/logger";

export type DevelopmentEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const emailGlobal = globalThis as unknown as { developmentMailbox?: DevelopmentEmail[] };
const developmentMailbox = emailGlobal.developmentMailbox ?? [];
if (process.env.NODE_ENV !== "production") emailGlobal.developmentMailbox = developmentMailbox;

const smtpTransport = nodemailer.createTransport({
  host: emailConfig.developmentSmtp.host,
  port: emailConfig.developmentSmtp.port,
  secure: false,
  disableFileAccess: true,
  disableUrlAccess: true,
});

export async function sendApplicationEmail(message: DevelopmentEmail): Promise<void> {
  if (process.env.NODE_ENV === "test" || emailConfig.provider === "log") {
    developmentMailbox.push(message);
    logger.info(
      { event: "development_email_queued", template: message.subject },
      "E-posta sıraya alındı.",
    );
    return;
  }

  if (emailConfig.provider !== "smtp") {
    throw new Error("Canlı e-posta sağlayıcısı Faz 1 kapsamında kapalıdır.");
  }

  await smtpTransport.sendMail({
    from: emailConfig.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
  logger.info(
    { event: "development_email_sent", template: message.subject },
    "E-posta gönderildi.",
  );
}

export function peekDevelopmentEmails(): readonly DevelopmentEmail[] {
  return developmentMailbox;
}

export function drainDevelopmentEmails(): DevelopmentEmail[] {
  return developmentMailbox.splice(0, developmentMailbox.length);
}

export function verificationEmail(to: string, url: string): DevelopmentEmail {
  return {
    to,
    subject: "E-posta adresinizi doğrulayın",
    text: `TedarikKöprü hesabınızı doğrulamak için bağlantıyı açın: ${url}`,
    html: `<p>TedarikKöprü hesabınızı doğrulamak için <a href="${url}">e-posta adresinizi doğrulayın</a>.</p>`,
  };
}

export function passwordResetEmail(to: string, url: string): DevelopmentEmail {
  return {
    to,
    subject: "Parolanızı yenileyin",
    text: `Parolanızı güvenli biçimde yenilemek için bağlantıyı açın: ${url}`,
    html: `<p>Parolanızı güvenli biçimde yenilemek için <a href="${url}">parola yenileme sayfasını açın</a>.</p>`,
  };
}

export function invitationEmail(
  to: string,
  url: string,
  organizationName: string,
): DevelopmentEmail {
  return {
    to,
    subject: "İşletme üyeliği daveti",
    text: `${organizationName} işletmesine katılmak için bağlantıyı açın: ${url}`,
    html: `<p>${organizationName} işletmesine katılmak için <a href="${url}">daveti kabul edin</a>.</p>`,
  };
}
