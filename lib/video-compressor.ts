/**
 * In-Browser Client-Side Video Compressor
 * 
 * Compresses videos before uploading to Bunny.net Stream using hardware-accelerated
 * HTML5 Canvas, AudioContext, and MediaRecorder.
 * 
 * Features:
 * - Downscales resolution (e.g., 4K down to 1080p or 720p)
 * - Controls bitrate (e.g., 2.5 - 4.5 Mbps) to dramatically reduce file size (60% - 85% savings)
 * - Hardware frame synchronization via requestVideoFrameCallback
 * - Multi-codec fallback (MP4 / WebM VP9 / WebM VP8)
 * - Full audio preservation with AudioContext stream mixing
 * - Fallback to original file if browser environment lacks encoder support
 */

export interface VideoCompressionOptions {
  /** Maximum resolution along either dimension (e.g. 1920 for 1080p, 1280 for 720p) */
  maxDimension?: number;
  /** Target video bitrate in bits per second (default: 3_500_000 = 3.5 Mbps) */
  targetBitrate?: number;
  /** Frame rate for encoding (default: 30) */
  fps?: number;
  /** Progress callback reporting 0 to 100 */
  onProgress?: (percent: number) => void;
  /** AbortSignal to cancel compression */
  signal?: AbortSignal;
}

export interface VideoCompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration: number;
  width: number;
  height: number;
  skipped?: boolean;
}

/**
 * Detect the best supported video mimeType for MediaRecorder
 */
function getSupportedMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }

  const candidateTypes = [
    'video/mp4;codecs=avc1.4d401f,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
  ];

  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return '';
}

/**
 * Check if client-side video compression is supported in the current browser
 */
export function isVideoCompressionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    !!getSupportedMimeType()
  );
}

/**
 * Compress a video file in the browser before upload
 */
