package main

import (
	"context"
	"fmt"
	"log"
	"os"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

var (
	fcmClient *messaging.Client
)

// InitServices initializes Firebase Admin SDK and Supabase configuration
func InitServices() error {
	// Initialize Firebase
	ctx := context.Background()
	
	// Read Firebase Service Account from Environment Variable
	// In Cloud Run, it's common to mount the service account as a secret file, or pass as base64 ENV
	opt := option.WithCredentialsFile("serviceAccountKey.json")
	
	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		log.Printf("Warning: Failed to initialize Firebase App (maybe serviceAccountKey.json is missing?): %v", err)
		return nil // Don't crash locally if key is missing, just return
	}

	fcmClient, err = app.Messaging(ctx)
	if err != nil {
		return fmt.Errorf("error getting Messaging client: %v", err)
	}

	log.Println("Firebase Admin SDK initialized successfully")
	
	// Supabase URL & Key should be checked here
	if os.Getenv("SUPABASE_URL") == "" || os.Getenv("SUPABASE_SERVICE_ROLE_KEY") == "" {
		log.Println("Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set")
	}

	return nil
}
