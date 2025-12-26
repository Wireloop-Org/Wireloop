package types

type Rule struct {
	CriteriaType string `json:"criteria_type"`
	Threshold    int    `json:"threshold"`
}
