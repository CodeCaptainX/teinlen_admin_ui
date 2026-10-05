// Special payout ("cutting a 2") money as the game server computes it, so the admin page can show what a cut
// costs and the balance a player needs to join, before and after an admin edits the rules.
// Keep in sync with tienlen-member-api/pkg/specialpayout (Amounts, CutCosts, MaxTwosAPlayerCanBeCut,
// MaxLiability, MinimumBalance). Explained in tienlen-member-api/docs/refunds-and-minimum-balance.md.

// SPECIAL_EVENT names the two rule types the server knows; other event types do not add to the liability.
export const SPECIAL_EVENT = {
  beatSingleTwo: 'beat_single_2',
  beatPairTwo: 'beat_pair_2',
} as const

// MAX_TWOS_CUT_PER_PLAYER bounds the worst case. A deck has four 2s, but being dealt all four is the
// "four_of_2" auto-win: the round ends at the deal with no cuts. So a player who plays holds at most three 2s.
// The game server reads this from its auto-win rules (maxTwosAPlayerCanBeCut); the rule is always on.
const MAX_TWOS_CUT_PER_PLAYER = 3

// SpecialRuleInput is the part of a rule that affects money; it accepts saved rules and unsaved edits.
export interface SpecialRuleInput {
  event_type: string
  payout_type: string
  payout_value: number
  // commission is a share between 0 and 1 (0.05 = 5%), as stored in the database.
  commission: number
  active: boolean
}

export interface SpecialPayoutAmounts {
  // gross is what the beaten player pays; net is what the beating player receives after commission.
  gross: number
  commission: number
  net: number
}

// roundMoney matches the server's two-decimal rounding.
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

// specialPayoutAmounts returns what one cut moves: entry_fee_multiplier = value × entry fee, fixed_amount = value.
// Invalid values (zero, negative, unknown type) give zero, because the admin form blocks saving them anyway.
export function specialPayoutAmounts(rule: SpecialRuleInput, entryFee: number): SpecialPayoutAmounts {
  const value = Number(rule.payout_value) || 0
  let gross = 0
  if (rule.payout_type === 'entry_fee_multiplier') gross = roundMoney(entryFee * value)
  else if (rule.payout_type === 'fixed_amount') gross = roundMoney(value)
  if (gross <= 0) return { gross: 0, commission: 0, net: 0 }
  const commission = roundMoney(gross * (Number(rule.commission) || 0))
  return { gross, commission, net: roundMoney(gross - commission) }
}

// maxSpecialPayoutLiability is the most one player can owe from cuts in one round: holding three 2s and losing
// every cut, in the most expensive split (three singles, or one pair plus one single). Paused rules don't count.
export function maxSpecialPayoutLiability(rules: SpecialRuleInput[], entryFee: number): number {
  let singleTwoGross = 0
  let pairTwoGross = 0
  for (const rule of rules) {
    if (!rule.active) continue
    const { gross } = specialPayoutAmounts(rule, entryFee)
    if (rule.event_type === SPECIAL_EVENT.beatSingleTwo) singleTwoGross = Math.max(singleTwoGross, gross)
    if (rule.event_type === SPECIAL_EVENT.beatPairTwo) pairTwoGross = Math.max(pairTwoGross, gross)
  }
  let maxLiability = 0
  for (let pairCuts = 0; pairCuts * 2 <= MAX_TWOS_CUT_PER_PLAYER; pairCuts += 1) {
    const singleCuts = MAX_TWOS_CUT_PER_PLAYER - pairCuts * 2
    maxLiability = Math.max(maxLiability, roundMoney(pairCuts * pairTwoGross + singleCuts * singleTwoGross))
  }
  return maxLiability
}

// minimumBalanceForRound is the balance a player needs before a round can start: the entry fee plus the worst
// cut debt. The server marks players below it as not ready instead of starting the round.
export function minimumBalanceForRound(rules: SpecialRuleInput[], entryFee: number): number {
  if (entryFee <= 0) return 0
  return roundMoney(entryFee + maxSpecialPayoutLiability(rules, entryFee))
}
