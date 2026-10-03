import axios from 'axios'

const TOKEN_KEY = 'tien_len_admin_token'
export const ADMIN_AUTH_EXPIRED_EVENT = 'admin-auth-expired'

export interface LoginResult {
  token: string
  tokenType: string
}

export interface GameRecordPlayer {
  player_id: number
  username?: string
  seat_position: number
  final_rank: number
  outcome?: string
  reason?: string
  payout_amount: number
  cards_left: number
  hand?: GameRecordCard[]
  win_at?: string
  status_id: number
}

export interface GameRecordCard {
  id: number
  rank?: string
  suit?: string
  label?: string
  code?: string
  card?: string
  value?: string
  strength?: number
}

export interface GameRecordPlayedSet {
  player_id: number
  seat_number: number
  cards: Array<GameRecordCard | string>
  is_pass: boolean
  combination?: string
}

export interface GameRecord {
  game_id: number
  game_uuid: string
  game_round_id: number
  round_uuid: string
  ticket_id: number
  ticket_no: string
  parent_room_id: number
  inner_room_id: number
  room_code: string
  round_number: number
  started_at?: string
  ended_at?: string
  game_status_id: number
  round_status_id: number
  player_count: number
  players: GameRecordPlayer[]
  snapshot_id: number
  bet: number
  result_reason: string
  table_cards: GameRecordCard[]
  last_played?: GameRecordPlayedSet[]
  snapshot?: Record<string, unknown>
  created_at: string
}

export interface GameRecordList {
  records: GameRecord[]
  page: number
  perPage: number
  total: number
}

export interface GameRoundBet {
  id: number
  hold_key: string
  round_ticket: string
  round_number: number
  parent_room_id: number
  inner_room_id: number
  member_id: number
  currency_id: number
  amount: number
  payout_amount: number
  status: string
  result: string
  reason: string
  balance_before: number
  balance_after: number
  settled_at?: string
  created_at: string
  updated_at?: string
  // Latest admin refund request for this bet; empty when an admin never asked to refund it.
  refund_request_id?: number
  refund_request_status?: BetRefundRequestStatus
  refund_failure_reason?: string
}

// BetRefundRequestStatus mirrors tbl_game_bet_refund_requests.status: the member API moves the money and
// turns `pending` into `done`, or `failed` with a reason the admin can read.
export type BetRefundRequestStatus = 'pending' | 'done' | 'failed'

export interface BetRefundRequest {
  id: number
  bet_id: number
  hold_key: string
  member_id: number
  amount: number
  status: BetRefundRequestStatus
  reason: string
  failure_reason?: string
  requested_by: number
  requested_at: string
  processed_at?: string
}

// AdminCommandResult is returned by actions the member API applies asynchronously. commandWarning is set
// when the change was saved but the game server was not notified right away (it applies within ~30s).
export interface AdminCommandResult<T> {
  record: T
  commandWarning: string
}

// Suspension scopes match tbl_game_suspension_scopes.code.
export type SuspensionScope = 'site' | 'all_games' | 'room'
// RunningRoundPolicy decides what happens to rounds already playing when a suspension starts.
export type RunningRoundPolicy = 'drain' | 'force_stop'

export interface GameSuspension {
  id: number
  uuid: string
  scope: SuspensionScope
  scope_name: string
  room_id?: number
  room_code?: string
  room_name?: string
  running_round_policy: RunningRoundPolicy
  status: 'active' | 'ended'
  message: string
  expected_back_at?: string
  started_by: number
  started_by_name: string
  started_at: string
  ended_by?: number
  ended_by_name?: string
  ended_at?: string
  end_note?: string
}

export interface SuspensionScopeOption {
  id: number
  code: SuspensionScope
  name: string
  requires_room: boolean
  order: number
}

export interface ActiveSuspensions {
  records: GameSuspension[]
  scopes: SuspensionScopeOption[]
}

export interface GameSuspensionList {
  records: GameSuspension[]
  page: number
  perPage: number
  total: number
}

export interface StartSuspensionRequest {
  scope: SuspensionScope
  room_id?: number
  running_round_policy: RunningRoundPolicy
  message: string
  expected_back_at?: string
}

interface ActiveSuspensionsResponse {
  data: ActiveSuspensions
}

interface GameSuspensionListResponse {
  data: GameSuspension[]
  page: number
  per_page: number
  total: number
}

interface SuspensionChangeResponse {
  data: {
    suspension: GameSuspension
    command_warning?: string
  }
}

