"use client"

import * as React from "react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
  getSortedRowModel,
  type ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { JiraIssue } from "./main-card"
import { format, parseISO } from "date-fns"

interface DataTableProps {
  data: JiraIssue[]
}

export function DataTable({ data }: DataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const columns: ColumnDef<JiraIssue>[] = [
    {
      accessorKey: "key",
      header: "Chave",
      cell: ({ row }) => <div className="font-medium">{row.getValue("key")}</div>,
    },
    {
      accessorKey: "summary",
      header: "Resumo",
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate" title={row.getValue("summary")}>
          {row.getValue("summary")}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
    },
    {
      accessorKey: "assignee",
      header: "Responsável",
    },
    {
      accessorKey: "created",
      header: "Criado em",
      cell: ({ row }) => {
        const date = row.getValue("created") as string
        return date ? format(parseISO(date), "dd/MM/yyyy") : "-"
      },
    },
    {
      accessorKey: "updated",
      header: "Atualizado em",
      cell: ({ row }) => {
        const date = row.getValue("updated") as string
        return date ? format(parseISO(date), "dd/MM/yyyy") : "-"
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center py-2">
        <Input
          placeholder="Filtrar por chave..."
          value={(table.getColumn("key")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("key")?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-2">
        <div className="flex-1 text-sm text-muted-foreground">
          Mostrando {table.getFilteredRowModel().rows.length} de {data.length} registros
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Próximo
          </Button>
        </div>
      </div>
    </div>
  )
}
