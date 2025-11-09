import AdminLayout from '@/components/layout/AdminLayout'
import { Layout } from '@/components/layout/Layout'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createAutoReportSchedule } from '@/services/admin/autoReportSubmissions'
import { toast } from 'sonner'

const getOrdinalSuffix = (day: number) => {
  if (day % 100 >= 11 && day % 100 <= 13) {
    return 'th'
  }
  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}


export const AutoReportPage = () => {
  type SubmissionScheduleRow = {
    id: string
    submitOn: string
    createdBy: string
    description?: string
  }

  const [scheduleRows, setScheduleRows] = useState<SubmissionScheduleRow[]>([])
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleType, setScheduleType] = useState<'weekly' | 'monthly'>('weekly')
  const [selectedDay, setSelectedDay] = useState<string | undefined>()
  const [selectedMonthDate, setSelectedMonthDate] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const columns: GridColDef<SubmissionScheduleRow>[] = [
    {
      field: 'submitOn',
      headerName: 'Submit expense report date',
      width: 280,
      flex: 1,
    },
    {
      field: 'createdBy',
      headerName: 'Created by',
      width: 220,
      flex: 1,
    },
    {
      field: 'description',
      headerName: 'Description',
      width: 260,
      flex: 1,
    },
  ]

  const monthlyDateOptions = useMemo(() =>
    Array.from({ length: 31 }, (_, index) => {
      const day = index + 1
      return {
        value: day.toString(),
        label: `${day}${getOrdinalSuffix(day)}`,
      }
    }),
  [])

  const weeklyDayOptions = [
    { value: 'mon', label: 'Monday' },
    { value: 'tue', label: 'Tuesday' },
    { value: 'wed', label: 'Wednesday' },
    { value: 'thu', label: 'Thursday' },
    { value: 'fri', label: 'Friday' },
    { value: 'sat', label: 'Saturday' },
    { value: 'sun', label: 'Sunday' },
  ]

  const cadenceCopy = scheduleType === 'monthly' ? 'of every month' : 'of every week'

  const canSubmit =
    (scheduleType === 'weekly' && !!selectedDay) ||
    (scheduleType === 'monthly' && !!selectedMonthDate)

  const selectedDayLabel =
    selectedDay && weeklyDayOptions.find(option => option.value === selectedDay)?.label

  const selectedMonthLabel =
    selectedMonthDate && monthlyDateOptions.find(option => option.value === selectedMonthDate)?.label

  const summaryText =
    scheduleType === 'monthly'
      ? selectedMonthLabel
        ? `${selectedMonthLabel} of every month`
        : 'Select a Date'
      : selectedDayLabel
      ? `${selectedDayLabel} of every week`
      : 'Select a Day'

  const handleCreateSchedule = async () => {
    if (!canSubmit) {
      toast.error('Select a date before continuing.')
      return
    }

    const description =
      scheduleType === 'monthly'
        ? `Expense reports will be submitted automatically for approval on ${selectedMonthLabel} of every month.`
        : `Expense reports will be submitted automatically for approval on ${selectedDayLabel} of every week.`

    const payload =
      scheduleType === 'monthly'
        ? {
            description,
            schedule_config: {
              type: 'cron' as const,
              when: {
                day: selectedMonthDate!,
              },
            },
          }
        : {
            description,
            schedule_config: {
              type: 'cron' as const,
              when: {
                day_of_week: selectedDay!,
              },
            },
          }

    try {
      setIsSubmitting(true)
      const response = await createAutoReportSchedule(payload)

      setScheduleRows(prev => [
        ...prev,
        {
          id: response.data.id,
          submitOn: summaryText,
          createdBy: 'You',
          description: response.data.description,
        },
      ])

      toast.success('Auto submission schedule created.')
      setShowScheduleModal(false)
      setSelectedDay(undefined)
      setSelectedMonthDate(undefined)
      setScheduleType('weekly')
    } catch (error) {
      toast.error('Failed to create schedule. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout>
      <AdminLayout>
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Automated expense reports submissions</h1>
          <Button onClick={() => setShowScheduleModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Submission Schedule
          </Button>
        </div>

        
        <div className="bg-gray-100 rounded-md p-4 mb-6">
          <p className="text-sm text-gray-600">
            Create submission schedules to automatically submit expense reports at specified intervals.
          </p>
        </div>

        
        <DataGrid
                    className="rounded border-[0.2px] border-[#f3f4f6] h-full"
                    columns={columns}
                    rows={scheduleRows}
                    sx={{
                        border: 0,
                        "& .MuiDataGrid-columnHeaderTitle": {
                            color: '#9AA0A6',
                            fontWeight: 'bold',
                            fontSize: "12px"
                        },
                        "& .MuiDataGrid-main": {
                            border: '0.2px solid #f3f4f6'
                        },
                        "& .MuiDataGrid-columnHeader": {
                            backgroundColor: '#f3f4f6',
                            border: 'none'
                        },
                        "& .MuiDataGrid-columnHeaders": {
                            border: 'none',
                            borderTop: "none",
                            borderBottom: "none",
                        },
                        "& .MuiCheckbox-root": {
                            color: '#9AA0A6'
                        },
                        "& .MuiDataGrid-row:hover": {
                            cursor: "pointer",
                            backgroundColor: "#f5f5f5",
                        },
                        "& .MuiDataGrid-cell": {
                            color: '#2E2E2E',
                            border: '0.2px solid #f3f4f6'
                        },
                        "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
                            outline: "none",
                        },
                        "& .MuiDataGrid-cell:focus-within": {
                            outline: "none",
                        },
                        '& .MuiDataGrid-columnSeparator': {
                            color: '#f3f4f6'
                        },
                    }}
                    showToolbar
                    density="compact"
                    checkboxSelection
                    disableRowSelectionOnClick
                    showCellVerticalBorder
                    // onRowClick={handleRowClick}
                    // pagination
                    // paginationMode='server'
                    // paginationModel={paginationModel}
                    // onPaginationModelChange={setPaginationModel}
                    // rowCount={(activeTab === "all" ? allPagination?.total : activeTab === "pending" ? pendingPagination?.total : processedPagination?.total) || 0}
                    // autoPageSize
                />

        <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle>Create Submission Schedule</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Schedule Type <span className="text-red-500">*</span>
                  </label>
                </div>
                <Select
                  value={scheduleType}
                  onValueChange={value => {
                    setScheduleType(value as typeof scheduleType)
                    setSelectedDay(undefined)
                    setSelectedMonthDate(undefined)
                  }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Auto-Submit Expense Reports on
                </label>
                <div className="flex items-center gap-2">
                  {scheduleType === 'monthly' ? (
                    <Select value={selectedMonthDate} onValueChange={setSelectedMonthDate}>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="Select a date" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {monthlyDateOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={selectedDay} onValueChange={setSelectedDay}>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="Select a day" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {weeklyDayOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <span className="text-sm text-gray-500 whitespace-nowrap">{cadenceCopy}</span>
                </div>
              </div>

              {/* <Button variant="ghost" className="justify-start px-0 text-green-600 hover:text-green-700 hover:bg-transparent">
                + Add Another Date
              </Button> */}

              <div className="rounded-md border bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Expense Reports will be submitted on{' '}
                <span className="font-medium text-gray-900">{summaryText}</span>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSchedule} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create schedule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </Layout>
  )
}