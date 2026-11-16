let pendingSelfie: { uri: string; name: string; type: string } | null = null;

export function setPendingSelfie(asset: {
  uri: string;
  name: string;
  type: string;
}) {
  pendingSelfie = asset;
}

export function takePendingSelfie() {
  const file = pendingSelfie;
  pendingSelfie = null;
  return file;
}

export function peekPendingSelfie() {
  return pendingSelfie;
}