import { Search, Bell } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
export function Header() {
  return (
    <header className="px-10">
      {/* <div className="relative w-full max-w-xs">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search"
          className="pl-8"
        />
      </div>
      <div className="flex items-center gap-4">
        <time className="text-sm text-muted-foreground">12 Oct, 2024</time>
        <button className="relative hover:opacity-80">
          <Bell className="h-5 w-5" />
        </button>
        <img
          src="/placeholder.svg?height=40&width=40"
          alt="User avatar"
          className="h-10 w-10 rounded-full"
        />
      </div> */}
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                type="search"
                placeholder="Search"
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">12 Oct, 2024</span>
                <Bell className="h-5 w-5 text-gray-600" />
              </div>
              <Avatar>
                <AvatarImage src="/placeholder.svg" alt="User avatar" />
                <AvatarFallback className='bg-green-300'>OA</AvatarFallback>
              </Avatar>
            </div>
            
          </div>
          <div className=" relative top-[1.8px] 2xl:top-[1.3px] h-[2px] -mx-10   bg-[#E8E8E8]" />
    </header>
  )
}

