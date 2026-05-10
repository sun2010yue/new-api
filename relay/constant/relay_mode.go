package constant

import (
	"net/http"
	"strings"
)

const (
	RelayModeUnknown = iota
	RelayModeChatCompletions
	RelayModeCompletions
	RelayModeEmbeddings
	RelayModeModerations
	RelayModeImagesGenerations
	RelayModeImagesEdits
	RelayModeEdits

	RelayModeMidjourneyImagine
	RelayModeMidjourneyDescribe
	RelayModeMidjourneyBlend
	RelayModeMidjourneyChange
	RelayModeMidjourneySimpleChange
	RelayModeMidjourneyNotify
	RelayModeMidjourneyTaskFetch
	RelayModeMidjourneyTaskImageSeed
	RelayModeMidjourneyTaskFetchByCondition
	RelayModeMidjourneyAction
	RelayModeMidjourneyModal
	RelayModeMidjourneyShorten
	RelayModeSwapFace
	RelayModeMidjourneyUpload
	RelayModeMidjourneyVideo
	RelayModeMidjourneyEdits

	RelayModeAudioSpeech        // tts
	RelayModeAudioTranscription // whisper
	RelayModeAudioTranslation   // whisper

	RelayModeSunoFetch
	RelayModeSunoFetchByID
	RelayModeSunoSubmit

	RelayModeVideoFetchByID
	RelayModeVideoSubmit

	RelayModeRerank

	RelayModeResponses

	RelayModeRealtime

	RelayModeGemini

	RelayModeResponsesCompact
)

func Path2RelayMode(path string) int {
	relayMode := RelayModeUnknown

	// 移除版本号前缀（支持 /v1/, /v2/, /v3/ 等）
	// 匹配 /vN/ 格式，其中 N 是数字
	pathWithoutVersion := path
	if len(path) > 3 && path[0] == '/' && path[1] == 'v' && path[2] >= '0' && path[2] <= '9' {
		// 找到版本号后的第一个 /
		if idx := strings.Index(path[3:], "/"); idx != -1 {
			pathWithoutVersion = path[3+idx:]
		}
	}

	if strings.HasPrefix(path, "/v1/chat/completions") || strings.HasPrefix(path, "/pg/chat/completions") || strings.HasPrefix(pathWithoutVersion, "/chat/completions") {
		relayMode = RelayModeChatCompletions
	} else if strings.HasPrefix(path, "/v1/completions") || strings.HasPrefix(pathWithoutVersion, "/completions") {
		relayMode = RelayModeCompletions
	} else if strings.HasPrefix(path, "/v1/embeddings") || strings.HasPrefix(pathWithoutVersion, "/embeddings") {
		relayMode = RelayModeEmbeddings
	} else if strings.HasSuffix(path, "embeddings") {
		relayMode = RelayModeEmbeddings
	} else if strings.HasPrefix(path, "/v1/moderations") || strings.HasPrefix(pathWithoutVersion, "/moderations") {
		relayMode = RelayModeModerations
	} else if strings.HasPrefix(path, "/v1/images/generations") || strings.HasPrefix(pathWithoutVersion, "/images/generations") {
		relayMode = RelayModeImagesGenerations
	} else if strings.HasPrefix(path, "/v1/images/edits") || strings.HasPrefix(pathWithoutVersion, "/images/edits") {
		relayMode = RelayModeImagesEdits
	} else if strings.HasPrefix(path, "/v1/edits") || strings.HasPrefix(pathWithoutVersion, "/edits") {
		relayMode = RelayModeEdits
	} else if strings.HasPrefix(path, "/v1/responses/compact") || strings.HasPrefix(pathWithoutVersion, "/responses/compact") {
		relayMode = RelayModeResponsesCompact
	} else if strings.HasPrefix(path, "/v1/responses") || strings.HasPrefix(pathWithoutVersion, "/responses") {
		relayMode = RelayModeResponses
	} else if strings.HasPrefix(path, "/v1/audio/speech") || strings.HasPrefix(pathWithoutVersion, "/audio/speech") {
		relayMode = RelayModeAudioSpeech
	} else if strings.HasPrefix(path, "/v1/audio/transcriptions") || strings.HasPrefix(pathWithoutVersion, "/audio/transcriptions") {
		relayMode = RelayModeAudioTranscription
	} else if strings.HasPrefix(path, "/v1/audio/translations") || strings.HasPrefix(pathWithoutVersion, "/audio/translations") {
		relayMode = RelayModeAudioTranslation
	} else if strings.HasPrefix(path, "/v1/rerank") || strings.HasPrefix(pathWithoutVersion, "/rerank") {
		relayMode = RelayModeRerank
	} else if strings.HasPrefix(path, "/v1/realtime") || strings.HasPrefix(pathWithoutVersion, "/realtime") {
		relayMode = RelayModeRealtime
	} else if strings.HasPrefix(path, "/v1beta/models") || strings.HasPrefix(path, "/v1/models") {
		relayMode = RelayModeGemini
	} else if strings.HasPrefix(path, "/mj") {
		relayMode = Path2RelayModeMidjourney(path)
	}
	return relayMode
}

