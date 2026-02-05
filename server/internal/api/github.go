package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	utils "wireloop/internal"

	"github.com/gin-gonic/gin"
)

// ============================================================================
// GitHub Context Types
// ============================================================================

type GitHubLabel struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

type GitHubUser struct {
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url"`
}

type GitHubIssue struct {
	Number      int           `json:"number"`
	Title       string        `json:"title"`
	Body        string        `json:"body"`
	State       string        `json:"state"`
	Labels      []GitHubLabel `json:"labels"`
	User        GitHubUser    `json:"user"`
	Comments    int           `json:"comments"`
	CreatedAt   string        `json:"created_at"`
	UpdatedAt   string        `json:"updated_at"`
	HTMLURL     string        `json:"html_url"`
	PullRequest *struct {
		URL string `json:"url"`
	} `json:"pull_request,omitempty"`
}

type GitHubPR struct {
	Number    int           `json:"number"`
	Title     string        `json:"title"`
	Body      string        `json:"body"`
	State     string        `json:"state"`
	Draft     bool          `json:"draft"`
	Labels    []GitHubLabel `json:"labels"`
	User      GitHubUser    `json:"user"`
	Comments  int           `json:"comments"`
	Additions int           `json:"additions"`
	Deletions int           `json:"deletions"`
	CreatedAt string        `json:"created_at"`
	UpdatedAt string        `json:"updated_at"`
	MergedAt  *string       `json:"merged_at"`
	HTMLURL   string        `json:"html_url"`
	Head      struct {
		Ref string `json:"ref"`
	} `json:"head"`
	Base struct {
		Ref string `json:"ref"`
	} `json:"base"`
}

type GitHubComment struct {
	Body      string     `json:"body"`
	User      GitHubUser `json:"user"`
	CreatedAt string     `json:"created_at"`
}

type GitHubReview struct {
	Body      string     `json:"body"`
	State     string     `json:"state"`
	User      GitHubUser `json:"user"`
	CreatedAt string     `json:"submitted_at"`
}

type IssuesResponse struct {
	Issues   []GitHubIssue `json:"issues"`
	RepoName string        `json:"repo_name"`
}

type PRsResponse struct {
	PullRequests []GitHubPR `json:"pull_requests"`
	RepoName     string     `json:"repo_name"`
}

type SummarizeRequest struct {
	Type   string `json:"type"`
	Number int    `json:"number"`
}

type SummaryResponse struct {
	Summary   string `json:"summary"`
	Type      string `json:"type"`
	Number    int    `json:"number"`
	Title     string `json:"title"`
	RepoName  string `json:"repo_name"`
	URL       string `json:"url"`
	Generated string `json:"generated_at"`
}

// ============================================================================
// Helpers
// ============================================================================