interface BetRefundResponse {
  data: {
    request: BetRefundRequest
    command_warning?: string
  }
}

export interface GameRoundBetList {
  records: GameRoundBet[]
  page: number
  perPage: number
  total: number
}

export interface GamePayoutConfig {
  id: number
  room_id: number
  room_code: string
  room_name: string
  entry_fee: number
  player_count: number
  rank: number
  rake_percent: number
  payout_percent: number
  status_id: number
  order: number
  created_at: string
  updated_at?: string
}

export interface RoomConfiguration {
  id: number
  room_id: number
  room_code: string
  room_name: string
  turn_timeout_seconds: number
  created_at: string
  updated_at?: string
}

export interface GameSpecialPayoutRule {
  id: number
  room_id: number
  room_code: string
  room_name: string
  entry_fee: number
  event_type: string
  payout_type: 'entry_fee_multiplier' | 'fixed_amount' | string
  payout_value: number
  commission_percent: number
  payer: string
  receiver: string
  status_id: number
  order: number
  created_at: string
  updated_at?: string
}

export interface GameSpecialPayout {
  id: number
  event_key: string
  round_ticket: string
  round_number: number
  parent_room_id: number
  inner_room_id: number
  event_type: string
  payout_type: string
  payout_value: number
  gross_amount: number
  commission_percent: number
  commission_amount: number
  net_amount: number
  payer_member_id: number
  receiver_member_id: number
  currency_id: number
  status: string
  reason: string
  payer_balance_before: number
  payer_balance_after: number
  receiver_balance_before: number
  receiver_balance_after: number
  settled_at?: string
  created_at: string
}

export interface GameSpecialPayoutList {
  records: GameSpecialPayout[]
  page: number
  perPage: number
  total: number
}

export interface Room {
  id: number
  uuid: string
  code: string
  name: string
  status_id: number
  entry_fee: number
  sort_order: number
  turn_timeout_seconds: number
  created_at: string
  created_by: number
}

export interface CreateRoomRequest {
  room_code: string
  room_name: string
  entry_fee: number
  status_id?: number
  order?: number
  turn_timeout_seconds?: number
}

// UpdateRoomRequest edits a parent room. room_code is not editable (it identifies the room in history).
export interface UpdateRoomRequest {
  room_name: string
  entry_fee: number
  status_id: number
  order: number
}

export interface RankPayoutRequest {
  rank: number
  payout_percent: number
}

export interface UpdateRoomPayoutConfigRequest {
  player_count: number
  rake_percent: number
  rank_payouts: RankPayoutRequest[]
}

export interface UpdateRoomConfigurationRequest {
  turn_timeout_seconds: number
}

export interface UpdateRoomSpecialPayoutRuleRequest {
  event_type: string
  payout_type: string
  payout_value: number
  commission_percent: number
  payer: string
  receiver: string
  status_id: number
  order?: number
}

export interface AuditLog {
  id: number
  user_id: number
  context: string
  description: string
  audit_type_id: number
  audit_type: string
  user_agent: string
  operator: string
  ip: string
  status_id: number
  order: number
  created_by: number
  created_at: string
}

export interface AuditLogList {
  records: AuditLog[]
  page: number
  perPage: number
  total: number
}

export interface AdminUser {
  id: number
  user_uuid: string
  first_name: string
  last_name: string
  user_name: string
  email: string
  role_id: number
  role_name: string
  status: boolean | string
  phone_number?: string
  commission: string | number
  status_id: number
  creator?: string
  created_at: string
  updated_at?: string
}

export interface AdminUserList {
  records: AdminUser[]
  page: number
  perPage: number
  total: number
}

export interface AdminRole {
  id: number
  user_role_name: string
}

export interface CreateAdminUserRequest {
  first_name: string
  last_name: string
  user_name: string
  password: string
  password_confirm: string
  email: string
  role_id: number
  phone_number: string
  commission: number
}

export interface Member {
  id: number
  member_uuid: string
  login_id: string
  nickname?: string
  phone?: string
  currency_id: number
  language_id: number
  role_id: number
  status_id: number
  is_active: boolean
  is_online?: boolean
  min_bet: number
  max_bet: number
  max_win: number
  max_draw: number
  max_money: number
  max_game: number
  remark?: string
  created_at: string
  updated_at?: string
}

export interface MemberList {
  records: Member[]
  page: number
  perPage: number
  total: number
}

