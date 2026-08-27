package domain

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Date is a day-granularity calendar date carried on the wire as YYYY-MM-DD
// (OpenAPI format: date). JSON (de)coding is date-only - unlike [time.Time],
// which requires RFC3339 - so sync payloads round-trip plan dates verbatim.
// The wrapped time is UTC midnight.
type Date struct{ time.Time }

const dateLayout = "2006-01-02"

// daysPerWeek is the weekly-advance step in calendar days (mnd).
const daysPerWeek = 7

func NewDate(year int, month time.Month, day int) Date {
	return Date{time.Date(year, month, day, 0, 0, 0, 0, time.UTC)}
}

func (d Date) MarshalJSON() ([]byte, error) {
	return []byte(`"` + d.UTC().Format(dateLayout) + `"`), nil
}

func (d *Date) UnmarshalJSON(b []byte) error {
	s := string(b)
	if len(s) < 2 || s[0] != '"' || s[len(s)-1] != '"' {
		return fmt.Errorf("date must be a quoted YYYY-MM-DD string, got %s", s)
	}
	t, err := time.ParseInLocation(dateLayout, s[1:len(s)-1], time.UTC)
	if err != nil {
		return fmt.Errorf("date must be YYYY-MM-DD: %w", err)
	}
	d.Time = t
	return nil
}

// PlannedRegularity is how a planned payment recurs. Occurrences are computed
// from the anchor date's day (day-of-month for monthly, weekday for weekly,
// month-and-day for yearly); shorter months clamp to their last day and later
// occurrences return to the anchor (Jan 31 -> Feb 28/29 -> Mar 31).
type PlannedRegularity string

const (
	PlannedRegularityDaily   PlannedRegularity = "daily"
	PlannedRegularityWeekly  PlannedRegularity = "weekly"
	PlannedRegularityMonthly PlannedRegularity = "monthly"
	PlannedRegularityYearly  PlannedRegularity = "yearly"
)

// PlannedConfirmMode is who confirms an occurrence: manual — the user
// confirms each occurrence from the client; auto — the server job creates
// the transaction without user action once the date arrives.
type PlannedConfirmMode string

const (
	PlannedConfirmManual PlannedConfirmMode = "manual"
	PlannedConfirmAuto   PlannedConfirmMode = "auto"
)

// PlannedReminder is the local-notification setting of a plan (devices
// schedule their own reminders; nothing is pushed from the server).
type PlannedReminder string

const (
	PlannedReminderOff       PlannedReminder = "off"
	PlannedReminderDayBefore PlannedReminder = "day_before"
	PlannedReminderOnDay     PlannedReminder = "on_day"
)

// PlannedPayment is a recurring expense/income rule. Type is immutable;
// the plan has no child records, so deletion is always allowed and the
// transactions it produced remain. NextDue/AnchorDate are day-granularity
// dates stored as UTC midnight.
type PlannedPayment struct {
	ID          uuid.UUID
	UserID      uuid.UUID
	Type        TransactionType // expense | income (transfer is not a plan type)
	Amount      int64
	Name        string
	AccountID   uuid.UUID
	CategoryID  uuid.UUID
	NextDue     time.Time
	AnchorDate  time.Time
	Regularity  PlannedRegularity
	ConfirmMode PlannedConfirmMode
	Reminder    PlannedReminder
	Note        string
	CreatedAt   time.Time
	UpdatedAt   time.Time
	Version     int
	DeletedAt   *time.Time
}

// Deleted reports whether the plan is tombstoned.
func (p *PlannedPayment) Deleted() bool { return p.DeletedAt != nil }

type CreatePlannedPaymentParams struct {
	// ID is the optional client-generated id (offline-first clients). Zero
	// means "server generates".
	ID          uuid.UUID
	HouseholdID uuid.UUID
	// UserID is the authorship stamp (the acting member), never trusted from
	// the wire.
	UserID     uuid.UUID
	Type       TransactionType
	Amount     int64
	Name       string
	AccountID  uuid.UUID
	CategoryID uuid.UUID
	// NextDue doubles as the initial series anchor.
	NextDue     time.Time
	Regularity  PlannedRegularity
	ConfirmMode PlannedConfirmMode
	Reminder    PlannedReminder
	Note        string
}

