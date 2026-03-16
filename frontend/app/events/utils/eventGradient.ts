const GRADIENTS = [
  "linear-gradient(135deg, #2E8B7A 0%, #6B46C1 100%)",
  "linear-gradient(135deg, #E86F51 0%, #FFC82E 100%)",
  "linear-gradient(135deg, #6B46C1 0%, #2E8B7A 100%)",
  "linear-gradient(135deg, #FFC82E 0%, #E86F51 100%)",
  "linear-gradient(135deg, #2E8B7A 0%, #E86F51 100%)",
  "linear-gradient(135deg, #6B46C1 0%, #FFC82E 100%)",
  "linear-gradient(135deg, #E86F51 0%, #6B46C1 100%)",
  "linear-gradient(135deg, #FFC82E 0%, #2E8B7A 100%)",
];

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function eventGradient(title: string): string {
  const index = hashString(title) % GRADIENTS.length;
  return GRADIENTS[index];
}
