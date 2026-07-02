package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"firebase.google.com/go/v4/messaging"
	"github.com/gin-gonic/gin"
)

// WebhookPayload represents the expected JSON payload from Supabase Webhook
type WebhookPayload struct {
	Type   string                 `json:"type"`   // "INSERT", "UPDATE"
	Table  string                 `json:"table"`  // e.g., "purchase_orders"
	Record map[string]interface{} `json:"record"` // The new/updated record
}

func handleNotificationWebhook(c *gin.Context) {
	var payload WebhookPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Received Webhook: Table=%s, Type=%s", payload.Table, payload.Type)

	if payload.Type == "UPDATE" || payload.Type == "INSERT" {
		status, _ := payload.Record["status"].(string)
		var title, body string
		var requiredAuth string
		var notifyCreatorOnly bool
		
		switch status {
		case "Approved", "Disetujui":
			notifyCreatorOnly = true
			switch payload.Table {
			case "purchase_orders":
				poNumber, _ := payload.Record["po_number"].(string)
				title = "PO Disetujui! ✅"
				body = fmt.Sprintf("Purchase Order %s telah disetujui.", poNumber)
			case "purchase_requisitions":
				prNumber, _ := payload.Record["pr_number"].(string)
				title = "PR Disetujui! ✅"
				body = fmt.Sprintf("Purchase Requisition %s telah disetujui.", prNumber)
			}
		case "Diajukan", "Menunggu Level 2":
			switch payload.Table {
			case "purchase_orders":
				poNumber, _ := payload.Record["po_number"].(string)
				title = "Pengajuan PO Baru 📝"
				body = fmt.Sprintf("PO #%s butuh persetujuan Anda.", poNumber)
				requiredAuth = "APPROVE_PO"
			case "purchase_requisitions":
				prNumber, _ := payload.Record["pr_number"].(string)
				if status == "Menunggu Level 2" {
					title = "PR Menunggu Persetujuan L2 📝"
					body = fmt.Sprintf("PR #%s butuh persetujuan Level 2 Anda.", prNumber)
					requiredAuth = "APPROVE_PR_L2"
				} else {
					title = "Pengajuan PR Baru 📝"
					body = fmt.Sprintf("PR #%s butuh persetujuan Anda.", prNumber)
					requiredAuth = "APPROVE_PR_L1"
				}
			}
		}

		if title != "" {
			
			// Get created_by_id to notify the creator
			createdBy, _ := payload.Record["created_by_id"].(string)
			if createdBy == "" {
				createdBy = "00000000-0000-0000-0000-000000000000" // dummy if empty
			}
			
			log.Printf("Fetching tokens for creator: %s and required auth: %s (notifyCreatorOnly: %v)...", createdBy, requiredAuth, notifyCreatorOnly)
			tokens, err := fetchTargetFCMTokens(createdBy, requiredAuth, notifyCreatorOnly)
			if err != nil {
				log.Printf("Error fetching tokens: %v", err)
			}

			if len(tokens) == 0 {
				log.Printf("No eligible FCM tokens found. Skipping push notification.")
			} else {
				log.Printf("Found %d eligible tokens to notify.", len(tokens))
				for _, token := range tokens {
					err := sendFirebasePush(token, title, body)
					if err != nil {
						log.Printf("Failed sending to token %s: %v", token, err)
					}
				}
			}

			// Supabase Fallback Insert
			storeID, _ := payload.Record["store_id"].(string)
			if storeID != "" {
				err := insertSupabaseFallback(storeID, title, body, payload.Table)
				if err != nil {
					log.Printf("Supabase Fallback Error: %v", err)
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "processed"})
}

func fetchTargetFCMTokens(creatorID string, requiredAuth string, notifyCreatorOnly bool) ([]string, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		return nil, fmt.Errorf("supabase credentials not configured")
	}

	client := &http.Client{}

	// --- STEP 1: Dapatkan daftar ID user yang berhak menerima notifikasi ---
	q := url.Values{}
	q.Add("select", "id")

	if notifyCreatorOnly {
		// Hanya notifikasi pembuat dokumen (karena ini notifikasi Approval)
		q.Add("id", fmt.Sprintf("eq.%s", creatorID))
	} else if requiredAuth != "" {
		// Include users with explicit authority, plus generic owner/admin roles, OR the creator
		roleFilter := fmt.Sprintf("(role.in.(owner,admin),authorities.cs.[\"%s\"],id.eq.%s)", requiredAuth, creatorID)
		q.Add("or", roleFilter)
	} else {
		// Fallback
		roleFilter := fmt.Sprintf("(role.in.(owner,manager,purchasing,admin),id.eq.%s)", creatorID)
		q.Add("or", roleFilter)
	}

	reqURL := fmt.Sprintf("%s/rest/v1/users?%s", supabaseURL, q.Encode())
	
	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+supabaseKey)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("supabase returned status: %d when fetching users", resp.StatusCode)
	}

	var users []struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&users); err != nil {
		return nil, err
	}

	if len(users) == 0 {
		return nil, nil // Tidak ada user yang cocok
	}

	var userIDs []string
	for _, u := range users {
		userIDs = append(userIDs, u.ID)
	}

	// --- STEP 2: Ambil SEMUA token aktif dari user_push_subscriptions ---
	idList := strings.Join(userIDs, ",")
	qTokens := url.Values{}
	qTokens.Add("select", "fcm_token")
	qTokens.Add("user_id", fmt.Sprintf("in.(%s)", idList))

	tokenURL := fmt.Sprintf("%s/rest/v1/user_push_subscriptions?%s", supabaseURL, qTokens.Encode())
	reqTokens, err := http.NewRequest("GET", tokenURL, nil)
	if err != nil {
		return nil, err
	}
	reqTokens.Header.Set("apikey", supabaseKey)
	reqTokens.Header.Set("Authorization", "Bearer "+supabaseKey)

	respTokens, err := client.Do(reqTokens)
	if err != nil {
		return nil, err
	}
	defer respTokens.Body.Close()

	if respTokens.StatusCode >= 400 {
		return nil, fmt.Errorf("supabase returned status: %d when fetching tokens", respTokens.StatusCode)
	}

	var subs []struct {
		FCMToken string `json:"fcm_token"`
	}
	if err := json.NewDecoder(respTokens.Body).Decode(&subs); err != nil {
		return nil, err
	}

	var tokens []string
	for _, sub := range subs {
		if sub.FCMToken != "" {
			tokens = append(tokens, sub.FCMToken)
		}
	}

	return tokens, nil
}

