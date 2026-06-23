import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.from = config.get<string>('RESEND_FROM_EMAIL', 'Marketing ERP <noreply@marketingerp.com>');
    this.resend = apiKey ? new Resend(apiKey) : null;

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not set — email sending disabled');
    }
  }

  async send(params: SendEmailParams): Promise<void> {
    if (!this.resend) return;
    try {
      await this.resend.emails.send({
        from: this.from,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${params.to}: ${(err as Error).message}`);
    }
  }

  async sendTaskAssigned(params: { toEmail: string; toName: string; taskTitle: string; projectName: string; taskLink: string }): Promise<void> {
    await this.send({
      to: params.toEmail,
      subject: `Task assigned: ${params.taskTitle}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto">
          <h2 style="color:#7B6CF0">You have a new task</h2>
          <p>Hi ${params.toName},</p>
          <p>You were assigned to the task <strong>${params.taskTitle}</strong> in project <strong>${params.projectName}</strong>.</p>
          <a href="${params.taskLink}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#7B6CF0;color:#fff;border-radius:6px;text-decoration:none">View Task</a>
        </div>`,
    });
  }

  async sendTaskOverdue(params: { toEmail: string; toName: string; taskTitle: string; projectName: string; dueDate: string; taskLink: string }): Promise<void> {
    await this.send({
      to: params.toEmail,
      subject: `Overdue task: ${params.taskTitle}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto">
          <h2 style="color:#fb7185">Task overdue</h2>
          <p>Hi ${params.toName},</p>
          <p>The task <strong>${params.taskTitle}</strong> in project <strong>${params.projectName}</strong> was due on <strong>${params.dueDate}</strong> and is still not completed.</p>
          <a href="${params.taskLink}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#fb7185;color:#fff;border-radius:6px;text-decoration:none">View Task</a>
        </div>`,
    });
  }

  async sendReportReady(params: { toEmail: string; toName: string; projectName: string; reportLink: string }): Promise<void> {
    await this.send({
      to: params.toEmail,
      subject: `Report ready: ${params.projectName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto">
          <h2 style="color:#4ade80">Your report is ready</h2>
          <p>Hi ${params.toName},</p>
          <p>The AI-generated report for <strong>${params.projectName}</strong> is ready to view.</p>
          <a href="${params.reportLink}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#4ade80;color:#000;border-radius:6px;text-decoration:none">View Report</a>
        </div>`,
    });
  }
}
