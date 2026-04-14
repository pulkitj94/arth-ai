import { useState, useRef, useEffect } from 'react';
import { useFilter } from '../context/FilterContext';
import DateRangeFilter from './DateRangeFilter';
import NewCampaignModal from './NewCampaignModal';
import NotificationsDropdown from './NotificationsDropdown';

export default function Header() {
    const { currentFilter, setCurrentFilter } = useFilter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef(null);

    // Close notifications when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCreateCampaign = (campaignData) => {
        // Here we would typically make a POST request to the backend
        console.log("Launching campaign:", campaignData);
        alert(`Campaign "${campaignData.name}" successfully scheduled for launch!`);
        setIsModalOpen(false);
    };

    return (
        <>
            <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10">
                <div>
                    <h1 className="text-xl font-bold text-navy">ARTH AI — Social Media Intelligence</h1>
                </div>

                <div className="flex items-center gap-6">
                    {/* Global Controls */}
                    <div className="flex items-center gap-3 mr-2">
                        <DateRangeFilter
                            selectedRange={currentFilter.range}
                            onChange={setCurrentFilter}
                        />
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-medium shadow-md shadow-accent/20 transition-colors whitespace-nowrap"
                        >
                            + New Campaign
                        </button>
                    </div>

                    {/* Notifications */}
                    <div className="relative" ref={notificationRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`relative transition-colors ${showNotifications ? 'text-brand' : 'text-gray-400 hover:text-brand'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse"></span>
                        </button>

                        {showNotifications && (
                            <NotificationsDropdown onClose={() => setShowNotifications(false)} />
                        )}
                    </div>

                    {/* User Profile */}
                    <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-navy">Alex Johnson</div>
                            <div className="text-xs text-gray-500">Marketing Director</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            </header>

            <NewCampaignModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateCampaign}
            />
        </>
    );
}
