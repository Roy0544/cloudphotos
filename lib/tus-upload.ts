/**
 * Lightweight, zero-dependency browser TUS client for Bunny.net Stream
 */

export interface TusUploadOptions {
  uploadEndpoint: string;
  libraryId: string;
  videoId: string;
  authorizationSignature: string;
  authorizationExpire: number;
  file: File;
  onProgress?: (percentage: number, bytesUploaded: number, bytesTotal: number) => void;
  signal?: AbortSignal;
}

export interface TusUploadResult {
  success: boolean;
  videoId: string;
  bytesUploaded: number;
}

/**
 * Upload a video file directly to Bunny.net Stream ingest edge using the TUS 1.0.0 protocol.
 */
export async function uploadVideoViaTus(options: TusUploadOptions): Promise<TusUploadResult> {
  const {
    uploadEndpoint,
    libraryId,
    videoId,
    authorizationSignature,
    authorizationExpire,
    file,
    onProgress,
    signal,
  } = options;

  if (signal?.aborted) {
    throw new DOMException('Upload aborted by user', 'AbortError');
  }

  // 1. Creation Handshake (POST)
  const handshakeRes = await fetch(uploadEndpoint, {
    method: 'POST',
    headers: {
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(file.size),
      LibraryId: libraryId,
      VideoId: videoId,
      AuthorizationSignature: authorizationSignature,
      AuthorizationExpire: String(authorizationExpire),
    },
    signal,
  });

  if (!handshakeRes.ok) {
    const errorBody = await handshakeRes.text().catch(() => '');
    throw new Error(`TUS creation handshake failed (HTTP ${handshakeRes.status}): ${errorBody}`);
  }

  const locationHeader = handshakeRes.headers.get('Location') || handshakeRes.headers.get('location');
  if (!locationHeader) {
    throw new Error('TUS server did not return an upload Location header');
  }

  const patchUrl = locationHeader.startsWith('http')
    ? locationHeader
    : new URL(locationHeader, uploadEndpoint).toString();

  // 2. Binary Upload via XMLHttpRequest for byte-level progress reporting
  return new Promise<TusUploadResult>((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException('Upload aborted by user', 'AbortError'));
    }

    const xhr = new XMLHttpRequest();
    xhr.open('PATCH', patchUrl, true);

    xhr.setRequestHeader('Tus-Resumable', '1.0.0');
    xhr.setRequestHeader('Upload-Offset', '0');
    xhr.setRequestHeader('Content-Type', 'application/offset+octet-stream');
    xhr.setRequestHeader('Content-Length', String(file.size));
    xhr.setRequestHeader('LibraryId', libraryId);
    xhr.setRequestHeader('VideoId', videoId);
    xhr.setRequestHeader('AuthorizationSignature', authorizationSignature);
    xhr.setRequestHeader('AuthorizationExpire', String(authorizationExpire));

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        onProgress(percent, event.loaded, event.total);
      }
    };

    xhr.onload = () => {
      // TUS specifies 204 No Content for successful PATCH chunk
      if (xhr.status === 204 || xhr.status === 200) {
        if (onProgress) {
          onProgress(100, file.size, file.size);
        }
        resolve({
          success: true,
          videoId,
          bytesUploaded: file.size,
        });
      } else {
        reject(new Error(`TUS PATCH upload failed with HTTP ${xhr.status}: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during TUS video chunk upload. Connection may have dropped.'));
    };

    xhr.onabort = () => {
      reject(new DOMException('Upload aborted by user', 'AbortError'));
    };

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
      });
    }

    xhr.send(file);
  });
}