export interface CreateMemberRequest {
  login_id: string
  password: string
  nickname: string
  phone: string
  currency_id: number
  language_id: number
  role_id: number
  min_bet: number
  max_bet: number
  max_win: number
  max_draw: number
  max_money: number
  max_game: number
  remark: string
}

interface LoginResponse {
  data: {
    auths: {
      token: string
      token_type: string
    }
  }
}

interface GameRecordListResponse {
  data: GameRecord[]
  page: number
  per_page: number
  total: number
}

interface GameRecordDetailResponse {
  data: GameRecord
}

interface GameRoundBetListResponse {
  data: GameRoundBet[]
  page: number
  per_page: number
  total: number
}

interface GamePayoutConfigListResponse {
  data: GamePayoutConfig[]
}

interface RoomConfigurationListResponse {
  data: RoomConfiguration[]
}

interface GameSpecialPayoutRuleListResponse {
  data: GameSpecialPayoutRule[]
}

interface GameSpecialPayoutListResponse {
  data: GameSpecialPayout[]
  page: number
  per_page: number
  total: number
}

interface CreateRoomResponse {
  data: {
    room: Room
    room_config: RoomConfiguration
    payout_configs: GamePayoutConfig[]
  }
}

interface UpdateRoomPayoutConfigResponse {
  data: GamePayoutConfig[]
}

interface RoomListResponse {
  data: {
    rooms: Room[]
  }
}

interface UpdateRoomResponse {
  data: Room
}

interface UpdateRoomConfigurationResponse {
  data: RoomConfiguration
}

interface UpdateRoomSpecialPayoutRuleResponse {
  data: GameSpecialPayoutRule
}

interface AuditLogListResponse {
  data: AuditLog[]
  page: number
  per_page: number
  total: number
}

interface AdminUserListResponse {
  data: {
    users: AdminUser[]
  }
  page: number
  per_page: number
  total: number
}

interface AdminUserCreateResponse {
  data: {
    users: AdminUser[]
  }
}

interface AdminUserFormCreateResponse {
  data: {
    users: Array<{
      roles: AdminRole[]
    }>
  }
}

interface MemberListResponse {
  data: Member[]
  page: number
  per_page: number
  total: number
}

interface MemberCreateResponse {
  data: Member
}

export const apiBaseUrl = import.meta.env.VITE_ADMIN_API_BASE_URL || 'http://localhost:8889'

const client = axios.create({
  baseURL: apiBaseUrl,
  timeout: 12000,
})

client.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAuthFailure(error)) {
      clearStoredToken()
      window.dispatchEvent(new CustomEvent(ADMIN_AUTH_EXPIRED_EVENT))
    }
    return Promise.reject(error)
  },
)

// isAuthFailure detects expired or invalid admin sessions from HTTP status and backend error payloads.
function isAuthFailure(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const requestUrl = error.config?.url || ''
  if (requestUrl.includes('/api/v1/auth/login')) return false

  const status = error.response?.status
  if (status === 401 || status === 403) return true

  const responseData = error.response?.data as { message?: string; status_code?: number; data?: { error?: string }; error?: string } | undefined
  const message = [responseData?.message, responseData?.data?.error, responseData?.error].filter(Boolean).join(' ').toLowerCase()
  return status === 422 && responseData?.status_code === -500 && /session|token|jwt|authorization/.test(message)
}

// apiErrorMessage returns the backend's own error text (for example "bet is already settled") when there is
// one, so admins see why an action was refused instead of a generic "status code 400".
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { message?: string; data?: { error?: string } } | undefined
    const detail = responseData?.data?.error || responseData?.message
    if (detail) return detail
  }
  return error instanceof Error ? error.message : fallback
}

// loginAdmin authenticates with the admin API and stores the returned bearer token for later requests.
export async function loginAdmin(username: string, password: string): Promise<LoginResult> {
  const response = await client.post<LoginResponse>('/api/v1/auth/login', { username, password })
  const auth = response.data.data.auths
  storeToken(auth.token)
  return { token: auth.token, tokenType: auth.token_type }
}

// listGameRecords fetches the admin-wide persisted game records page.
export async function listGameRecords(page: number, perPage: number): Promise<GameRecordList> {
  const response = await client.get<GameRecordListResponse>('/api/v1/tienlen/games', {
    params: {
      'paging_options[page]': page,
      'paging_options[per_page]': perPage,
    },
  })

  return {
    records: response.data.data,
    page: response.data.page,
    perPage: response.data.per_page,
    total: response.data.total,
  }
}

