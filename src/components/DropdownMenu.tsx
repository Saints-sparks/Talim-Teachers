import { useState } from "react";

interface DropdownMenuProps {
  children: React.ReactNode;
}

export const DropdownMenu = ({ children }: DropdownMenuProps) => {
  return <div className="relative">{children}</div>;
};

export const DropdownMenuTrigger = ({ children }: DropdownMenuProps) => {
  return (
    <button className="flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full">
      {children}
    </button>
  );
};

export const DropdownMenuContent = ({ children }: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute right-0 mt-2 bg-white shadow-md rounded-md py-1 w-48"
      >
        {isOpen && children}
      </button>
    </div>
  );
};

export const DropdownMenuItem = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) => {
  return (
    <div
      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
      onClick={onClick}
    >
      {children}
    </div>
  );
};
