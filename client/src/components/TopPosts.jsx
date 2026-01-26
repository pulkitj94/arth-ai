export default function TopPosts({ posts }) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-navy">Top Performing Posts</h3>
                    <p className="text-sm text-gray-500">By engagement volume</p>
                </div>
                <button className="text-gray-400 hover:text-navy">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                </button>
            </div>

            <div className="space-y-4">
                {posts.map((post, index) => {
                    // Generate a dynamic, softer pastel gradient based on index/platform
                    const gradients = [
                        'from-violet-100 to-fuchsia-100',
                        'from-blue-50 to-emerald-50',
                        'from-rose-50 to-orange-50',
                        'from-amber-50 to-yellow-50'
                    ];
                    const gradient = gradients[index % gradients.length];

                    return (
                        <div key={index} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                            {/* Large Soft Thumbnail */}
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                                {/* Platform Icon Badge */}
                                <div className="transform scale-110 text-slate-700">
                                    {post.icon}
                                </div>
                            </div>

                            <div className="flex-1 min-w-0 px-2">
                                <h4 className="text-base font-bold text-navy truncate mb-0.5">{post.title}</h4>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[10px] font-bold text-gray-600 uppercase tracking-wide shadow-sm">
                                        {post.platform}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-[10px] font-bold text-gray-600 uppercase tracking-wide shadow-sm">
                                        {post.type}
                                    </span>
                                    <p className="text-xs text-gray-500 font-medium pt-0.5">{post.date}</p>
                                </div>
                            </div>

                            <div className="text-right pl-2">
                                <div className="text-lg font-bold text-navy">{post.engagement}</div>
                                <div className="text-xs text-gray-400 font-medium">Engagements</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
