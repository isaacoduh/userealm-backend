import { BadRequestError } from "./../../globals/helpers/error-handler";
import { config } from "./../../../config";
import nodemailer from "nodemailer";

import Mail from "nodemailer/lib/mailer";

import Logger from "bunyan";
import SMTPTransport from "nodemailer/lib/smtp-transport";

interface IMailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

const log: Logger = config.createLogger("mailOptions");

class MailTransport {
  public async sendEmail(
    receiverEmail: string,
    subject: string,
    body: string
  ): Promise<void> {
    if (
      config.NODE_ENV === "test" ||
      config.NODE_ENV === "development" ||
      config.NODE_ENV === "local"
    ) {
      this.developmentEmailSender(receiverEmail, subject, body);
    } else {
      this.productionEmailSender(receiverEmail, subject, body);
    }
  }

  private async developmentEmailSender(
    receiverEmail: string,
    subject: string,
    body: string
  ): Promise<void> {
    let hstring: string = "sanbox.smtp.mailtrap.io";
    var transport = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: config.SENDER_EMAIL,
        pass: config.SENDER_EMAIL_PASSWORD,
      },
    });

    const mailOptions: IMailOptions = {
      from: `UseRealm App <${config.SENDER_EMAIL!}>`,
      to: receiverEmail,
      subject,
      html: body,
    };

    try {
      await transport.sendMail(mailOptions);
      log.info("Development email sent successfully");
    } catch (error) {
      log.error("Error sending email", error);
      throw new BadRequestError("Error sending email!");
    }
  }

  private async productionEmailSender(
    receiverEmail: string,
    subject: string,
    body: string
  ): Promise<void> {
    const mailOptions: IMailOptions = {
      from: `UseRealm App <${config.SENDER_EMAIL!}>`,
      to: receiverEmail,
      subject,
      html: body,
    };

    try {
    } catch (error) {}
  }
}

export const mailTransport: MailTransport = new MailTransport();
