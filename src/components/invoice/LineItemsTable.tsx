import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Loader2 } from "lucide-react";

export type InvoiceLineRow = {
  id: number;
  itemDescription: string;
  quantity: string;
  rate: string;
  tdsCode: string;
  tdsAmount: string;
  gstCode: string;
  igst: string;
  cgst: string;
  sgst: string;
  netAmount: string;
};

interface LineItemsTableProps {
  rows: InvoiceLineRow[];
  isLoading: boolean;
  isApprovalMode: boolean;
  onRowUpdate: (rowId: number, field: keyof Omit<InvoiceLineRow, "id">, value: string) => void;
  onAddRow: () => void;
  isFieldChanged: (rowId: number, field: keyof Omit<InvoiceLineRow, "id">, currentValue: string) => boolean;
}

export function LineItemsTable({
  rows,
  isLoading,
  isApprovalMode,
  onRowUpdate,
  onAddRow,
  isFieldChanged,
}: LineItemsTableProps) {
  return (
    <div className="border-t bg-white">
      <div className="py-6 pr-6 pl-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 min-w-[200px]">ITEM DESCRIPTION</TableHead>
              <TableHead className="px-4">QUANTITY</TableHead>
              <TableHead className="px-4">RATE</TableHead>
              <TableHead className="px-4">TDS CODE</TableHead>
              <TableHead className="px-4">TDS AMOUNT</TableHead>
              <TableHead className="px-4">GST CODE</TableHead>
              <TableHead className="px-4">IGST</TableHead>
              <TableHead className="px-4">CGST</TableHead>
              <TableHead className="px-4">SGST</TableHead>
              <TableHead className="px-4">NET AMOUNT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="px-4 py-10">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Processing invoice…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="px-4 py-10">
                  <div className="text-center text-sm text-gray-500">
                    No line items yet. Upload an invoice or click "Add Row".
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="px-4 py-1">
                    <Input
                      value={row.itemDescription}
                      onChange={(e) => onRowUpdate(row.id, "itemDescription", e.target.value)}
                      className={`h-8 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 whitespace-nowrap overflow-hidden text-ellipsis ${
                        isFieldChanged(row.id, "itemDescription", row.itemDescription) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="Enter item description"
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1">
                    <Input
                      value={row.quantity ? parseFloat(row.quantity).toString() : ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || /^\d+$/.test(value)) {
                          onRowUpdate(row.id, "quantity", value);
                        }
                      }}
                      className={`h-8 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 ${
                        isFieldChanged(row.id, "quantity", row.quantity) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="Qty"
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1">
                    <Input
                      value={row.rate}
                      onChange={(e) => onRowUpdate(row.id, "rate", e.target.value)}
                      className={`h-8 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 ${
                        isFieldChanged(row.id, "rate", row.rate) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="₹ 0.00"
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1">
                    <Input
                      value={row.tdsCode}
                      onChange={(e) => onRowUpdate(row.id, "tdsCode", e.target.value)}
                      className={`h-8 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 ${
                        isFieldChanged(row.id, "tdsCode", row.tdsCode) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="Enter TDS code"
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1">
                    <Input
                      value={row.tdsAmount}
                      onChange={(e) => onRowUpdate(row.id, "tdsAmount", e.target.value)}
                      className={`h-8 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 ${
                        isFieldChanged(row.id, "tdsAmount", row.tdsAmount) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="₹ 0.00"
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1">
                    <Input
                      value={row.gstCode}
                      onChange={(e) => onRowUpdate(row.id, "gstCode", e.target.value)}
                      className={`h-8 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 ${
                        isFieldChanged(row.id, "gstCode", row.gstCode) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="Enter GST code"
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1">
                    <Input
                      value={row.igst}
                      onChange={(e) => onRowUpdate(row.id, "igst", e.target.value)}
                      className={`h-8 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 ${
                        isFieldChanged(row.id, "igst", row.igst) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="₹ 0.00"
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1">
                    <Input
                      value={row.cgst}
                      onChange={(e) => onRowUpdate(row.id, "cgst", e.target.value)}
                      className={`h-8 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 ${
                        isFieldChanged(row.id, "cgst", row.cgst) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="₹ 0.00"
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1">
                    <Input
                      value={row.sgst}
                      onChange={(e) => onRowUpdate(row.id, "sgst", e.target.value)}
                      className={`h-8 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 ${
                        isFieldChanged(row.id, "sgst", row.sgst) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="₹ 0.00"
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1">
                    <Input
                      value={row.netAmount}
                      onChange={(e) => onRowUpdate(row.id, "netAmount", e.target.value)}
                      className={`h-8 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 bg-gray-50 ${
                        isFieldChanged(row.id, "netAmount", row.netAmount) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="₹ 0.00"
                      disabled={true}
                      readOnly
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!isApprovalMode && (
          <div className="mt-4">
            <button
              onClick={onAddRow}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Row
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

