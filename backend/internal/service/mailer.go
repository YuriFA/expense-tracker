package service

import (
	"context"
	"log/slog"
)

// Mailer sends transactional auth emails. The default implementation is a
// log-only stub (NewLogMailer, dev default); NewSMTPMailer delivers through
// an SMTP relay when SMTP_HOST is configured (wiring in cmd picks one).
// Implementations are best-effort: failures are logged, not returned as
// flow errors.
type Mailer interface {
	SendVerificationCode(ctx context.Context, to, code string) error
	SendPasswordResetToken(ctx context.Context, to, token string) error
	SendHouseholdInvitation(ctx context.Context, to, link string) error
}

// logMailer is the default Mailer: it logs the code/token instead of sending.
// Never panics, never fails - auth flows must not break on mailer issues.
type logMailer struct {
	log *slog.Logger
}

// NewLogMailer returns a Mailer that logs verification/reset secrets at info
// level (dev convenience - the code appears in server logs).
func NewLogMailer(log *slog.Logger) Mailer {
	return &logMailer{log: log}
}

func (m *logMailer) SendVerificationCode(ctx context.Context, to, code string) error {
	m.log.InfoContext(ctx, "verification code issued", slog.String("email", to), slog.String("code", code))
	return nil
}

func (m *logMailer) SendPasswordResetToken(ctx context.Context, to, token string) error {
	m.log.InfoContext(ctx, "password reset token issued", slog.String("email", to), slog.String("reset_token", token))
	return nil
}

func (m *logMailer) SendHouseholdInvitation(ctx context.Context, to, link string) error {
	m.log.InfoContext(ctx, "household invitation issued", slog.String("email", to), slog.String("accept_link", link))
	return nil
}
