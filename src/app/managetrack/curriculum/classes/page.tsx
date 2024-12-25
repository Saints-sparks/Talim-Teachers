"use client"

import Header from '@/components/Header'
import Search from '@/components/Search';
import UpcomingClasses from '@/components/UpcomingClasses';
import React from 'react'

const page: React.FC = () => {
    const greeting = "Class Creation Reminder";
  const tent = "Don't Forget to Set Up Your Next Class!";
  const mogi = "⏰";
  const SearchComponent = <Search placeholder="Search for classes"  />;
  return (
    <div className="p-6 space-y-1 bg-[F8F8F8]">
        <Header greeting={greeting} tent={tent} mogi={mogi} SearchComponent={SearchComponent} />
        <UpcomingClasses/>
    </div>
  )
}

export default page