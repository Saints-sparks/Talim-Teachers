"use client";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/app/lib/api/config";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import React, { useEffect, useState } from "react";
import type { Metadata, ResolvingMetadata } from 'next'

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

// Use TypeScript's type assertion for Next.js params


// Modified interface to match Next.js' expected structure
interface PageProps {
  params: Promise<{ id: string }>;
}

const NotificationPage: React.FC<PageProps> = ({ params }) => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchNotification = async () => {
      try {
        const { id } = await params;
        const res = await fetch(`${API_BASE_URL}/notifications/${id}`);
        if (!res.ok) throw new Error("Failed to fetch notification");
        const data: Notification = await res.json();
        setNotification(data);
      } catch (err: any) {
        setError(err.message || "An error occurred");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotification();
  }, [params]);

  // Loading state component
  if (loading) return <LoadingState />;

  // Error state component
  if (error) return <ErrorState error={error} />;

  // Empty state component
  if (!notification) return <EmptyState />;

  return (
    <Layout>
      <div className="flex flex-col max-h-full gap-4 overflow-y-auto p-4">
        <div>
          <Button
            className="bg-transparent shadow-none hover:bg-gray-200"
            onClick={() => router.back()}
          >
            <ChevronLeft className="text-[#6F6F6F]" />
          </Button>
        </div>
        <NotificationContent notification={notification} />
      </div>
    </Layout>
  );
};

// Sub-components for better organization
const NotificationContent: React.FC<{ notification: Notification }> = ({ notification }) => (
  <div className="h-full bg-white rounded-2xl flex flex-col gap-5 p-8 sm:px-10">
    <p className="text-[18px] text-center sm:text-left text-[#030E18]">
      {notification.title}
    </p>
    <div className="border-b border-[#E3E3E3] -mx-10"></div>
    <div className="flex flex-col gap-6 h-full overflow-y-auto">
      <SenderInfo notification={notification} />
      <MessageContent message={notification.message} />
    </div>
  </div>
);

const SenderInfo: React.FC<{ notification: Notification }> = ({ notification }) => (
  <div className="flex gap-4">
    <Avatar className="w-10 h-10 rounded-full bg-gray-300">
      <AvatarImage src={notification.avatar} />
    </Avatar>
    <div className="flex flex-col">
      <p className="text-[#030E18]">
        {`${notification.senderId.firstName} ${notification.senderId.lastName}`}
      </p>
      <p className="text-sm text-[#7B7B7B]">
        {notification.senderId.email}
      </p>
    </div>
  </div>
);

const MessageContent: React.FC<{ message: string }> = ({ message }) => (
  <div className="space-y-3 h-full overflow-y-auto">
    {message.split("\n").map((line, index) => (
      <p className="text-[#030E18]" key={index}>
        {line}
      </p>
    ))}
  </div>
);

// State components
const LoadingState: React.FC = () => (
  <Layout>
    <div className="flex justify-center items-center min-h-screen">
      <p className="text-lg text-center">Loading notification...</p>
    </div>
  </Layout>
);

const ErrorState: React.FC<{ error: string }> = ({ error }) => (
  <Layout>
    <div className="flex justify-center items-center min-h-screen">
      <p className="text-lg text-center text-red-600">Error: {error}</p>
    </div>
  </Layout>
);

const EmptyState: React.FC = () => (
  <Layout>
    <div className="flex justify-center items-center min-h-screen">
      <p className="text-lg text-center">No notification found.</p>
    </div>
  </Layout>
);

export default NotificationPage;