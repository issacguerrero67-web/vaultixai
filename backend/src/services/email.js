import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendReportEmail(to, reportId, summary) {
  // TODO: implement report delivery email
}

export async function sendWelcomeEmail(to, name) {
  // TODO: implement welcome email
}
