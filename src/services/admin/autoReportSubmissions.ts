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
