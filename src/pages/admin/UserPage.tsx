import { useEffect, useMemo, useState } from "react"
import { Layout } from "@/components/layout/Layout"
import AdminLayout from "@/components/layout/AdminLayout"
import { Button } from "@/components/ui/button"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { Plus } from "lucide-react"
import { Link } from "react-router-dom"
import api from "@/lib/api"
import { toast } from "sonner"
import { getOrgIdFromToken } from "@/lib/jwtUtils"

type APIUser = {
  id?: string | number
  email?: string
  first_name?: string
  last_name?: string
  phone_number?: string
  role?: string
  status?: string
}

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  phone?: string
  status?: string
}

const UserPage = () => {
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)

  const columns = useMemo<GridColDef<UserRow>[]>(
    () => [
      { field: "name", headerName: "NAME", width: 240 },
      { field: "email", headerName: "EMAIL", width: 260 },
      { field: "role", headerName: "ROLE", width: 160 },
      { field: "phone", headerName: "PHONE", width: 200 },
      { field: "status", headerName: "STATUS", width: 160 },
    ],
    [],
  )

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true)
      try {
        const orgId = getOrgIdFromToken()
        if (!orgId) {
          toast.error("Organization ID not found")
          setRows([])
          return
        }

        const response = await api.get(`/auth/em/users?org_id=${orgId}`)
        const users: APIUser[] = response.data?.data?.data || []

        const mappedRows: UserRow[] = users.map((user, index) => {
          const id = user.id ?? index
          const firstName = user.first_name?.trim() || ""
          const lastName = user.last_name?.trim() || ""
          const fullName = `${firstName} ${lastName}`.trim()

          return {
            id: String(id),
            name: fullName || user.email || `User ${index + 1}`,
            email: user.email || "-",
            role: (user.role || "-").toUpperCase(),
            phone: user.phone_number || "-",
            status: user.status || "-",
          }
        })

        setRows(mappedRows)
      } catch (error) {
        console.error("Failed to load users:", error)
        toast.error("Failed to load users")
        setRows([])
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [])

  return (
    <Layout>
      <AdminLayout>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-sm text-gray-600 mt-1">
              View and manage the users in your organization.
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/users/create">
              <Plus className="mr-2 h-4 w-4" />
              CREATE
            </Link>
          </Button>
        </div>

        <div className="bg-gray-100 rounded-md p-4 mb-6">
          <p className="text-sm text-gray-600">
            Review user access and create new users to grant access to Chronon.
          </p>
        </div>

        <DataGrid
          className="rounded border-[0.2px] border-[#f3f4f6] h-full"
          columns={columns}
          rows={rows}
          loading={loading}
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaderTitle": {
              color: "#9AA0A6",
              fontWeight: "bold",
              fontSize: "12px",
            },
            "& .MuiDataGrid-main": {
              border: "0.2px solid #f3f4f6",
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#f3f4f6",
              border: "none",
            },
            "& .MuiDataGrid-columnHeaders": {
              border: "none",
              borderTop: "none",
              borderBottom: "none",
            },
            "& .MuiCheckbox-root": {
              color: "#9AA0A6",
            },
            "& .MuiDataGrid-row:hover": {
              cursor: "pointer",
              backgroundColor: "#f5f5f5",
            },
            "& .MuiDataGrid-cell": {
              color: "#2E2E2E",
              border: "0.2px solid #f3f4f6",
            },
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
              outline: "none",
            },
            "& .MuiDataGrid-cell:focus-within": {
              outline: "none",
            },
            "& .MuiDataGrid-columnSeparator": {
              color: "#f3f4f6",
            },
          }}
          density="compact"
          checkboxSelection
          disableRowSelectionOnClick
          showCellVerticalBorder
        />
      </AdminLayout>
    </Layout>
  )
}

 export default UserPage
