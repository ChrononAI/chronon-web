import api from '@/lib/api'

type CreateAutoReportSchedulePayload =
  | {
      description: string
      schedule_config: {
        type: 'cron'
        when: {
          day: string
        }
      }
    }
  | {
      description: string
      schedule_config: {
        type: 'cron'
        when: {
          day_of_week: string
        }
      }
    }
type CreateAutoReportScheduleResponse = {
  data: {
    description: string
    id: string
    org_id: string
    schedule_id: string
  }
}

export async function createAutoReportSchedule(
  payload: CreateAutoReportSchedulePayload
) {
  const response = await api.post<CreateAutoReportScheduleResponse>(
    '/reports/auto_report_submissions',
    payload
  )
  return response.data
}

export type AutoReportSubmission = {
  id: string
  description: string
  org_id: string
  schedule_id: string
  created_at: string
  updated_at: string
  schedule: {
    apscheduler_job_id: string
    config: {
      type: 'cron'
      when: {
        day?: string
        day_of_week?: string
      }
    }
    created_at: string
    event_name: string
    id: string
    is_enabled: boolean
    updated_at: string
  }
  created_by: {
    email: string
    org_id: string
    user_id: string
  }
  updated_by: {
    email: string
    org_id: string
    user_id: string
  }
}

type GetAutoReportSubmissionsResponse = {
  status: string
  data: AutoReportSubmission[]
}

export async function getAutoReportSchedules() {
  const response = await api.get<GetAutoReportSubmissionsResponse>(
    '/reports/auto_report_submissions'
  )
  return response.data
}