// UpdatePlannedPaymentParams holds optional PATCH fields plus the required
// optimistic-concurrency Version. Pointer fields are nil to "leave
// unchanged"; a non-nil empty Name/Note clears it. Type is immutable and
// therefore absent. A non-nil NextDue also resets the anchor to the new date.
type UpdatePlannedPaymentParams struct {
	Amount      *int64
	Name        *string
	Note        *string
	AccountID   *uuid.UUID
	CategoryID  *uuid.UUID
	NextDue     *time.Time
	Regularity  *PlannedRegularity
	ConfirmMode *PlannedConfirmMode
	Reminder    *PlannedReminder
	Version     int
}

// GetPlannedPaymentsParams filters the plan list. Nil Type means "all of the
// user's plans".
type GetPlannedPaymentsParams struct {
	Type *TransactionType
}

// PlannedPaymentFullState is the complete mutable state of a plan (sync
// upserts carry the full record, not a PATCH). Type is immutable.
type PlannedPaymentFullState struct {
	Type        TransactionType    `json:"type"`
	Amount      int64              `json:"amount"`
	Name        string             `json:"name"`
	AccountID   uuid.UUID          `json:"accountId"`
	CategoryID  uuid.UUID          `json:"categoryId"`
	NextDue     Date               `json:"nextDue"`
	AnchorDate  Date               `json:"anchorDate"`
	Regularity  PlannedRegularity  `json:"regularity"`
	ConfirmMode PlannedConfirmMode `json:"confirmMode"`
	Reminder    PlannedReminder    `json:"reminder"`
	Note        string             `json:"note"`
}

// FullState returns the plan's complete mutable state (for sync payloads).
func (p *PlannedPayment) FullState() *PlannedPaymentFullState {
	return &PlannedPaymentFullState{
		Type:        p.Type,
		Amount:      p.Amount,
		Name:        p.Name,
		AccountID:   p.AccountID,
		CategoryID:  p.CategoryID,
		NextDue:     Date{p.NextDue},
		AnchorDate:  Date{p.AnchorDate},
		Regularity:  p.Regularity,
		ConfirmMode: p.ConfirmMode,
		Reminder:    p.Reminder,
		Note:        p.Note,
	}
}

// AdvanceNextDue returns the occurrence date that follows nextDue, computed
// from the anchor per the regularity: monthly keeps the anchor's day-of-month
// (clamped to the target month's length, recovering afterwards), weekly keeps
// the anchor's weekday, yearly keeps the anchor's month-and-day (Feb 29
// clamps to Feb 28 in non-leap years). All inputs/outputs are UTC-midnight
// dates; the anchor is passed separately because advancement must not poison
// it (a Jan-31 plan passing through February still lands on Mar 31).
//
// Month/year arithmetic deliberately avoids time.AddDate: it normalizes
// overflow (Jan 30 + 1 month becomes Mar 1), which would skip February
// entirely for end-of-month anchors.
func AdvanceNextDue(nextDue, anchor time.Time, regularity PlannedRegularity) time.Time {
	nextDue = midnightUTC(nextDue)
	anchor = midnightUTC(anchor)
	switch regularity {
	case PlannedRegularityDaily:
		return nextDue.AddDate(0, 0, 1)
	case PlannedRegularityWeekly:
		return nextDue.AddDate(0, 0, daysPerWeek)
	case PlannedRegularityYearly:
		year := nextDue.Year() + 1
		return time.Date(
			year, anchor.Month(), clampDay(anchor.Day(), year, anchor.Month()),
			0, 0, 0, 0, time.UTC,
		)
	default: // monthly
		year, month := nextDue.Year(), nextDue.Month()+1
		if month > time.December {
			month = time.January
			year++
		}
		return time.Date(
			year, month, clampDay(anchor.Day(), year, month),
			0, 0, 0, 0, time.UTC,
		)
	}
}

func clampDay(day int, year int, month time.Month) int {
	if last := time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day(); day > last {
		return last
	}
	return day
}

func midnightUTC(t time.Time) time.Time {
	t = t.UTC()
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}
