import React from 'react';

const notifications = [
    {
        id: 1,
        title: "Campaign Approved",
        message: "Your 'Summer Sale 2026' campaign has been approved.",
        time: "2 hours ago",
        read: false,
        type: "success"
    },
    {
        id: 2,
        title: "High Engagement Alert",
        message: "Post 'New Product Launch' is trending on Twitter.",
        time: "5 hours ago",
        read: false,
        type: "info"
    },
    {
        id: 3,
        title: "New Follower Milestone",
        message: "You reached 10k followers on Instagram!",
        time: "1 day ago",
        read: true,
        type: "celebration"
    }
];

export default function NotificationsDropdown({ onClose }) {
    return (
        <div className="absolute top-12 right-0 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animation-fade-in origin-top-right">
            <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-semibold text-navy text-sm">Notifications</h3>
                <span className="text-xs text-accent font-medium cursor-pointer hover:underline">Mark all as read</span>
            </div>

            <div className="max-h-96 overflow-y-auto">
                {notifications.map((notif) => (
                    <div
                        key={notif.id}
                        className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read ? 'bg-blue-50/30' : ''}`}
                    >
                        <div className="flex gap-3">
                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notif.read ? 'bg-accent' : 'bg-transparent'}`}></div>
                            <div>
                                <h4 className="text-sm font-medium text-navy mb-1">{notif.title}</h4>
                                <p className="text-xs text-gray-500 leading-relaxed mb-2">{notif.message}</p>
                                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{notif.time}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-2 bg-gray-50 text-center">
                <button onClick={onClose} className="text-xs text-gray-500 hover:text-navy transition-colors font-medium">
                    View All Activity
                </button>
            </div>
        </div>
    );
}
