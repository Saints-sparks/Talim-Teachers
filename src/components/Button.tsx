import React from 'react';
import classNames from 'classnames';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'; // You can expand this as needed
  size?: 'small' | 'medium' | 'large' | 'icon';
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',  // Default to 'primary' if not provided
  size = 'medium',      // Default to 'medium' size
  className,            // Allow extra classes
  children,
  ...props
}) => {
  // Define the base classes for the button
  const baseClasses = 'inline-flex items-center justify-center rounded-md transition-all duration-200';

  // Define variant classes
  const variantClasses = {
    primary: 'bg-[#003366] text-white hover:bg-blue-600',
    secondary: 'bg-[#BABABA] text-white hover:bg-gray-600',
    ghost: 'bg-transparent text-gray-700 border border-gray-300 hover:bg-gray-100',
  };

  // Define size classes
  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-5 py-3 text-lg',
    icon: 'h-8 w-8 p-2',  // Icon size for pagination buttons, etc.
  };

  // Combine all classes dynamically
  const buttonClasses = classNames(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className  // Allow custom user-defined classes
  );

  return (
    <button className={buttonClasses} {...props}>
      {children}
    </button>
  );
};

export default Button;
