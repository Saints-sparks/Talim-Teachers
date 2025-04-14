"use client";
import Layout from "@/components/Layout";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CheckCheck, ChevronDown, Search } from "lucide-react";
import React from "react";
import useNotifications from "@/app/hooks/useNotifications";

type Notification = {
  id: string;
  title: string;
  message: string;
  senderId: {
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  unread: boolean;
  avatar?: string; // Optional in case you want to add avatars later
};

function Page() {
  const router = useRouter();

  // Fetch notifications from the API on component mount
  const { notifications, loading, error } = useNotifications();

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <p className="text-lg text-center">Loading notifications...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <p className="text-lg text-center text-red-600">Error: {error}</p>
        </div>
      </Layout>
    );
  }

  if (notifications.length === 0) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <p className="text-lg text-center text-[#737373]">
            No notifications available
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 max-h-full border-[#F0F0F0] overflow-y-auto rounded-xl">
        <div className="flex flex-col gap-4 h-full">
          <div className="flex flex-col lg:flex-row justify-between">
            <p className="text-[#2F2F2F] font-medium">Notifications</p>
            <div className="flex gap-2">
              <div className="flex items-center border border-[#F0F0F0] shadow-none rounded-lg px-3 w-full bg-white">
                <Search className="text-[#898989]" size={18} />
                <Input
                  className="border-0 shadow-none focus-visible:ring-0 focus:outline-none flex-1"
                  placeholder="Search"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex text-[#595959] opacity-[70%] sm:opacity-[50%] bg-[#FFFFFF] h-full rounded-lg shadow-none border-[#F0F0F0] items-center gap-1"
                  >
                    Recent <ChevronDown size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="font-manrope" align="end">
                  <DropdownMenuItem>Recent</DropdownMenuItem>
                  <DropdownMenuItem>All</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="bg-white place-items-center h-full rounded-lg sm:border">
            <div className="flex justify-between w-full sm:p-6 py-5 px-2 bg-[#F8F8F8] sm:bg-[#FFFFFF] border-b">
              <div className="flex gap-2">
                <p className="text-[#003366] cursor-pointer">All</p>
                <p className="text-[#8F8F8F] cursor-pointer">Unread(10)</p>
              </div>
              <div className="flex gap-1 items-center text-[#003366] cursor-pointer">
                <CheckCheck size={20} />
                <p>Mark all as read</p>
              </div>
            </div>
            <div className="w-full h-full overflow-y-auto scrollbar-hide">
              {notifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  onClick={() =>
                    router.push(`/notifications/${notification.id}`)
                  }
                  className="flex items-center gap-4 p-2 sm:px-10 border-b border-l-0 border-r-0 sm:border-l-0  cursor-pointer"
                >
                  <div className="relative w-10 h-10">
                    <Avatar className="w-10 h-10 rounded-full bg-gray-300">
                      <AvatarImage src={notification.avatar} />
                    </Avatar>
                  </div>
                  <div className="sm:flex gap-4 flex-1">
                    <p className="text-[#030E18]">
                      {notification.senderId.firstName}{" "}
                      {notification.senderId.lastName}
                    </p>
                    <p className="text-sm truncate max-w-[250px] sm:max-w-[100px] md:max-w-[50px] lg:max-w-[300px] xl:max-w-[750px] 2xl:max-w-[1800px] flex items-center text-[#737373]">
                      Announcement: {notification.message}
                    </p>
                  </div>
                  <span
                    className={` text-sm ${
                      notification.unread ? "text-[#030E18]" : "text-[#737373]"
                    }`}
                  >
                    {new Date(notification.createdAt)
                      .toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                      .toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Page;
