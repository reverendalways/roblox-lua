"use client";
import { useState, useMemo } from 'react';

const CoinIcon = ({ className = "w-5 h-5 mr-1 text-yellow-400" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor" className="opacity-30" />
    <circle cx="12" cy="12" r="9" fill="currentColor" className="opacity-60" />
    <path d="M12 7a1 1 0 011 1v3h2.25a1 1 0 010 2H13v3a1 1 0 11-2 0v-3H8.75a1 1 0 010-2H11V8a1 1 0 011-1z" fill="#FFF6D5" />
  </svg>
);

export default function PromotePage() {
  const [selectedTier, setSelectedTier] = useState<'none' | 'I' | 'II' | 'III' | 'IV'>('none');
  const [verified, setVerified] = useState<boolean>(false);

  const tierData: Record<string, { mult: number; bump: number | null }> = {
    none: { mult: 1, multLabel: 1, bump: 25 },
    I: { mult: 1.2, bump: 50 },
    II: { mult: 1.35, bump: 75 },
    III: { mult: 1.5, bump: 100 },
    IV: { mult: 1.7, bump: 125 }
  } as any;

  const basePoints = { view: 0.1, like: 2, comment: 4, bump: 25, submit: 100 };

  const effective = useMemo(() => {
    const tier = tierData[selectedTier];
    const verificationMult = verified ? 1.4 : 1;
    const engagementMult = (tier?.mult || 1) * verificationMult;
    return {
      view: +(basePoints.view * engagementMult).toFixed(3),
      like: +(basePoints.like * engagementMult).toFixed(2),
      comment: +(basePoints.comment * engagementMult).toFixed(2),
      bump: tier.bump,
      submit: basePoints.submit
    };
  }, [selectedTier, verified]);

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-12">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="text-center space-y-3">
          <h1 className="text-4xl font-bold flex justify-center items-center gap-2">
           Promote
          </h1>
          <p className="text-gray-400 text-base">
            Do you want to get more views, more engagement and in result generate more money?
          </p>

          <div className="mx-auto max-w-5xl bg-gray-800/60 border border-gray-700 rounded-md px-3 py-2 mb-3">
            <div className="hidden md:flex items-center justify-center gap-2 text-sm text-gray-300 whitespace-nowrap">
              <CoinIcon className="w-16 h-12 text-amber-400" />
              <span className="font-medium text-white">Script Points</span>
              <span className="text-gray-400">— the scoring unit used by the Search Algorithm to boost scripts based on activity ( views, comments, likes, and bumps.)</span>
            </div>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-3">

          <div className="relative rounded-xl border border-gray-800 bg-gradient-to-b from-gray-800/70 to-gray-850/40 p-6 flex flex-col shadow-lg">
            <h3 className="text-xl font-semibold mb-1">Promotion I</h3>
            <p className="text-sm text-gray-400 mb-4">Affordable, effective</p>
            <ul className="space-y-2 text-sm text-gray-300 flex-1">
              <li><span className="text-green-400 font-medium">+20%</span> more engagement (views / likes / comments)</li>
              <li>Reverse script age by <span className="text-white font-medium">7 days</span></li>
              <li>Bump points: <span className="line-through text-gray-500">25</span> → <span className="text-blue-400 font-semibold">50</span></li>
              <li><span className="text-green-400 font-medium">10%</span> total bump multiplier bonus</li>
              <li>Monthly duration</li>
              <li>Small Price, Big Difference</li>
            </ul>
            <div className="mt-5">
              <div className="text-2xl font-bold">$2.49</div>
              <a href="https://scriptvoid.mysellauth.com/product/scriptvoid-pricing" target="_blank" rel="noopener noreferrer" className="mt-4 block w-full rounded-md bg-green-600 hover:bg-green-500 text-white py-2 text-sm font-semibold text-center transition-colors">Promote</a>
            </div>
          </div>

            <div className="relative rounded-xl border border-gray-800 bg-gradient-to-b from-gray-800/70 to-gray-850/40 p-6 flex flex-col shadow-lg">
            <h3 className="text-xl font-semibold mb-1">Promotion II</h3>
            <p className="text-sm text-gray-400 mb-4">Good for creators aiming to grow</p>
            <ul className="space-y-2 text-sm text-gray-300 flex-1">
            <li><span className="text-green-400 font-medium">+35%</span> more engagement (views / likes / comments)</li>
              <li>Reverse script age by <span className="text-white font-medium">14 days</span></li>
              <li>Bump points: <span className="line-through text-gray-500">25</span> → <span className="text-blue-400 font-semibold">75</span></li>
              <li><span className="text-green-400 font-medium">15%</span> total bump multiplier bonus</li>
              <li>Monthly duration</li>
              <li>Perfect for mid-tier creators</li>
            </ul>
            <div className="mt-5">
              <div className="text-2xl font-bold">$4.99</div>
              <a href="https://scriptvoid.mysellauth.com/product/scriptvoid-pricing" target="_blank" rel="noopener noreferrer" className="mt-4 block w-full rounded-md bg-green-600 hover:bg-green-500 text-white py-2 text-sm font-semibold text-center transition-colors">Promote</a>
            </div>
          </div>

          <div className="relative rounded-xl border border-amber-500/60 bg-gradient-to-b from-amber-600/20 via-gray-800 to-gray-850/40 p-6 flex flex-col shadow-[0_0_0_1px_rgba(217,119,6,0.3)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-semibold px-3 py-1 rounded-full shadow">Popular</div>
            <h3 className="text-xl font-semibold mb-1">Promotion III</h3>
            <p className="text-sm text-gray-300 mb-4">Best Value</p>
            <ul className="space-y-2 text-sm text-gray-200 flex-1">
            <li><span className="text-green-400 font-medium">+50%</span> more engagement (views / likes / comments)</li>
              <li>Reverse script age by <span className="text-white font-medium">30 days</span></li>
              <li>Bump points: <span className="line-through text-gray-500">25</span> → <span className="text-blue-300 font-semibold">100</span></li>
              <li><span className="text-green-400 font-medium">20%</span> total bump multiplier bonus</li>
              <li>Monthly duration</li>
              <li><span className="text-yellow-400 font-medium">⭐ Your script will return to main page automatically every 6 hours</span></li>
            </ul>
            <div className="mt-5">
              <div className="text-2xl font-bold">$7.99</div>
              <a href="https://scriptvoid.mysellauth.com/product/scriptvoid-pricing" target="_blank" rel="noopener noreferrer" className="mt-4 block w-full rounded-md bg-amber-500/90 hover:bg-amber-400 text-black py-2 text-sm font-semibold text-center transition-colors">Promote</a>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">

          <div className="relative rounded-xl border border-indigo-500/60 bg-gradient-to-b from-indigo-600/25 via-gray-800 to-gray-900 p-6 flex flex-col shadow-[0_0_0_1px_rgba(99,102,241,0.35)]">
            <div className="absolute -top-3 left-4 bg-indigo-500 text-black text-xs font-semibold px-3 py-1 rounded-full shadow">Maximum Boost</div>
            <h3 className="text-2xl font-semibold mb-2">Promotion IV</h3>
            <p className="text-sm text-gray-300 mb-5">If you are aiming for the top</p>
            <ul className="space-y-2 text-sm text-gray-300 flex-1">
              <li><span className="text-green-400 font-medium">+70%</span> more engagement (views / likes / comments)</li>
              <li>Reverse script age by <span className="text-white font-medium">90 days</span></li>
              <li>Bump points: <span className="line-through text-gray-500">100</span> → <span className="text-blue-300 font-semibold">125</span></li>
              <li><span className="text-green-400 font-medium">25%</span> total bump multiplier bonus</li>
              <li>Monthly duration</li>
              <li><span className="text-yellow-400 font-medium">⭐ Your script will return to main page automatically every hour</span></li>
            </ul>
            <div className="mt-4">
              <div className="text-3xl font-bold mb-2">$12.99</div>
              <a href="https://scriptvoid.mysellauth.com/product/scriptvoid-pricing" target="_blank" rel="noopener noreferrer" className="mt-6 block w-full rounded-md bg-indigo-500 hover:bg-indigo-400 text-black py-2 text-sm font-semibold text-center transition-colors">Promote</a>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gradient-to-b from-gray-800/70 to-gray-900 p-6 flex flex-col shadow-lg">
            <h3 className="text-2xl font-semibold mb-2">Special Offer: Full Script Age Reset</h3>
            <p className="text-sm text-gray-300 mb-5">Fresh start</p>
            <ul className="space-y-2 text-sm text-gray-300 mb-6">
              <li>Sets script age to <span className="text-white font-medium">0 days</span></li>
              <li>Works with any Promotion tier (<span className="text-green-400 font-medium">stacks nicely</span>)</li>
              <li>Perfect for <span className="text-green-400 font-medium">re-launches</span></li>
              <li>Keeps all <span className="text-white font-medium">points</span>, <span className="text-white font-medium">views</span> and everything else</li>
              <li>Delays <span className="text-green-400 font-medium">Decay</span> and brings back <span className="text-green-400 font-medium">freshness boost</span></li>
            </ul>
            <div className="mt-auto">
              <div className="text-3xl font-bold">$4.99</div>
              <a href="https://scriptvoid.mysellauth.com/product/scriptvoid-pricing" target="_blank" rel="noopener noreferrer" className="mt-6 block w-full rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200 py-2 text-sm font-semibold text-center transition-colors">Get It Now</a>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl bg-gray-800/60 border border-gray-700 rounded-lg px-6 py-4">
          <h2 className="text-xl font-semibold text-center mb-4">Legend</h2>
          <div className="text-sm text-gray-300 space-y-3">
            <p><span className="text-white font-semibold">More engagement (views / likes / comments):</span> means more points that are received from views, likes and comments. This will affect the search algorithm by giving your script higher ranking and better visibility in search results.</p>
            <p><span className="text-white font-semibold">Reversed script age:</span> means that the script age will be reversed by given amount of time (can't be negative). (Freshness boost)</p>
            <p><span className="text-white font-semibold">Bump points:</span> means the points your script will get from single bump (you can bump every 24 hours).</p>
            <p><span className="text-white font-semibold">Total bump multiplier bonus:</span> means the total additional bonus the Script Multiplier will get if script has been bumped within 24 hours.</p>
            <p><span className="text-white font-semibold">Monthly duration:</span> means that the promotion will last for one month.</p>
            <p className="text-center"><span className="text-white font-semibold">See more information in </span><a href="/creator" className="text-blue-400 hover:text-blue-300 font-semibold">Creator</a></p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl bg-gray-800/60 border border-gray-700 rounded-lg px-6 py-4">
          <h2 className="text-xl font-semibold text-center mb-4">Freshness Multiplier (Time Since Effective Publish)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-2 px-4 font-semibold text-white">Age Window</th>
                  <th className="text-right py-2 px-4 font-semibold text-white">Multiplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                <tr>
                  <td className="py-2 px-4">0–1 hour</td>
                  <td className="text-right py-2 px-4 text-green-400 font-medium">2.0×</td>
                </tr>
                <tr>
                  <td className="py-2 px-4">1 hour–1 day</td>
                  <td className="text-right py-2 px-4 text-green-400 font-medium">1.6×</td>
                </tr>
                <tr>
                  <td className="py-2 px-4">1–3 days</td>
                  <td className="text-right py-2 px-4 text-green-400 font-medium">1.4×</td>
                </tr>
                <tr>
                  <td className="py-2 px-4">3–7 days</td>
                  <td className="text-right py-2 px-4 text-green-400 font-medium">1.3×</td>
                </tr>
                <tr>
                  <td className="py-2 px-4">7–14 days</td>
                  <td className="text-right py-2 px-4 text-green-400 font-medium">1.15×</td>
                </tr>
                <tr>
                  <td className="py-2 px-4">14–30 days</td>
                  <td className="text-right py-2 px-4 text-green-400 font-medium">1.1×</td>
                </tr>
                <tr>
                  <td className="py-2 px-4">30–90 days</td>
                  <td className="text-right py-2 px-4 text-white font-medium">1.0×</td>
                </tr>
                <tr>
                  <td className="py-2 px-4">90+ days</td>
                  <td className="text-right py-2 px-4 text-red-400 font-medium">0.9×</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mx-auto max-w-4xl bg-gray-800/60 border border-gray-700 rounded-lg px-6 py-4">
          <h2 className="text-xl font-semibold text-center mb-4">Promotion & Verification Multipliers</h2>
          <p className="text-sm text-gray-300 text-center mb-4">Promotion tiers multiply engagement + modify bump points + reverse effective age. Verification adds a global 1.4× engagement multiplier across all scripts (views / likes / comments only).</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-2 px-4 font-semibold text-white">Tier</th>
                  <th className="text-center py-2 px-4 font-semibold text-white">Engagement ×</th>
                  <th className="text-center py-2 px-4 font-semibold text-white">Age Reversal</th>
                  <th className="text-center py-2 px-4 font-semibold text-white">Bump Points</th>
                  <th className="text-center py-2 px-4 font-semibold text-white">Bump Bonus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                <tr>
                  <td className="py-2 px-4 font-medium">Promotion I</td>
                  <td className="text-center py-2 px-4 text-green-400 font-medium">1.2×</td>
                  <td className="text-center py-2 px-4">7 d</td>
                  <td className="text-center py-2 px-4 text-blue-400 font-medium">50</td>
                  <td className="text-center py-2 px-4 text-green-400 font-medium">+10%</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium">Promotion II</td>
                  <td className="text-center py-2 px-4 text-green-400 font-medium">1.35×</td>
                  <td className="text-center py-2 px-4">14 d</td>
                  <td className="text-center py-2 px-4 text-blue-400 font-medium">75</td>
                  <td className="text-center py-2 px-4 text-green-400 font-medium">+15%</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium">Promotion III</td>
                  <td className="text-center py-2 px-4 text-green-400 font-medium">1.5×</td>
                  <td className="text-center py-2 px-4">30 d</td>
                  <td className="text-center py-2 px-4 text-blue-400 font-medium">100</td>
                  <td className="text-center py-2 px-4 text-green-400 font-medium">+20%</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium">Promotion IV</td>
                  <td className="text-center py-2 px-4 text-green-400 font-medium">1.7×</td>
                  <td className="text-center py-2 px-4">90 d</td>
                  <td className="text-center py-2 px-4 text-blue-400 font-medium">125</td>
                  <td className="text-center py-2 px-4 text-green-400 font-medium">+25%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
