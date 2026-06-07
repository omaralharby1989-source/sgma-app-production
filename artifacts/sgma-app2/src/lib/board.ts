export function formatBoardBioToBullets(bio: string): string[] {
  if (!bio) return [];
  return bio
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•.]+\s*/, "").trim())
    .filter((line) => line.length > 0);
}