func Path2RelayModeMidjourney(path string) int {
	relayMode := RelayModeUnknown
	if strings.HasSuffix(path, "/mj/submit/action") {
		// midjourney plus
		relayMode = RelayModeMidjourneyAction
	} else if strings.HasSuffix(path, "/mj/submit/modal") {
		// midjourney plus
		relayMode = RelayModeMidjourneyModal
	} else if strings.HasSuffix(path, "/mj/submit/shorten") {
		// midjourney plus
		relayMode = RelayModeMidjourneyShorten
	} else if strings.HasSuffix(path, "/mj/insight-face/swap") {
		// midjourney plus
		relayMode = RelayModeSwapFace
	} else if strings.HasSuffix(path, "/submit/upload-discord-images") {
		// midjourney plus
		relayMode = RelayModeMidjourneyUpload
	} else if strings.HasSuffix(path, "/mj/submit/imagine") {
		relayMode = RelayModeMidjourneyImagine
	} else if strings.HasSuffix(path, "/mj/submit/video") {
		relayMode = RelayModeMidjourneyVideo
	} else if strings.HasSuffix(path, "/mj/submit/edits") {
		relayMode = RelayModeMidjourneyEdits
	} else if strings.HasSuffix(path, "/mj/submit/blend") {
		relayMode = RelayModeMidjourneyBlend
	} else if strings.HasSuffix(path, "/mj/submit/describe") {
		relayMode = RelayModeMidjourneyDescribe
	} else if strings.HasSuffix(path, "/mj/notify") {
		relayMode = RelayModeMidjourneyNotify
	} else if strings.HasSuffix(path, "/mj/submit/change") {
		relayMode = RelayModeMidjourneyChange
	} else if strings.HasSuffix(path, "/mj/submit/simple-change") {
		relayMode = RelayModeMidjourneyChange
	} else if strings.HasSuffix(path, "/fetch") {
		relayMode = RelayModeMidjourneyTaskFetch
	} else if strings.HasSuffix(path, "/image-seed") {
		relayMode = RelayModeMidjourneyTaskImageSeed
	} else if strings.HasSuffix(path, "/list-by-condition") {
		relayMode = RelayModeMidjourneyTaskFetchByCondition
	}
	return relayMode
}

func Path2RelaySuno(method, path string) int {
	relayMode := RelayModeUnknown
	if method == http.MethodPost && strings.HasSuffix(path, "/fetch") {
		relayMode = RelayModeSunoFetch
	} else if method == http.MethodGet && strings.Contains(path, "/fetch/") {
		relayMode = RelayModeSunoFetchByID
	} else if strings.Contains(path, "/submit/") {
		relayMode = RelayModeSunoSubmit
	}
	return relayMode
}
