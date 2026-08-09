package domain

// CategoryTemplate is the seed definition for the default categories created
// for every new user on registration.
type CategoryTemplate struct {
	Name  string
	Type  TransactionType
	Icon  string
	Color string
}

// DefaultCategories are created for every new user (24 categories). Carried over
// from the original SQLite seed; category localization is a later task.
//
//nolint:gochecknoglobals // seed data for new users, not runtime state
var DefaultCategories = []CategoryTemplate{
	{Name: "Food", Type: TransactionTypeExpense, Icon: "🍔", Color: "#FF6347"},
	{Name: "Transport", Type: TransactionTypeExpense, Icon: "🚗", Color: "#1E90FF"},
	{Name: "Entertainment", Type: TransactionTypeExpense, Icon: "🎬", Color: "#FFD700"},
	{Name: "Salary", Type: TransactionTypeIncome, Icon: "💼", Color: "#32CD32"},
	{Name: "Freelance", Type: TransactionTypeIncome, Icon: "🖥️", Color: "#8A2BE2"},
	{Name: "Health", Type: TransactionTypeExpense, Icon: "💊", Color: "#FF69B4"},
	{Name: "Education", Type: TransactionTypeExpense, Icon: "📚", Color: "#20B2AA"},
	{Name: "Investment", Type: TransactionTypeIncome, Icon: "📈", Color: "#FF4500"},
	{Name: "Gifts", Type: TransactionTypeIncome, Icon: "🎁", Color: "#FF1493"},
	{Name: "Utilities", Type: TransactionTypeExpense, Icon: "💡", Color: "#00CED1"},
	{Name: "Travel", Type: TransactionTypeExpense, Icon: "✈️", Color: "#FF8C00"},
	{Name: "Miscellaneous", Type: TransactionTypeExpense, Icon: "🛍️", Color: "#A52A2A"},
	{Name: "Bonus", Type: TransactionTypeIncome, Icon: "🎉", Color: "#32CD32"},
	{Name: "Rent", Type: TransactionTypeExpense, Icon: "🏠", Color: "#8B4513"},
	{Name: "Savings", Type: TransactionTypeIncome, Icon: "💰", Color: "#228B22"},
	{Name: "Charity", Type: TransactionTypeExpense, Icon: "❤️", Color: "#FF69B4"},
	{Name: "Side Hustle", Type: TransactionTypeIncome, Icon: "🛠️", Color: "#8A2BE2"},
	{Name: "Subscriptions", Type: TransactionTypeExpense, Icon: "📱", Color: "#1E90FF"},
	{Name: "Other Income", Type: TransactionTypeIncome, Icon: "💵", Color: "#32CD32"},
	{Name: "Other Expense", Type: TransactionTypeExpense, Icon: "🛒", Color: "#A52A2A"},
	{Name: "Health Insurance", Type: TransactionTypeExpense, Icon: "🏥", Color: "#FF69B4"},
	{Name: "Car Maintenance", Type: TransactionTypeExpense, Icon: "🔧", Color: "#1E90FF"},
	{Name: "Grocery", Type: TransactionTypeExpense, Icon: "🛒", Color: "#FF6347"},
	{Name: "Dining Out", Type: TransactionTypeExpense, Icon: "🍽️", Color: "#FFD700"},
}
