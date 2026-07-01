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
	
	// Try to read from Environment Variable first (For Render.com)
	firebaseKeyJSON := os.Getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
	var opt option.ClientOption

	if firebaseKeyJSON != "" {
		// Use the JSON string directly from the Environment Variable
		opt = option.WithCredentialsJSON([]byte(firebaseKeyJSON))
		log.Println("Initializing Firebase using Environment Variable (Render.com mode)")
	} else {
		// Try to read the local service account file (for local development in VS Code)
		opt = option.WithCredentialsFile("serviceAccountKey.json")
		log.Println("Initializing Firebase using local serviceAccountKey.json file")
	}

	app, err := firebase.NewApp(ctx, nil, opt)
	
	if err != nil {
		log.Printf("Local serviceAccountKey.json not found. Falling back to Google Cloud Default Credentials...")
		// Fallback for Cloud Run: Use Application Default Credentials automatically
		app, err = firebase.NewApp(ctx, nil)
		if err != nil {
			return fmt.Errorf("failed to initialize Firebase App: %v", err)
		}
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
