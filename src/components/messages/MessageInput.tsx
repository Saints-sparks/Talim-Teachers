import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, SendHorizontal, FileText, Image, FileVideo } from "lucide-react";

interface MessageInputProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function MessageInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Type something here..."
}: MessageInputProps) {
  const [message, setMessage] = useState(value || "");
  
  // Handle internal state changes if not controlled
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e);
    } else {
      setMessage(e.target.value);
    }
  };
  
  // Handle send button click
  const handleSend = () => {
    if (onSend) {
      onSend();
    } else {
      console.log("Message sent:", message);
      setMessage("");
    }
  };

  return (
    <div className="p-3 flex-col mx-4 mb-4 bg-white rounded-lg flex items-center gap-3">
      <Input
        placeholder={placeholder}
        className="flex-1 border-none shadow-none focus:outline-none focus-visible:ring-0 mb-2"
        value={value !== undefined ? value : message}
        onChange={handleChange}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      <div className="flex w-full items-center justify-between text-gray-500">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="border border-[#F0F0F0] hover:bg-gray-200 transition-all duration-300"
          >
            Document
            <FileText />
          </Button>
          <Button
            variant="ghost"
            className="border border-[#F0F0F0] hover:bg-gray-200 transition-all duration-300"
          >
            Image
            <Image />
          </Button>
          <Button
            variant="ghost"
            className="border border-[#F0F0F0] hover:bg-gray-200 transition-all duration-300"
          >
            Video
            <FileVideo />
          </Button>
        </div>
        <Button
          className={`border w-[52px] h-[42px] shadow-none rounded-lg ${
            message.trim() ? "bg-[#003366] hover:bg-[#002244]" : "bg-[#C7C7C7]"
          }`}
          onClick={handleSend}
          disabled={disabled || !message.trim()}
        >
          <SendHorizontal color="white" size={30} />
        </Button>
      </div>
    </div>
  );
}
