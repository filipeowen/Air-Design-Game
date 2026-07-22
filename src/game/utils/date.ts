import type { GameDate } from "@/game/types";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
] as const;

export function formatGameDate(date: GameDate): string {
  return `${MONTH_NAMES[date.month - 1]} ${date.year}`;
}

export function advanceMonth(date: GameDate): GameDate {
  if (date.month === 12) {
    return { year: date.year + 1, month: 1 };
  }

  return { year: date.year, month: date.month + 1 };
}

export function turnToDate(turn: number): GameDate {
  const zeroBased = turn;
  const year = 1970 + Math.floor(zeroBased / 12);
  const month = (zeroBased % 12) + 1;
  return { year, month };
}
