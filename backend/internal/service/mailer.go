package service

import (
	"context"
	"log/slog"
)

// Mailer sends transactional auth emails. Real email delivery is out of scope
// for this rework; the default implementation is a log-only stub. Swap in a
// real sender (SES, SMTP, ...) by implementing this interface.
type Mailer interface {
	SendVerificationCode(ctx context.Context, to, code string) error
	SendPasswordResetToken(ctx context.Context, to, token string) error
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

func (m *logMailer) SendVerificationCode(_ context.Context, to, code string) error {
	m.log.Info("verification code issued", slog.String("email", to), slog.String("code", code))
	return nil
}

func (m *logMailer) SendPasswordResetToken(_ context.Context, to, token string) error {
	m.log.Info("password reset token issued", slog.String("email", to), slog.String("reset_token", token))
	return nil
}
