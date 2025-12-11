import React from 'react';
import './SectionHeader.css';

interface SectionHeaderProps {
    icon: string;
    title: string;
    accentColor: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, accentColor }) => {
    return (
        <div className="section-header" style={{ borderTopColor: accentColor }}>
            <div className="section-header-content">
                <span className="section-icon">{icon}</span>
                <h2 className="section-title">{title}</h2>
            </div>
        </div>
    );
};
