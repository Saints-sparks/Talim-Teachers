import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Image,
  Video,
  AlignLeft,
  Download,
  MoreVertical,
  Trash2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "../ui/checkbox";

interface Resource {
  id: string;
  name: string;
  subject: string;
  uploadDate: string;
  type: "pdf" | "img" | "vid" | "txt";
}

const getFileIcon = (type: Resource["type"]) => {
  switch (type) {
    case "pdf":
      return <FileText className="h-4 w-4" />;
    case "img":
      return <Image className="h-4 w-4" />;
    case "vid":
      return <Video className="h-4 w-4" />;
    case "txt":
      return <AlignLeft className="h-4 w-4" />;
  }
};

interface ResourcesTableProps {
  resources: Resource[];
}

export function ResourcesTable({ resources }: ResourcesTableProps) {
  return (
    <div className="bg-white p-4 border border-[#F0F0F0] rounded-lg">
      <Table className="text-[#030303] px-5 bg-white p-6">
        <TableHeader className="text-[#030E18]">
          <TableRow>
            <TableHead className="flex gap-2 items-center">
              <Checkbox className="shadow-none pb-1" />
              Name
            </TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Upload Date</TableHead>
            <TableHead className="flex justify-center">Actions</TableHead>
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
              <TableCell className="text-[#616161]">
                {resource.uploadDate}
              </TableCell>
              <TableCell className="flex justify-center">
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                      <Info />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Button variant="outline" size="icon" className="border-none shadow-none">
                  <Trash2 className="text-[#D92D20]" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
