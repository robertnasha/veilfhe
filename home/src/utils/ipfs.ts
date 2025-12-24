const IPFS_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Random(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += IPFS_ALPHABET[bytes[i] % IPFS_ALPHABET.length];
  }
  return out;
}

export async function mockIpfsUpload(file: File, onProgress?: (message: string) => void) {
  if (onProgress) {
    onProgress(`Preparing ${file.name} (${Math.round(file.size / 1024)} KB) for upload...`);
  }
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (onProgress) {
    onProgress('Generating IPFS content address...');
  }
  await new Promise((resolve) => setTimeout(resolve, 700));

  const hash = `Qm${base58Random(44)}`;

  if (onProgress) {
    onProgress('Upload complete.');
  }

  return { hash };
}
