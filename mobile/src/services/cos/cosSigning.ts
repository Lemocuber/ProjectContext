function toUtf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((entry) => entry.toString(16).padStart(2, '0'))
    .join('');
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}

function leftRotate(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

function sha1Bytes(input: Uint8Array): Uint8Array {
  const bitLen = input.length * 8;
  const withOne = input.length + 1;
  const remainder = withOne % 64;
  const padZeroBytes = remainder <= 56 ? 56 - remainder : 64 + 56 - remainder;
  const totalLen = withOne + padZeroBytes + 8;

  const bytes = new Uint8Array(totalLen);
  bytes.set(input, 0);
  bytes[input.length] = 0x80;

  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  const end = totalLen - 8;
  bytes[end] = (highBits >>> 24) & 0xff;
  bytes[end + 1] = (highBits >>> 16) & 0xff;
  bytes[end + 2] = (highBits >>> 8) & 0xff;
  bytes[end + 3] = highBits & 0xff;
  bytes[end + 4] = (lowBits >>> 24) & 0xff;
  bytes[end + 5] = (lowBits >>> 16) & 0xff;
  bytes[end + 6] = (lowBits >>> 8) & 0xff;
  bytes[end + 7] = lowBits & 0xff;

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Uint32Array(80);

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      const base = offset + i * 4;
      w[i] =
        ((bytes[base] << 24) |
          (bytes[base + 1] << 16) |
          (bytes[base + 2] << 8) |
          bytes[base + 3]) >>>
        0;
    }
    for (let i = 16; i < 80; i += 1) {
      w[i] = leftRotate(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i += 1) {
      let f = 0;
      let k = 0;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (leftRotate(a, 5) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = leftRotate(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const output = new Uint8Array(20);
  const words = [h0, h1, h2, h3, h4];
  for (let i = 0; i < words.length; i += 1) {
    const base = i * 4;
    output[base] = (words[i] >>> 24) & 0xff;
    output[base + 1] = (words[i] >>> 16) & 0xff;
    output[base + 2] = (words[i] >>> 8) & 0xff;
    output[base + 3] = words[i] & 0xff;
  }
  return output;
}

function sha1Hex(value: string): string {
  return toHex(sha1Bytes(toUtf8Bytes(value)));
}

function hmacSha1Hex(message: string, secret: string): string {
  const blockSize = 64;
  let key = toUtf8Bytes(secret);
  if (key.length > blockSize) {
    key = sha1Bytes(key);
  }
  if (key.length < blockSize) {
    const padded = new Uint8Array(blockSize);
    padded.set(key, 0);
    key = padded;
  }

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i += 1) {
    oKeyPad[i] = key[i] ^ 0x5c;
    iKeyPad[i] = key[i] ^ 0x36;
  }

  const innerHash = sha1Bytes(concatBytes([iKeyPad, toUtf8Bytes(message)]));
  const outerHash = sha1Bytes(concatBytes([oKeyPad, innerHash]));
  return toHex(outerHash);
}

function camSafeUrlEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

function getObjectKeys(obj: Record<string, string>, forKey: boolean): string[] {
  const keys = Object.keys(obj).map((key) =>
    forKey ? camSafeUrlEncode(key).toLowerCase() : key,
  );
  return keys.sort((a, b) => {
    const left = a.toLowerCase();
    const right = b.toLowerCase();
    if (left === right) return 0;
    return left > right ? 1 : -1;
  });
}

function obj2str(obj: Record<string, string>, lowerCaseKey: boolean): string {
  const keys = getObjectKeys(obj, false);
  return keys
    .map((key) => {
      const value = obj[key] ?? '';
      const safeKey = lowerCaseKey
        ? camSafeUrlEncode(key).toLowerCase()
        : camSafeUrlEncode(key);
      const safeValue = camSafeUrlEncode(value);
      return `${safeKey}=${safeValue}`;
    })
    .join('&');
}

function normalizeObjectKey(key: string): string {
  const clean = key.replace(/^\/+/, '');
  if (!clean) return '';
  return clean
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

type SignedCosUrlParams = {
  method: 'GET' | 'PUT' | 'DELETE';
  bucket: string;
  region: string;
  key: string;
  secretId: string;
  secretKey: string;
  expiresSec: number;
  query?: Record<string, string>;
};

export function buildSignedCosUrl(params: SignedCosUrlParams): string {
  const method = params.method.toLowerCase();
  const now = Math.floor(Date.now() / 1000) - 1;
  const expiry = now + Math.max(1, Math.floor(params.expiresSec));
  const qSignTime = `${now};${expiry}`;
  const qKeyTime = qSignTime;
  const host = `${params.bucket}.cos.${params.region}.myqcloud.com`;
  const pathname = `/${normalizeObjectKey(params.key)}`;

  const queryParams: Record<string, string> = { ...(params.query || {}) };
  const headers = { Host: host };

  const qHeaderList = getObjectKeys(headers, true).join(';').toLowerCase();
  const qUrlParamList = getObjectKeys(queryParams, true).join(';').toLowerCase();

  const formatString = [
    method,
    pathname,
    obj2str(queryParams, true),
    obj2str(headers, true),
    '',
  ].join('\n');

  const signKey = hmacSha1Hex(qKeyTime, params.secretKey);
  const stringToSign = ['sha1', qSignTime, sha1Hex(formatString), ''].join('\n');
  const qSignature = hmacSha1Hex(stringToSign, signKey);

  const authParams: Record<string, string> = {
    ...queryParams,
    'q-sign-algorithm': 'sha1',
    'q-ak': params.secretId,
    'q-sign-time': qSignTime,
    'q-key-time': qKeyTime,
    'q-header-list': qHeaderList,
    'q-url-param-list': qUrlParamList,
    'q-signature': qSignature,
  };

  const queryString = obj2str(authParams, false);
  return `https://${host}${pathname}?${queryString}`;
}

