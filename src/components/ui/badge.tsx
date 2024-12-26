import React from 'react';

interface BadgeProps {
    text: string;
    color?: string;
    variant: string;
    className: string;
    children: React.ReactNode;
}


const Badge: React.FC<BadgeProps> = ({ text,   color = 'blue' }) => {
    const badgeStyle = {
        backgroundColor: color,
        color: 'white',
        padding: '0.5em 1em',
        borderRadius: '12px',
        display: 'inline-block',
        fontSize: '0.75em',
        fontWeight: 'bold',
    };

    return <span style={badgeStyle}>{text}</span>;
};

export default Badge;