package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"

	utils "wireloop/internal"

	"github.com/gin-gonic/gin"
)

// ============================================================================
// PR REVIEW SYNC — Two-way sync between GitHub PR comments and Wireloop
// ============================================================================

// PRReviewComment represents a review comment from GitHub
type PRReviewComment struct {
	ID        int64  `json:"id"`
	Body      string `json:"body"`
	Path      string `json:"path,omitempty"`
	Line      *int   `json:"line,omitempty"`
	Side      string `json:"side,omitempty"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
	HTMLURL   string `json:"html_url"`
	User      struct {
		Login     string `json:"login"`
		AvatarURL string `json:"avatar_url"`
	} `json:"user"`
	// For review comments on specific lines
	DiffHunk    string `json:"diff_hunk,omitempty"`
	InReplyToID *int64 `json:"in_reply_to_id,omitempty"`
}

// PRIssueComment represents a top-level PR comment (not on a specific line)
type PRIssueComment struct {
	ID        int64  `json:"id"`
	Body      string `json:"body"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
	HTMLURL   string `json:"html_url"`
	User      struct {
		Login     string `json:"login"`
		AvatarURL string `json:"avatar_url"`
	} `json:"user"`
}

// PRReview represents a review (approved, changes requested, etc.)
type PRReview struct {
	ID        int64  `json:"id"`
	Body      string `json:"body"`
	State     string `json:"state"` // APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED
	CreatedAt string `json:"submitted_at"`
	HTMLURL   string `json:"html_url"`
	User      struct {
		Login     string `json:"login"`
		AvatarURL string `json:"avatar_url"`
	} `json:"user"`
}

// UnifiedComment is what we return to the frontend — all comment types merged
type UnifiedComment struct {
	ID          int64  `json:"id"`
	Type        string `json:"type"` // "review_comment", "issue_comment", "review"
	Body        string `json:"body"`
	Path        string `json:"path,omitempty"`
	Line        *int   `json:"line,omitempty"`
	DiffHunk    string `json:"diff_hunk,omitempty"`
	State       string `json:"state,omitempty"` // For reviews: APPROVED, CHANGES_REQUESTED
	InReplyToID *int64 `json:"in_reply_to_id,omitempty"`
	CreatedAt   string `json:"created_at"`
	HTMLURL     string `json:"html_url"`
	Username    string `json:"username"`
	AvatarURL   string `json:"avatar_url"`
	Source      string `json:"source"` // "github"
}

// PostCommentRequest for posting a comment back to GitHub
type PostCommentRequest struct {
	PRNumber int    `json:"pr_number" binding:"required"`
	Body     string `json:"body" binding:"required"`
	// Optional: reply to a specific review comment
	InReplyTo *int64 `json:"in_reply_to,omitempty"`
}

// ============================================================================
// GET /api/loops/:name/github/pr/:number/comments
// Fetches all comments on a PR — review comments, issue comments, and reviews
// ============================================================================

