package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

type Claims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.StandardClaims
}

func GenerateToken(userID string, role string) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID: userID,
		Role:   role,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	jwtKey := []byte(os.Getenv("JWT_SECRET"))
	if len(jwtKey) == 0 {
		jwtKey = []byte("gdl-secret-key-2026") // Fallback for safety
	}
	return token.SignedString(jwtKey)
}

func ValidateToken(tokenStr string) (*Claims, error) {
	jwtKey := []byte(os.Getenv("JWT_SECRET"))
	if len(jwtKey) == 0 {
		jwtKey = []byte("gdl-secret-key-2026")
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

func authInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	// Skip auth for login and register
	if info.FullMethod == "/identity.IdentityService/Login" ||
		info.FullMethod == "/identity.IdentityService/Register" ||
		info.FullMethod == "/identity.IdentityService/VerifyOTP" {
		return handler(ctx, req)
	}

	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, status.Errorf(codes.Unauthenticated, "metadata is not provided")
	}

	// Check internal security secret first
	internalSecret := md["x-internal-secret"]
	expectedInternalSecret := os.Getenv("INTERNAL_SECURITY_KEY")
	if len(internalSecret) > 0 && internalSecret[0] == expectedInternalSecret {
		return handler(ctx, req) // Trust internal service-to-service calls
	}

	// Otherwise, check JWT
	authHeader := md["authorization"]
	if len(authHeader) == 0 {
		return nil, status.Errorf(codes.Unauthenticated, "authorization token is not provided")
	}

	tokenStr := authHeader[0]
	_, err := ValidateToken(tokenStr)
	if err != nil {
		return nil, status.Errorf(codes.Unauthenticated, "invalid token")
	}

	return handler(ctx, req)
}