func sendFirebasePush(token, title, body string) error {
	if fcmClient == nil {
		return fmt.Errorf("FCM client is not initialized")
	}

	message := &messaging.Message{
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Android: &messaging.AndroidConfig{
			Priority: "high",
			Notification: &messaging.AndroidNotification{
				Sound: "default",
			},
		},
		Webpush: &messaging.WebpushConfig{
			Headers: map[string]string{
				"Urgency": "high",
			},
			Notification: &messaging.WebpushNotification{
				Title: title,
				Body:  body,
				Icon:  "/logo-tradixa.png",
			},
		},
		APNS: &messaging.APNSConfig{
			Headers: map[string]string{
				"apns-priority": "10",
			},
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{
					Sound:            "default",
					ContentAvailable: true,
				},
			},
		},
		Token: token,
	}

	response, err := fcmClient.Send(context.Background(), message)
	if err != nil {
		return err
	}
	
	log.Printf("Successfully sent FCM message: %s", response)
	return nil
}

func insertSupabaseFallback(storeID, title, message, notifType string) error {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		return fmt.Errorf("supabase credentials not configured")
	}

	payload := map[string]interface{}{
		"store_id":   storeID,
		"title":      title,
		"message":    message,
		"type":       notifType,
		"is_read":    false,
		"created_at": "now()",
	}

	jsonValue, _ := json.Marshal(payload)
	
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/rest/v1/notifications", supabaseURL), bytes.NewBuffer(jsonValue))
	if err != nil {
		return err
	}

	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+supabaseKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=minimal")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("supabase returned status: %d", resp.StatusCode)
	}

	return nil
}
