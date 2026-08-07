package auth

import (
	"crypto/rand"
	"fmt"
	"math/big"
)

const otpCodeBound = 1000000

func GenerateOTPCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(otpCodeBound))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}
