export type UserRole = 'admin' | 'traffic_manager' | 'social_media' | 'client'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  logo_url: string | null
  industry: string | null
  contact_email: string | null
  contact_phone: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  client_id: string
  name: string
  platform: 'meta' | 'google' | 'tiktok' | 'linkedin' | 'other'
  status: 'active' | 'paused' | 'finished'
  budget_monthly: number | null
  created_at: string
  updated_at: string
}

export interface TrafficReport {
  id: string
  campaign_id: string
  client_id: string
  period_start: string
  period_end: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number | null
  created_at: string
}

export interface ContentPost {
  id: string
  client_id: string
  title: string
  caption: string | null
  media_url: string | null
  platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'twitter'
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'published'
  scheduled_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface Insight {
  id: string
  title: string
  content: string
  cover_url: string | null
  published: boolean
  created_at: string
  updated_at: string
}
