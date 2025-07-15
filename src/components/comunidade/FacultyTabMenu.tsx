import React from 'react';
import { Activity, MessageSquare, FileText, BookOpen, Users } from 'lucide-react';

interface FacultyTabMenuProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

export const FacultyTabMenu: React.FC<FacultyTabMenuProps> = ({ activeTab, onChange }) => {
  const tabs = [
    { id: 'feed', icon: Activity, label: 'Feed' },
    { id: 'forum', icon: MessageSquare, label: 'Fórum' },
    { id: 'materials', icon: FileText, label: 'Materiais' },
    { id: 'exams', icon: BookOpen, label: 'Simulados' },
    { id: 'members', icon: Users, label: 'Membros' }
  ];

  // Cor roxa para os ícones ativos
  const activeColor = '#7c3aed'; // Cor roxa (Tailwind purple-600)

  return (
    <div id="navbody">
      <ul className="ul">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <li key={tab.id} className="li">
              <input 
                type="radio" 
                id={`tab-${tab.id}`} 
                name="tabs" 
                className="radio" 
                checked={isActive}
                onChange={() => onChange(tab.id)}
              />
              <label 
                htmlFor={`tab-${tab.id}`} 
                className="relative group flex flex-col items-center justify-center"
              >
                <Icon 
                  className="svg" 
                  style={{ 
                    color: isActive ? activeColor : undefined,
                    opacity: isActive ? '100%' : '80%'
                  }} 
                />
                
                {/* Tooltip visível apenas no hover */}
                <span 
                  className="tooltip-text absolute left-1/2 -translate-x-1/2 -bottom-7 
                  bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 
                  group-hover:opacity-100 transition-all duration-200 z-10"
                >
                  {tab.label}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}; 