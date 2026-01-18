'use client';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'stability', label: 'Stability', imgSrc: 'stability_icon.png', imgSrcRed: 'stabilityRed_icon.png' },
  { id: 'positioning', label: 'Positioning', imgSrc: 'positioning_icon.png', imgSrcRed: 'positioningRed_icon.png' },
  { id: 'prediction', label: 'Prediction', imgSrc: 'prediction_icon.png', imgSrcRed: 'predictionRed_icon.png' },
  { id: 'copilot', label: 'Copilot', imgSrc: 'copilot_icon.png', imgSrcRed: 'copilotRed_icon.png' } 
];

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex gap-2 mb-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-8 py-3.5 border-2 border-b-0 rounded-t-xl font-semibold text-base cursor-pointer transition-all duration-200 relative top-[2px] flex gap-2
            ${activeTab === tab.id 
              ? 'bg-card-bg text-red-highlight border-border-color z-10 after:content-[""] after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-1 after:bg-card-bg' 
              : 'bg-card-bg text-text-secondary border-border-color hover:bg-card-bg-light hover:text-text-primary'
            }
          `}
        >

          {activeTab === tab.id ? <img src={tab.imgSrcRed} alt="" /> : <img src={tab.imgSrc} alt="" />}
          
          {tab.label}
        </button>
      ))}
    </div>
  );
}
