export function generateRandom(serverSeed: string, clientSeed: string, nonce: number) {
  const input = `${serverSeed}:${clientSeed}:${nonce}`;

  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash % 10000) / 10000;
}
