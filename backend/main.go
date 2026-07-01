package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize Firebase and Supabase clients
	if err := InitServices(); err != nil {
		log.Printf("Warning during service initialization: %v", err)
	}

	// Initialize Gin router
	r := gin.Default()

	// Health check endpoint
	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Tradixa Notification Backend is running",
		})
	})

	// Webhook endpoint
	r.POST("/webhook/notifications", handleNotificationWebhook)

	// Start the server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	log.Printf("Starting server on port %s...", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
