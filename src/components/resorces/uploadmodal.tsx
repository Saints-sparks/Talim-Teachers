import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] text-black">
        <DialogHeader>
          <DialogTitle>Resources</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input id="project-name" placeholder="History note book" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="class">Class</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent className="text-black bg-white">
                <SelectItem value="jss1">JSS 1</SelectItem>
                <SelectItem value="jss2">JSS 2</SelectItem>
                <SelectItem value="jss3">JSS 3</SelectItem>
                <SelectItem value="ss1">SS 1</SelectItem>
                <SelectItem value="ss2">SS 2</SelectItem>
                <SelectItem value="ss3">SS 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Upload file</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Drag and drop your file here or click to browse</p>
              <input type="file" className="hidden" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-[#002147] text-white">Send</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

