// ═══════════════════════════════════════════════════════════════
//  RUNWAY ML VIDEO GENERATION SERVICE
//  Uses Runway Gen-3 Alpha Turbo for AI video creation
//  Admin provides a single API key — premium users access it
// ═══════════════════════════════════════════════════════════════

const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';
const RUNWAY_API_VERSION = '2024-11-06';

const getHeaders = (apiKey) => ({
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'X-Runway-Version': RUNWAY_API_VERSION
});

// ── Start video generation from an image + text prompt ──
// Returns a task ID that can be polled for completion
const generateVideoFromImage = async (apiKey, imageUrl, promptText, options = {}) => {
  if (!apiKey) throw new Error('Runway API key not configured. Contact admin.');

  const body = {
    model: 'gen3a_turbo',
    promptImage: imageUrl,
    promptText: promptText || 'Smooth, professional promotional video with subtle motion',
    duration: options.duration || 5,   // 5 or 10 seconds
    ratio: options.ratio || '16:9',     // 16:9, 9:16 (stories/reels), 1:1
    watermark: false
  };

  console.log('[Runway] Starting video generation:', { model: body.model, duration: body.duration, ratio: body.ratio });

  const response = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('[Runway] Start error:', response.status, err);
    throw new Error(err.error || `Runway API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[Runway] Task created:', data.id);
  return { taskId: data.id };
};

// ── Start video generation from text only (no image) ──
const generateVideoFromText = async (apiKey, promptText, options = {}) => {
  if (!apiKey) throw new Error('Runway API key not configured. Contact admin.');

  const body = {
    model: 'gen3a_turbo',
    promptText: promptText,
    duration: options.duration || 5,
    ratio: options.ratio || '16:9',
    watermark: false
  };

  console.log('[Runway] Starting text-to-video:', { duration: body.duration, ratio: body.ratio });

  const response = await fetch(`${RUNWAY_API_BASE}/text_to_video`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    // If text_to_video not available, inform user
    if (response.status === 404 || response.status === 400) {
      throw new Error('Text-to-video requires an image. Generate an AI image first, then create video from it.');
    }
    console.error('[Runway] Start error:', response.status, err);
    throw new Error(err.error || `Runway API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[Runway] Task created:', data.id);
  return { taskId: data.id };
};

// ── Poll task status ──
// Returns { status, progress, videoUrl, error }
const getTaskStatus = async (apiKey, taskId) => {
  if (!apiKey) throw new Error('Runway API key not configured.');

  const response = await fetch(`${RUNWAY_API_BASE}/tasks/${taskId}`, {
    method: 'GET',
    headers: getHeaders(apiKey)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to check task: ${response.status}`);
  }

  const data = await response.json();

  return {
    taskId: data.id,
    status: data.status,           // PENDING, RUNNING, SUCCEEDED, FAILED, CANCELLED
    progress: data.progress || 0,  // 0-1 float
    videoUrl: data.status === 'SUCCEEDED' && data.output ? data.output[0] : null,
    error: data.failure || null,
    createdAt: data.createdAt
  };
};

// ── Cancel a running task ──
const cancelTask = async (apiKey, taskId) => {
  if (!apiKey) throw new Error('Runway API key not configured.');

  const response = await fetch(`${RUNWAY_API_BASE}/tasks/${taskId}/cancel`, {
    method: 'POST',
    headers: getHeaders(apiKey)
  });

  return response.ok;
};

module.exports = {
  generateVideoFromImage,
  generateVideoFromText,
  getTaskStatus,
  cancelTask
};
