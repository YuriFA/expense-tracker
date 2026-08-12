package e2e_test

import "crypto/rand"

// randString returns n hex chars of crypto randomness for unique test data.
func randString(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	const hexc = "0123456789abcdef"
	for i, v := range b {
		b[i] = hexc[int(v)%len(hexc)]
	}
	return string(b)
}
