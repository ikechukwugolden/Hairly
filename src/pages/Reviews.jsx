import { useMemo, useState } from 'react';
import { MessageSquare, Search, Star, ThumbsUp } from 'lucide-react';

const REVIEW_DATA = [
  {
    id: 'r1',
    client: 'Amara Ugo',
    service: 'Knotless Braids',
    date: 'Mar 20, 2026',
    rating: 5,
    comment: 'Very neat work and super patient all through the session.',
    verified: true
  },
  {
    id: 'r2',
    client: 'Tolu Martins',
    service: 'Wig Install',
    date: 'Mar 18, 2026',
    rating: 4,
    comment: 'Great finish and quick service. I will definitely come back.',
    verified: true
  },
  {
    id: 'r3',
    client: 'Blessing Obi',
    service: 'Natural Hair Care',
    date: 'Mar 15, 2026',
    rating: 5,
    comment: 'My hair felt healthier immediately after the treatment.',
    verified: false
  },
  {
    id: 'r4',
    client: 'Sade Bello',
    service: 'Fulani Braids',
    date: 'Mar 12, 2026',
    rating: 3,
    comment: 'Nice result. Waiting time was slightly long.',
    verified: true
  }
];

export default function Reviews() {
  const [query, setQuery] = useState('');

  const visibleReviews = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return REVIEW_DATA;
    return REVIEW_DATA.filter((review) =>
      [review.client, review.service, review.comment].join(' ').toLowerCase().includes(q)
    );
  }, [query]);

  const averageRating = useMemo(() => {
    if (!REVIEW_DATA.length) return 0;
    const sum = REVIEW_DATA.reduce((total, review) => total + review.rating, 0);
    return (sum / REVIEW_DATA.length).toFixed(1);
  }, []);

  return (
    <div className="min-h-screen bg-[#fcfcfc] pb-24">
      <div className="bg-[#7c3aed] p-6 pt-12 rounded-b-[40px] text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black opacity-80">Client Feedback</p>
            <h1 className="text-2xl font-black mt-1">Reviews</h1>
          </div>
          <div className="bg-white/15 rounded-2xl px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-[0.15em] font-black text-white/80">Average</p>
            <p className="text-2xl font-black flex items-center gap-1 justify-end">
              {averageRating}
              <Star size={18} fill="white" />
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white border border-zinc-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <Search size={18} className="text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by client, service or review..."
            className="w-full bg-transparent outline-none text-sm"
          />
        </div>

        <div className="mt-5 flex items-center justify-between text-xs text-zinc-500">
          <span className="font-bold uppercase tracking-widest">{visibleReviews.length} results</span>
          <span className="font-medium">Most recent first</span>
        </div>

        {visibleReviews.length ? (
          <div className="mt-4 space-y-4">
            {visibleReviews.map((review) => (
              <article key={review.id} className="bg-white rounded-3xl border border-zinc-100 p-5 shadow-sm">
                <div className="flex justify-between gap-4">
                  <div>
                    <h2 className="font-black text-zinc-800">{review.client}</h2>
                    <p className="text-xs text-zinc-500 font-medium">{review.service}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-500 justify-end">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          size={14}
                          fill={index < review.rating ? '#f59e0b' : 'transparent'}
                          className={index < review.rating ? 'text-amber-500' : 'text-zinc-300'}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">{review.date}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-zinc-700 leading-relaxed">{review.comment}</p>

                <div className="mt-4 flex items-center gap-4 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare size={12} />
                    Public Review
                  </span>
                  {review.verified && (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <ThumbsUp size={12} />
                      Verified Booking
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-10 bg-white border-2 border-dashed border-zinc-200 rounded-3xl py-14 text-center">
            <MessageSquare size={34} className="mx-auto text-zinc-300" />
            <p className="text-sm font-bold text-zinc-500 mt-3">No reviews matched your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
