import React, { useEffect, useState } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import { HiOutlineBell } from "react-icons/hi";

interface HeaderProps {
  greeting: string;
  tent: string;
  mogi: string;
  SearchComponent: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ greeting, tent, mogi, SearchComponent }) => {
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const date = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    setCurrentDate(date);
  }, []);

  return (
    <header className="sticky top-3 left-10 max-w-full z-50 flex justify-between items-center bg-white py-4 px-3 shadow-md">
      {/* Greeting Section */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
          {greeting} <span className="ml-2">{mogi}</span>
        </h1>
        <p className="text-sm text-gray-600">{tent}</p>
      </div>

      {/* Search Section */}
      <div className="flex-grow flex justify-center">
        {SearchComponent}
      </div>

      {/* Date and Notification Section */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 text-gray-500">
          <span className="text-sm text-gray-500">{currentDate}</span>
          <FaCalendarAlt className="text-lg" />
        </div>
        <HiOutlineBell className="text-xl text-gray-500 cursor-pointer hover:text-gray-700" />
      </div>
    </header>
  );
};

export default Header;
