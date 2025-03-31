"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/app/lib/api/config";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";

interface Notification {
  _id: string;
  title: string;
  message: string;
  senderId: {
    firstName: string;
    lastName: string;
    email: string;
  };
  avatar: string;
  time: string;
}

interface Props {
  params: { id: string };
  onClose?: () => void;
}

const ExpandedNotification = ({ params, onClose }: Props) => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const router = useRouter();
  const notificationId = params.id;

  useEffect(() => {
    const fetchNotification = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/notifications/${notificationId}`
        );
        if (!res.ok) throw new Error("Failed to fetch notification");
        const data = await res.json();
        setNotification(data); // Directly set the notification as it's not inside a "data" array
      } catch (error) {
        console.error(error);
      }
    };

    if (notificationId) fetchNotification();
  }, [notificationId]);

  if (!notification) return <p>Loading...</p>;

  return (
    <Layout>
      <div className="flex flex-col h-full gap-4 overflow-y-auto p-4">
        <div>
          <Button
            className="bg-transparent shadow-none hover:bg-gray-200"
            onClick={onClose ? onClose : () => router.back()}
          >
            <ChevronLeft className="text-[#6F6F6F]" />
          </Button>
        </div>
        <div className="h-full bg-white rounded-2xl flex flex-col gap-5 p-8 sm:px-10">
          <p className="text-[18px] text-center sm:text-left text-[#030E18]">
            {notification.title}
          </p>
          <div className="border-b border-[#E3E3E3] -mx-10"></div>
          <div className="flex flex-col gap-6 h-full overflow-y-auto">
            <div className="flex gap-4">
              <Avatar className="w-10 h-10 rounded-full bg-gray-300">
                <AvatarImage src={notification.avatar} />
              </Avatar>
              <div className="flex flex-col">
                <p className="text-[#030E18]">{`${notification.senderId.firstName} ${notification.senderId.lastName}`}</p>
                <p className="text-sm text-[#7B7B7B]">
                  {notification.senderId.email}
                </p>
              </div>
            </div>
            <div className="space-y-3 h-full overflow-y-auto">
              {notification.message.split("\n").map((line, index) => (
                <p className="text-[#030E18]" key={index}>
                  {line}
                </p>
              ))}
            </div>
            <div className="flex flex-col flex-1 gap-4">
              <Input
                placeholder="reply here if you have a question or response"
                className="flex-1 text-[#8C8C8C] border-[#8C8C8C] border-0 rounded-none border-b shadow-none focus:outline-none focus-visible:ring-0"
              />
              <div className="flex justify-end">
                <Button className="bg-[#A7A7A7]">Reply</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExpandedNotification;
