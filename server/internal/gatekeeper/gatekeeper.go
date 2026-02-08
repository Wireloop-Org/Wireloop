package gatekeeper

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// CriteriaType defines the types of contribution criteria
type CriteriaType string

const (
	PRCount     CriteriaType = "PR_COUNT"
	PRMerged    CriteriaType = "PR_MERGED"
	CommitCount CriteriaType = "COMMIT_COUNT"
	StarCount   CriteriaType = "STAR_COUNT"
	IssueCount  CriteriaType = "ISSUE_COUNT"
)

// Rule represents a single access requirement
type Rule struct {
	CriteriaType CriteriaType `json:"criteria_type"`
	Threshold    int          `json:"threshold"`
}

// VerificationResult contains the result of a verification check
type VerificationResult struct {
	Passed   bool   `json:"passed"`
	Criteria string `json:"criteria"`
	Required int    `json:"required"`
	Actual   int    `json:"actual"`
	Message  string `json:"message"`
}

// Gatekeeper verifies user contributions against repository rules
type Gatekeeper struct {
	httpClient *http.Client
}

// New creates a new Gatekeeper instance
func New() *Gatekeeper {
	return &Gatekeeper{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// VerifyAccess checks if a user meets all rules for a repository
func (g *Gatekeeper) VerifyAccess(ctx context.Context, accessToken, repoOwner, repoName, username string, rules []Rule) ([]VerificationResult, bool, error) {
	results := make([]VerificationResult, 0, len(rules))
	allPassed := true

	for _, rule := range rules {
		result, err := g.checkRule(ctx, accessToken, repoOwner, repoName, username, rule)
		if err != nil {
			return nil, false, fmt.Errorf("failed to check rule %s: %w", rule.CriteriaType, err)
		}
		results = append(results, result)
		if !result.Passed {
			allPassed = false
		}
	}

	return results, allPassed, nil
}

func (g *Gatekeeper) checkRule(ctx context.Context, accessToken, repoOwner, repoName, username string, rule Rule) (VerificationResult, error) {
	result := VerificationResult{
		Criteria: string(rule.CriteriaType),
		Required: rule.Threshold,
	}

	var actual int
	var err error

	switch rule.CriteriaType {
	case PRCount, PRMerged:
		actual, err = g.getPRCount(ctx, accessToken, repoOwner, repoName, username, rule.CriteriaType == PRMerged)
	case CommitCount:
		actual, err = g.getCommitCount(ctx, accessToken, repoOwner, repoName, username)
	case IssueCount:
		actual, err = g.getIssueCount(ctx, accessToken, repoOwner, repoName, username)
	case StarCount:
		// Star count is for the repo, not per-user
		actual, err = g.getStarCount(ctx, accessToken, repoOwner, repoName)
	default:
		return result, fmt.Errorf("unknown criteria type: %s", rule.CriteriaType)
	}

	if err != nil {
		// Non-fatal: if we can't check a rule (e.g. private repo, API error), mark as failed with a message
		result.Passed = false
		result.Actual = 0
		result.Message = fmt.Sprintf("✗ Could not verify %s (repo may be private or inaccessible)", strings.ToLower(string(rule.CriteriaType)))
		return result, nil
	}

	result.Actual = actual
	result.Passed = actual >= rule.Threshold

	if result.Passed {
		result.Message = fmt.Sprintf("✓ You have %d %s (required: %d)", actual, strings.ToLower(string(rule.CriteriaType)), rule.Threshold)
	} else {
		result.Message = fmt.Sprintf("✗ You need %d more %s", rule.Threshold-actual, strings.ToLower(string(rule.CriteriaType)))
	}

	return result, nil
}

// getPRCount fetches the number of PRs by a user on a repo
func (g *Gatekeeper) getPRCount(ctx context.Context, accessToken, owner, repo, username string, mergedOnly bool) (int, error) {
	// GitHub Search API: search for PRs by author in repo
	state := "all"
	if mergedOnly {
		state = "closed"
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls?state=%s&per_page=100", owner, repo, state)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return 0, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("GitHub API returned %d", resp.StatusCode)
	}

	var pulls []struct {
		User struct {
			Login string `json:"login"`
		} `json:"user"`
		MergedAt *string `json:"merged_at"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&pulls); err != nil {
		return 0, err
	}

	count := 0
	for _, pr := range pulls {
		if strings.EqualFold(pr.User.Login, username) {
			if mergedOnly {
				if pr.MergedAt != nil {
					count++
				}
			} else {
				count++
			}
		}
	}

	return count, nil
}

// getCommitCount fetches the number of commits by a user on a repo
func (g *Gatekeeper) getCommitCount(ctx context.Context, accessToken, owner, repo, username string) (int, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/commits?author=%s&per_page=100", owner, repo, username)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return 0, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("GitHub API returned %d", resp.StatusCode)
	}

	// Check Link header for total count (if paginated)
	linkHeader := resp.Header.Get("Link")
	if linkHeader != "" && strings.Contains(linkHeader, "last") {
		// Parse last page number from Link header for accurate count
		// For now, just count what we get
	}

	var commits []interface{}
	if err := json.NewDecoder(resp.Body).Decode(&commits); err != nil {
		return 0, err
	}

	return len(commits), nil
}

// getIssueCount fetches the number of issues created by a user on a repo
func (g *Gatekeeper) getIssueCount(ctx context.Context, accessToken, owner, repo, username string) (int, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues?creator=%s&state=all&per_page=100", owner, repo, username)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return 0, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("GitHub API returned %d", resp.StatusCode)
	}

	var issues []struct {
		PullRequest interface{} `json:"pull_request"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&issues); err != nil {
		return 0, err
	}

	// Filter out PRs (GitHub returns PRs in issues endpoint)
	count := 0
	for _, issue := range issues {
		if issue.PullRequest == nil {
			count++
		}
	}

	return count, nil
}

// getStarCount fetches the star count for a repo
func (g *Gatekeeper) getStarCount(ctx context.Context, accessToken, owner, repo string) (int, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s", owner, repo)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return 0, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("GitHub API returned %d", resp.StatusCode)
	}

	var repoData struct {
		StargazersCount int `json:"stargazers_count"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&repoData); err != nil {
		return 0, err
	}

	return repoData.StargazersCount, nil
}

// ParseThreshold converts a string threshold to int
func ParseThreshold(s string) (int, error) {
	return strconv.Atoi(s)
}

// CheckCollaborator checks if a user is a collaborator (has write/admin/push access) on a GitHub repo.
// Uses GET /repos/{owner}/{repo} which returns the user's permissions on the repo.
// This works with any token that has access to the repo — no admin required.
func (g *Gatekeeper) CheckCollaborator(ctx context.Context, accessToken, owner, repo, username string) (bool, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s", owner, repo)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return false, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, nil
	}

	var repoData struct {
		Permissions struct {
			Admin    bool `json:"admin"`
			Maintain bool `json:"maintain"`
			Push     bool `json:"push"`
			Triage   bool `json:"triage"`
			Pull     bool `json:"pull"`
		} `json:"permissions"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&repoData); err != nil {
		return false, err
	}

	// User has push (write) access or higher = collaborator
	return repoData.Permissions.Push || repoData.Permissions.Admin || repoData.Permissions.Maintain, nil
}