func getRepoFullName(repoID int64, accessToken string) (string, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("https://api.github.com/repositories/%d", repoID), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := (&http.Client{Timeout: 10 * time.Second}).Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("GitHub API error: %d", resp.StatusCode)
	}

	var repo struct {
		FullName string `json:"full_name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&repo); err != nil {
		return "", err
	}
	return repo.FullName, nil
}

func githubAPIGet(url, accessToken string) (*http.Response, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	return (&http.Client{Timeout: 15 * time.Second}).Do(req)
}

// ============================================================================
// GET /api/loops/:name/github/issues
// ============================================================================

func (h *Handler) HandleGetGitHubIssues(c *gin.Context) {
	name := c.Param("name")
	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	ctx := c.Request.Context()
	project, err := h.Queries.GetProjectByName(ctx, name)
	if err != nil {
		c.JSON(404, gin.H{"error": "loop not found"})
		return
	}
	if project.GithubRepoID == 0 {
		c.JSON(400, gin.H{"error": "no GitHub repository linked to this loop"})
		return
	}

	user, err := h.Queries.GetUserByID(ctx, uid)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get user"})
		return
	}
	if user.AccessToken == "" {
		c.JSON(401, gin.H{"error": "No GitHub access token. Please re-login."})
		return
	}

	repoFullName, err := getRepoFullName(project.GithubRepoID, user.AccessToken)
	if err != nil {
		log.Printf("[GitHub] Failed to get repo name for ID %d: %v", project.GithubRepoID, err)
		c.JSON(500, gin.H{"error": "failed to resolve repository"})
		return
	}

	state := c.DefaultQuery("state", "open")
	page := c.DefaultQuery("page", "1")
	perPage := c.DefaultQuery("per_page", "20")

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/issues?state=%s&page=%s&per_page=%s&sort=updated&direction=desc",
		repoFullName, state, page, perPage)

	resp, err := githubAPIGet(apiURL, user.AccessToken)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch issues from GitHub"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		c.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("GitHub API error: %d", resp.StatusCode)})
		return
	}

	var allItems []GitHubIssue
	if err := json.NewDecoder(resp.Body).Decode(&allItems); err != nil {
		c.JSON(500, gin.H{"error": "failed to parse GitHub response"})
		return
	}

	// Filter out PRs (GitHub issues API includes them)
	issues := make([]GitHubIssue, 0, len(allItems))
	for _, item := range allItems {
		if item.PullRequest == nil {
			issues = append(issues, item)
		}
	}

	c.JSON(200, IssuesResponse{Issues: issues, RepoName: repoFullName})
}

// ============================================================================
// GET /api/loops/:name/github/pulls
// ============================================================================

func (h *Handler) HandleGetGitHubPRs(c *gin.Context) {
	name := c.Param("name")
	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	ctx := c.Request.Context()
	project, err := h.Queries.GetProjectByName(ctx, name)
	if err != nil {
		c.JSON(404, gin.H{"error": "loop not found"})
		return
	}
	if project.GithubRepoID == 0 {
		c.JSON(400, gin.H{"error": "no GitHub repository linked to this loop"})
		return
	}

	user, err := h.Queries.GetUserByID(ctx, uid)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get user"})
		return
	}
	if user.AccessToken == "" {
		c.JSON(401, gin.H{"error": "No GitHub access token. Please re-login."})
		return
	}

	repoFullName, err := getRepoFullName(project.GithubRepoID, user.AccessToken)
	if err != nil {
		log.Printf("[GitHub] Failed to get repo name for ID %d: %v", project.GithubRepoID, err)
		c.JSON(500, gin.H{"error": "failed to resolve repository"})
		return
	}

	state := c.DefaultQuery("state", "open")
	page := c.DefaultQuery("page", "1")
	perPage := c.DefaultQuery("per_page", "20")

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/pulls?state=%s&page=%s&per_page=%s&sort=updated&direction=desc",
		repoFullName, state, page, perPage)

	resp, err := githubAPIGet(apiURL, user.AccessToken)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch PRs from GitHub"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		c.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("GitHub API error: %d", resp.StatusCode)})
		return
	}

	var prs []GitHubPR
	if err := json.NewDecoder(resp.Body).Decode(&prs); err != nil {
		c.JSON(500, gin.H{"error": "failed to parse GitHub response"})
		return
	}

	c.JSON(200, PRsResponse{PullRequests: prs, RepoName: repoFullName})
}

// ============================================================================
// POST /api/loops/:name/github/summarize
// ============================================================================

func (h *Handler) HandleGitHubSummarize(c *gin.Context) {
	name := c.Param("name")

	var req SummarizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid request: type and number required"})
		return
	}
	if req.Type != "issue" && req.Type != "pr" {
		c.JSON(400, gin.H{"error": "type must be 'issue' or 'pr'"})
		return
	}

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	ctx := c.Request.Context()
	project, err := h.Queries.GetProjectByName(ctx, name)
	if err != nil {
		c.JSON(404, gin.H{"error": "loop not found"})
		return
	}
	if project.GithubRepoID == 0 {
		c.JSON(400, gin.H{"error": "no GitHub repository linked"})
		return
	}

	user, err := h.Queries.GetUserByID(ctx, uid)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get user"})
		return
	}
	if user.AccessToken == "" {
		c.JSON(401, gin.H{"error": "No GitHub access token"})
		return
	}

	repoFullName, err := getRepoFullName(project.GithubRepoID, user.AccessToken)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to resolve repository"})
		return
	}

	// Fetch full context concurrently
	var (
		wg        sync.WaitGroup
		itemTitle string
		itemBody  string
		itemURL   string
		itemState string
		comments  []GitHubComment
		reviews   []GitHubReview
		prDetails *GitHubPR
		itemErr   error
	)

	numStr := strconv.Itoa(req.Number)

	if req.Type == "issue" {
		wg.Add(2)
		go func() {
			defer wg.Done()
			resp, err := githubAPIGet(
				fmt.Sprintf("https://api.github.com/repos/%s/issues/%s", repoFullName, numStr),
				user.AccessToken)
			if err != nil {
				itemErr = err
				return
			}
			defer resp.Body.Close()
			if resp.StatusCode != 200 {
				itemErr = fmt.Errorf("GitHub error: %d", resp.StatusCode)
				return
			}
			var issue GitHubIssue
			json.NewDecoder(resp.Body).Decode(&issue)
			itemTitle = issue.Title
			itemBody = issue.Body
			itemURL = issue.HTMLURL
			itemState = issue.State
		}()
		go func() {
			defer wg.Done()
			resp, err := githubAPIGet(
				fmt.Sprintf("https://api.github.com/repos/%s/issues/%s/comments?per_page=50", repoFullName, numStr),
				user.AccessToken)
			if err != nil {
				return
			}
			defer resp.Body.Close()
			if resp.StatusCode == 200 {
				json.NewDecoder(resp.Body).Decode(&comments)
			}
		}()
	} else {
		wg.Add(3)
		go func() {
			defer wg.Done()
			resp, err := githubAPIGet(
				fmt.Sprintf("https://api.github.com/repos/%s/pulls/%s", repoFullName, numStr),
				user.AccessToken)
			if err != nil {
				itemErr = err
				return
			}
			defer resp.Body.Close()
			if resp.StatusCode != 200 {
				itemErr = fmt.Errorf("GitHub error: %d", resp.StatusCode)
				return
			}
			var pr GitHubPR
			json.NewDecoder(resp.Body).Decode(&pr)
			prDetails = &pr
			itemTitle = pr.Title
			itemBody = pr.Body
			itemURL = pr.HTMLURL
			itemState = pr.State
		}()
		go func() {
			defer wg.Done()
			resp, err := githubAPIGet(
				fmt.Sprintf("https://api.github.com/repos/%s/issues/%s/comments?per_page=50", repoFullName, numStr),
				user.AccessToken)
			if err != nil {
				return
			}
			defer resp.Body.Close()
			if resp.StatusCode == 200 {
				json.NewDecoder(resp.Body).Decode(&comments)
			}
		}()
		go func() {
			defer wg.Done()
			resp, err := githubAPIGet(
				fmt.Sprintf("https://api.github.com/repos/%s/pulls/%s/reviews?per_page=50", repoFullName, numStr),
				user.AccessToken)
			if err != nil {
				return
			}
			defer resp.Body.Close()
			if resp.StatusCode == 200 {
				json.NewDecoder(resp.Body).Decode(&reviews)
			}
		}()
	}

	wg.Wait()

	if itemErr != nil {
		log.Printf("[GitHub Summarize] Failed to fetch %s #%d: %v", req.Type, req.Number, itemErr)
		c.JSON(500, gin.H{"error": "failed to fetch item from GitHub"})
		return
	}

	// Generate AI summary with fallback
	summary, err := generateAISummary(req.Type, itemTitle, itemBody, itemState, repoFullName, req.Number, comments, reviews, prDetails)
	if err != nil {
		log.Printf("[AI Summarize] AI unavailable, using fallback: %v", err)
		summary = generateFallbackSummary(itemType(req.Type), itemTitle, itemBody, itemState, comments, reviews, prDetails)
	}

	c.JSON(200, SummaryResponse{
		Summary:   summary,
		Type:      req.Type,
		Number:    req.Number,
		Title:     itemTitle,
		RepoName:  repoFullName,
		URL:       itemURL,
		Generated: time.Now().Format(time.RFC3339),
	})
}

// itemType helper to capitalize
func itemType(t string) string {
	if t == "pr" {
		return "PR"
	}
	return "Issue"
}

// ============================================================================
// AI Summary Generation (OpenAI-compatible API)
// ============================================================================

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIRequest struct {
	Model       string          `json:"model"`
	Messages    []openAIMessage `json:"messages"`
	MaxTokens   int             `json:"max_tokens"`
	Temperature float64         `json:"temperature"`
}

type openAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func generateAISummary(typ, title, body, state, repoName string, number int, comments []GitHubComment, reviews []GitHubReview, pr *GitHubPR) (string, error) {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("OPENAI_API_KEY not set")
	}

	var prompt strings.Builder
	prompt.WriteString(fmt.Sprintf("Repository: %s\n", repoName))
	prompt.WriteString(fmt.Sprintf("Type: %s #%d\n", typ, number))
	prompt.WriteString(fmt.Sprintf("Title: %s\n", title))
	prompt.WriteString(fmt.Sprintf("State: %s\n", state))

	if pr != nil {
		prompt.WriteString(fmt.Sprintf("Branch: %s -> %s\n", pr.Head.Ref, pr.Base.Ref))
		prompt.WriteString(fmt.Sprintf("Changes: +%d -%d lines\n", pr.Additions, pr.Deletions))
		if pr.Draft {
			prompt.WriteString("Status: Draft\n")
		}
		if pr.MergedAt != nil {
			prompt.WriteString("Merged: Yes\n")
		}
	}

	if body != "" {
		trimmed := body
		if len(trimmed) > 3000 {
			trimmed = trimmed[:3000] + "...[truncated]"
		}
		prompt.WriteString(fmt.Sprintf("\nDescription:\n%s\n", trimmed))
	}

	if len(comments) > 0 {
		prompt.WriteString("\nDiscussion:\n")
		for i, c := range comments {
			if i >= 15 {
				prompt.WriteString(fmt.Sprintf("...and %d more comments\n", len(comments)-15))
				break
			}
			t := c.Body
			if len(t) > 500 {
				t = t[:500] + "..."
			}
			prompt.WriteString(fmt.Sprintf("@%s: %s\n\n", c.User.Login, t))
		}
	}

	if len(reviews) > 0 {
		prompt.WriteString("\nCode Reviews:\n")
		for _, r := range reviews {
			if r.Body != "" {
				prompt.WriteString(fmt.Sprintf("@%s [%s]: %s\n\n", r.User.Login, r.State, r.Body))
			}
		}
	}

	system := `You are a concise technical summarizer for GitHub issues and pull requests.
Provide a clear, actionable summary for a development team chat.

Format:
**Status**: (open/closed/merged/draft)
**Summary**: 2-3 sentences on core purpose and current state.
**Key Points**:
- Important technical decisions or findings
- Blockers or action items
**Discussion Highlights**: Brief overview of significant points (if any).

Be concise. No unnecessary jargon.`

	reqBody := openAIRequest{
		Model: getModelName(),
		Messages: []openAIMessage{
			{Role: "system", Content: system},
			{Role: "user", Content: prompt.String()},
		},
		MaxTokens:   500,
		Temperature: 0.3,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	apiBase := os.Getenv("OPENAI_API_BASE")
	if apiBase == "" {
		apiBase = "https://api.openai.com/v1"
	}

	httpReq, err := http.NewRequest("POST", apiBase+"/chat/completions", bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := (&http.Client{Timeout: 30 * time.Second}).Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("AI API request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("AI API error %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var aiResp openAIResponse
	if err := json.NewDecoder(resp.Body).Decode(&aiResp); err != nil {
		return "", err
	}

	if len(aiResp.Choices) == 0 {
		return "", fmt.Errorf("no response from AI")
	}

	return aiResp.Choices[0].Message.Content, nil
}

func getModelName() string {
	model := os.Getenv("OPENAI_MODEL")
	if model == "" {
		return "gpt-4o-mini"
	}
	return model
}

// Fallback summary when AI is unavailable
func generateFallbackSummary(typeName, title, body, state string, comments []GitHubComment, reviews []GitHubReview, pr *GitHubPR) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("**Status**: %s\n", state))
	sb.WriteString(fmt.Sprintf("**Summary**: %s\n", title))

	if pr != nil {
		sb.WriteString(fmt.Sprintf("**Branch**: %s -> %s | +%d -%d lines\n", pr.Head.Ref, pr.Base.Ref, pr.Additions, pr.Deletions))
		if pr.Draft {
			sb.WriteString("This is a draft PR.\n")
		}
	}

	if body != "" {
		trimmed := body
		if len(trimmed) > 400 {
			trimmed = trimmed[:400] + "..."
		}
		sb.WriteString(fmt.Sprintf("\n%s\n", trimmed))
	}

	if len(comments) > 0 {
		sb.WriteString(fmt.Sprintf("\n**Discussion**: %d comments", len(comments)))
	}

	if len(reviews) > 0 {
		approvals, changes := 0, 0
		for _, r := range reviews {
			if r.State == "APPROVED" {
				approvals++
			} else if r.State == "CHANGES_REQUESTED" {
				changes++
			}
		}
		if approvals > 0 || changes > 0 {
			sb.WriteString(fmt.Sprintf(" | %d approved, %d changes requested", approvals, changes))
		}
	}

	return sb.String()
}
