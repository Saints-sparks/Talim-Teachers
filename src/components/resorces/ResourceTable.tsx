import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Image, Video, AlignLeft, Download, MoreVertical } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "../ui/checkbox"

interface Resource {
  id: string
  name: string
  subject: string
  uploadDate: string
  type: 'pdf' | 'img' | 'vid' | 'txt'
}

const getFileIcon = (type: Resource['type']) => {
  switch (type) {
    case 'pdf':
      return <FileText className="h-4 w-4" />
    case 'img':
      return <Image className="h-4 w-4" />
    case 'vid':
      return <Video className="h-4 w-4" />
    case 'txt':
      return <AlignLeft className="h-4 w-4" />
  }
}

interface ResourcesTableProps {
  resources: Resource[]
}

export function ResourcesTable({ resources }: ResourcesTableProps) {
  return (
    <div className="bg-white p-6 border rounded-lg">
    <Table className="text-[#030303] px-5 bg-white p-6">
      <TableHeader className="text-[#030303] px-5">
        <TableRow >
          <TableHead className="flex gap-3">
            <Checkbox />
             <h1>Name</h1>  </TableHead>
          <TableHead>Subject</TableHead>
          <TableHead>Upload Date</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {resources.map((resource) => (
          <TableRow key={resource.id}>
            <TableCell>
              <div className="flex items-center gap-2 p-5">
                {getFileIcon(resource.type)}
                <span className="text-[#030303]">{resource.name}</span>
              </div>
            </TableCell>
            <TableCell>{resource.subject}</TableCell>
            <TableCell>{resource.uploadDate}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
               
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View</DropdownMenuItem>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  )
}