func (h *Handler) HandleGetPRComments(c *gin.Context) {
	name := c.Param("name")
	prNumberStr := c.Param("number")
	prNumber, err := strconv.Atoi(prNumberStr)
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid PR number"})
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

	user, err := h.Queries.GetUserByID(ctx, uid)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get user"})
		return
	}
	if user.AccessToken == "" {
		c.JSON(401, gin.H{"error": "no GitHub access token — please re-login"})
		return
	}

	repoFullName, err := getRepoFullName(project.GithubRepoID, user.AccessToken)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// Fetch all 3 types of comments in parallel
	type result struct {
		comments []UnifiedComment
		err      error
	}

	reviewCommentsCh := make(chan result, 1)
	issueCommentsCh := make(chan result, 1)
	reviewsCh := make(chan result, 1)

	// 1. Review comments (inline on code)
	go func() {
		url := fmt.Sprintf("https://api.github.com/repos/%s/pulls/%d/comments?per_page=100&sort=created&direction=asc", repoFullName, prNumber)
		resp, err := githubAPIGet(url, user.AccessToken)
		if err != nil {
			reviewCommentsCh <- result{err: err}
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			body, _ := io.ReadAll(resp.Body)
			reviewCommentsCh <- result{err: fmt.Errorf("GitHub API error %d: %s", resp.StatusCode, string(body))}
			return
		}

		var comments []PRReviewComment
		if err := json.NewDecoder(resp.Body).Decode(&comments); err != nil {
			reviewCommentsCh <- result{err: err}
			return
		}

		unified := make([]UnifiedComment, 0, len(comments))
		for _, c := range comments {
			unified = append(unified, UnifiedComment{
				ID:          c.ID,
				Type:        "review_comment",
				Body:        c.Body,
				Path:        c.Path,
				Line:        c.Line,
				DiffHunk:    c.DiffHunk,
				InReplyToID: c.InReplyToID,
				CreatedAt:   c.CreatedAt,
				HTMLURL:     c.HTMLURL,
				Username:    c.User.Login,
				AvatarURL:   c.User.AvatarURL,
				Source:      "github",
			})
		}
		reviewCommentsCh <- result{comments: unified}
	}()

	// 2. Issue comments (top-level PR comments)
	go func() {
		url := fmt.Sprintf("https://api.github.com/repos/%s/issues/%d/comments?per_page=100&sort=created&direction=asc", repoFullName, prNumber)
		resp, err := githubAPIGet(url, user.AccessToken)
		if err != nil {
			issueCommentsCh <- result{err: err}
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			body, _ := io.ReadAll(resp.Body)
			issueCommentsCh <- result{err: fmt.Errorf("GitHub API error %d: %s", resp.StatusCode, string(body))}
			return
		}

		var comments []PRIssueComment
		if err := json.NewDecoder(resp.Body).Decode(&comments); err != nil {
			issueCommentsCh <- result{err: err}
			return
		}

		unified := make([]UnifiedComment, 0, len(comments))
		for _, c := range comments {
			unified = append(unified, UnifiedComment{
				ID:        c.ID,
				Type:      "issue_comment",
				Body:      c.Body,
				CreatedAt: c.CreatedAt,
				HTMLURL:   c.HTMLURL,
				Username:  c.User.Login,
				AvatarURL: c.User.AvatarURL,
				Source:    "github",
			})
		}
		issueCommentsCh <- result{comments: unified}
	}()

	// 3. Reviews (approved, changes requested, etc.)
	go func() {
		url := fmt.Sprintf("https://api.github.com/repos/%s/pulls/%d/reviews?per_page=100", repoFullName, prNumber)
		resp, err := githubAPIGet(url, user.AccessToken)
		if err != nil {
			reviewsCh <- result{err: err}
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			body, _ := io.ReadAll(resp.Body)
			reviewsCh <- result{err: fmt.Errorf("GitHub API error %d: %s", resp.StatusCode, string(body))}
			return
		}

		var reviews []PRReview
		if err := json.NewDecoder(resp.Body).Decode(&reviews); err != nil {
			reviewsCh <- result{err: err}
			return
		}

		unified := make([]UnifiedComment, 0, len(reviews))
		for _, r := range reviews {
			// Skip empty COMMENTED reviews (they're just containers for inline comments)
			if r.State == "COMMENTED" && r.Body == "" {
				continue
			}
			unified = append(unified, UnifiedComment{
				ID:        r.ID,
				Type:      "review",
				Body:      r.Body,
				State:     r.State,
				CreatedAt: r.CreatedAt,
				HTMLURL:   r.HTMLURL,
				Username:  r.User.Login,
				AvatarURL: r.User.AvatarURL,
				Source:    "github",
			})
		}
		reviewsCh <- result{comments: unified}
	}()

	// Collect results
	r1 := <-reviewCommentsCh
	r2 := <-issueCommentsCh
	r3 := <-reviewsCh

	// Log errors but don't fail — return whatever we got
	if r1.err != nil {
		log.Printf("[pr-review] review comments fetch error: %v", r1.err)
	}
	if r2.err != nil {
		log.Printf("[pr-review] issue comments fetch error: %v", r2.err)
	}
	if r3.err != nil {
		log.Printf("[pr-review] reviews fetch error: %v", r3.err)
	}

	// Merge all comments
	all := make([]UnifiedComment, 0, len(r1.comments)+len(r2.comments)+len(r3.comments))
	all = append(all, r1.comments...)
	all = append(all, r2.comments...)
	all = append(all, r3.comments...)

	c.JSON(200, gin.H{
		"comments":  all,
		"pr_number": prNumber,
		"repo_name": repoFullName,
	})
}

// ============================================================================
// POST /api/loops/:name/github/pr-comment
// Posts a comment on a PR (two-way sync: Wireloop → GitHub)
// ============================================================================

func (h *Handler) HandlePostPRComment(c *gin.Context) {
	name := c.Param("name")

	var req PostCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
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

	user, err := h.Queries.GetUserByID(ctx, uid)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get user"})
		return
	}
	if user.AccessToken == "" {
		c.JSON(401, gin.H{"error": "no GitHub access token — please re-login"})
		return
	}

	repoFullName, err := getRepoFullName(project.GithubRepoID, user.AccessToken)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	var apiURL string
	if req.InReplyTo != nil {
		// Reply to a specific review comment
		apiURL = fmt.Sprintf("https://api.github.com/repos/%s/pulls/%d/comments/%d/replies", repoFullName, req.PRNumber, *req.InReplyTo)
	} else {
		// Top-level issue comment on the PR
		apiURL = fmt.Sprintf("https://api.github.com/repos/%s/issues/%d/comments", repoFullName, req.PRNumber)
	}

	payload, _ := json.Marshal(map[string]string{"body": req.Body})
	httpReq, err := http.NewRequest("POST", apiURL, bytes.NewReader(payload))
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to create request"})
		return
	}
	httpReq.Header.Set("Authorization", "Bearer "+user.AccessToken)
	httpReq.Header.Set("Accept", "application/vnd.github+json")
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := githubHTTPClient.Do(httpReq)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to post comment to GitHub"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 201 {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[pr-review] post comment failed: status=%d body=%s", resp.StatusCode, string(body))
		c.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("GitHub API error: %s", string(body))})
		return
	}

	var createdComment struct {
		ID      int64  `json:"id"`
		Body    string `json:"body"`
		HTMLURL string `json:"html_url"`
	}
	json.NewDecoder(resp.Body).Decode(&createdComment)

	// Broadcast the new comment to the loop's WebSocket channel so other users see it
	h.Hub.Broadcast(utils.UUIDToStr(project.ID), WSOutMessage{
		Type: "pr_comment",
		Payload: gin.H{
			"pr_number": req.PRNumber,
			"comment": UnifiedComment{
				ID:        createdComment.ID,
				Type:      "issue_comment",
				Body:      createdComment.Body,
				HTMLURL:   createdComment.HTMLURL,
				Username:  user.Username,
				AvatarURL: user.AvatarUrl.String,
				Source:    "wireloop",
				CreatedAt: "just now",
			},
		},
	})

	c.JSON(201, gin.H{
		"success":  true,
		"id":       createdComment.ID,
		"html_url": createdComment.HTMLURL,
	})
}
