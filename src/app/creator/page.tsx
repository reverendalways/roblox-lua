"use client";
import { useState } from 'react';

const CoinIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 mr-1 text-yellow-400" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor" className="opacity-30" />
    <circle cx="12" cy="12" r="9" fill="currentColor" className="opacity-60" />
    <path d="M12 7a1 1 0 011 1v3h2.25a1 1 0 010 2H13v3a1 1 0 11-2 0v-3H8.75a1 1 0 010-2H11V8a1 1 0 011-1z" fill="#FFF6D5" />
  </svg>
);

export default function CreatorPage() {
  const [tab, setTab] = useState<'points' | 'verification' | 'api' | 'rules'>('points');
  const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);
    return (
      <button
        onClick={() => {
          navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          });
        }}
        className="flex items-center gap-2 px-2 py-1 border border-gray-600 rounded text-xs text-white hover:bg-gray-800"
        aria-label="Copy"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15V5a2 2 0 0 1 2-2h10"/>
        </svg>
        {copied ? <span className="text-gray-300">Copied</span> : <span>Copy</span>}
      </button>
    );
  };
  const btnBase = 'min-w-[150px] px-6 py-3 rounded-md text-sm font-medium border transition-colors';
  const inactive = 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-800/80 hover:text-gray-200 hover:border-gray-600';
  const active = 'bg-gray-800 border-gray-600 text-white shadow-lg';

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">Creator Hub</h1>
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          <button onClick={() => setTab('points')} className={`${btnBase} ${tab==='points'?active:inactive}`}>Point System</button>
          <button onClick={() => setTab('verification')} className={`${btnBase} ${tab==='verification'?active:inactive}`}>Verification</button>
          <button onClick={() => setTab('api')} className={`${btnBase} ${tab==='api'?active:inactive}`}>API</button>
          <button onClick={() => setTab('rules')} className={`${btnBase} ${tab==='rules'?active:inactive}`}>Creator Rules</button>
        </div>

        {tab==='points' && (
          <div className="space-y-10">

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">Interactive Point Simulator <span className="text-xs font-normal text-gray-400">(model combined multipliers)</span></h2>
              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-400"><CoinIcon /><span className="text-gray-300 font-medium">Script Points</span><span>— the scoring unit used by the Search Algorithm to boost scripts based on activity ( views, comments, likes, and bumps.)</span></div>
              <Simulator />
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Overview</h2>
              <p className="text-sm text-gray-300 leading-relaxed">The point system measures script performance. You can get the bigger audience by making high quality content, using tags, making good thumbnails, good titles, bumping everyday and promoting your script using promo codes. </p>
            </section>
            <section className="space-y-4">
              <h3 className="text-xl font-semibold">Base Point Awards</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-900/95">
                <table className="min-w-full text-sm">
                  <thead><tr className="bg-gray-800/50 text-gray-200"><th className="px-4 py-3 text-left font-medium">Action</th><th className="px-4 py-3 text-left font-medium">Base Points</th><th className="px-4 py-3 text-left font-medium">Multiplied?</th></tr></thead>
                  <tbody className="divide-y divide-gray-700/70">
                    <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300 font-medium">Submit a script</td><td className="px-4 py-3 text-green-400 font-semibold">+100</td><td className="px-4 py-3 text-gray-400">No (static)</td></tr>
                    <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300 font-medium">View</td><td className="px-4 py-3">+0.1</td><td className="px-4 py-3 text-blue-300">Yes</td></tr>
                    <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300 font-medium">Like</td><td className="px-4 py-3">+2</td><td className="px-4 py-3 text-blue-300">Yes</td></tr>
                    <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300 font-medium">Comment</td><td className="px-4 py-3">+4</td><td className="px-4 py-3 text-blue-300">Yes</td></tr>
                    <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300 font-medium">Bump</td><td className="px-4 py-3">+25 (base)</td><td className="px-4 py-3 text-blue-300">Promotion tier only</td></tr>
                  </tbody>
                </table>
              </div>
            </section>
            <section className="space-y-4">
              <h3 className="text-xl font-semibold">Multipliers</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-blue-300">Freshness Multiplier</h4>
                  <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-900/95">
                    <table className="min-w-full text-sm">
                      <thead><tr className="bg-gray-800/50 text-gray-200"><th className="px-4 py-3 text-left font-medium">Age Window</th><th className="px-4 py-3 text-left font-medium">Multiplier</th></tr></thead>
                      <tbody className="divide-y divide-gray-700/70">
                        <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300">0–1 hour</td><td className="px-4 py-3 text-green-400 font-semibold">2.0×</td></tr>
                        <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300">1h–1d</td><td className="px-4 py-3 text-green-400 font-semibold">1.6×</td></tr>
                        <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300">1–3d</td><td className="px-4 py-3 text-green-400 font-semibold">1.4×</td></tr>
                        <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300">3–7d</td><td className="px-4 py-3 text-green-400 font-semibold">1.3×</td></tr>
                        <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300">7–14d</td><td className="px-4 py-3 text-green-400 font-semibold">1.15×</td></tr>
                        <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300">14–30d</td><td className="px-4 py-3 text-green-400 font-semibold">1.1×</td></tr>
                        <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300">30–90d</td><td className="px-4 py-3 text-green-400 font-semibold">1.0×</td></tr>
                        <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300">90+ days</td><td className="px-4 py-3 text-red-400 font-semibold">0.9×</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-purple-300">Promotion Multiplier</h4>
                  <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-900/95">
                    <table className="min-w-full text-sm">
                      <thead><tr className="bg-gray-800/50 text-gray-200"><th className="px-4 py-3 text-left font-medium">Tier</th><th className="px-4 py-3 text-left font-medium">Multiplier</th><th className="px-4 py-3 text-left font-medium">Bump Bonus</th></tr></thead>
                      <tbody className="divide-y divide-gray-700/70">
                        <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300">None</td><td className="px-4 py-3 text-gray-400">1.0×</td><td className="px-4 py-3 text-blue-300">5%</td></tr>
                        <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300">Promotion I</td><td className="px-4 py-3 text-green-400 font-semibold">1.2×</td><td className="px-4 py-3 text-blue-300">+10%</td></tr>
                        <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300">Promotion II</td><td className="px-4 py-3 text-green-400 font-semibold">1.35×</td><td className="px-4 py-3 text-blue-300">+15%</td></tr>
                        <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300">Promotion III</td><td className="px-4 py-3 text-green-400 font-semibold">1.5×</td><td className="px-4 py-3 text-blue-300">+20%</td></tr>
                        <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300">Promotion IV</td><td className="px-4 py-3 text-green-400 font-semibold">1.7×</td><td className="px-4 py-3 text-blue-300">+25%</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
            <section className="space-y-4">
              <h3 className="text-xl font-semibold">Verification Bonus</h3>
              <div className="bg-gray-900/95 rounded-lg border border-gray-700 p-6">
                <p className="text-gray-300">Verified creators receive a permanent <span className="text-indigo-400 font-semibold">1.4× multiplier</span> on all engagement-based points (views, likes, comments).</p>
              </div>
            </section>
          </div>
        )}

        {tab==='verification' && (
          <div className="space-y-6 max-w-4xl mx-auto text-sm">
            <div>
              <h2 className="text-2xl font-semibold text-center mb-2">Verification</h2>
              <p className="text-gray-300 text-center">Apply to become a verified creator and gain an ongoing <span className="text-indigo-400 font-semibold">1.4×</span> engagement multiplier across all of your scripts (views / likes / comments ). Verification highlights trust, quality, and sustained contribution.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-lg border border-gray-700 bg-gray-900/95 p-5 space-y-4">
                <h3 className="text-lg font-semibold text-blue-300">Account Requirement</h3>
                <p className="text-gray-300">Your account must be at least <span className="font-semibold text-white">30 days old</span> and currently not timeouted.</p>
              </div>

            <div className="rounded-lg border border-gray-700 bg-gray-900/95 p-5 space-y-4">
                <h3 className="text-lg font-semibold text-green-300">Script Requirement</h3>
                <ul className="list-disc ml-5 space-y-1 text-gray-300 text-xs">
                  <li>Every script should adhere to the platform's rules</li>
                  <li>Scripts must be functional and not fully AI generated</li>
                  <li>Remember to update the status of your scripts</li>
                  <li>Script descriptions and tags should be consistent with the script</li>
                  <li>Provide key system info and discord info if available</li>
              </ul>
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-900/95 p-5 space-y-4">
                <h3 className="text-lg font-semibold text-purple-300">Success Requirement</h3>
                <p className="text-gray-300">Verification requires your activity on the platform to be successful even without verification. If people do not use your scripts, it means that you do not deserve verification. It is required to gain respect in the community and release several good productions.</p>
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-900/95 p-5 space-y-4">
                <h3 className="text-lg font-semibold text-yellow-300">Guideline Requirement</h3>
                <p className="text-gray-300">It is required that you are not known for frequently breaking rules or stealing scripts.</p>
              </div>
            </div>

            <div className="bg-indigo-900/20 border border-indigo-700/50 rounded-lg p-6 text-center">
              <h3 className="text-xl font-semibold mb-4 text-indigo-300">Apply for Verification</h3>
              <p className="text-gray-300 mb-6">Create a ticket on our Discord server to apply for verification.</p>
              <a
                href="https://discord.gg/3WwQsq78mE"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.0777.0777 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
                </svg>
                Create Discord Ticket
              </a>
            </div>

            <div className="text-center text-xs text-gray-500">
              <p>Meeting requirements does not guarantee approval; qualitative review still applies. Loss of eligibility (e.g. rule violations) can revoke status.</p>
            </div>
          </div>
        )}

        {tab==='api' && (
          <div className="space-y-8 max-w-5xl mx-auto">
            <div className="text-center mb-4">
              <h2 className="text-3xl font-bold text-white">Public Script Endpoints</h2>
            </div>

            <div className="bg-gray-900/95 rounded-lg border border-gray-700 p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">GET</div>
                    <div className="text-white font-mono text-sm">{typeof window !== 'undefined' ? window.location.origin : ''}/api/scripts/fast</div>
                  </div>
                  <CopyButton text={typeof window !== 'undefined' ? `${window.location.origin}/api/scripts/fast` : '/api/scripts/fast'} />
                </div>
                <p className="text-white">Returns newest and popular scripts</p>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">GET</div>
                    <div className="text-white font-mono text-sm">{typeof window !== 'undefined' ? window.location.origin : ''}/api/scripts/fast-search</div>
                  </div>
                  <CopyButton text={typeof window !== 'undefined' ? `${window.location.origin}/api/scripts/fast-search` : '/api/scripts/fast-search'} />
                </div>
                <p className="text-white">Add <span className="font-mono">?q=searchterm</span> to search</p>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">GET</div>
                    <div className="text-white font-mono text-sm">{typeof window !== 'undefined' ? window.location.origin : ''}/api/scripts/[id]</div>
                  </div>
                  <CopyButton text={typeof window !== 'undefined' ? `${window.location.origin}/api/scripts/123456789` : '/api/scripts/123456789'} />
                </div>
                <p className="text-white">Get individual script details</p>
              </div>

              <div className="mt-6 p-4 bg-gray-800 rounded border border-gray-600">
                <p className="text-white text-sm">You can use these endpoints to load script data from our platform. To check fields paste them into browser (for script/id one you gotta pick right id).</p>
                <p className="text-white text-sm mt-2">There are 2 thumbnail fields: <span className="font-mono">thumbnailUrl</span> - game thumbnail, <span className="font-mono">customThumbnail</span> - custom one so you will need to make some fallback or something like that.</p>
              </div>
            </div>
          </div>
        )}

        {tab==='rules' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4 text-white">Creator Rules & Guidelines</h2>
              <p className="text-gray-300 text-lg">Follow these guidelines to maintain a positive community and ensure your content meets ScriptVoid standards.</p>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-900/95 rounded-lg border border-gray-700 p-6">
                <h3 className="text-xl font-bold mb-4 text-white">Content Quality Standards</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold mb-2 text-blue-300">Script Functionality</h4>
                    <ul className="list-disc ml-5 space-y-2 text-gray-300">
                      <li>Scripts must be functional and perform their stated purpose</li>
                      <li>No broken or non-working scripts</li>
                      <li>Test your scripts before uploading</li>
                      <li>Provide clear instructions when possible</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2 text-blue-300">Title & Description</h4>
                    <ul className="list-disc ml-5 space-y-2 text-gray-300">
                      <li>Use descriptive, accurate titles</li>
                      <li>No clickbait or misleading titles</li>
                      <li>Include relevant game information</li>
                      <li>Describe what the script actually does</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/95 rounded-lg border border-gray-700 p-6">
                <h3 className="text-xl font-bold mb-4 text-white">Community Guidelines</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold mb-2 text-green-300">Respectful Behavior</h4>
                    <ul className="list-disc ml-5 space-y-2 text-gray-300">
                      <li>Be respectful to other creators and users</li>
                      <li>No harassment, bullying, or hate speech</li>
                      <li>Constructive feedback is welcome</li>
                      <li>Report violations appropriately</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2 text-green-300">Original Content</h4>
                    <ul className="list-disc ml-5 space-y-2 text-gray-300">
                      <li>Upload your own original scripts</li>
                      <li>Give credit when using others' work</li>
                      <li>No plagiarism or copyright infringement</li>
                      <li>Respect intellectual property rights</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/95 rounded-lg border border-gray-700 p-6">
                <h3 className="text-xl font-bold mb-4 text-white">Prohibited Content</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold mb-2 text-red-300">Never Upload</h4>
                    <ul className="list-disc ml-5 space-y-2 text-gray-300">
                      <li>Malware, viruses, or harmful code</li>
                      <li>Scripts designed to harm users</li>
                      <li>Content that violates game terms of service</li>
                      <li>Explicitly sexual or violent content</li>
                      <li>Personal information or doxxing content</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2 text-red-300">Avoid</h4>
                    <ul className="list-disc ml-5 space-y-2 text-gray-300">
                      <li>Excessive profanity in titles/descriptions</li>
                      <li>Spam or repetitive content</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/95 rounded-lg border border-gray-700 p-6">
                <h3 className="text-xl font-bold mb-4 text-white">Consequences</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold mb-2 text-yellow-300">Violation Penalties</h4>
                    <ul className="list-disc ml-5 space-y-2 text-gray-300">
                      <li>Content Removal</li>
                      <li>Temporary suspension</li>
                      <li>Account Removal</li>
                    </ul>
                  </div>
                  <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-2 text-yellow-300">Important</h4>
                    <p className="text-sm text-yellow-200">These rules exist to maintain a safe, respectful community. When in doubt, ask yourself: "Would I want someone else to upload this content?"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Simulator() {
  const [ageDays, setAgeDays] = useState(1);
  const [tier, setTier] = useState<'none' | 'I' | 'II' | 'III' | 'IV'>('none');
  const [verified, setVerified] = useState(false);
  const [isBumped, setIsBumped] = useState(false);

  const base = { view: 0.1, like: 2, comment: 4, bump: 25 };

  const promo = {
    none: { mult: 1.0, bumpBonus: 0.05, bump: 26.25 },
    I: { mult: 1.2, bumpBonus: 0.1, bump: 27.5 },
    II: { mult: 1.35, bumpBonus: 0.15, bump: 28.75 },
    III: { mult: 1.5, bumpBonus: 0.2, bump: 30 },
    IV: { mult: 1.7, bumpBonus: 0.25, bump: 31.25 }
  };

  function freshnessMult(days: number) {
    const hours = days * 24;
    if (hours <= 1) return 2.0;
    if (days <= 1) return 1.6;
    if (days <= 3) return 1.4;
    if (days <= 7) return 1.3;
    if (days <= 14) return 1.15;
    if (days <= 30) return 1.1;
    if (days <= 90) return 1.0;
    return 0.9;
  }

  const effectiveAgeDays = Math.max(0, ageDays);
  const fresh = freshnessMult(effectiveAgeDays);
  const baseMultiplier = fresh * promo[tier].mult * (verified?1.4:1);
  const bumpBonus = isBumped ? promo[tier].bumpBonus : 0;
  const totalMultiplier = baseMultiplier * (1 + bumpBonus);

  const effective = {
    view: +(base.view * totalMultiplier).toFixed(3),
    like: +(base.like * totalMultiplier).toFixed(2),
    comment: +(base.comment * totalMultiplier).toFixed(2),
    bump: promo[tier].bump,
  };

  function labelFresh(){
    const d = effectiveAgeDays; const h = d*24;
    if(h <= 1) return '0–1 hour (2.0×)';
    if(d <= 1) return '1h–1d (1.6×)';
    if(d <= 3) return '1–3d (1.4×)';
    if(d <= 7) return '3–7d (1.3×)';
    if(d <= 14) return '7–14d (1.15×)';
    if(d <= 30) return '14–30d (1.1×)';
    if(d <= 90) return '30–90d (1.0×)';
    return '90+d (0.9×)';
  }

  return (
    <div className="space-y-6 rounded-xl border border-gray-700 bg-gray-900/95 p-6">
      <div className="grid md:grid-cols-5 gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-400">Script Real Age (days)</label>
          <input type="number" min={0} step={0.1} value={ageDays} onChange={e=>setAgeDays(parseFloat(e.target.value)||0)} className="w-full rounded-md bg-gray-800 border border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" />
          <p className="text-[10px] text-gray-500">Enter numeric days (e.g. 0.25 = 6h).</p>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-400">Promotion Tier</label>
          <select value={tier} onChange={e=>setTier(e.target.value as any)} className="w-full rounded-md bg-gray-800 border border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white">
            <option value="none">None</option>
            <option value="I">Promotion I</option>
            <option value="II">Promotion II</option>
            <option value="III">Promotion III</option>
            <option value="IV">Promotion IV</option>
          </select>
          <p className="text-[10px] text-gray-500">Includes engagement × and reversal.</p>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-400">Verification</label>
          <button onClick={()=>setVerified(v=>!v)} className={`w-full rounded-md px-3 py-2 text-sm font-medium border transition-colors ${verified?'bg-indigo-600 border-indigo-500 text-white':'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'}`}>{verified?'Enabled (1.4×)':'Enable 1.4×'}</button>
          <p className="text-[10px] text-gray-500">Applies globally to engagement.</p>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-400">Bump Status</label>
          <button onClick={()=>setIsBumped(v=>!v)} className={`w-full rounded-md px-3 py-2 text-sm font-medium border transition-colors ${isBumped?'bg-green-600 border-green-500 text-white':'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'}`}>{isBumped?'Bumped (+Bonus)':'Not Bumped'}</button>
          <p className="text-[10px] text-gray-500">Within 24h for bonus.</p>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-400">Effective Age After Reversal</label>
          <div className="rounded-md bg-gray-800 border border-gray-600 px-3 py-2 text-sm flex flex-col gap-1">
            <span className="text-gray-200">{effectiveAgeDays.toFixed(2)} days</span>
            <span className="text-[11px] text-gray-400">Window: {labelFresh()}</span>
          </div>
          <p className="text-[10px] text-gray-500">Real age − reversal (min 0).</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 text-center">
        <Stat label="Freshness ×" value={fresh.toFixed(2)} />
        <Stat label="Promotion ×" value={promo[tier].mult.toFixed(2)} />
        <Stat label="Verification ×" value={(verified?1.4:1).toFixed(2)} />
        <Stat label="Bump Bonus" value={isBumped ? `+${(promo[tier].bumpBonus*100).toFixed(0)}%` : 'None'} highlight={isBumped} />
        <Stat label="Total Multiplier" value={totalMultiplier.toFixed(3)} highlight />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800/80">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-800/90 text-gray-200"><th className="px-4 py-3 text-left font-medium">Action</th><th className="px-4 py-3 text-left font-medium">Base</th><th className="px-4 py-3 text-left font-medium">Effective</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-700/70">
            <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300 font-medium">View</td><td className="px-4 py-3">+0.1</td><td className="px-4 py-3 text-green-400 font-semibold">+{effective.view}</td></tr>
            <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300 font-medium">Like</td><td className="px-4 py-3">+2</td><td className="px-4 py-3 text-green-400 font-semibold">+{effective.like}</td></tr>
            <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300 font-medium">Comment</td><td className="px-4 py-3">+4</td><td className="px-4 py-3 text-green-400 font-semibold">+{effective.comment}</td></tr>
            <tr className="hover:bg-gray-800/60"><td className="px-4 py-3 text-gray-300 font-medium">Bump</td><td className="px-4 py-3">+25</td><td className="px-4 py-3 text-blue-400 font-semibold">+{effective.bump}</td></tr>
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed">Formula: Effective Points = Base × Freshness × Promotion × Verification × (1 + Bump Bonus). Bump: base replaced by promotion bump value, no freshness/verification. Submission bonus is static and excluded here.</p>
    </div>
  );
}

function Stat({label,value,highlight}:{label:string;value:string;highlight?:boolean}){
  return (
    <div className={`rounded-lg border px-4 py-3 ${highlight?'border-blue-500/70 bg-blue-500/20':'border-gray-700 bg-gray-800/60'}`}>
      <div className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${highlight?'text-blue-300':'text-gray-200'}`}>{value}</div>
    </div>
  );
}