export async function compressVideo(
  file: File,
  options: VideoCompressionOptions = {}
): Promise<VideoCompressionResult> {
  const {
    maxDimension = 1920,
    targetBitrate = 3_500_000,
    fps = 30,
    onProgress,
    signal,
  } = options;

  // 1. If file is already small (< 5MB), skip compression to preserve original quality
  if (file.size < 5 * 1024 * 1024) {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 0,
      duration: 0,
      width: 0,
      height: 0,
      skipped: true,
    };
  }

  // 2. If MediaRecorder is not supported, return original file
  const mimeType = getSupportedMimeType();
  if (!mimeType) {
    console.warn('[video-compressor] MediaRecorder mimeType not supported in this browser. Skipping compression.');
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 0,
      duration: 0,
      width: 0,
      height: 0,
      skipped: true,
    };
  }

  return new Promise<VideoCompressionResult>((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException('Aborted', 'AbortError'));
    }

    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = false; // We connect to Web Audio to capture audio
    video.playsInline = true;
    (video as any).crossOrigin = 'anonymous';

    let audioContext: AudioContext | null = null;
    let audioSource: MediaElementAudioSourceNode | null = null;
    let audioDestination: MediaStreamAudioDestinationNode | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let recorder: MediaRecorder | null = null;
    let animationFrameId: number | null = null;
    let isCleanedUp = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      try {
        video.pause();
        video.src = '';
        video.load();
        URL.revokeObjectURL(videoUrl);
      } catch {}

      try {
        if (audioSource) audioSource.disconnect();
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close();
        }
      } catch {}

      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {}
      }
    };

    if (signal) {
      signal.addEventListener('abort', () => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }

    video.onerror = () => {
      cleanup();
      console.warn('[video-compressor] Video decoding error, falling back to original.');
      resolve({
        file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 0,
        duration: 0,
        width: 0,
        height: 0,
        skipped: true,
      });
    };

    video.onloadedmetadata = async () => {
      try {
        const origWidth = video.videoWidth || 1920;
        const origHeight = video.videoHeight || 1080;
        const duration = video.duration || 1;

        // Calculate scaled dimensions (preserve aspect ratio, enforce even dimensions)
        let targetWidth = origWidth;
        let targetHeight = origHeight;

        if (origWidth > maxDimension || origHeight > maxDimension) {
          if (origWidth >= origHeight) {
            targetWidth = maxDimension;
            targetHeight = Math.round((origHeight * maxDimension) / origWidth);
          } else {
            targetHeight = maxDimension;
            targetWidth = Math.round((origWidth * maxDimension) / origHeight);
          }
        }

        // Even dimensions required for H.264/VP9 macroblocks
        targetWidth = Math.floor(targetWidth / 2) * 2;
        targetHeight = Math.floor(targetHeight / 2) * 2;

        canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) {
          throw new Error('Failed to get 2D canvas context');
        }

        // Capture canvas stream
        const canvasStream = canvas.captureStream(fps);

        // Try setting up Web Audio to capture audio track
        let combinedStream = canvasStream;
        try {
          const AudioContextClass =
            window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioContext = new AudioContextClass();
            if (audioContext.state === 'suspended') {
              await audioContext.resume();
            }
            audioSource = audioContext.createMediaElementSource(video);
            audioDestination = audioContext.createMediaStreamDestination();
            audioSource.connect(audioDestination);

            const audioTracks = audioDestination.stream.getAudioTracks();
            if (audioTracks.length > 0) {
              combinedStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...audioTracks,
              ]);
            }
          }
        } catch (audioErr) {
          console.warn('[video-compressor] Audio routing failed, proceeding with video only:', audioErr);
        }

        // Initialize MediaRecorder
        const recorderOptions: MediaRecorderOptions = {
          mimeType,
          videoBitsPerSecond: targetBitrate,
        };

        recorder = new MediaRecorder(combinedStream, recorderOptions);
        const recordedChunks: Blob[] = [];

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };

        recorder.onstop = () => {
          cleanup();

          const isMp4 = mimeType.startsWith('video/mp4');
          const outputExt = isMp4 ? '.mp4' : '.webm';
          const outputMime = isMp4 ? 'video/mp4' : 'video/webm';
          const cleanBaseName = file.name.replace(/\.[^/.]+$/, '');
          const outputFilename = `${cleanBaseName}_optimized${outputExt}`;

          const compressedBlob = new Blob(recordedChunks, { type: outputMime });

          // If the compressed output is somehow larger than original, return original
          if (compressedBlob.size >= file.size * 0.95) {
            console.log(`[video-compressor] Compressed size (${compressedBlob.size}) is not significantly smaller than original (${file.size}). Using original.`);
            resolve({
              file,
              originalSize: file.size,
              compressedSize: file.size,
              compressionRatio: 0,
              duration,
              width: origWidth,
              height: origHeight,
              skipped: true,
            });
            return;
          }

          const compressedFile = new File([compressedBlob], outputFilename, {
            type: outputMime,
            lastModified: Date.now(),
          });

          const savedRatio = Math.round(
            (1 - compressedBlob.size / file.size) * 100
          );

          if (onProgress) onProgress(100);

          resolve({
            file: compressedFile,
            originalSize: file.size,
            compressedSize: compressedBlob.size,
            compressionRatio: savedRatio,
            duration,
            width: targetWidth,
            height: targetHeight,
          });
        };

        // Render loop: draw video frames to canvas
        const renderFrame = () => {
          if (isCleanedUp || !ctx || !canvas) return;

          if (video.readyState >= 2) {
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          }

          if (onProgress && duration > 0) {
            const currentPercent = Math.min(
              99,
              Math.round((video.currentTime / duration) * 100)
            );
            onProgress(currentPercent);
          }

          if (!video.paused && !video.ended) {
            if ('requestVideoFrameCallback' in video) {
              (video as any).requestVideoFrameCallback(renderFrame);
            } else {
              animationFrameId = requestAnimationFrame(renderFrame);
            }
          }
        };

        video.onended = () => {
          if (recorder && recorder.state === 'recording') {
            recorder.stop();
          }
        };

        // If video is longer than 3 minutes, skip client encoding to avoid browser lag; Bunny Stream will transcode it
        if (duration > 180) {
          console.log('[video-compressor] Video > 180s. Bunny Stream will handle cloud transcoding.');
          cleanup();
          resolve({
            file,
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: 0,
            duration,
            width: origWidth,
            height: origHeight,
            skipped: true,
          });
          return;
        }

        // Safety timeout to prevent hanging if video stalls
        const maxProcessingTimeMs = Math.max(15000, (duration + 10) * 1000);
        const safetyTimeout = setTimeout(() => {
          if (recorder && recorder.state === 'recording') {
            console.warn('[video-compressor] Safety timeout reached, finishing recording.');
            recorder.stop();
          }
        }, maxProcessingTimeMs);

        // Start recording and video playback
        recorder.start(1000); // 1-second timeslices
        try {
          await video.play();
        } catch {
          // If browser restricts unmuted autoplay, mute and continue
          video.muted = true;
          await video.play();
        }
        renderFrame();
      } catch (err: any) {
        cleanup();
        console.warn('[video-compressor] Compression failed with exception, falling back to original:', err);
        resolve({
          file,
          originalSize: file.size,
          compressedSize: file.size,
          compressionRatio: 0,
          duration: 0,
          width: 0,
          height: 0,
          skipped: true,
        });
      }
    };

    video.src = videoUrl;
  });
}