// getGameRecord fetches one round record with snapshot detail for the dedicated admin detail page.
export async function getGameRecord(gameRoundId: number): Promise<GameRecord> {
  const response = await client.get<GameRecordDetailResponse>(`/api/v1/tienlen/games/${gameRoundId}`)
  return response.data.data
}

// listGameRoundBets fetches the admin bet ledger with the same pagination shape as game records.
export async function listGameRoundBets(page: number, perPage: number): Promise<GameRoundBetList> {
  const response = await client.get<GameRoundBetListResponse>('/api/v1/tienlen/bets', {
    params: {
      'paging_options[page]': page,
      'paging_options[per_page]': perPage,
    },
  })

  return {
    records: response.data.data,
    page: response.data.page,
    perPage: response.data.per_page,
    total: response.data.total,
  }
}

// listGamePayoutConfigs fetches active payout percent rows from the admin API.
export async function listGamePayoutConfigs(): Promise<GamePayoutConfig[]> {
  const response = await client.get<GamePayoutConfigListResponse>('/api/v1/tienlen/payout-configs')
  return response.data.data
}

// createRoomWithPayoutConfigs creates a parent room and receives the default seeded payout rows.
export async function createRoomWithPayoutConfigs(request: CreateRoomRequest): Promise<CreateRoomResponse['data']> {
  const response = await client.post<CreateRoomResponse>('/api/v1/tienlen/rooms', request)
  return response.data.data
}

// updateRoomPayoutConfigs saves one room/player-count rank distribution as decimal shares.
export async function updateRoomPayoutConfigs(roomId: number, request: UpdateRoomPayoutConfigRequest): Promise<GamePayoutConfig[]> {
  const response = await client.put<UpdateRoomPayoutConfigResponse>(`/api/v1/tienlen/rooms/${roomId}/payout-configs`, request)
  return response.data.data
}

// listRoomConfigurations fetches parent-room timing settings for admin controls.
export async function listRoomConfigurations(): Promise<RoomConfiguration[]> {
  const response = await client.get<RoomConfigurationListResponse>('/api/v1/tienlen/room-configurations')
  return response.data.data
}

// updateRoomConfiguration saves gameplay timing used by future game starts.
export async function updateRoomConfiguration(roomId: number, request: UpdateRoomConfigurationRequest): Promise<RoomConfiguration> {
  const response = await client.put<UpdateRoomConfigurationResponse>(`/api/v1/tienlen/rooms/${roomId}/configuration`, request)
  return response.data.data
}

// listRooms fetches every parent room (name, entry fee, status, order, turn timeout) for room setup.
export async function listRooms(): Promise<Room[]> {
  const response = await client.get<RoomListResponse>('/api/v1/tienlen/room')
  return response.data.data.rooms ?? []
}

// updateRoom saves a parent room's name, entry fee, status and order.
export async function updateRoom(roomId: number, request: UpdateRoomRequest): Promise<Room> {
  const response = await client.put<UpdateRoomResponse>(`/api/v1/tienlen/rooms/${roomId}`, request)
  return response.data.data
}

// listGameSpecialPayoutRules fetches room-level special event payout rules for admin editing.
export async function listGameSpecialPayoutRules(): Promise<GameSpecialPayoutRule[]> {
  const response = await client.get<GameSpecialPayoutRuleListResponse>('/api/v1/tienlen/special-payout-rules')
  return response.data.data
}

// updateRoomSpecialPayoutRule saves one room's special-event payout rule.
export async function updateRoomSpecialPayoutRule(roomId: number, request: UpdateRoomSpecialPayoutRuleRequest): Promise<GameSpecialPayoutRule> {
  const response = await client.put<UpdateRoomSpecialPayoutRuleResponse>(`/api/v1/tienlen/rooms/${roomId}/special-payout-rules`, request)
  return response.data.data
}

// listGameSpecialPayouts fetches the immutable special payout ledger with standard admin pagination.
export async function listGameSpecialPayouts(page: number, perPage: number): Promise<GameSpecialPayoutList> {
  const response = await client.get<GameSpecialPayoutListResponse>('/api/v1/tienlen/special-payouts', {
    params: {
      'paging_options[page]': page,
      'paging_options[per_page]': perPage,
    },
  })

  return {
    records: response.data.data,
    page: response.data.page,
    perPage: response.data.per_page,
    total: response.data.total,
  }
}

