export const CAPTURE_SUCCESS_RATE = 0.92;
export const CAPTURE_HP_PERCENT = 15; // 對手 HP 剩 15%（含）以下才能收服
export function canCapture(hp, maxHp) {
  return Number.isFinite(hp) && Number.isFinite(maxHp) && maxHp > 0 && hp > 0 && hp * 100 <= maxHp * CAPTURE_HP_PERCENT;
}
export function captureSucceeds(hp, maxHp, random = Math.random) {
  return canCapture(hp, maxHp) && random() < CAPTURE_SUCCESS_RATE;
}
