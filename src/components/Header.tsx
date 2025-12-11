import React from 'react';

import './Header.css';

interface HeaderProps {
    alertCount?: number;
    onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ alertCount = 2, onRefresh }) => {
    return (
        <header className="app-header">
            <div className="header-left">
                <div className="logo">
                    <svg className="logo-icon" width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <path d="M16 4L8 12L16 8L24 12L16 4Z" fill="var(--motor-accent)" />
                        <path d="M8 12L16 20L24 12L16 16L8 12Z" fill="var(--motor-accent)" opacity="0.6" />
                    </svg>
                    <span className="logo-text">Wealth Guardian</span>
                </div>
            </div>
            <div className="header-right">
                {/* Right side elements removed */}
            </div>
        </header>
    );
};