// listAuditLogs fetches protected admin audit activity with optional text search.
export async function listAuditLogs(page: number, perPage: number, search = ''): Promise<AuditLogList> {
  const response = await client.get<AuditLogListResponse>('/api/v1/audits/', {
    params: {
      'paging_options[page]': page,
      'paging_options[per_page]': perPage,
      search,
    },
  })

  return {
    records: response.data.data,
    page: response.data.page,
    perPage: response.data.per_page,
    total: response.data.total,
  }
}

// listAdminUsers fetches admin accounts with the legacy user endpoint's nested users payload.
export async function listAdminUsers(page: number, perPage: number): Promise<AdminUserList> {
  const response = await client.get<AdminUserListResponse>('/api/v1/user/', {
    params: {
      'paging_options[page]': page,
      'paging_options[per_page]': perPage,
      'sorts[0][property]': 'u.id',
      'sorts[0][direction]': 'desc',
    },
  })

  return {
    records: response.data.data.users,
    page: response.data.page,
    perPage: response.data.per_page,
    total: response.data.total,
  }
}

// createAdminUser creates one admin user account and returns the saved row.
export async function createAdminUser(request: CreateAdminUserRequest): Promise<AdminUser> {
  const response = await client.post<AdminUserCreateResponse>('/api/v1/user/', request)
  return response.data.data.users[0]
}

// getAdminUserCreateRoles reads role options from the backend form endpoint so the UI does not hard-code access levels.
export async function getAdminUserCreateRoles(): Promise<AdminRole[]> {
  const response = await client.get<AdminUserFormCreateResponse>('/api/v1/user/form/create')
  return response.data.data.users[0]?.roles || []
}

// listMembers fetches playable member accounts with bounded pagination and optional text search.
export async function listMembers(page: number, perPage: number, search = ''): Promise<MemberList> {
  const response = await client.get<MemberListResponse>('/api/v1/members/', {
    params: {
      'paging_options[page]': page,
      'paging_options[per_page]': perPage,
      search,
    },
  })

  return {
    records: response.data.data,
    page: response.data.page,
    perPage: response.data.per_page,
    total: response.data.total,
  }
}

// createMember creates one playable member account from the admin UI.
export async function createMember(request: CreateMemberRequest): Promise<Member> {
  const response = await client.post<MemberCreateResponse>('/api/v1/members/', request)
  return response.data.data
}

// listActiveSuspensions fetches what is suspended right now plus the scope options for the suspend form.
export async function listActiveSuspensions(): Promise<ActiveSuspensions> {
  const response = await client.get<ActiveSuspensionsResponse>('/api/v1/suspensions/active')
  return response.data.data
}

// listSuspensionHistory fetches suspension history newest first with standard admin pagination.
export async function listSuspensionHistory(page: number, perPage: number): Promise<GameSuspensionList> {
  const response = await client.get<GameSuspensionListResponse>('/api/v1/suspensions/', {
    params: {
      'paging_options[page]': page,
      'paging_options[per_page]': perPage,
    },
  })

  return {
    records: response.data.data,
    page: response.data.page,
    perPage: response.data.per_page,
    total: response.data.total,
  }
}

// startSuspension suspends the website, all games, or one room. The member API applies it right away.
export async function startSuspension(request: StartSuspensionRequest): Promise<AdminCommandResult<GameSuspension>> {
  const response = await client.post<SuspensionChangeResponse>('/api/v1/suspensions/', request)
  return { record: response.data.data.suspension, commandWarning: response.data.data.command_warning || '' }
}

// endSuspension resumes one active suspension, with an optional note kept in the history.
export async function endSuspension(suspensionId: number, note: string): Promise<AdminCommandResult<GameSuspension>> {
  const response = await client.post<SuspensionChangeResponse>(`/api/v1/suspensions/${suspensionId}/end`, { note })
  return { record: response.data.data.suspension, commandWarning: response.data.data.command_warning || '' }
}

// requestBetRefund asks the member API to refund one held/unsettled bet. The result starts as `pending`;
// the ledger shows `done` or `failed` once the member API has processed it.
export async function requestBetRefund(betId: number, reason: string): Promise<AdminCommandResult<BetRefundRequest>> {
  const response = await client.post<BetRefundResponse>(`/api/v1/tienlen/bets/${betId}/refund`, { reason })
  return { record: response.data.data.request, commandWarning: response.data.data.command_warning || '' }
}

export function getStoredToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}
